/**
 * Overseas RMA Case Duration & Vendor Penalty Calculation Utilities
 * Supports Thai Buddhist Era (BE) and Gregorian dates without timezone drift.
 */

import { parseThaiDate } from "./caseDuration"
import type { StageHistoryRecord } from "@/types/database"

export const VENDOR_PENALTY_STANDARD_DAYS = 14
export const VENDOR_PENALTY_STAGE_NUMBER = 6 // 6. จีน (เข้ากระบวนการซ่อม)

export interface RmaStageConfig {
  stageNumber: number
  name: string
  shortName: string
  standardDays: number
  hasVendorPenalty?: boolean
}

export const RMA_STAGES_CONFIG: RmaStageConfig[] = [
  { stageNumber: 1, name: "ระบบใบ RMA", shortName: "เปิดใบ RMA", standardDays: 2 },
  { stageNumber: 2, name: "Forth (ส่งตรวจสอบภายใน)", shortName: "Forth ตรวจ", standardDays: 7 },
  { stageNumber: 3, name: "กสทช. (ตรวจสอบ / อนุมัติ)", shortName: "กสทช. อนุมัติ", standardDays: 5 },
  { stageNumber: 4, name: "ส่งออก", shortName: "ส่งออก", standardDays: 3 },
  { stageNumber: 5, name: "Hytera / Huawei Hongkong (ถึงศูนย์ต่างประเทศ)", shortName: "ถึงศูนย์ ตปท.", standardDays: 21 },
  { stageNumber: 6, name: "จีน (เข้ากระบวนการซ่อม)", shortName: "จีน — ซ่อม", standardDays: 14, hasVendorPenalty: true },
  { stageNumber: 7, name: "ส่งกลับเครื่องบิน", shortName: "ขนส่งกลับ", standardDays: 3 },
  { stageNumber: 8, name: "เคลียร์ของออก (ศุลกากรขาเข้า)", shortName: "ศุลกากรขาเข้า", standardDays: 5 },
]

export interface RmaCalculationItem {
  id?: string
  openDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  currentStageNumber?: number | null
  totalStages?: number | null
  currentStageName?: string | null
  stageWaitDays?: string | null
  currentStageStartedAt?: string | null
  currentStageCompletedAt?: string | null
  status?: string | null
  statusBadge?: "in_progress" | "returned" | null
  statusBadgeText?: string | null
  totalDays?: string | null
  penaltyDays?: string | null
  penaltyStandard?: string | null
  isOverduePenalty?: boolean | null
  stageHistory?: StageHistoryRecord[] | null
}

export interface RmaTotalDaysResult {
  days: number
  text: string
  isFrozen: boolean
  statusBadge: "in_progress" | "returned"
  statusBadgeText: string
}

export interface RmaPenaltyDaysResult {
  elapsedDays: number
  overdueDays: number
  isOverdue: boolean
  isStarted: boolean
  isCompleted: boolean
  penaltyDaysText: string
  penaltyStandardText: string
  displayLiveText: string
  textColor: string
}

export interface RmaMetricsResult {
  total: RmaTotalDaysResult
  penalty: RmaPenaltyDaysResult
}

/**
 * Normalize any date into Local Midnight (00:00:00.000)
 * Eliminates timezone conversion drift when computing elapsed calendar days.
 */
export function toLocalMidnight(date: Date | null | undefined): Date | null {
  if (!date || isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

/**
 * Robust date parser supporting Gregorian (YYYY-MM-DD, ISO, YYYY-MM-DD HH:mm),
 * Thai Buddhist Era (11 ก.ย. 2569, 11/09/2569), and standard Date objects.
 */
export function parseRmaCalendarDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : toLocalMidnight(dateStr)
  }

  const trimmed = String(dateStr).trim()
  if (!trimmed) return null

  // 1. Gregorian format with dash or slash: YYYY-MM-DD (e.g. 2026-09-11 or 2026/09/11)
  const gregMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (gregMatch) {
    const year = parseInt(gregMatch[1], 10)
    const month = parseInt(gregMatch[2], 10) - 1
    const day = parseInt(gregMatch[3], 10)
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 0, 0, 0, 0)
    }
  }

  // 2. Delegate to parseThaiDate (handles Thai month names, BE >= 2400, DD/MM/YYYY)
  const parsedThai = parseThaiDate(trimmed)
  if (parsedThai && !isNaN(parsedThai.getTime())) {
    return toLocalMidnight(parsedThai)
  }

  // 3. Fallback to standard JS Date
  const fallback = new Date(trimmed)
  if (!isNaN(fallback.getTime())) {
    return toLocalMidnight(fallback)
  }

  return null
}

/**
 * Extract integer number of days from strings like "11 วัน", "เกิน 7 วัน", "ค้างมา 5 วัน"
 */
function extractDaysFromString(str?: string | null): number {
  if (!str) return 0
  const match = String(str).match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * 1. Dynamic Total Days Calculation ('รวม')
 * - Active case: increments dynamically daily (today - issueDate)
 * - Completed case ('ของกลับถึงแล้ว' / stage 8 done): freeze at delivery/completion date
 */
export function calculateRmaTotalDays(
  item: RmaCalculationItem,
  currentDateInput: Date = new Date()
): RmaTotalDaysResult {
  const currentMidnight = toLocalMidnight(currentDateInput) || new Date()

  const isCompleted =
    item.statusBadge === "returned" ||
    item.status === "returned" ||
    item.status === "completed" ||
    item.statusBadgeText === "ของกลับถึงแล้ว" ||
    (item.currentStageNumber ?? 1) >= 8

  const issueDate = parseRmaCalendarDate(item.openDate) || parseRmaCalendarDate(item.createdAt)

  let days = 0
  let isFrozen = false

  if (isCompleted) {
    isFrozen = true

    // Attempt to locate completion date from stage 8 history or updatedAt
    let completionDate: Date | null = null

    if (Array.isArray(item.stageHistory) && item.stageHistory.length > 0) {
      const stage8 = item.stageHistory.find((s) => s.stageNumber === 8)
      if (stage8?.endDate) {
        completionDate = parseRmaCalendarDate(stage8.endDate)
      } else if (stage8?.startDate && stage8.status === "completed") {
        completionDate = parseRmaCalendarDate(stage8.startDate)
      }
    }

    if (!completionDate && item.updatedAt) {
      completionDate = parseRmaCalendarDate(item.updatedAt)
    }

    if (completionDate && issueDate) {
      const diffMs = completionDate.getTime() - issueDate.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (item.totalDays) {
      // Freeze at previously stored totalDays
      days = extractDaysFromString(item.totalDays)
    } else if (issueDate) {
      const diffMs = currentMidnight.getTime() - issueDate.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }
  } else {
    // Active case: compute live elapsed days relative to current date
    if (issueDate) {
      const diffMs = currentMidnight.getTime() - issueDate.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (item.totalDays) {
      days = extractDaysFromString(item.totalDays)
    }
  }

  const statusBadge: "in_progress" | "returned" = isCompleted ? "returned" : "in_progress"
  const statusBadgeText = isCompleted ? "ของกลับถึงแล้ว" : "กำลังดำเนินการ"

  return {
    days,
    text: `${days} วัน`,
    isFrozen,
    statusBadge,
    statusBadgeText,
  }
}

/**
 * 2. Vendor Penalty Days Calculation ('บทปรับผู้ขาย')
 * - Strictly starts when case enters stage 6 (จีน - เข้ากระบวนการซ่อม)
 * - If stage 6 is active: count dynamically (today - stage6StartDate)
 * - If stage 6 is completed: freeze duration at completion date
 * - If > 14 days standard limit: flag isOverduePenalty and format "เกิน X วัน" in red
 */
export function calculateRmaPenaltyDays(
  item: RmaCalculationItem,
  currentDateInput: Date = new Date(),
  penaltyLimitDays: number = VENDOR_PENALTY_STANDARD_DAYS
): RmaPenaltyDaysResult {
  const currentMidnight = toLocalMidnight(currentDateInput) || new Date()
  const currentStageNum = item.currentStageNumber ?? 1

  let elapsedDays = 0
  let isStarted = false
  let isCompleted = false

  // Case A: Stage history is available
  if (Array.isArray(item.stageHistory) && item.stageHistory.length > 0) {
    const penaltyStage = item.stageHistory.find(
      (s) => s.hasVendorPenalty || s.stageNumber === VENDOR_PENALTY_STAGE_NUMBER
    )

    if (penaltyStage) {
      if (penaltyStage.status === "completed") {
        isStarted = true
        isCompleted = true
        if (penaltyStage.startDate && penaltyStage.endDate) {
          const start = parseRmaCalendarDate(penaltyStage.startDate)
          const end = parseRmaCalendarDate(penaltyStage.endDate)
          if (start && end) {
            elapsedDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
          } else {
            elapsedDays = penaltyStage.actualDays || 0
          }
        } else {
          elapsedDays = penaltyStage.actualDays || 0
        }
      } else if (penaltyStage.status === "active") {
        isStarted = true
        isCompleted = false
        const start = parseRmaCalendarDate(penaltyStage.startDate)
        if (start) {
          elapsedDays = Math.max(0, Math.floor((currentMidnight.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        } else if (penaltyStage.actualDays) {
          elapsedDays = penaltyStage.actualDays
        }
      } else {
        // Pending
        isStarted = false
        isCompleted = false
        elapsedDays = 0
      }
    }
  } else {
    // Case B: Flat item without stageHistory
    if (currentStageNum < VENDOR_PENALTY_STAGE_NUMBER) {
      // Has not reached stage 6 yet
      isStarted = false
      isCompleted = false
      elapsedDays = 0
    } else if (currentStageNum === VENDOR_PENALTY_STAGE_NUMBER) {
      // Actively in stage 6
      isStarted = true
      isCompleted = false

      // Check if stageWaitDays contains wait days
      const waitDays = extractDaysFromString(item.stageWaitDays)
      const existingPenaltyDays = extractDaysFromString(item.penaltyDays)

      if (waitDays > 0) {
        elapsedDays = waitDays
      } else if (existingPenaltyDays > 0) {
        elapsedDays = existingPenaltyDays
      } else {
        elapsedDays = 0
      }
    } else {
      // Past stage 6 (e.g. stage 7 or 8)
      isStarted = true
      isCompleted = true

      // If penaltyDays string has "เกิน X วัน", total is 14 + X
      if (item.penaltyDays && item.penaltyDays.includes("เกิน")) {
        const extra = extractDaysFromString(item.penaltyDays)
        elapsedDays = penaltyLimitDays + extra
      } else if (item.penaltyDays) {
        elapsedDays = extractDaysFromString(item.penaltyDays)
      } else {
        elapsedDays = penaltyLimitDays
      }
    }
  }

  const isOverdue = isStarted && elapsedDays > penaltyLimitDays
  const overdueDays = isOverdue ? elapsedDays - penaltyLimitDays : 0

  let penaltyDaysText = "0 วัน"
  let penaltyStandardText = `จาก ${penaltyLimitDays} วัน`
  let displayLiveText = `0 วัน / จาก ${penaltyLimitDays} วัน`

  if (!isStarted) {
    penaltyDaysText = "0 วัน"
    penaltyStandardText = `จาก ${penaltyLimitDays} วัน`
    displayLiveText = `0 วัน / จาก ${penaltyLimitDays} วัน`
  } else if (isOverdue) {
    penaltyDaysText = `เกิน ${overdueDays} วัน`
    penaltyStandardText = isCompleted
      ? `จาก ${penaltyLimitDays} วัน · ซ่อมเสร็จแล้ว`
      : `จาก ${penaltyLimitDays} วัน`
    displayLiveText = `${elapsedDays} วัน / จาก ${penaltyLimitDays} วัน (เกิน ${overdueDays} วัน)`
  } else {
    penaltyDaysText = `${elapsedDays} วัน`
    penaltyStandardText = isCompleted
      ? `จาก ${penaltyLimitDays} วัน · ซ่อมเสร็จแล้ว`
      : `จาก ${penaltyLimitDays} วัน`
    displayLiveText = `${elapsedDays} วัน / จาก ${penaltyLimitDays} วัน`
  }

  const textColor = isOverdue ? "text-[#dc2626] font-bold" : "text-slate-700 font-medium"

  return {
    elapsedDays,
    overdueDays,
    isOverdue,
    isStarted,
    isCompleted,
    penaltyDaysText,
    penaltyStandardText,
    displayLiveText,
    textColor,
  }
}

/**
 * 3. Complete RMA Case Metrics Calculation
 */
export function calculateRmaMetrics(
  item: RmaCalculationItem,
  currentDateInput: Date = new Date(),
  penaltyLimitDays: number = VENDOR_PENALTY_STANDARD_DAYS
): RmaMetricsResult {
  const total = calculateRmaTotalDays(item, currentDateInput)
  const penalty = calculateRmaPenaltyDays(item, currentDateInput, penaltyLimitDays)

  return { total, penalty }
}

export interface StageDurationResult {
  elapsedDays: number
  isOverStandard: boolean
  overdueDays: number
  parenthesizedText: string
  badgeText: string
  textColor: string
  badgeStyle: string
}

/**
 * 4. Dynamic Stage Elapsed Days Calculation for Timeline Steps
 * - Completed step: endDate - startDate
 * - Active step: currentDate - stageStartDate
 * - Automatic SLA highlight when actual duration > standardDays
 */
export function calculateStageDuration(
  stage: {
    startDate?: string | null
    endDate?: string | null
    status: "completed" | "active" | "pending"
    standardDays?: number
    actualDays?: number
  },
  currentDateInput: Date = new Date()
): StageDurationResult {
  const currentMidnight = toLocalMidnight(currentDateInput) || new Date()
  let elapsedDays = 0

  if (stage.status === "completed") {
    const start = parseRmaCalendarDate(stage.startDate)
    const end = parseRmaCalendarDate(stage.endDate)
    if (start && end) {
      const diffMs = end.getTime() - start.getTime()
      elapsedDays = Math.max(0, Math.round(diffMs / 86400000))
    } else {
      elapsedDays = stage.actualDays || 0
    }
  } else if (stage.status === "active") {
    const start = parseRmaCalendarDate(stage.startDate)
    if (start) {
      const diffMs = currentMidnight.getTime() - start.getTime()
      elapsedDays = Math.max(0, Math.floor(diffMs / 86400000))
    } else {
      elapsedDays = stage.actualDays || 1
    }
  } else {
    elapsedDays = 0
  }

  const standardDays = stage.standardDays || 0
  const isOverStandard = standardDays > 0 && elapsedDays > standardDays
  const overdueDays = isOverStandard ? elapsedDays - standardDays : 0

  return {
    elapsedDays,
    isOverStandard,
    overdueDays,
    parenthesizedText: `(${elapsedDays} วัน)`,
    badgeText: isOverStandard ? `เกินมาตรฐาน ${overdueDays} วัน` : `ตามเกณฑ์ (${elapsedDays}/${standardDays} วัน)`,
    textColor: isOverStandard ? "text-[#ea580c] font-bold" : "text-slate-500",
    badgeStyle: isOverStandard
      ? "bg-orange-100 text-[#ea580c] border border-orange-200"
      : "bg-slate-100 text-slate-700 border border-slate-200",
  }
}

/**
 * 5. Calculate Cumulative Duration Across All Steps
 */
export function calculateCumulativeStagesDays(
  stages: Array<{ actualDays?: number; status?: string }>
): number {
  if (!Array.isArray(stages)) return 0
  return stages
    .filter((s) => s.status === "completed" || s.status === "active")
    .reduce((sum, s) => sum + (Number(s.actualDays) || 0), 0)
}

export interface CurrentStageDurationResult {
  days: number
  text: string
  isFinalized: boolean
  stageNumber: number
  stageName: string
  startedAt: Date | null
  completedAt: Date | null
}

/**
 * 6. Dynamic Current-Stage Duration Calculation for Overseas Tracking Progress Bar
 * - Calculates strictly the elapsed days within the active ongoing step itself:
 *   (currentDate - currentStepStartedAt)
 * - Excludes cumulative total case age or durations from prior stages.
 * - If the stage is finalized or closed, locks duration to the total elapsed days
 *   spent between entry and completion timestamps.
 * - On transition to a new stage, resets duration counter to count from day 0/1.
 * - Formats localized string template: '{days} วัน'
 */
export function calculateCurrentStageDuration(
  item: RmaCalculationItem,
  currentDateInput: Date = new Date()
): CurrentStageDurationResult {
  const currentMidnight = toLocalMidnight(currentDateInput) || new Date()
  const stageNumber = Math.max(1, Math.min(8, item.currentStageNumber ?? 1))
  const stageConfig = RMA_STAGES_CONFIG.find((s) => s.stageNumber === stageNumber)

  // Resolve clean stage name without numerical prefixes like "6. "
  let stageName = stageConfig?.name || item.currentStageName || `ขั้นตอนที่ ${stageNumber}`
  if (item.currentStageName) {
    const trimmed = item.currentStageName.replace(/^\d+\.\s*/, "").trim()
    if (trimmed) {
      if (stageConfig && (trimmed === stageConfig.shortName || trimmed === stageConfig.name)) {
        stageName = stageConfig.name
      } else {
        stageName = trimmed
      }
    }
  }

  // Determine if the RMA case or stage is finalized/closed
  const isFinalized =
    item.statusBadge === "returned" ||
    item.status === "returned" ||
    item.status === "completed" ||
    item.status === "เสร็จสิ้น" ||
    item.statusBadgeText === "ของกลับถึงแล้ว" ||
    Boolean(item.currentStageCompletedAt)

  let startedAt: Date | null = null
  let completedAt: Date | null = null
  let historyStageActualDays: number | null = null

  // 1. Direct explicit stage timestamps
  if (item.currentStageStartedAt) {
    startedAt = parseRmaCalendarDate(item.currentStageStartedAt)
  }
  if (item.currentStageCompletedAt) {
    completedAt = parseRmaCalendarDate(item.currentStageCompletedAt)
  }

  // 2. Stage history inspection if present
  if (Array.isArray(item.stageHistory) && item.stageHistory.length > 0) {
    const stageRec = item.stageHistory.find((s) => s.stageNumber === stageNumber)
    if (stageRec) {
      if (stageRec.startDate && !startedAt) {
        startedAt = parseRmaCalendarDate(stageRec.startDate)
      }
      if (stageRec.endDate && !completedAt) {
        completedAt = parseRmaCalendarDate(stageRec.endDate)
      }
      if (typeof stageRec.actualDays === "number") {
        historyStageActualDays = stageRec.actualDays
      }
    }
  }

  // 3. Fallback for stage 1 if startedAt is not yet set
  if (!startedAt && stageNumber === 1) {
    startedAt = parseRmaCalendarDate(item.openDate) || parseRmaCalendarDate(item.createdAt)
  }

  let days = 0

  if (isFinalized) {
    // Finalized/closed stage: lock duration to elapsed days between stage entry and completion
    if (completedAt && startedAt) {
      const diffMs = completedAt.getTime() - startedAt.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (historyStageActualDays !== null && historyStageActualDays > 0) {
      days = historyStageActualDays
    } else if (item.stageWaitDays) {
      days = extractDaysFromString(item.stageWaitDays)
    } else if (startedAt) {
      const fallbackEnd = parseRmaCalendarDate(item.updatedAt) || currentMidnight
      const diffMs = fallbackEnd.getTime() - startedAt.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else {
      days = 0
    }
  } else {
    // Active ongoing stage: calculate strictly elapsed days within this active step
    // strictly currentDate - currentStepStartedAt
    if (startedAt) {
      const diffMs = currentMidnight.getTime() - startedAt.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (historyStageActualDays !== null && historyStageActualDays > 0) {
      days = historyStageActualDays
    } else if (item.stageWaitDays) {
      days = extractDaysFromString(item.stageWaitDays)
    } else {
      days = 0
    }
  }

  return {
    days,
    text: `${days} วัน`,
    isFinalized,
    stageNumber,
    stageName,
    startedAt,
    completedAt,
  }
}

