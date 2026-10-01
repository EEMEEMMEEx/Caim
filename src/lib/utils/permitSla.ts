/**
 * Permit 90-Day SLA & Lifecycle Timeline Calculation Utilities
 * Enforces strict 90-day validity window (addDays(issueDate, 90)),
 * calculates calendar elapsed vs. remaining days, and maps conditional
 * timeline workflow steps (Steps 1-5 for Export, Steps 5-8 for Import).
 */

import type { PermitTrackingInfo } from "@/types/database"

export interface PermitSlaResult {
  totalDays: number
  elapsedDays: number
  remainingDays: number
  isExpired: boolean
  isExpiringSoon: boolean // <= 15 days remaining
  progressPercent: number
  badgeText: string // "เหลืออีก {remainingDays} วัน" or "หมดอายุแล้ว"
  subtext: string   // "กรอบเวลา SLA 90 วัน (ผ่านไป {elapsedDays} วัน)"
  status: "active" | "warning" | "expired"
  expirationDate: string
}

/**
 * Safely parse date string into local Date object (ignoring timezone drift)
 */
export function parseLocalDate(dateInput?: string | Date | null): Date {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date) return new Date(dateInput)
  const dStr = String(dateInput).slice(0, 10)
  const parts = dStr.split("-").map(Number)
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
  }
  const parsed = new Date(dateInput)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Format local Date to 'YYYY-MM-DD'
 */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Formula: expirationDate = addDays(new Date(issueDate), 90)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime())
  result.setDate(result.getDate() + days)
  return result
}

/**
 * differenceInCalendarDays: Calendar day difference between dateLeft and dateRight
 */
export function differenceInCalendarDays(dateLeft: Date, dateRight: Date): number {
  const utcLeft = Date.UTC(dateLeft.getFullYear(), dateLeft.getMonth(), dateLeft.getDate())
  const utcRight = Date.UTC(dateRight.getFullYear(), dateRight.getMonth(), dateRight.getDate())
  return Math.round((utcLeft - utcRight) / (1000 * 60 * 60 * 24))
}

/**
 * Auto-calculates expiration date: expirationDate = addDays(new Date(issueDate), validityDays)
 * in YYYY-MM-DD format
 */
export function calculatePermitExpirationDate(issueDateStr?: string | null, validityDays = 90): string {
  const issueDate = parseLocalDate(issueDateStr)
  const expDate = addDays(issueDate, validityDays)
  return formatDateToYMD(expDate)
}

/**
 * Dynamically calculate elapsed days and remaining days within the 90-day permit SLA window
 *
 * Formula:
 * - expirationDate = addDays(new Date(issueDate), 90)
 * - elapsedDays = differenceInCalendarDays(currentDate, issueDate)
 * - remainingDays = Math.max(0, differenceInCalendarDays(expirationDate, currentDate))
 * - progressPct = Math.min(100, Math.max(0, (elapsedDays / 90) * 100))
 */
export function calculatePermitSla(
  issueDateStr?: string | null,
  expiryDateStr?: string | null,
  targetDate: Date | string = new Date()
): PermitSlaResult {
  const TOTAL_SLA_DAYS = 90

  const issueDate = parseLocalDate(issueDateStr)
  const calculatedExpiry = addDays(issueDate, TOTAL_SLA_DAYS)

  // Use provided expiryDate if valid, otherwise strictly computed issueDate + 90 days
  const expirationDate =
    expiryDateStr && !isNaN(Date.parse(expiryDateStr))
      ? parseLocalDate(expiryDateStr)
      : calculatedExpiry

  const currentDate = parseLocalDate(targetDate)

  // elapsedDays = differenceInCalendarDays(currentDate, issueDate)
  const elapsedDays = Math.max(0, differenceInCalendarDays(currentDate, issueDate))

  // remainingDays = Math.max(0, differenceInCalendarDays(expirationDate, currentDate))
  const rawRemaining = differenceInCalendarDays(expirationDate, currentDate)
  const remainingDays = Math.max(0, rawRemaining)

  const isExpired = rawRemaining <= 0
  const isExpiringSoon = !isExpired && remainingDays <= 15

  // progressPct = Math.min(100, Math.max(0, (elapsedDays / 90) * 100))
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedDays / TOTAL_SLA_DAYS) * 100))
  )

  let status: "active" | "warning" | "expired" = "active"
  if (isExpired) {
    status = "expired"
  } else if (isExpiringSoon) {
    status = "warning"
  }

  // Primary pill: 'เหลืออีก {remainingDays} วัน' (e.g., 'เหลืออีก 56 วัน' or 'เหลืออีก 19 วัน')
  let badgeText = `เหลืออีก ${remainingDays} วัน`
  if (isExpired) {
    badgeText = "หมดอายุแล้ว"
  } else if (isExpiringSoon) {
    badgeText = `ใกล้หมดอายุ เหลืออีก ${remainingDays} วัน`
  }

  // Subtext: 'กรอบเวลา SLA 90 วัน (ผ่านไป {elapsedDays} วัน)'
  const subtext = `กรอบเวลา SLA 90 วัน (ผ่านไป ${elapsedDays} วัน)`

  return {
    totalDays: TOTAL_SLA_DAYS,
    elapsedDays,
    remainingDays,
    isExpired,
    isExpiringSoon,
    progressPercent,
    badgeText,
    subtext,
    status,
    expirationDate: formatDateToYMD(expirationDate),
  }
}

/**
 * Returns the timeline step coverage array based on permit classification:
 * - Case 1: 'export_for_repair' -> Steps 1 through 5
 * - Case 2: 'import_after_repair' -> Steps 5 through 8
 * - Default / Custom: Steps 1 through 5
 */
export function getCoveredStepsByPermitType(permitType?: string | null): number[] {
  switch (permitType) {
    case "export_for_repair":
      return [1, 2, 3, 4, 5]
    case "import_after_repair":
      return [5, 6, 7, 8]
    case "nbtc_permit":
      return [1, 2, 3, 4, 5]
    case "customs_clearance":
      return [4, 5, 7, 8]
    default:
      return [1, 2, 3, 4, 5]
  }
}

/**
 * Format badge text for timeline step indicator
 * Example: "[ใบอนุญาต: EXP-2026-0089 | เหลืออีก 74 วัน]"
 */
export function formatPermitStepBadge(
  permit: PermitTrackingInfo,
  targetDate = new Date()
): {
  text: string
  isExpired: boolean
  isExpiringSoon: boolean
  remainingDays: number
} {
  const sla = calculatePermitSla(permit.issueDate, permit.expiryDate, targetDate)
  let text = `ใบอนุญาต: ${permit.permitNo} | เหลืออีก ${sla.remainingDays} วัน`
  if (sla.isExpired) {
    text = `ใบอนุญาต: ${permit.permitNo} | หมดอายุแล้ว`
  } else if (sla.isExpiringSoon) {
    text = `ใบอนุญาต: ${permit.permitNo} | ใกล้หมดอายุ เหลืออีก ${sla.remainingDays} วัน`
  }

  return {
    text,
    isExpired: sla.isExpired,
    isExpiringSoon: sla.isExpiringSoon,
    remainingDays: sla.remainingDays,
  }
}
