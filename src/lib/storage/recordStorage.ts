// Storage & API persistence helper for CAIM system (Equipments, Stations, Tickets, RMA)
import type { StageHistoryRecord, PermitTrackingInfo } from "@/types/database"

export const STORAGE_KEYS = {
  DELETED_TICKETS: "forth_caim_deleted_ticket_ids_v1",
  DELETED_RMA: "forth_caim_deleted_rma_ids_v1",
  CUSTOM_TICKETS: "forth_caim_custom_tickets_v1",
  CUSTOM_ASSETS: "forth_caim_custom_assets_v1",
  CUSTOM_STATIONS: "forth_caim_custom_stations_v1",
}

export interface StoredTicket {
  id: string
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string
  status: string
  statusCode: number
  date: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  stationId?: string
  station?: string
  province?: string
  district?: string
  subdistrict?: string
}

export interface StoredAsset {
  serial: string
  vendor: string
  model: string
  category: string
  name?: string
  description?: string
  stationId?: string
  stationName?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface StoredStation {
  id: string
  code: string
  name: string
  subdistrict: string
  district: string
  province: string
  area: string
  zone: string
  siteType: string
  contractor: string
  towerType: string
  height: number
  seaLevel: number
  lat: number
  lng: number
  category: string
  createdAt?: string
  updatedAt?: string
}

export interface StoredRma {
  id: string
  rmaNo: string
  caseName?: string
  ticketId?: string
  serialNo: string
  vendor: string
  model: string
  destination?: string
  status?: string
  statusBadge?: "in_progress" | "returned"
  statusBadgeText?: string
  currentStageNumber?: number
  totalStages?: number
  currentStageName?: string
  stageWaitDays?: string
  currentStageStartedAt?: string
  currentStageCompletedAt?: string
  openDate?: string
  sentDate?: string
  trackNo?: string
  carrier?: string
  notes?: string
  remarks?: string
  totalDays?: string
  penaltyDays?: string
  penaltyStandard?: string
  isOverduePenalty?: boolean
  stageHistory?: StageHistoryRecord[]
  permitInfo?: PermitTrackingInfo
  permits?: PermitTrackingInfo[]
}

// ---------------------------------------------------------------------------
// Custom Local Fallback Cache
// ---------------------------------------------------------------------------

export function getCustomTickets(): StoredTicket[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TICKETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read custom tickets from localStorage", err)
    return []
  }
}

export function addCustomTicket(ticket: StoredTicket): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomTickets()
    const filtered = existing.filter((t) => t.id !== ticket.id)
    const updated = [ticket, ...filtered]
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TICKETS, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save custom ticket to localStorage", err)
  }
}

export function getDeletedTicketIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TICKETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read deleted tickets from localStorage", err)
    return []
  }
}

export function addDeletedTicketId(id: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getDeletedTicketIds()
    if (!existing.includes(id)) {
      const updated = [...existing, id]
      localStorage.setItem(STORAGE_KEYS.DELETED_TICKETS, JSON.stringify(updated))
    }
  } catch (err) {
    console.error("Failed to save deleted ticket to localStorage", err)
  }
}

export function getDeletedRmaIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RMA)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read deleted RMAs from localStorage", err)
    return []
  }
}

export function addDeletedRmaId(id: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getDeletedRmaIds()
    if (!existing.includes(id)) {
      const updated = [...existing, id]
      localStorage.setItem(STORAGE_KEYS.DELETED_RMA, JSON.stringify(updated))
    }
  } catch (err) {
    console.error("Failed to save deleted RMA to localStorage", err)
  }
}

export function getCustomAssets(): StoredAsset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ASSETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read custom assets from localStorage", err)
    return []
  }
}

export function saveCustomAsset(asset: StoredAsset): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomAssets()
    const filtered = existing.filter(
      (a) => a.serial.toUpperCase() !== asset.serial.toUpperCase()
    )
    const updated = [asset, ...filtered]
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ASSETS, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save custom asset to localStorage", err)
  }
}

export function removeCustomAsset(serial: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomAssets()
    const filtered = existing.filter(
      (a) => a.serial.toUpperCase() !== serial.toUpperCase()
    )
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ASSETS, JSON.stringify(filtered))
  } catch (err) {
    console.error("Failed to remove custom asset from localStorage", err)
  }
}

// ---------------------------------------------------------------------------
// Transactional API Persistence Functions
// ---------------------------------------------------------------------------

export async function saveAssetApi(
  asset: StoredAsset
): Promise<{ success: boolean; asset?: StoredAsset; message?: string }> {
  saveCustomAsset(asset)
  try {
    const res = await fetch("/api/equipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asset),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`)
    }
    return {
      success: true,
      asset: data.equipment || asset,
      message: data.message || "บันทึกข้อมูลอุปกรณ์สำเร็จแล้ว",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์"
    console.warn("Backend API not reachable or error, saved to local persistence:", msg)
    return {
      success: true,
      asset,
      message: "บันทึกข้อมูลลงเครื่องของคุณเรียบร้อยแล้ว (จะซิงก์เข้าฐานข้อมูลเมื่อเชื่อมต่อได้)",
    }
  }
}

export async function deleteAssetApi(serial: string): Promise<{ success: boolean; message?: string }> {
  removeCustomAsset(serial)
  try {
    const res = await fetch(`/api/equipments?serial=${encodeURIComponent(serial)}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`)
    return { success: true, message: data.message || `ลบอุปกรณ์ ${serial} เรียบร้อยแล้ว` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete"
    return { success: false, message: msg }
  }
}

export async function saveStationApi(
  station: StoredStation,
  isEdit = false
): Promise<{ success: boolean; station?: StoredStation; message?: string }> {
  try {
    const res = await fetch("/api/stations", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(station),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`)
    }
    return {
      success: true,
      station: data.station || station,
      message: data.message || "บันทึกข้อมูลสถานีสำเร็จแล้ว",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด"
    return { success: false, message: msg }
  }
}

export async function deleteStationApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/stations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`)
    return { success: true, message: data.message || `ลบสถานี ${id} เรียบร้อยแล้ว` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete station"
    return { success: false, message: msg }
  }
}

export async function saveRmaApi(
  rma: StoredRma,
  isEdit = false
): Promise<{ success: boolean; rma?: StoredRma; message?: string }> {
  try {
    const res = await fetch("/api/rma", {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify(rma),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`)
    }
    return {
      success: true,
      rma: data.rma || rma,
      message: data.message || "บันทึกใบส่งซ่อมเรียบร้อยแล้ว",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด"
    return { success: false, message: msg }
  }
}

export async function deleteRmaApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/rma?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
      },
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to delete RMA")
    }
    return { success: true, message: data.message || `ใบ RMA ${id} ถูกลบออกจากระบบเรียบร้อยแล้ว` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบใบส่งซ่อม"
    return { success: false, message: msg }
  }
}

export async function deleteTicketApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
      },
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to delete ticket")
    }
    return { success: true, message: data.message || `เคส ${id} ถูกลบออกจากระบบอย่างถาวรแล้ว` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบเคส"
    return { success: false, message: msg }
  }
}
