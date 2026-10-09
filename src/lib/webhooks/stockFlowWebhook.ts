import { createHmac } from "node:crypto"
import type { CaimRepairOutcome, TicketDocument } from "@/types/database"

/**
 * CAIM -> Stock-Flow outbound webhook dispatcher (Stock-Flow Integration Plan, Phase 2).
 *
 * Contract (see docs/caim-webhook-integration-plan.md section 3.2 in the Stock-Flow repo):
 *   POST ${STOCKFLOW_WEBHOOK_URL || "https://stockflowth.online/api/caim-webhook"}
 *   - x-caim-signature: sha256=<hex HMAC-SHA256 of the exact raw UTF-8 request body using CAIM_WEBHOOK_SECRET>
 *   - x-caim-timestamp: unix epoch seconds (Stock-Flow rejects drift greater than 5 minutes)
 *   - x-caim-event-id: deterministic idempotency key stored in Stock-Flow "caim_webhook_logs.event_id"
 *
 * The dispatcher is called from "after()" inside the tickets route so a Stock-Flow outage can never
 * block or fail a CAIM case update.
 */

const DEFAULT_WEBHOOK_URL = "https://stockflowth.online/api/caim-webhook"
const REQUEST_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 2 // 1 initial attempt + 1 retry on transient failure
const DEFAULT_DISPOSAL_METHOD = "electronic_waste"

export interface StockFlowWebhookPayload {
  event: "claim.closed"
  eventId: string
  ticketId: string
  serialNo: string
  repairResult: CaimRepairOutcome
  technicianNotes: string
  disposalMethod: string | null
  replacedNewSerialNo: string | null
  closedAt: string
  closedBy: string
}

export interface DispatchOptions {
  closedAt?: string
  closedBy?: string
}

export interface DispatchOutcome {
  delivered: boolean
  eventId?: string
  status?: number
  skippedReason?: "missing-secret" | "unmapped-repair-result" | "missing-ticket-id"
}

/**
 * Heuristic keyword mapping from the free-text CAIM "repairResult" to the Stock-Flow contract enum.
 * Unrepairable is matched first because it never inflates stock (see integration plan section 6).
 */
const OUTCOME_KEYWORDS: Array<{ outcome: CaimRepairOutcome; pattern: RegExp }> = [
  {
    outcome: "unrepairable",
    pattern: /ซ่อมไม่ได้|ไม่คุ้ม|ไม่สามารถซ่อม|แทงจำหน่าย|ตัดจำหน่าย|จำหน่ายออก|ทิ้ง|unrepairable|beyond economic|scrap|\bber\b/i,
  },
  {
    outcome: "replaced_new",
    pattern: /เปลี่ยน(เครื่อง|ของ|ตัว|อุปกรณ์)?ใหม่|เปลี่ยนใหม่|ของใหม่|ทดแทน|replaced|replace/i,
  },
  {
    outcome: "repaired",
    pattern: /ซ่อมได้|ซ่อมเสร็จ|ซ่อมผ่าน|ซ่อมเรียบร้อย|ซ่อมสำเร็จ|ใช้งานได้|repaired|repair success|fixed/i,
  },
]

export function isCaimRepairOutcome(value: unknown): value is CaimRepairOutcome {
  return value === "unrepairable" || value === "repaired" || value === "replaced_new"
}

/**
 * Resolve the outbound repairResult enum. An explicit "repairOutcome" field always wins;
 * otherwise the free-text "repairResult" is mapped by keyword. Returns null when the result
 * is ambiguous so no stock movement is ever guessed.
 */
export function resolveRepairOutcome(
  ticket: Pick<TicketDocument, "repairOutcome" | "repairResult" | "replacedNewSerialNo">
): CaimRepairOutcome | null {
  if (isCaimRepairOutcome(ticket.repairOutcome)) {
    return ticket.repairOutcome
  }

  const text = String(ticket.repairResult || "").trim()
  if (!text) return null

  for (const entry of OUTCOME_KEYWORDS) {
    if (entry.pattern.test(text)) return entry.outcome
  }

  return null
}

export function buildStockFlowWebhookPayload(
  ticket: TicketDocument,
  options: DispatchOptions = {}
): StockFlowWebhookPayload | null {
  const repairResult = resolveRepairOutcome(ticket)
  if (!repairResult) return null

  const replacedNewSerialNo = String(ticket.replacedNewSerialNo || "").trim() || null
  const closedAt = options.closedAt || ticket.closedAt || new Date().toISOString()
  const serialNo = String(ticket.serialNo || "").trim() || "-"

  return {
    event: "claim.closed",
    eventId: `${ticket.id}:${repairResult}:${replacedNewSerialNo || serialNo}`,
    ticketId: ticket.id,
    serialNo,
    repairResult,
    technicianNotes: String(ticket.repairResult || "").trim(),
    disposalMethod: repairResult === "unrepairable" ? String(ticket.disposalMethod || "").trim() || DEFAULT_DISPOSAL_METHOD : null,
    replacedNewSerialNo: repairResult === "replaced_new" ? replacedNewSerialNo : null,
    closedAt,
    closedBy:
      options.closedBy ||
      ticket.closedBy ||
      String(ticket.assigneeName || ticket.assignee || ticket.reporterName || ticket.reporter || "").trim() ||
      "เจ้าหน้าที่ CAIM",
  }
}

export function signStockFlowPayload(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`
}

async function postOnce(url: string, rawBody: string, secret: string, eventId: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-caim-signature": signStockFlowPayload(rawBody, secret),
        "x-caim-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-caim-event-id": eventId,
      },
      body: rawBody,
      cache: "no-store",
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function dispatchStockFlowWebhook(
  ticket: TicketDocument,
  options: DispatchOptions = {}
): Promise<DispatchOutcome> {
  if (!ticket?.id) {
    return { delivered: false, skippedReason: "missing-ticket-id" }
  }

  const secret = process.env.CAIM_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.warn("[StockFlow Webhook] skipped: CAIM_WEBHOOK_SECRET is not configured")
    return { delivered: false, skippedReason: "missing-secret" }
  }

  const payload = buildStockFlowWebhookPayload(ticket, options)
  if (!payload) {
    console.warn(
      `[StockFlow Webhook] skipped: cannot map repairResult for ticket ${ticket.id} (repairResult="${ticket.repairResult || ""}")`
    )
    return { delivered: false, skippedReason: "unmapped-repair-result" }
  }

  const url = process.env.STOCKFLOW_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL
  const rawBody = JSON.stringify(payload)

  let lastStatus: number | undefined
  let lastError: string | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await postOnce(url, rawBody, secret, payload.eventId)
      lastStatus = res.status

      if (res.ok) {
        console.info(`[StockFlow Webhook] delivered ${payload.eventId} (HTTP ${res.status})`)
        return { delivered: true, eventId: payload.eventId, status: res.status }
      }

      const bodyText = await res.text().catch(() => "")
      lastError = bodyText.slice(0, 300)

      if (res.status < 500 && res.status !== 429) {
        console.error(`[StockFlow Webhook] rejected ${payload.eventId} (HTTP ${res.status}): ${lastError}`)
        return { delivered: false, eventId: payload.eventId, status: res.status }
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[StockFlow Webhook] retrying ${payload.eventId} (attempt ${attempt} failed: ${lastError})`)
    }
  }

  console.error(`[StockFlow Webhook] failed ${payload.eventId} after ${MAX_ATTEMPTS} attempts: ${lastError || lastStatus}`)
  return { delivered: false, eventId: payload.eventId, status: lastStatus }
}
