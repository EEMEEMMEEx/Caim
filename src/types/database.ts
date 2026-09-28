// Centralized Database Schema Definitions for CAIM System
// Supports Equipments, Stations, Tickets (Claims), RMA Records, and Transaction Logs

export interface StationDocument {
  id: string // e.g. "st-60-1", "st-rep-1", or custom string ID
  code: string // e.g. "GOV-03"
  name: string // "ที่ว่าการอำเภอคลองลาน"
  subdistrict: string // "คลองน้ำไหล"
  district: string // "คลองลาน"
  province: string // "กำแพงเพชร"
  area: string // "ภาคเหนือ"
  zone: string // "เขต 3 (ส่วนแยกตาก)"
  siteType: string // "ที่ว่าการอำเภอ"
  contractor: string // "P&S"
  towerType: string // "Self-Support"
  height: number // 60
  seaLevel: number // 158
  lat: number // 16.204197
  lng: number // 99.321011
  category: string // "เสาสัญญาณหลัก 60 เมตร"
  activeClaimIds?: string[] // Relational reference: active claims at this station
  createdAt?: string
  updatedAt?: string
}

export type EquipmentStatus = "active" | "in_claim" | "in_rma" | "retired"

export interface EquipmentDocument {
  serial: string // Primary unique natural key (S/N)
  vendor: string // e.g. "Huawei", "Hytera", "Motorola"
  model: string // e.g. "2280", "MD788G"
  category: string // Category name
  name?: string // Device label/name
  description?: string
  stationId?: string // Foreign Key -> StationDocument.id
  stationName?: string // Cached station name for rapid search
  status?: EquipmentStatus // Current state of the equipment
  currentClaimId?: string // Foreign Key -> TicketDocument.id (if in_claim)
  currentRmaId?: string // Foreign Key -> RmaDocument.id (if in_rma)
  createdAt?: string
  updatedAt?: string
}

export interface TicketDocument {
  id: string // e.g. "CLM-2026-0043" or "TICKET-174..."
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string // Foreign Key -> EquipmentDocument.serial
  status: string // "รับแจ้ง", "ส่งศูนย์", "ปิดเคส", etc.
  statusCode: number
  date: string
  reportedDate?: string
  deadlineDate?: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  repairResult?: string
  remarks?: string
  category?: string
  deviceType?: string
  location?: string
  warrantyStatus?: string
  serviceCenter?: string
  sentDate?: string
  lastTrackDate?: string
  returnDate?: string
  reporter?: string
  assignee?: string
  stationId?: string // Foreign Key -> StationDocument.id
  station?: string // Station name
  province?: string
  district?: string
  subdistrict?: string
  rmaId?: string // Foreign Key -> RmaDocument.id (if dispatched overseas)
  createdAt?: string
  updatedAt?: string
}

export interface StageHistoryRecord {
  stageNumber: number
  name: string
  shortName: string
  standardDays: number
  hasVendorPenalty?: boolean
  startDate: string
  endDate: string
  actualDays: number
  status: "completed" | "active" | "pending"
  notes?: string
}

export interface RmaDocument {
  id: string // e.g. "RMA-2026-001"
  rmaNo: string
  caseName?: string // Claim case reference title or ID
  ticketId?: string // Foreign Key -> TicketDocument.id
  serialNo: string // Foreign Key -> EquipmentDocument.serial
  vendor: string
  model: string
  destination: string
  status: string
  statusBadge?: "in_progress" | "returned"
  statusBadgeText?: string
  currentStageNumber?: number
  totalStages?: number
  currentStageName?: string
  stageWaitDays?: string
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
  createdAt?: string
  updatedAt?: string
}

export type TransactionAction =
  | "CLAIM_OPENED"
  | "CLAIM_UPDATED"
  | "CLAIM_DELETED"
  | "RMA_DISPATCHED"
  | "RMA_UPDATED"
  | "RMA_DELETED"
  | "EQUIPMENT_CREATED"
  | "EQUIPMENT_UPDATED"
  | "EQUIPMENT_DELETED"
  | "STATION_CREATED"
  | "STATION_UPDATED"
  | "STATION_DELETED"

export interface TransactionLogDocument {
  id: string
  action: TransactionAction
  targetType: "equipment" | "station" | "ticket" | "rma"
  targetId: string
  details: Record<string, unknown>
  timestamp: string
}

export interface RealtimeSyncPayload<T = unknown> {
  type: "station" | "equipment" | "ticket" | "rma" | "metrics"
  action: "create" | "update" | "delete" | "snapshot"
  data: T
  timestamp: string
}
