import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { EquipmentDocument } from "@/types/database"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { NO_CACHE_HEADERS, STATIC_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  getPersistentEquipments,
  savePersistentEquipment,
  deletePersistentEquipment,
} from "@/lib/storage/serverEquipmentStorage"

export const dynamic = "force-dynamic"
export const revalidate = 60
export const maxDuration = 10

const deletedSerials = new Set<string>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serial = searchParams.get("serial")?.trim()
    const search = searchParams.get("search")?.toLowerCase().trim()
    const vendor = searchParams.get("vendor")
    const category = searchParams.get("category")
    const status = searchParams.get("status")

    const persistentCustom = getPersistentEquipments()

    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const collection = db.collection<EquipmentDocument>("equipments")

          if (serial) {
            const item = await collection.findOne({
              serial: { $regex: new RegExp(`^${serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            })
            if (item) {
              return NextResponse.json(
                { success: true, equipment: item, source: "mongodb" },
                { headers: NO_CACHE_HEADERS }
              )
            }
          }

          const query: Record<string, unknown> = {}
          if (vendor && vendor !== "all") query.vendor = vendor
          if (category && category !== "all") query.category = category
          if (status && status !== "all") query.status = status

          if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            query.$or = [
              { serial: { $regex: escaped, $options: "i" } },
              { vendor: { $regex: escaped, $options: "i" } },
              { model: { $regex: escaped, $options: "i" } },
              { category: { $regex: escaped, $options: "i" } },
              { name: { $regex: escaped, $options: "i" } },
              { description: { $regex: escaped, $options: "i" } },
              { stationName: { $regex: escaped, $options: "i" } },
            ]
          }

          // Always sort with newest first (createdAt / updatedAt descending)
          const mongoEquipments = await collection
            .find(query)
            .sort({ createdAt: -1, updatedAt: -1, _id: -1 })
            .toArray()

          // Sync any local persistent items to mongo if missing
          if (persistentCustom.length > 0) {
            for (const p of persistentCustom) {
              if (!mongoEquipments.some((m) => m.serial.toUpperCase() === p.serial.toUpperCase())) {
                await collection.updateOne({ serial: p.serial }, { $set: p }, { upsert: true }).catch(() => {})
                mongoEquipments.unshift(p as unknown as typeof mongoEquipments[number])
              }
            }
          }

          return NextResponse.json(
            {
              success: true,
              source: "mongodb",
              total: mongoEquipments.length,
              equipments: mongoEquipments,
            },
            {
              headers: STATIC_CACHE_HEADERS,
            }
          )
        }
      } catch (dbErr) {
        console.warn("[Equipments API] MongoDB query failed, using persistent disk store:", dbErr)
      }
    }

    // Fallback: persistent disk store (strictly dynamic - zero mock data)
    let list = persistentCustom.filter((e) => !deletedSerials.has(e.serial.toUpperCase()))

    if (serial) {
      const found = list.find((e) => e.serial.toUpperCase() === serial.toUpperCase())
      return NextResponse.json(
        { success: true, equipment: found || null, source: "persistent-local" },
        { headers: NO_CACHE_HEADERS }
      )
    }

    if (vendor && vendor !== "all") list = list.filter((e) => e.vendor === vendor)
    if (category && category !== "all") list = list.filter((e) => e.category === category)
    if (status && status !== "all") list = list.filter((e) => e.status === status)
    if (search) {
      list = list.filter(
        (e) =>
          e.serial.toLowerCase().includes(search) ||
          e.vendor.toLowerCase().includes(search) ||
          e.model.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search) ||
          (e.name && e.name.toLowerCase().includes(search)) ||
          (e.description && e.description.toLowerCase().includes(search))
      )
    }

    return NextResponse.json(
      {
        success: true,
        source: "persistent-local",
        total: list.length,
        equipments: list,
      },
      {
        headers: STATIC_CACHE_HEADERS,
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch equipments"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const serial = String(body.serial || "").trim()
    const vendor = String(body.vendor || "").trim()
    const model = String(body.model || "-").trim()
    const category = String(body.category || "อื่นๆ").trim()
    const name = body.name ? String(body.name).trim() : undefined
    const description = body.description ? String(body.description).trim() : undefined
    const stationId = body.stationId ? String(body.stationId).trim() : undefined
    const stationName = body.stationName ? String(body.stationName).trim() : undefined

    if (!serial) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุหมายเลขอุปกรณ์ (Serial Number)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุยี่ห้อ (Vendor)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const persistentCustom = getPersistentEquipments()
    const isDuplicateLocal = persistentCustom.some(
      (p) => p.serial.toUpperCase() === serial.toUpperCase()
    )

    const nowIso = new Date().toISOString()
    const equipmentDoc: EquipmentDocument = {
      serial,
      vendor,
      model,
      category,
      name,
      description,
      stationId,
      stationName,
      status: body.status || "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    let savedToMongo = false
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const col = db.collection<EquipmentDocument>("equipments")

          // Duplicate check: ensure serial is unique in MongoDB
          const existing = await col.findOne({
            serial: { $regex: new RegExp(`^${serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })

          if (existing) {
            return NextResponse.json(
              {
                success: false,
                error: `หมายเลขอุปกรณ์ (Serial Number) "${serial}" มีอยู่ในฐานข้อมูลแล้ว กรุณาตรวจสอบหรือใช้เมนูแก้ไขข้อมูล`,
              },
              { status: 409, headers: NO_CACHE_HEADERS }
            )
          }

          // Mandatory database insert
          await col.insertOne(equipmentDoc)

          // Keep assets collection synced
          await db.collection("assets").updateOne(
            { serial: { $regex: new RegExp(`^${serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: equipmentDoc },
            { upsert: true }
          )

          // Write transactional audit log
          await db.collection("transaction_logs").insertOne({
            id: `TX-EQUIP-${Date.now()}`,
            action: "EQUIPMENT_CREATED",
            targetType: "equipment",
            targetId: serial,
            details: { vendor, model, category, serial, stationId },
            timestamp: nowIso,
          })

          savedToMongo = true
        }
      } catch (dbErr) {
        console.warn("[Equipments API] Could not write to MongoDB Atlas, saving to disk store:", dbErr)
      }
    }

    if (isDuplicateLocal && !savedToMongo) {
      return NextResponse.json(
        {
          success: false,
          error: `หมายเลขอุปกรณ์ (Serial Number) "${serial}" มีอยู่ในระบบแล้ว กรุณาตรวจสอบหรือใช้เมนูแก้ไขข้อมูล`,
        },
        { status: 409, headers: NO_CACHE_HEADERS }
      )
    }

    // Persist to disk store so it survives any server restart / worker recycle
    savePersistentEquipment(equipmentDoc)
    deletedSerials.delete(serial.toUpperCase())

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.EQUIPMENTS_CHANGED, {
      type: "equipment",
      action: "create",
      data: equipmentDoc,
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        equipment: equipmentDoc,
        savedTo: savedToMongo ? "mongodb" : "persistent-local",
        message: "บันทึกข้อมูลอุปกรณ์สำเร็จแล้ว",
      },
      {
        status: 201,
        headers: NO_CACHE_HEADERS,
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save equipment"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { serial, ...updates } = body

    if (!serial) {
      return NextResponse.json(
        { success: false, error: "Missing equipment serial number for update" },
        { status: 400 }
      )
    }

    const trimmedSerial = String(serial).trim()
    const nowIso = new Date().toISOString()
    const setFields = { ...updates, updatedAt: nowIso }

    let updatedInMongo = false
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: { $regex: new RegExp(`^${trimmedSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: setFields }
          )
          await db.collection("assets").updateOne(
            { serial: { $regex: new RegExp(`^${trimmedSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: setFields }
          )

          // Write transaction log
          await db.collection("transaction_logs").insertOne({
            id: `TX-EQUIP-UPD-${Date.now()}`,
            action: "EQUIPMENT_UPDATED",
            targetType: "equipment",
            targetId: trimmedSerial,
            details: updates,
            timestamp: nowIso,
          })

          updatedInMongo = true
        }
      } catch (dbErr) {
        console.warn("[Equipments API] Could not update MongoDB Atlas:", dbErr)
      }
    }

    // Update in persistent local disk store
    const persistent = getPersistentEquipments()
    const existingP = persistent.find((p) => p.serial.toUpperCase() === trimmedSerial.toUpperCase())
    if (existingP) {
      savePersistentEquipment({ ...existingP, ...setFields })
    }

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.EQUIPMENTS_CHANGED, {
      type: "equipment",
      action: "update",
      data: { serial: trimmedSerial, updates: setFields },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        serial: trimmedSerial,
        savedTo: updatedInMongo ? "mongodb" : "persistent-local",
        message: `อัปเดตข้อมูลอุปกรณ์ ${trimmedSerial} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update equipment"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let serial = searchParams.get("serial")
    if (!serial) {
      const body = await request.json().catch(() => ({}))
      serial = body.serial
    }

    if (!serial) {
      return NextResponse.json(
        { success: false, error: "Serial number is required for deletion" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const trimmedSerial = String(serial).trim()
    const nowIso = new Date().toISOString()
    deletedSerials.add(trimmedSerial.toUpperCase())

    let deletedFromMongo = false
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          await db.collection("equipments").deleteOne({
            serial: { $regex: new RegExp(`^${trimmedSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })
          await db.collection("assets").deleteOne({
            serial: { $regex: new RegExp(`^${trimmedSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })

          // Write transaction log
          await db.collection("transaction_logs").insertOne({
            id: `TX-EQUIP-DEL-${Date.now()}`,
            action: "EQUIPMENT_DELETED",
            targetType: "equipment",
            targetId: trimmedSerial,
            details: { deletedAt: nowIso },
            timestamp: nowIso,
          })

          deletedFromMongo = true
        }
      } catch (dbErr) {
        console.warn("[Equipments API] Could not delete from MongoDB Atlas:", dbErr)
      }
    }

    // Delete from persistent local disk store
    deletePersistentEquipment(trimmedSerial)

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.EQUIPMENTS_CHANGED, {
      type: "equipment",
      action: "delete",
      data: { serial: trimmedSerial },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        serial: trimmedSerial,
        deletedFrom: deletedFromMongo ? "mongodb" : "persistent-local",
        message: `ลบอุปกรณ์ ${trimmedSerial} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete equipment"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
