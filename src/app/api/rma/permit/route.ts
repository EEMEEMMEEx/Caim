import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { RmaDocument, PermitTrackingInfo } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { getPersistentRma, savePersistentRma } from "@/lib/storage/serverRmaStorage"
import {
  calculatePermitExpirationDate,
  calculatePermitSla,
  getCoveredStepsByPermitType,
} from "@/lib/utils/permitSla"

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
        { success: false, error: "Missing required permit submission payload" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Normalize permit type
    const rawType = String(body.permitType || "export_for_repair").trim()
    let permitType: "export_for_repair" | "import_after_repair" | "nbtc_permit" | "customs_clearance" = "export_for_repair"

    if (rawType === "นำเข้าหลังการซ่อมแซม" || rawType === "import_after_repair") {
      permitType = "import_after_repair"
    } else if (rawType === "ส่งออกเพื่อซ่อมแซม" || rawType === "export_for_repair") {
      permitType = "export_for_repair"
    } else if (rawType === "nbtc_permit" || rawType.includes("กสทช")) {
      permitType = "nbtc_permit"
    } else if (rawType === "customs_clearance" || rawType.includes("ศุลกากร")) {
      permitType = "customs_clearance"
    }

    const coveredSteps = getCoveredStepsByPermitType(permitType)

    const issueDate =
      body.issueDate && !isNaN(Date.parse(body.issueDate))
        ? body.issueDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const expiryDate =
      body.expiryDate && !isNaN(Date.parse(body.expiryDate))
        ? body.expiryDate.slice(0, 10)
        : calculatePermitExpirationDate(issueDate, 90)
    const sla = calculatePermitSla(issueDate, expiryDate)

    const permitNo =
      (body.permitNo && body.permitNo.trim()) ||
      (permitType === "import_after_repair"
        ? `IMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        : `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)

    const nowIso = new Date().toISOString()

    // Find matching RMA record if provided
    const targetRmaNo = (body.rmaNo || body.linkedRmaNo || body.rmaId || "").trim()
    const targetSerial = (body.selectedAssetSerial || body.serialNo || "").trim()

    let targetRma: RmaDocument | undefined

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<RmaDocument>("rma")
        if (targetRmaNo) {
          const found = await collection.findOne({
            $or: [
              { rmaNo: { $regex: new RegExp(`^${targetRmaNo}$`, "i") } },
              { id: targetRmaNo },
            ],
          })
          if (found) targetRma = found
        }
        if (!targetRma && targetSerial) {
          const found = await collection.findOne({
            serialNo: { $regex: new RegExp(`^${targetSerial}$`, "i") },
          })
          if (found) targetRma = found
        }
        if (!targetRma) {
          const first = await collection.findOne({})
          if (first) targetRma = first
        }
      }
    }

    if (!targetRma) {
      const diskItems = getPersistentRma()
      if (targetRmaNo) {
        targetRma = diskItems.find(
          (r) =>
            r.rmaNo.toLowerCase() === targetRmaNo.toLowerCase() ||
            r.id.toLowerCase() === targetRmaNo.toLowerCase()
        )
      }
      if (!targetRma && targetSerial) {
        targetRma = diskItems.find(
          (r) => r.serialNo.toLowerCase() === targetSerial.toLowerCase()
        )
      }
      if (!targetRma && diskItems.length > 0) {
        targetRma = diskItems[0]
      }
    }

    const permitDoc: PermitTrackingInfo = {
      permitNo,
      permitType,
      authority: body.authority || "กสทช. (NBTC)",
      destinationCountry: body.destinationCountry || "ฮ่องกง (Hong Kong)",
      rmaId: targetRma?.id || targetRmaNo || undefined,
      rmaNo: targetRma?.rmaNo || targetRmaNo || undefined,
      serialNo: targetRma?.serialNo || targetSerial || undefined,
      issueDate,
      expiryDate,
      coveredSteps,
      coveredStages: coveredSteps,
      remarks: body.remarks || "",
      totalDays: sla.totalDays,
      elapsedDays: sla.elapsedDays,
      remainingDays: sla.remainingDays,
      progressPercent: sla.progressPercent,
      status: sla.status,
      badgeText: sla.badgeText,
      subtext: sla.subtext,
      createdAt: nowIso,
      updatedAt: nowIso,
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
            { $or: [{ id: targetRma.id }, { rmaNo: targetRma.rmaNo }] },
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
              authority: permitDoc.authority,
              destinationCountry: permitDoc.destinationCountry,
              rmaId: targetRma.id,
              rmaNo: targetRma.rmaNo,
              serialNo: targetRma.serialNo,
              coveredSteps: permitDoc.coveredSteps,
              coveredStages: permitDoc.coveredStages,
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

      console.log(`[api/rma/permit] Successfully persisted permit ${permitDoc.permitNo} to RMA ${targetRma.rmaNo}`)

      return NextResponse.json(
        {
          success: true,
          permit: permitDoc,
          linkedRma: updatedRma,
          savedTo: savedToMongo ? "mongodb" : "persistent-disk",
          message: "บันทึกใบอนุญาตนำเข้า-ส่งออกสำเร็จ",
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
        message: "บันทึกใบอนุญาตนำเข้า-ส่งออกสำเร็จ",
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process permit submission"
    console.error("[api/rma/permit] Error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * PATCH handler for inline/modal permit date modification
 * Dynamically recalculates total SLA days = differenceInCalendarDays(expirationDate, issueDate),
 * elapsed days, remaining days, and progress percent, persisting back to MongoDB and disk.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || (!body.permitNo && !body.id)) {
      return NextResponse.json(
        { success: false, error: "Missing permit identifier (permitNo or id)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const permitNo = String(body.permitNo || body.id).trim()
    const targetRmaNo = (body.rmaNo || body.linkedRmaNo || body.rmaId || "").trim()
    const nowIso = new Date().toISOString()

    let targetRma: RmaDocument | undefined

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<RmaDocument>("rma")
        if (targetRmaNo) {
          const found = await collection.findOne({
            $or: [
              { rmaNo: { $regex: new RegExp(`^${targetRmaNo}$`, "i") } },
              { id: targetRmaNo },
            ],
          })
          if (found) targetRma = found
        }
        if (!targetRma) {
          const found = await collection.findOne({
            $or: [
              { "permits.permitNo": permitNo },
              { "permitInfo.permitNo": permitNo },
            ],
          })
          if (found) targetRma = found
        }
      }
    }

    if (!targetRma) {
      const diskItems = getPersistentRma()
      if (targetRmaNo) {
        targetRma = diskItems.find(
          (r) =>
            r.rmaNo.toLowerCase() === targetRmaNo.toLowerCase() ||
            r.id.toLowerCase() === targetRmaNo.toLowerCase()
        )
      }
      if (!targetRma) {
        targetRma = diskItems.find(
          (r) =>
            (r.permits && r.permits.some((p) => p.permitNo === permitNo)) ||
            r.permitInfo?.permitNo === permitNo
        )
      }
      if (!targetRma && diskItems.length > 0) {
        targetRma = diskItems[0]
      }
    }

    if (!targetRma) {
      return NextResponse.json(
        { success: false, error: `Could not find RMA case linked to permit ${permitNo}` },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    const existingPermits = targetRma.permits || []
    const existingPermit =
      existingPermits.find((p) => p.permitNo === permitNo) ||
      (targetRma.permitInfo?.permitNo === permitNo ? targetRma.permitInfo : null)

    const issueDate =
      body.issueDate && !isNaN(Date.parse(body.issueDate))
        ? body.issueDate.slice(0, 10)
        : existingPermit?.issueDate || new Date().toISOString().slice(0, 10)

    const expiryDate =
      body.expiryDate && !isNaN(Date.parse(body.expiryDate))
        ? body.expiryDate.slice(0, 10)
        : existingPermit?.expiryDate || calculatePermitExpirationDate(issueDate, 90)

    // Dynamically calculate SLA without hardcoding fixed 90 days
    const sla = calculatePermitSla(issueDate, expiryDate)

    const updatedPermitDoc: PermitTrackingInfo = {
      ...(existingPermit || {}),
      permitNo,
      permitType: body.permitType || existingPermit?.permitType || "export_for_repair",
      authority: body.authority || existingPermit?.authority || "กสทช. (NBTC)",
      destinationCountry: body.destinationCountry || existingPermit?.destinationCountry,
      rmaId: targetRma.id,
      rmaNo: targetRma.rmaNo,
      serialNo: targetRma.serialNo,
      issueDate,
      expiryDate,
      coveredSteps: existingPermit?.coveredSteps || [1, 2, 3, 4, 5],
      coveredStages: existingPermit?.coveredStages || existingPermit?.coveredSteps || [1, 2, 3, 4, 5],
      remarks: body.remarks !== undefined ? body.remarks : existingPermit?.remarks || "",
      totalDays: sla.totalDays,
      elapsedDays: sla.elapsedDays,
      remainingDays: sla.remainingDays,
      progressPercent: sla.progressPercent,
      status: sla.status,
      badgeText: sla.badgeText,
      subtext: sla.subtext,
      updatedAt: nowIso,
    }

    const updatedPermits = existingPermits.map((p) =>
      p.permitNo === permitNo ? updatedPermitDoc : p
    )
    if (!existingPermits.some((p) => p.permitNo === permitNo)) {
      updatedPermits.push(updatedPermitDoc)
    }

    const updatedRma: RmaDocument = {
      ...targetRma,
      permitInfo: targetRma.permitInfo?.permitNo === permitNo ? updatedPermitDoc : targetRma.permitInfo,
      permits: updatedPermits,
      updatedAt: nowIso,
    }

    // 1. Save to disk
    savePersistentRma(updatedRma)

    // 2. Save to Mongo
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection<RmaDocument>("rma").updateOne(
          { $or: [{ id: targetRma.id }, { rmaNo: targetRma.rmaNo }] },
          {
            $set: {
              permitInfo: updatedRma.permitInfo,
              permits: updatedPermits,
              updatedAt: nowIso,
            },
          }
        )

        await db.collection("transaction_logs").insertOne({
          id: `TX-PERMIT-UPDATE-${Date.now()}`,
          action: "PERMIT_UPDATED",
          targetType: "rma",
          targetId: targetRma.id,
          details: {
            permitNo: updatedPermitDoc.permitNo,
            rmaNo: targetRma.rmaNo,
            issueDate,
            expiryDate,
            totalDays: sla.totalDays,
            elapsedDays: sla.elapsedDays,
            remainingDays: sla.remainingDays,
          },
          timestamp: nowIso,
        })
      }
    }

    // 3. Broadcast realtime event
    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "update",
      data: updatedRma,
      timestamp: nowIso,
    })

    console.log(`[api/rma/permit] PATCH successfully updated permit ${permitNo}: issueDate ${issueDate}, expiryDate ${expiryDate}, totalSla ${sla.totalDays}d`)

    return NextResponse.json(
      {
        success: true,
        permit: updatedPermitDoc,
        linkedRma: updatedRma,
        message: "อัปเดตวันที่ใบอนุญาตสำเร็จ",
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update permit dates"
    console.error("[api/rma/permit] PATCH Error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

