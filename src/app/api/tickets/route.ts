import { NextRequest, NextResponse, after } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { TicketDocument, EquipmentDocument, CaimRepairOutcome } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  getPersistentTickets,
  savePersistentTicket,
  deletePersistentTicket,
  getPersistentDeletedTicketIds,
} from "@/lib/storage/serverTicketStorage"
import { calculateCaseDuration, calculateDueDate } from "@/lib/utils/caseDuration"
import { dispatchStockFlowWebhook } from "@/lib/webhooks/stockFlowWebhook"
import { requireCaimApiKey } from "@/lib/auth/apiKeyAuth"
import { createTicketRecord } from "@/lib/tickets/createTicketRecord"
import { invalidateDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"
import { notifyClaimUpdated } from "@/lib/email/claimNotificationService"

function enrichTicket(ticket: TicketDocument): TicketDocument {
  const duration = calculateCaseDuration(ticket)
  const defaultDeadline = calculateDueDate(ticket.date, 60).dueDateStr
  const deadlineDate = ticket.deadlineDate && !ticket.deadlineDate.includes("12 พ.ย. 2569")
    ? ticket.deadlineDate
    : defaultDeadline
  return {
    ...ticket,
    deadlineDate,
    ageDays: duration.text,
    isOverdue: duration.isOverdue,
    overdueText: duration.overdueText || ticket.overdueText,
  }
}

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const maxDuration = 15

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const persistentDeletedIds = getPersistentDeletedTicketIds()

    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const collection = db.collection<TicketDocument>("tickets")
          if (id) {
            const item = await collection.findOne({ id })
            if (item && !persistentDeletedIds.includes(item.id)) {
              return NextResponse.json({ success: true, ticket: enrichTicket(item), source: "mongodb" }, { headers: NO_CACHE_HEADERS })
            }
          } else {
            const tickets = await collection.find({}).sort({ createdAt: -1 }).toArray()
            const filteredTickets = tickets
              .filter((t) => !persistentDeletedIds.includes(t.id))
              .map(enrichTicket)
            return NextResponse.json(
              {
                success: true,
                source: "mongodb",
                tickets: filteredTickets,
                total: filteredTickets.length,
                deletedIds: persistentDeletedIds,
              },
              { headers: NO_CACHE_HEADERS }
            )
          }
        }
      } catch (dbErr) {
        console.warn("[Tickets API] MongoDB query failed, using persistent disk store:", dbErr)
      }
    }

    const diskTickets = getPersistentTickets().map(enrichTicket)

    if (id) {
      const found = diskTickets.find((t) => t.id === id)
      return NextResponse.json(
        { success: true, ticket: found || null, source: "persistent-local" },
        { headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      {
        success: true,
        source: "persistent-local",
        tickets: diskTickets,
        total: diskTickets.length,
        deletedIds: persistentDeletedIds,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tickets"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/tickets
 * Machine-to-machine claim creation used by the Stock-Flow integration.
 * Requires `Authorization: Bearer <CAIM_API_KEY>` (integration plan section 5.1).
 * The portal's own form posts to POST /api/claims instead, which stays open for in-app
 * use because the shared secret must never reach the browser bundle.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireCaimApiKey(request)
  if (unauthorized) return unauthorized
  return createTicketRecord(request)
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const id = body.id || searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ticket id" },
        { status: 400 }
      )
    }

    const updates = { ...body }
    delete updates.id
    const nowIso = new Date().toISOString()

    // Normalize field names (support both naming conventions across all claim fields)
    const normalizedProblemDesc = updates.problemDesc !== undefined
      ? String(updates.problemDesc).trim()
      : updates.description !== undefined
      ? String(updates.description).trim()
      : updates.symptoms !== undefined
      ? String(updates.symptoms).trim()
      : undefined

    const normalizedSerialNo = updates.serialNo !== undefined
      ? String(updates.serialNo).trim()
      : updates.serialNumber !== undefined
      ? String(updates.serialNumber).trim()
      : undefined

    const normalizedVendor = updates.brand !== undefined
      ? String(updates.brand).trim()
      : updates.vendor !== undefined
      ? String(updates.vendor).trim()
      : undefined

    const normalizedDeviceType = updates.group !== undefined
      ? String(updates.group).trim()
      : updates.deviceType !== undefined
      ? String(updates.deviceType).trim()
      : undefined

    const normalizedDate = updates.reportedDate !== undefined
      ? String(updates.reportedDate).trim()
      : updates.date !== undefined
      ? String(updates.date).trim()
      : undefined

    const normalizedDeadlineDate = updates.slaExpiry !== undefined
      ? String(updates.slaExpiry).trim()
      : updates.deadlineDate !== undefined
      ? String(updates.deadlineDate).trim()
      : undefined

    // Normalize status and statusCode with comprehensive display and code mappings
    const STATUS_MAP: Record<number, string> = {
      1: "รับแจ้ง",
      2: "ส่งศูนย์",
      3: "รออะไหล่",
      4: "ซ่อมเสร็จ",
      5: "ปิดเคส",
      6: "ปฏิเสธเคลม",
    }
    const STATUS_TO_CODE: Record<string, number> = {
      "รับแจ้ง": 1,
      "รับแจ้ง/รอตรวจสภาพ": 1,
      "ส่งศูนย์": 2,
      "ส่งศูนย์บริการแล้ว": 2,
      "ส่งศูนย์บริการ": 2,
      "รออะไหล่": 3,
      "รออะไหล่/กำลังซ่อม": 3,
      "กำลังซ่อม": 3,
      "ซ่อมเสร็จ": 4,
      "ซ่อมเสร็จ/รอส่งมอบ": 4,
      "รอส่งมอบ": 4,
      "ปิดเคส": 5,
      "ปิดเคส (รับคืนเรียบร้อย)": 5,
      "เสร็จสิ้น": 5,
      "รับคืนเรียบร้อย": 5,
      "ปฏิเสธเคลม": 6,
      "ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไข)": 6,
    }

    let finalStatusCode = updates.statusCode !== undefined ? Number(updates.statusCode) : undefined
    let finalStatus = updates.status ? String(updates.status).trim() : undefined

    if (finalStatusCode !== undefined && !finalStatus) {
      finalStatus = STATUS_MAP[finalStatusCode] || "รับแจ้ง"
    } else if (finalStatus && finalStatusCode === undefined) {
      finalStatusCode = STATUS_TO_CODE[finalStatus] || 1
      finalStatus = STATUS_MAP[finalStatusCode] || finalStatus
    } else if (finalStatusCode !== undefined && finalStatus) {
      // Keep them strictly aligned to canonical status
      finalStatus = STATUS_MAP[finalStatusCode] || finalStatus
    }

    const setFields: Record<string, unknown> = {
      ...updates,
      updatedAt: nowIso,
    }

    if (normalizedProblemDesc !== undefined) {
      setFields.problemDesc = normalizedProblemDesc
      setFields.description = normalizedProblemDesc
      setFields.symptoms = normalizedProblemDesc
    }
    if (normalizedSerialNo !== undefined) {
      setFields.serialNo = normalizedSerialNo
      setFields.serialNumber = normalizedSerialNo
    }
    if (normalizedVendor !== undefined) {
      setFields.vendor = normalizedVendor
      setFields.brand = normalizedVendor
    }
    if (normalizedDeviceType !== undefined) {
      setFields.deviceType = normalizedDeviceType
      setFields.group = normalizedDeviceType
    }
    if (normalizedDate !== undefined) {
      setFields.date = normalizedDate
      setFields.reportedDate = normalizedDate
    }
    if (normalizedDeadlineDate !== undefined) {
      setFields.deadlineDate = normalizedDeadlineDate
      setFields.slaExpiry = normalizedDeadlineDate
    }
    if (finalStatus !== undefined) {
      setFields.status = finalStatus
    }
    if (finalStatusCode !== undefined) {
      setFields.statusCode = finalStatusCode
    }
    if (updates.claimTitle !== undefined || updates.title !== undefined) {
      const rawT = updates.claimTitle !== undefined ? updates.claimTitle : updates.title
      const titleStr = String(rawT || "").trim()
      setFields.title = titleStr
      setFields.claimTitle = titleStr
    }
    if (updates.reporterName !== undefined || updates.reporter !== undefined) {
      const rep = String(updates.reporter !== undefined ? updates.reporter : updates.reporterName).trim()
      setFields.reporter = rep
      setFields.reporterName = rep
    }
    if (updates.assigneeName !== undefined || updates.assignee !== undefined) {
      const asn = String(updates.assignee !== undefined ? updates.assignee : updates.assigneeName).trim()
      setFields.assignee = asn
      setFields.assigneeName = asn
    }

    // Determine current record from disk or mongo to preserve and calculate duration
    const existingTickets = getPersistentTickets()
    let currentTicket = existingTickets.find(
      (t) => t.id === id || (id === "CLM-2026-001" && t.id === "1") || (id === "1" && t.id === "CLM-2026-001")
    )

    const dateToCalculate = (setFields.date as string) || currentTicket?.date || new Date().toLocaleDateString("th-TH")
    const statusForDuration = (setFields.status as string) || currentTicket?.status || "รับแจ้ง"
    const statusCodeForDuration = typeof setFields.statusCode === "number" ? setFields.statusCode : currentTicket?.statusCode || 1

    const duration = calculateCaseDuration({
      date: dateToCalculate,
      status: statusForDuration,
      statusCode: statusCodeForDuration,
    })

    setFields.ageDays = duration.text
    setFields.isOverdue = duration.isOverdue
    setFields.overdueText = duration.overdueText

    if (!setFields.deadlineDate || String(setFields.deadlineDate).includes("12 พ.ย. 2569")) {
      setFields.deadlineDate = calculateDueDate(dateToCalculate, 60).dueDateStr
    }

    // Phase 2: a close transition (statusCode 5 "ปิดเคส") notifies Stock-Flow via webhook.
    // "previousTicket" is read before the update so a case that is already closed does not re-fire,
    // and the record is also available when it only exists in MongoDB.
    // Capture pre-update state snapshot before modifications occur
    let previousTicket: TicketDocument | null = currentTicket ? { ...currentTicket } : null

    let updatedTicketDoc: TicketDocument | null = null

    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const mongoExisting = await db.collection<TicketDocument>("tickets").findOne({
            $or: [{ id }, { id: id === "CLM-2026-001" ? "1" : id === "1" ? "CLM-2026-001" : id }],
          })
          if (mongoExisting) {
            previousTicket = { ...mongoExisting }
            if (!currentTicket) {
              currentTicket = { ...mongoExisting }
            }
          }

          await db.collection("tickets").updateOne({ id }, { $set: setFields })

          // If status changed to closed ("ปิดเคส" / 5) or rejected ("ปฏิเสธเคลม" / 6), release equipment
          if (finalStatusCode === 5 || finalStatusCode === 6 || finalStatus === "ปิดเคส" || finalStatus === "ปฏิเสธเคลม") {
            const mongoTicket = await db.collection<TicketDocument>("tickets").findOne({ id })
            const sNo = (setFields.serialNo as string) || mongoTicket?.serialNo
            if (sNo && sNo !== "-") {
              await db.collection<EquipmentDocument>("equipments").updateOne(
                { serial: sNo },
                { $set: { status: "active", currentClaimId: undefined, updatedAt: nowIso } }
              )
            }
          }

          // Record Transaction Log
          await db.collection("transaction_logs").insertOne({
            id: `TX-CLAIM-UPD-${Date.now()}`,
            action: "CLAIM_UPDATED",
            targetType: "ticket",
            targetId: id,
            details: setFields,
            timestamp: nowIso,
          })

          const fetched = await db.collection<TicketDocument>("tickets").findOne({ id })
          if (fetched) {
            updatedTicketDoc = enrichTicket(fetched)
          }
        }
      } catch (dbErr) {
        console.warn("[Tickets API] MongoDB update failed:", dbErr)
      }
    }

    // Always update persistent disk store
    const diskTicket: TicketDocument = {
      ...(currentTicket || {
        id,
        title: String(setFields.title || ""),
        claimTitle: String(setFields.claimTitle || setFields.title || ""),
        problemDesc: String(setFields.problemDesc || ""),
        vendor: String(setFields.vendor || "Other"),
        model: String(setFields.model || "-"),
        serialNo: String(setFields.serialNo || "-"),
        status: String(setFields.status || "รับแจ้ง"),
        statusCode: Number(setFields.statusCode || 1),
        date: dateToCalculate,
        ageDays: duration.text,
        createdAt: nowIso,
      }),
      ...setFields,
    } as TicketDocument

    savePersistentTicket(diskTicket)

    const finalEnrichedTicket = updatedTicketDoc || enrichTicket(diskTicket)

    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "update",
      data: finalEnrichedTicket,
      timestamp: nowIso,
    })

    // Instantly invalidate dashboard cache and broadcast fresh metrics
    await invalidateDashboardMetrics(true)

    // Phase 2: notify Stock-Flow after the response is sent ("after" keeps the serverless invocation
    // alive) so a Stock-Flow outage can never break or delay a CAIM case update.
    const isClosedNow =
      finalStatusCode === 5 ||
      finalStatusCode === 6 ||
      finalStatus === "ปิดเคส" ||
      finalStatus === "ปฏิเสธเคลม" ||
      String(finalStatus || "").includes("ปฏิเสธเคลม")
    const wasClosedBefore =
      previousTicket?.statusCode === 5 ||
      previousTicket?.statusCode === 6 ||
      previousTicket?.status === "ปิดเคส" ||
      previousTicket?.status === "ปฏิเสธเคลม" ||
      String(previousTicket?.status || "").includes("ปฏิเสธเคลม")
    const repairResultChanged =
      (setFields.repairOutcome !== undefined && setFields.repairOutcome !== previousTicket?.repairOutcome) ||
      (setFields.repairResult !== undefined && setFields.repairResult !== previousTicket?.repairResult) ||
      (finalStatusCode === 6 && previousTicket?.statusCode !== 6)

    if (isClosedNow && (!wasClosedBefore || repairResultChanged)) {
      const isRejectedOutcome = finalStatusCode === 6 || String(finalStatus || "").includes("ปฏิเสธเคลม")
      const webhookTicket: TicketDocument = {
        ...finalEnrichedTicket,
        closedAt: nowIso,
        repairOutcome: (finalEnrichedTicket.repairOutcome as CaimRepairOutcome) || (isRejectedOutcome ? "rejected" : undefined),
        repairResult: finalEnrichedTicket.repairResult || (isRejectedOutcome ? "ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไขการรับประกัน)" : finalEnrichedTicket.repairResult),
      }
      after(async () => {
        try {
          await dispatchStockFlowWebhook(webhookTicket, { closedAt: nowIso })
        } catch (webhookErr) {
          console.warn("[StockFlow Webhook] dispatch error:", webhookErr)
        }
      })
    }

    // Status Transition Detection & Direct SMTP Email Dispatch (Trigger B)
    const prevStatusCode = Number(previousTicket?.statusCode) || (previousTicket?.status ? STATUS_TO_CODE[previousTicket.status] : 1)
    const newStatusCode = Number(finalEnrichedTicket.statusCode) || (finalEnrichedTicket.status ? STATUS_TO_CODE[finalEnrichedTicket.status] : 1)
    const prevStatus = previousTicket?.status || STATUS_MAP[prevStatusCode] || "รับแจ้ง"
    const newStatus = finalEnrichedTicket.status || STATUS_MAP[newStatusCode] || prevStatus

    const isStatusChanged =
      prevStatus !== newStatus ||
      prevStatusCode !== newStatusCode ||
      (updates.statusCode !== undefined && Number(updates.statusCode) !== previousTicket?.statusCode) ||
      (updates.status !== undefined && updates.status !== previousTicket?.status)

    // Extract client-side SMTP settings passed from localStorage if available
    const clientSmtpSettings = (updates.smtpSettings as Record<string, unknown> | undefined) || (() => {
      const headerVal = request.headers.get("x-smtp-settings")
      if (headerVal) {
        try {
          return JSON.parse(decodeURIComponent(headerVal))
        } catch {
          return null
        }
      }
      return null
    })()

    let emailResult: { success: boolean; messageId?: string; error?: string } | null = null

    if (isStatusChanged) {
      console.log(`[Tickets API] Status transition detected for ${id}: '${prevStatus}' (Stage ${prevStatusCode}) -> '${newStatus}' (Stage ${newStatusCode})`)
      emailResult = await notifyClaimUpdated({
        previousTicket: previousTicket
          ? { ...previousTicket, status: prevStatus, statusCode: prevStatusCode }
          : null,
        updatedTicket: finalEnrichedTicket,
        modifiedFields: setFields,
        smtpSettings: clientSmtpSettings,
      })
    }

    const emailDispatched = emailResult ? emailResult.success : false
    const emailError = emailResult?.error
    const emailMessageId = emailResult?.messageId

    let responseMessage = `อัปเดตข้อมูลเคส ${id} ในฐานข้อมูลเรียบร้อยแล้ว`
    if (isStatusChanged) {
      if (emailDispatched) {
        responseMessage = `อัปเดตสถานะเคส ${id} เป็น "${newStatus}" เรียบร้อยแล้ว พร้อมส่งอีเมลแจ้งเตือน`
      } else if (emailError) {
        responseMessage = `อัปเดตสถานะเคส ${id} เป็น "${newStatus}" สำเร็จ แต่การส่งอีเมลขัดข้อง: ${emailError}`
      } else {
        responseMessage = `อัปเดตสถานะเคส ${id} เป็น "${newStatus}" เรียบร้อยแล้ว`
      }
    }

    return NextResponse.json(
      {
        success: true,
        ticket: finalEnrichedTicket,
        isStatusChanged,
        emailDispatched,
        emailMessageId,
        emailError,
        message: responseMessage,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update ticket"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request)
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get("id")

    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = body.id
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ticket id parameter" },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    // 1. Delete from MongoDB Atlas & update equipment status
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const currentTicket = await db.collection<TicketDocument>("tickets").findOne({ id })
          if (currentTicket && currentTicket.serialNo) {
            // Free equipment
            await db.collection<EquipmentDocument>("equipments").updateOne(
              { serial: currentTicket.serialNo },
              { $set: { status: "active", currentClaimId: undefined, updatedAt: nowIso } }
            )
          }

          await db.collection("tickets").deleteOne({ id })

          // Record Transaction Log
          await db.collection("transaction_logs").insertOne({
            id: `TX-CLAIM-DEL-${Date.now()}`,
            action: "CLAIM_DELETED",
            targetType: "ticket",
            targetId: id,
            details: { deletedAt: nowIso },
            timestamp: nowIso,
          })
        }
      } catch (dbErr) {
        console.warn("[Tickets API] MongoDB deletion warning:", dbErr)
      }
    }

    // 2. Delete permanently from persistent disk store
    deletePersistentTicket(id)

    // 3. Broadcast real-time deletion event across all active clients
    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "delete",
      data: { id },
      timestamp: nowIso,
    })

    // Instantly invalidate dashboard cache and broadcast fresh metrics
    await invalidateDashboardMetrics(true)

    return NextResponse.json(
      {
        success: true,
        id,
        message: `ลบเคสแจ้งเคลม ${id} ออกจากฐานข้อมูลเรียบร้อยแล้ว`,
        timestamp: nowIso,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete ticket record"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
