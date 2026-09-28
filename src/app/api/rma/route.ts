import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { RmaDocument, EquipmentDocument, TicketDocument } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  getPersistentRma,
  savePersistentRma,
  deletePersistentRma,
  getPersistentDeletedRmaIds,
} from "@/lib/storage/serverRmaStorage"
import { calculateRmaMetrics } from "@/lib/utils/rmaDuration"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function enrichRma(doc: RmaDocument): RmaDocument {
  const metrics = calculateRmaMetrics(doc)
  return {
    ...doc,
    totalDays: metrics.total.text,
    statusBadge: metrics.total.statusBadge,
    statusBadgeText: metrics.total.statusBadgeText,
    penaltyDays: metrics.penalty.penaltyDaysText,
    penaltyStandard: metrics.penalty.penaltyStandardText,
    isOverduePenalty: metrics.penalty.isOverdue,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const persistentDeletedIds = getPersistentDeletedRmaIds()
    const deletedSet = new Set(persistentDeletedIds)

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<RmaDocument>("rma")
        if (id) {
          if (deletedSet.has(id)) {
            return NextResponse.json(
              { success: true, rma: null, isDeleted: true },
              { headers: NO_CACHE_HEADERS }
            )
          }
          const item = await collection.findOne({ id })
          return NextResponse.json(
            { success: true, rma: item ? enrichRma(item) : null },
            { headers: NO_CACHE_HEADERS }
          )
        }
        const list = await collection.find({}).sort({ createdAt: -1 }).toArray()
        const filteredList = list.filter((r) => !deletedSet.has(r.id)).map(enrichRma)
        return NextResponse.json(
          {
            success: true,
            source: "mongodb",
            items: filteredList,
            deletedIds: persistentDeletedIds,
          },
          { headers: NO_CACHE_HEADERS }
        )
      }
    }

    const diskRma = getPersistentRma()
    if (id) {
      if (deletedSet.has(id)) {
        return NextResponse.json(
          { success: true, rma: null, isDeleted: true },
          { headers: NO_CACHE_HEADERS }
        )
      }
      const found = diskRma.find((r) => r.id === id)
      return NextResponse.json(
        { success: true, rma: found ? enrichRma(found) : null },
        { headers: NO_CACHE_HEADERS }
      )
    }

    const enrichedDisk = diskRma.map(enrichRma)
    return NextResponse.json(
      {
        success: true,
        source: "persistent-disk",
        items: enrichedDisk,
        deletedIds: persistentDeletedIds,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch RMA items"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.rmaNo) {
      return NextResponse.json(
        { success: false, error: "Missing required RMA data (rmaNo)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const rmaId = body.id || `RMA-${Date.now()}`
    const serialNo = String(body.serialNo || "").trim()
    const ticketId = body.ticketId ? String(body.ticketId).trim() : undefined
    const nowIso = new Date().toISOString()

    const rmaOpenDate = body.openDate || new Date().toLocaleDateString("th-TH")
    const metrics = calculateRmaMetrics({
      openDate: rmaOpenDate,
      createdAt: nowIso,
      currentStageNumber: body.currentStageNumber || 1,
      status: body.status,
      statusBadge: body.statusBadge || "in_progress",
      stageWaitDays: body.stageWaitDays,
      penaltyDays: body.penaltyDays,
      stageHistory: body.stageHistory,
    })

    const newRma: RmaDocument = {
      id: rmaId,
      rmaNo: body.rmaNo,
      caseName: body.caseName || "",
      ticketId,
      serialNo,
      vendor: body.vendor || "N/A",
      model: body.model || "-",
      destination: body.destination || "ต่างประเทศ",
      status: body.status || "กำลังดำเนินการ",
      statusBadge: metrics.total.statusBadge,
      statusBadgeText: metrics.total.statusBadgeText,
      currentStageNumber: body.currentStageNumber || 1,
      totalStages: body.totalStages || 8,
      currentStageName: body.currentStageName || "1. ระบบใบ RMA",
      stageWaitDays: body.stageWaitDays || "ค้างมา 0 วัน",
      openDate: rmaOpenDate,
      sentDate: body.sentDate || new Date().toLocaleDateString("th-TH"),
      trackNo: body.trackNo || "-",
      carrier: body.carrier || "-",
      notes: body.notes || body.remarks || "",
      remarks: body.remarks || body.notes || "",
      totalDays: metrics.total.text,
      penaltyDays: metrics.penalty.penaltyDaysText,
      penaltyStandard: metrics.penalty.penaltyStandardText,
      isOverduePenalty: metrics.penalty.isOverdue,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    // Always persist to server disk store
    savePersistentRma(newRma)

    let savedToMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        // 1. Insert RMA record
        await db.collection<RmaDocument>("rma").insertOne(newRma)

        // 2. Link with ticket if ticketId provided
        if (ticketId) {
          await db.collection<TicketDocument>("tickets").updateOne(
            { id: ticketId },
            { $set: { rmaId, updatedAt: nowIso } }
          )
        }

        // 3. Update Equipment status to in_rma
        if (serialNo) {
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: { $regex: new RegExp(`^${serialNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: { status: "in_rma", currentRmaId: rmaId, updatedAt: nowIso } }
          )
        }

        // 4. Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-DISPATCH-${Date.now()}`,
          action: "RMA_DISPATCHED",
          targetType: "rma",
          targetId: rmaId,
          details: {
            rmaNo: newRma.rmaNo,
            ticketId,
            serialNo,
            vendor: newRma.vendor,
            destination: newRma.destination,
          },
          timestamp: nowIso,
        })

        savedToMongo = true
      }
    }

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "create",
      data: newRma,
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        rma: newRma,
        savedTo: savedToMongo ? "mongodb" : "persistent-disk",
        message: "บันทึกใบส่งเคลมต่างประเทศและประวัติการส่งซ่อมเรียบร้อยแล้ว",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save RMA"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing RMA id for update" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const nowIso = new Date().toISOString()
    const setFields = { ...updates, updatedAt: nowIso }

    // Update persistent disk
    const diskItems = getPersistentRma()
    const foundItem = diskItems.find((r) => r.id === id)
    if (foundItem) {
      savePersistentRma({ ...foundItem, ...setFields })
    }

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("rma").updateOne({ id }, { $set: setFields })

        // If returned or completed, update equipment status
        if (updates.statusBadge === "returned" || updates.status === "เสร็จสิ้น" || updates.status === "ของกลับถึงแล้ว") {
          const currentRma = await db.collection<RmaDocument>("rma").findOne({ id })
          if (currentRma && currentRma.serialNo) {
            await db.collection<EquipmentDocument>("equipments").updateOne(
              { serial: currentRma.serialNo },
              { $set: { status: "active", currentRmaId: undefined, updatedAt: nowIso } }
            )
          }
        }

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-UPD-${Date.now()}`,
          action: "RMA_UPDATED",
          targetType: "rma",
          targetId: id,
          details: updates,
          timestamp: nowIso,
        })
      }
    }

    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "update",
      data: { id, updates: setFields },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        message: `อัปเดตข้อมูลใบส่งซ่อมต่างประเทศ ${id} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update RMA record"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
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
        { success: false, error: "Missing RMA id parameter" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const nowIso = new Date().toISOString()

    // 1. Delete from persistent disk store
    deletePersistentRma(id)

    // 2. Delete from MongoDB Atlas if configured
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const currentRma = await db.collection<RmaDocument>("rma").findOne({ id })
        if (currentRma && currentRma.serialNo) {
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: currentRma.serialNo },
            { $set: { status: "active", currentRmaId: undefined, updatedAt: nowIso } }
          )
        }

        await db.collection("rma").deleteOne({ id })

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-DEL-${Date.now()}`,
          action: "RMA_DELETED",
          targetType: "rma",
          targetId: id,
          details: { deletedAt: nowIso },
          timestamp: nowIso,
        })
      }
    }

    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "delete",
      data: { id },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        id,
        message: `RMA record ${id} has been permanently deleted from database.`,
        timestamp: nowIso,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete RMA record"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
