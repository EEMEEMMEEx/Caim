/**
 * Permit 90-Day SLA & Lifecycle Timeline Calculation Utilities
 * Enforces 90-day validity window, calculates elapsed vs. remaining days,
 * and maps conditional timeline workflow steps (Steps 1-5 for Export, Steps 5-8 for Import).
 */

import type { PermitTrackingInfo } from "@/types/database"

export interface PermitSlaResult {
  totalDays: number
  elapsedDays: number
  remainingDays: number
  isExpired: boolean
  isExpiringSoon: boolean // <= 15 days remaining
  progressPercent: number
  badgeText: string
  status: "active" | "warning" | "expired"
}

/**
 * Auto-calculates expiration date: issueDate + 90 days in YYYY-MM-DD format
 */
export function calculatePermitExpirationDate(issueDateStr?: string | null, validityDays = 90): string {
  const baseDate = issueDateStr && !isNaN(Date.parse(issueDateStr)) ? new Date(issueDateStr) : new Date()
  const expDate = new Date(baseDate.getTime())
  expDate.setDate(expDate.getDate() + validityDays)

  const year = expDate.getFullYear()
  const month = String(expDate.getMonth() + 1).padStart(2, "0")
  const day = String(expDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Calculate elapsed days vs. remaining days within the 90-day permit SLA window
 */
export function calculatePermitSla(
  issueDateStr?: string | null,
  expiryDateStr?: string | null,
  targetDate = new Date()
): PermitSlaResult {
  const TOTAL_SLA_DAYS = 90

  const issueDate = issueDateStr && !isNaN(Date.parse(issueDateStr)) ? new Date(issueDateStr) : new Date()
  issueDate.setHours(0, 0, 0, 0)

  const expiryDate =
    expiryDateStr && !isNaN(Date.parse(expiryDateStr))
      ? new Date(expiryDateStr)
      : new Date(issueDate.getTime() + TOTAL_SLA_DAYS * 24 * 60 * 60 * 1000)
  expiryDate.setHours(23, 59, 59, 999)

  const now = new Date(targetDate.getTime())
  now.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - issueDate.getTime()) / msPerDay))
  const remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / msPerDay))

  const isExpired = remainingDays <= 0 || now.getTime() > expiryDate.getTime()
  const isExpiringSoon = !isExpired && remainingDays <= 15

  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / TOTAL_SLA_DAYS) * 100)))

  let status: "active" | "warning" | "expired" = "active"
  if (isExpired) {
    status = "expired"
  } else if (isExpiringSoon) {
    status = "warning"
  }

  let badgeText = `เหลืออีก ${remainingDays} วัน`
  if (isExpired) {
    badgeText = "หมดอายุแล้ว"
  } else if (isExpiringSoon) {
    badgeText = `ใกล้หมดอายุ เหลืออีก ${remainingDays} วัน`
  }

  return {
    totalDays: TOTAL_SLA_DAYS,
    elapsedDays,
    remainingDays,
    isExpired,
    isExpiringSoon,
    progressPercent,
    badgeText,
    status,
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
