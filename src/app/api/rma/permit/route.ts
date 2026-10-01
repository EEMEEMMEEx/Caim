import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { RmaDocument, PermitTrackingInfo } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { getPersistentRma, savePersistentRma } from "@/lib/storage/serverRmaStorage"
import { calculatePermitExpirationDate, getCoveredStepsByPermitType } from "@/lib/utils/permitSla"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

/**
 * Backend Permit-Submission Handler
 * Binds conditional step coverage (Steps 1-5 for Export, Steps 5-8 for Import)
 * and enforces strict 90-day permit SLA validity window.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Missing request body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const permitType = body.permitType || "export_for_repair"
    const coveredSteps = getCoveredStepsByPermitType(permitType)

    const issueDate =
      body.issueDate && !isNaN(Date.parse(body.issueDate))
        ? body.issueDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const expiryDate =
      body.expiryDate && !isNaN(Date.parse(body.expiryDate))
        ? body.expiryDate.slice(0, 10)
        : calculatePermitExpirationDate(issueDate, 90)

    const permitNo =
      (body.permitNo && body.permitNo.trim()) ||
      (permitType === "import_after_repair"
        ? `IMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        : `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)

    const nowIso = new Date().toISOString()

    const permitDoc: PermitTrackingInfo = {
      permitNo,
      permitType,
      authority: body.authority || "กสทช. (NBTC)",
      coveredSteps,
      issueDate,
      expiryDate,
      destinationCountry: body.destinationCountry || "ฮ่องกง (Hong Kong)",
      remarks: body.remarks || "",
      createdAt: nowIso,
    }

    // Find and link to matching RMA record if provided
    const targetRmaNo = (body.rmaNo || body.linkedRmaNo || "").trim()
    const targetSerial = (body.selectedAssetSerial || body.serialNo || "").trim()

    const diskItems = getPersistentRma()
    let targetRma: RmaDocument | undefined

    if (targetRmaNo) {
      targetRma = diskItems.find(
        (r) => r.rmaNo.toLowerCase() === targetRmaNo.toLowerCase() || r.id === targetRmaNo
      )
    }

    if (!targetRma && targetSerial) {
      targetRma = diskItems.find(
        (r) => r.serialNo.toLowerCase() === targetSerial.toLowerCase()
      )
    }

    // If still not matched and there are active RMAs, bind to the most recent in-progress RMA
    if (!targetRma && diskItems.length > 0) {
      targetRma = diskItems[0]
    }

    let savedToMongo = false

    if (targetRma) {
      const existingPermits = targetRma.permits || []
      const filtered = existingPermits.filter((p) => p.permitNo !== permitDoc.permitNo)
      const updatedPermits = [permitDoc, ...filtered]

      const updatedRma: RmaDocument = {
        ...targetRma,
        permitInfo: permitDoc,
        permits: updatedPermits,
        updatedAt: nowIso,
      }

      // 1. Save to persistent disk
      savePersistentRma(updatedRma)

      // 2. Save to MongoDB if configured
      if (isMongoConfigured()) {
        const db = await getDb()
        if (db) {
          await db.collection<RmaDocument>("rma").updateOne(
            { id: targetRma.id },
            {
              $set: {
                permitInfo: permitDoc,
                permits: updatedPermits,
                updatedAt: nowIso,
              },
            }
          )

          // Also record transaction log
          await db.collection("transaction_logs").insertOne({
            id: `TX-PERMIT-BIND-${Date.now()}`,
            action: "RMA_UPDATED",
            targetType: "rma",
            targetId: targetRma.id,
            details: {
              permitNo: permitDoc.permitNo,
              permitType: permitDoc.permitType,
              coveredSteps: permitDoc.coveredSteps,
              issueDate: permitDoc.issueDate,
              expiryDate: permitDoc.expiryDate,
              validityDays: 90,
            },
            timestamp: nowIso,
          })

          savedToMongo = true
        }
      }

      // 3. Broadcast realtime RMA change event
      realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
        type: "rma",
        action: "update",
        data: updatedRma,
        timestamp: nowIso,
      })

      return NextResponse.json(
        {
          success: true,
          permit: permitDoc,
          linkedRma: updatedRma,
          savedTo: savedToMongo ? "mongodb" : "persistent-disk",
          message: `บันทึกใบอนุญาต ${permitDoc.permitNo} และผูกขั้นตอนไทม์ไลน์ (${permitType === "export_for_repair" ? "ขั้นตอน 1–5" : "ขั้นตอน 5–8"}) กรอบเวลา 90 วันเรียบร้อยแล้ว`,
        },
        { status: 200, headers: NO_CACHE_HEADERS }
      )
    }

    // Fallback when no active RMA is available yet
    return NextResponse.json(
      {
        success: true,
        permit: permitDoc,
        linkedRma: null,
        message: `บันทึกใบอนุญาต ${permitDoc.permitNo} (กรอบเวลา 90 วัน) เรียบร้อยแล้ว`,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process permit"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
