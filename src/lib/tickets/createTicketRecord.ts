import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { TicketDocument, EquipmentDocument, StationDocument } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { savePersistentTicket } from "@/lib/storage/serverTicketStorage"
import { calculateCaseDuration, calculateDueDate } from "@/lib/utils/caseDuration"
import { generateNextClaimNumber } from "@/lib/sequences/claimSequence"
import { invalidateDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"
import { notifyNewClaimCreated } from "@/lib/email/claimNotificationService"

/**
 * Claim/ticket creation shared by the portal endpoint (POST /api/claims) and the
 * machine-to-machine integration endpoint (POST /api/tickets, guarded by CAIM_API_KEY).
 *
 * Lives outside the App Router route file because Next.js route modules only accept
 * HTTP-method exports, and both endpoints must run the exact same persistence,
 * real-time and disk-backup pipeline.
 */
export async function createTicketRecord(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || (!body.title && !body.problemDesc && !body.serialNo)) {
      return NextResponse.json(
        { success: false, error: "Missing required ticket information" },
        { status: 400 }
      )
    }

    // Determine atomic, concurrency-safe sequential claim number (CLM-YYYY-XXX)
    // Ensures all new claim creations atomically acquire the sequence lock and advance the counter without race conditions
    const isExplicitExternalNonAuto =
      body.isExternalAssignedId === true &&
      body.id &&
      !String(body.id).includes("XXX")

    const ticketId = isExplicitExternalNonAuto
      ? String(body.id).trim()
      : await generateNextClaimNumber({ date: body.date || body.createdAt })

    const rawClaimTitle = body.claimTitle || body.title
    const ticketTitle =
      rawClaimTitle &&
      !String(rawClaimTitle).includes("สร้างอัตโนมัติ") &&
      !String(rawClaimTitle).includes("XXX") &&
      !/^CLM-\d{4}-\d+$/i.test(String(rawClaimTitle).trim())
        ? String(rawClaimTitle).trim()
        : body.problemDesc
        ? String(body.problemDesc).trim().slice(0, 50)
        : ticketId

    const resolvedClaimTitle =
      body.claimTitle && String(body.claimTitle).trim()
        ? String(body.claimTitle).trim()
        : ticketTitle

    const nowIso = new Date().toISOString()
    const serialNo = String(body.serialNo || "").trim()

    let stationId = body.stationId ? String(body.stationId).trim() : undefined
    let stationName = body.station ? String(body.station).trim() : undefined
    let province = body.province ? String(body.province).trim() : undefined
    let district = body.district ? String(body.district).trim() : undefined
    let subdistrict = body.subdistrict ? String(body.subdistrict).trim() : undefined

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        // 1. Resolve Station Reference if stationId is missing but station name is provided
        if (!stationId && stationName) {
          const foundStation = await db.collection<StationDocument>("stations").findOne({
            name: { $regex: new RegExp(`^${stationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })
          if (foundStation) {
            stationId = foundStation.id
            province = province || foundStation.province
            district = district || foundStation.district
            subdistrict = subdistrict || foundStation.subdistrict
          }
        } else if (stationId && !stationName) {
          const foundStation = await db.collection<StationDocument>("stations").findOne({ id: stationId })
          if (foundStation) {
            stationName = foundStation.name
            province = province || foundStation.province
            district = district || foundStation.district
            subdistrict = subdistrict || foundStation.subdistrict
          }
        }

        // 2. Validate and Update Equipment Reference
        if (serialNo && serialNo !== "-") {
          const equipCol = db.collection<EquipmentDocument>("equipments")
          await equipCol.updateOne(
            { serial: { $regex: new RegExp(`^${serialNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            {
              $set: {
                status: "in_claim",
                currentClaimId: ticketId,
                stationId: stationId || undefined,
                stationName: stationName || undefined,
                updatedAt: nowIso,
              },
            }
          )
        }

        const reportedDateStr = body.date || new Date().toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        const duration = calculateCaseDuration({
          date: reportedDateStr,
          createdAt: nowIso,
          status: body.status || "รับแจ้ง",
          statusCode: body.statusCode || 1,
          isOverdue: body.isOverdue,
          overdueText: body.overdueText,
        })

        // 3. Insert Ticket Document
        const newTicketDoc: TicketDocument = {
          id: ticketId,
          title: ticketTitle,
          claimTitle: resolvedClaimTitle,
          problemDesc: body.problemDesc || "",
          vendor: body.vendor || "Other",
          model: body.model || "-",
          serialNo: serialNo || "-",
          status: body.status || "รับแจ้ง",
          statusCode: body.statusCode || 1,
          date: reportedDateStr,
          deadlineDate: body.deadlineDate || calculateDueDate(reportedDateStr, 60).dueDateStr,
          ageDays: duration.text,
          isOverdue: duration.isOverdue,
          overdueText: duration.overdueText,
          stationId,
          station: stationName,
          province,
          district,
          subdistrict,
          reporter: body.reporter || body.reporterName || undefined,
          assignee: body.assignee || body.assigneeName || undefined,
          reporterName: body.reporterName || body.reporter || undefined,
          assigneeName: body.assigneeName || body.assignee || undefined,
          remarks: body.remarks || undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        }

        await db.collection<TicketDocument>("tickets").insertOne(newTicketDoc)

        // 4. Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-CLAIM-OPEN-${Date.now()}`,
          action: "CLAIM_OPENED",
          targetType: "ticket",
          targetId: ticketId,
          details: {
            title: newTicketDoc.title,
            serialNo: newTicketDoc.serialNo,
            stationId: newTicketDoc.stationId,
            station: newTicketDoc.station,
            status: newTicketDoc.status,
            reporter: newTicketDoc.reporter,
            assignee: newTicketDoc.assignee,
            remarks: newTicketDoc.remarks,
          },
          timestamp: nowIso,
        })

        // 5. Real-Time Broadcast
        realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
          type: "ticket",
          action: "create",
          data: newTicketDoc,
          timestamp: nowIso,
        })
        realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
          type: "metrics",
          action: "update",
          data: {},
          timestamp: nowIso,
        })

        // Save to persistent disk store as dual-layer backup
        savePersistentTicket(newTicketDoc)

        // Instantly invalidate dashboard cache and broadcast fresh metrics
        await invalidateDashboardMetrics(true)

        // Trigger asynchronous email notification for new claim creation (Trigger A)
        notifyNewClaimCreated(newTicketDoc)

        return NextResponse.json(
          {
            success: true,
            ticket: newTicketDoc,
            savedTo: "mongodb",
            message: "เปิดเคสแจ้งเคลมและบันทึกประวัติการทำรายการเรียบร้อยแล้ว",
          },
          { status: 201, headers: NO_CACHE_HEADERS }
        )
      }
    }

    const fallbackReportedDate = body.date || new Date().toLocaleDateString("th-TH")
    const fallbackDuration = calculateCaseDuration({
      date: fallbackReportedDate,
      createdAt: nowIso,
      status: body.status || "รับแจ้ง",
      statusCode: body.statusCode || 1,
      isOverdue: body.isOverdue,
      overdueText: body.overdueText,
    })

    // Fallback store
    const fallbackDoc: TicketDocument = {
      id: ticketId,
      title: ticketTitle,
      claimTitle: resolvedClaimTitle,
      problemDesc: body.problemDesc || "",
      vendor: body.vendor || "Other",
      model: body.model || "-",
      serialNo: serialNo || "-",
      status: body.status || "รับแจ้ง",
      statusCode: body.statusCode || 1,
      date: fallbackReportedDate,
      ageDays: fallbackDuration.text,
      isOverdue: fallbackDuration.isOverdue,
      overdueText: fallbackDuration.overdueText,
      stationId,
      station: stationName,
      province,
      district,
      subdistrict,
      reporter: body.reporter || body.reporterName || undefined,
      assignee: body.assignee || body.assigneeName || undefined,
      reporterName: body.reporterName || body.reporter || undefined,
      assigneeName: body.assigneeName || body.assignee || undefined,
      remarks: body.remarks || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
    savePersistentTicket(fallbackDoc)

    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "create",
      data: fallbackDoc,
      timestamp: nowIso,
    })

    // Instantly invalidate dashboard cache and broadcast fresh metrics
    await invalidateDashboardMetrics(true)

    // Trigger asynchronous email notification for new claim creation (Trigger A)
    notifyNewClaimCreated(fallbackDoc)

    return NextResponse.json(
      {
        success: true,
        ticket: fallbackDoc,
        savedTo: "persistent-local",
        message: "บันทึกเคสแจ้งเคลมเรียบร้อยแล้ว",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create ticket"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
