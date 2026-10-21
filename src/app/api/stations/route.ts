import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { StationDocument } from "@/types/database"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { NO_CACHE_HEADERS, STATIC_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 60
export const maxDuration = 10

// Runtime in-memory fallback store (strictly dynamic - zero mock data)
const fallbackStations: StationDocument[] = []
const deletedStationIds = new Set<string>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const search = searchParams.get("search")?.toLowerCase().trim()
    const province = searchParams.get("province")
    const district = searchParams.get("district")
    const height = searchParams.get("height")
    const area = searchParams.get("area")
    const siteType = searchParams.get("siteType")

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<StationDocument>("stations")

        if (id) {
          const station = await collection.findOne({ id })
          if (station) {
            return NextResponse.json(
              { success: true, station, source: "mongodb" },
              { headers: STATIC_CACHE_HEADERS }
            )
          }
        }

        const query: Record<string, unknown> = {}
        if (province && province !== "all") query.province = province
        if (district && district !== "all") query.district = district
        if (area && area !== "all") query.area = area
        if (siteType && siteType !== "all") query.siteType = siteType
        if (height && height !== "all") query.height = Number(height)

        if (search) {
          const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          query.$or = [
            { name: { $regex: escaped, $options: "i" } },
            { code: { $regex: escaped, $options: "i" } },
            { province: { $regex: escaped, $options: "i" } },
            { district: { $regex: escaped, $options: "i" } },
            { subdistrict: { $regex: escaped, $options: "i" } },
            { category: { $regex: escaped, $options: "i" } },
          ]
        }

        const stations = await collection.find(query).sort({ id: 1 }).toArray()
        return NextResponse.json(
          {
            success: true,
            source: "mongodb",
            total: stations.length,
            stations,
          },
          { headers: STATIC_CACHE_HEADERS }
        )
      }
    }

    // Fallback if DB is unavailable
    let list = fallbackStations.filter((s) => !deletedStationIds.has(s.id))
    if (id) {
      const found = list.find((s) => s.id === id)
      return NextResponse.json(
        { success: true, station: found || null, source: "local" },
        { headers: STATIC_CACHE_HEADERS }
      )
    }

    if (province && province !== "all") list = list.filter((s) => s.province === province)
    if (district && district !== "all") list = list.filter((s) => s.district === district)
    if (area && area !== "all") list = list.filter((s) => s.area === area)
    if (siteType && siteType !== "all") list = list.filter((s) => s.siteType === siteType)
    if (height && height !== "all") list = list.filter((s) => s.height === Number(height))
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.code.toLowerCase().includes(search) ||
          s.province.toLowerCase().includes(search) ||
          s.district.toLowerCase().includes(search)
      )
    }

    return NextResponse.json(
      {
        success: true,
        source: "local",
        total: list.length,
        stations: list,
      },
      { headers: STATIC_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stations"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || !body.name) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อสถานี (Station Name)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const id = body.id || `st-custom-${Date.now()}`
    const code = body.code || `ST-${String(Math.floor(Math.random() * 900 + 100))}`
    const nowIso = new Date().toISOString()

    const newStation: StationDocument = {
      id,
      code,
      name: String(body.name).trim(),
      subdistrict: String(body.subdistrict || "").trim(),
      district: String(body.district || "").trim(),
      province: String(body.province || "").trim(),
      area: String(body.area || "ภาคกลาง").trim(),
      zone: String(body.zone || "ส่วนกลาง").trim(),
      siteType: String(body.siteType || "เสาสัญญาณ").trim(),
      contractor: String(body.contractor || "FORTH").trim(),
      towerType: String(body.towerType || "Self-Support").trim(),
      height: Number(body.height) || 60,
      seaLevel: Number(body.seaLevel) || 0,
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
      category: String(body.category || "เสาสัญญาณ").trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    let savedToMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<StationDocument>("stations")
        await collection.insertOne(newStation)

        // Write transaction log
        await db.collection("transaction_logs").insertOne({
          id: `TX-STATION-${Date.now()}`,
          action: "STATION_CREATED",
          targetType: "station",
          targetId: id,
          details: { name: newStation.name, code: newStation.code, province: newStation.province },
          timestamp: nowIso,
        })

        savedToMongo = true
      }
    }

    // Update fallback memory
    fallbackStations.unshift(newStation)
    deletedStationIds.delete(id)

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.STATIONS_CHANGED, {
      type: "station",
      action: "create",
      data: newStation,
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        station: newStation,
        savedTo: savedToMongo ? "mongodb" : "local-memory",
        message: "เพิ่มข้อมูลสถานีเรียบร้อยแล้ว",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create station"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing station id for update" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const nowIso = new Date().toISOString()
    const setFields = { ...updates, updatedAt: nowIso }

    let updatedInMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<StationDocument>("stations")
        await collection.updateOne({ id }, { $set: setFields })

        // Write transaction log
        await db.collection("transaction_logs").insertOne({
          id: `TX-STATION-UPD-${Date.now()}`,
          action: "STATION_UPDATED",
          targetType: "station",
          targetId: id,
          details: updates,
          timestamp: nowIso,
        })
        updatedInMongo = true
      }
    }

    const idx = fallbackStations.findIndex((s) => s.id === id)
    if (idx >= 0) {
      fallbackStations[idx] = { ...fallbackStations[idx], ...setFields }
    }

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.STATIONS_CHANGED, {
      type: "station",
      action: "update",
      data: { id, updates: setFields },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        id,
        savedTo: updatedInMongo ? "mongodb" : "local-memory",
        message: `อัปเดตข้อมูลสถานี ${id} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update station"
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
        { success: false, error: "Missing station id for deletion" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const nowIso = new Date().toISOString()
    deletedStationIds.add(id)

    let deletedFromMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("stations").deleteOne({ id })

        // Write transaction log
        await db.collection("transaction_logs").insertOne({
          id: `TX-STATION-DEL-${Date.now()}`,
          action: "STATION_DELETED",
          targetType: "station",
          targetId: id,
          details: { deletedAt: nowIso },
          timestamp: nowIso,
        })
        deletedFromMongo = true
      }
    }

    const idx = fallbackStations.findIndex((s) => s.id === id)
    if (idx >= 0) {
      fallbackStations.splice(idx, 1)
    }

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.STATIONS_CHANGED, {
      type: "station",
      action: "delete",
      data: { id },
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        id,
        deletedFrom: deletedFromMongo ? "mongodb" : "local-memory",
        message: `ลบข้อมูลสถานี ${id} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete station"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
