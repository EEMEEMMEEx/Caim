import { NextRequest, NextResponse, after } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { TicketDocument, EquipmentDocument, StationDocument } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  getPersistentTickets,
  savePersistentTicket,
  deletePersistentTicket,
  getPersistentDeletedTicketIds,
} from "@/lib/storage/serverTicketStorage"
import { calculateCaseDuration, calculateDueDate } from "@/lib/utils/caseDuration"
import { dispatchStockFlowWebhook } from "@/lib/webhooks/stockFlowWebhook"

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.title) {
      return NextResponse.json(
        { success: false, error: "Missing required ticket information" },
        { status: 400 }
      )
    }

    const ticketId = body.id || `CLM-${Date.now().toString().slice(-4)}`
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
          title: body.title,
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
      title: body.title,
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
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
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

    // Normalize field names (support both naming conventions: problemDesc/description, serialNo/serialNumber)
    const normalizedProblemDesc = updates.problemDesc !== undefined ? updates.problemDesc : updates.description
    const normalizedSerialNo = updates.serialNo !== undefined ? String(updates.serialNo).trim() : updates.serialNumber ? String(updates.serialNumber).trim() : undefined

    // Normalize status and statusCode
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
      "ส่งศูนย์": 2,
      "รออะไหล่": 3,
      "ซ่อมเสร็จ": 4,
      "ปิดเคส": 5,
      "ปฏิเสธเคลม": 6,
    }

    let finalStatusCode = updates.statusCode !== undefined ? Number(updates.statusCode) : undefined
    let finalStatus = updates.status ? String(updates.status).trim() : undefined

    if (finalStatusCode !== undefined && !finalStatus) {
      finalStatus = STATUS_MAP[finalStatusCode] || "รับแจ้ง"
    } else if (finalStatus && finalStatusCode === undefined) {
      finalStatusCode = STATUS_TO_CODE[finalStatus] || 1
    } else if (finalStatusCode !== undefined && finalStatus) {
      // Keep them aligned
      finalStatus = STATUS_MAP[finalStatusCode] || finalStatus
    }

    const setFields: Record<string, unknown> = {
      ...updates,
      updatedAt: nowIso,
    }

    if (normalizedProblemDesc !== undefined) {
      setFields.problemDesc = normalizedProblemDesc
    }
    if (normalizedSerialNo !== undefined) {
      setFields.serialNo = normalizedSerialNo
    }
    if (finalStatus !== undefined) {
      setFields.status = finalStatus
    }
    if (finalStatusCode !== undefined) {
      setFields.statusCode = finalStatusCode
    }
    if (updates.reporterName !== undefined && updates.reporter === undefined) {
      setFields.reporter = updates.reporterName
    }
    if (updates.assigneeName !== undefined && updates.assignee === undefined) {
      setFields.assignee = updates.assigneeName
    }
    if (updates.reporter !== undefined && updates.reporterName === undefined) {
      setFields.reporterName = updates.reporter
    }
    if (updates.assignee !== undefined && updates.assigneeName === undefined) {
      setFields.assigneeName = updates.assignee
    }

    // Determine current record from disk or mongo to preserve and calculate duration
    const existingTickets = getPersistentTickets()
    const currentTicket = existingTickets.find((t) => t.id === id)

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
    const isClosedNow = finalStatusCode === 5 || finalStatus === "ปิดเคส"
    let previousTicket: TicketDocument | null = currentTicket || null

    let updatedTicketDoc: TicketDocument | null = null

    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          if (isClosedNow) {
            previousTicket = (await db.collection<TicketDocument>("tickets").findOne({ id })) || previousTicket
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
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      data: {},
      timestamp: nowIso,
    })

    // Phase 2: notify Stock-Flow after the response is sent ("after" keeps the serverless invocation
    // alive) so a Stock-Flow outage can never break or delay a CAIM case update.
    const wasClosedBefore = previousTicket?.statusCode === 5 || previousTicket?.status === "ปิดเคส"
    const repairResultChanged =
      (setFields.repairOutcome !== undefined && setFields.repairOutcome !== previousTicket?.repairOutcome) ||
      (setFields.repairResult !== undefined && setFields.repairResult !== previousTicket?.repairResult)

    if (isClosedNow && (!wasClosedBefore || repairResultChanged)) {
      const webhookTicket: TicketDocument = { ...finalEnrichedTicket, closedAt: nowIso }
      after(async () => {
        try {
          await dispatchStockFlowWebhook(webhookTicket, { closedAt: nowIso })
        } catch (webhookErr) {
          console.warn("[StockFlow Webhook] dispatch error:", webhookErr)
        }
      })
    }

    return NextResponse.json(
      {
        success: true,
        ticket: finalEnrichedTicket,
        message: `อัปเดตข้อมูลเคส ${id} ในฐานข้อมูลเรียบร้อยแล้ว`,
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
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      data: {},
      timestamp: nowIso,
    })

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
