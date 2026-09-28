/**
 * Thai Buddhist Era (BE) & Calendar Date Utilities for Claim Case Duration Calculation
 */

const THAI_MONTHS_MAP: Record<string, number> = {
  // Abbreviated
  "ม.ค.": 0, "ม.ค": 0,
  "ก.พ.": 1, "ก.พ": 1,
  "มี.ค.": 2, "มี.ค": 2,
  "เม.ย.": 3, "เม.ย": 3,
  "พ.ค.": 4, "พ.ค": 4,
  "มิ.ย.": 5, "มิ.ย": 5,
  "ก.ค.": 6, "ก.ค": 6,
  "ส.ค.": 7, "ส.ค": 7,
  "ก.ย.": 8, "ก.ย": 8,
  "ต.ค.": 9, "ต.ค": 9,
  "พ.ย.": 10, "พ.ย": 10,
  "ธ.ค.": 11, "ธ.ค": 11,
  // Full names
  "มกราคม": 0,
  "กุมภาพันธ์": 1,
  "มีนาคม": 2,
  "เมษายน": 3,
  "พฤษภาคม": 4,
  "มิถุนายน": 5,
  "กรกฎาคม": 6,
  "สิงหาคม": 7,
  "กันยายน": 8,
  "ตุลาคม": 9,
  "พฤศจิกายน": 10,
  "ธันวาคม": 11,
}

/**
 * Standard SLA duration threshold before a claim case is flagged as overdue
 */
export const DEFAULT_SLA_THRESHOLD_DAYS = 7

/**
 * Parse any date representation into a valid Date object.
 * Correctly handles Thai Buddhist Era (BE, e.g. 2569 -> 2026 CE) and Thai month names.
 */
export function parseThaiDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr
  }

  const trimmed = String(dateStr).trim()
  if (!trimmed) return null

  // 1. Check for Thai text date pattern: e.g. "13 มิ.ย. 2569", "13 มิ.ย. 2569 07:00", "13 มิถุนายน 2569 01:09"
  const thaiTextMatch = trimmed.match(
    /^(\d{1,2})\s+([ก-๙.]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (thaiTextMatch) {
    const day = parseInt(thaiTextMatch[1], 10)
    const monthKey = thaiTextMatch[2].trim()
    let year = parseInt(thaiTextMatch[3], 10)
    const hour = thaiTextMatch[4] ? parseInt(thaiTextMatch[4], 10) : 0
    const minute = thaiTextMatch[5] ? parseInt(thaiTextMatch[5], 10) : 0
    const second = thaiTextMatch[6] ? parseInt(thaiTextMatch[6], 10) : 0

    const month = THAI_MONTHS_MAP[monthKey]
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      // Convert Buddhist Era (BE >= 2400) to Common Era (CE)
      if (year >= 2400) {
        year -= 543
      }
      return new Date(year, month, day, hour, minute, second, 0)
    }
  }

  // 2. Check for slash or dash format: DD/MM/YYYY with potential BE year (e.g. 13/06/2569 or 13/06/2569 07:00)
  const slashMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10) - 1
    let year = parseInt(slashMatch[3], 10)
    const hour = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0
    const minute = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0
    const second = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0

    if (year >= 2400) {
      year -= 543
    }
    return new Date(year, month, day, hour, minute, second, 0)
  }

  // 3. Fallback to standard JavaScript Date parser (for ISO strings, e.g. 2026-06-13T08:00:00Z)
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    // If year was parsed as BE (e.g. year >= 2400), adjust
    if (parsed.getFullYear() >= 2400) {
      parsed.setFullYear(parsed.getFullYear() - 543)
    }
    return parsed
  }

  return null
}

/**
 * Format a Date object into standard Thai BE text (e.g. "12 พ.ย. 2569")
 */
export function formatThaiDate(date: Date): string {
  const day = date.getDate()
  const monthNames = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]
  const month = monthNames[date.getMonth()]
  const yearBe = date.getFullYear() + 543
  return `${day} ${month} ${yearBe}`
}

export interface RemainingDaysResult {
  remainingDays: number
  totalDays: number
  progressPercent: number
  isOverdue: boolean
  overdueDays: number
  deadlineDateStr: string
}

/**
 * Dynamically computes remaining days and progress percentage towards deadline/due date.
 * Formats: dueDate - currentDate
 */
export function calculateRemainingDays(
  deadlineDateInput?: string | Date | null,
  reportedDateInput?: string | Date | null,
  currentDate: Date = new Date()
): RemainingDaysResult {
  const reported = parseThaiDate(reportedDateInput) || new Date(currentDate)
  let deadline = parseThaiDate(deadlineDateInput)

  // Default to standard 60-day SLA if no deadline is specified
  if (!deadline) {
    deadline = new Date(reported.getFullYear(), reported.getMonth(), reported.getDate() + 60)
  }

  const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime()
  const deadlineMidnight = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime()
  const reportedMidnight = new Date(reported.getFullYear(), reported.getMonth(), reported.getDate()).getTime()

  const remainingDiffMs = deadlineMidnight - currentMidnight
  const remainingDays = Math.ceil(remainingDiffMs / (1000 * 60 * 60 * 24))

  const totalSlaMs = deadlineMidnight - reportedMidnight
  const totalDays = Math.max(1, Math.round(totalSlaMs / (1000 * 60 * 60 * 24)))

  // Progress percent representing remaining portion of the SLA window
  const progressPercent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100))

  const isOverdue = remainingDays < 0
  const overdueDays = isOverdue ? Math.abs(remainingDays) : 0

  return {
    remainingDays: Math.max(0, remainingDays),
    totalDays,
    progressPercent,
    isOverdue,
    overdueDays,
    deadlineDateStr:
      deadlineDateInput && typeof deadlineDateInput === "string" && deadlineDateInput.trim()
        ? deadlineDateInput
        : formatThaiDate(deadline),
  }
}

export interface CaseDurationInput {
  date?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  closedAt?: string | null
  status?: string | null
  statusCode?: number | null
  ageDays?: string | number | null
  isOverdue?: boolean | null
  overdueText?: string | null
}

export interface CaseDurationResult {
  days: number
  text: string
  isOverdue: boolean
  overdueText: string
  isClosed: boolean
}

/**
 * Dynamically computes elapsed days and overdue status for a claim ticket.
 * - Active / Open cases: calculates elapsed days up to currentDate.
 * - Closed / Rejected cases: freezes duration at completion/close date.
 */
export function calculateCaseDuration(
  ticket: CaseDurationInput,
  currentDate: Date = new Date(),
  slaThresholdDays: number = DEFAULT_SLA_THRESHOLD_DAYS
): CaseDurationResult {
  const isClosed =
    ticket.statusCode === 5 ||
    ticket.statusCode === 6 ||
    ticket.status === "ปิดเคส" ||
    ticket.status === "ปฏิเสธเคลม" ||
    Boolean(ticket.status?.includes("ปิดเคส")) ||
    Boolean(ticket.status?.includes("ปฏิเสธเคลม"))

  // Determine reported date
  const reportedDate =
    parseThaiDate(ticket.date) ||
    parseThaiDate(ticket.createdAt) ||
    (ticket.createdAt ? new Date(ticket.createdAt) : null)

  let elapsedDays = 0

  if (isClosed) {
    // For closed cases: freeze at closedAt or updatedAt or existing positive ageDays
    const closeDate =
      parseThaiDate(ticket.closedAt) ||
      parseThaiDate(ticket.updatedAt) ||
      (ticket.updatedAt ? new Date(ticket.updatedAt) : null)

    if (reportedDate && closeDate && closeDate >= reportedDate) {
      const closeMidnight = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate()).getTime()
      const reportedMidnight = new Date(reportedDate.getFullYear(), reportedDate.getMonth(), reportedDate.getDate()).getTime()
      const diffMs = closeMidnight - reportedMidnight
      elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (ticket.ageDays) {
      // Parse existing numeric age if available
      const match = String(ticket.ageDays).match(/(\d+)/)
      if (match && parseInt(match[1], 10) > 0) {
        elapsedDays = parseInt(match[1], 10)
      } else if (reportedDate) {
        const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime()
        const reportedMidnight = new Date(reportedDate.getFullYear(), reportedDate.getMonth(), reportedDate.getDate()).getTime()
        const diffMs = currentMidnight - reportedMidnight
        elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      }
    }
  } else {
    // For active/open cases: dynamically calculate from reported date to today
    if (reportedDate) {
      const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime()
      const reportedMidnight = new Date(reportedDate.getFullYear(), reportedDate.getMonth(), reportedDate.getDate()).getTime()
      const diffMs = currentMidnight - reportedMidnight
      elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } else if (ticket.ageDays) {
      const match = String(ticket.ageDays).match(/(\d+)/)
      if (match) {
        elapsedDays = parseInt(match[1], 10)
      }
    }
  }

  // Determine Overdue status based on SLA threshold (only for active open cases)
  const isOverdue = !isClosed && (elapsedDays > slaThresholdDays || Boolean(ticket.isOverdue))
  const overdueText = isOverdue
    ? ticket.overdueText || `เกินกำหนด ${elapsedDays - slaThresholdDays > 0 ? `+${elapsedDays - slaThresholdDays} วัน` : ""}`.trim()
    : ""

  return {
    days: elapsedDays,
    text: `${elapsedDays} วัน`,
    isOverdue,
    overdueText: overdueText || "เกินกำหนด",
    isClosed,
  }
}
