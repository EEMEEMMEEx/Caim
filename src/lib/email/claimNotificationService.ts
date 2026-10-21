import { after } from "next/server"
import type { TicketDocument } from "@/types/database"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { getPersistentTickets } from "@/lib/storage/serverTicketStorage"
import { sendEmail, type SendMailResult } from "./emailTransporter"
import { getEmailConfig, type EmailConfig } from "./emailConfig"
import {
  buildNewClaimEmail,
  buildClaimUpdatedEmail,
  buildRmaStageUpdatedEmail,
  type ClaimUpdatedEmailParams,
  type RmaStageUpdatedEmailParams,
} from "./templates/claimEmailTemplates"

/**
 * Resolves all intended recipients for a claim notification:
 * 1. Default operations team address (dopa-only-tm@forth.co.th)
 * 2. Assigned technician / assignee email if present or parseable
 * 3. Reporter / creator email if present or parseable
 * 4. Any optional explicit additional recipients
 */
export function resolveClaimRecipients(
  ticket?: TicketDocument | null,
  additionalRecipients?: string[]
): string[] {
  const config = getEmailConfig()
  const recipients = new Set<string>()

  // Always include designated operations address (dopa-only-tm@forth.co.th)
  if (config.primaryRecipient) {
    recipients.add(config.primaryRecipient.trim().toLowerCase())
  }

  const extractEmails = (val?: unknown): string[] => {
    if (!val || typeof val !== "string") return []
    const matches = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    return matches ? matches.map((m) => m.trim().toLowerCase()) : []
  }

  if (ticket) {
    // Check reporter and assignee fields
    extractEmails(ticket.reporter).forEach((e) => recipients.add(e))
    extractEmails(ticket.reporterName).forEach((e) => recipients.add(e))
    extractEmails(ticket.assignee).forEach((e) => recipients.add(e))
    extractEmails(ticket.assigneeName).forEach((e) => recipients.add(e))

    // Check optional dynamic email properties if present
    const anyTicket = ticket as unknown as Record<string, unknown>
    extractEmails(anyTicket.reporterEmail).forEach((e) => recipients.add(e))
    extractEmails(anyTicket.assigneeEmail).forEach((e) => recipients.add(e))
    extractEmails(anyTicket.technicianEmail).forEach((e) => recipients.add(e))
    extractEmails(anyTicket.contactEmail).forEach((e) => recipients.add(e))
  }

  if (additionalRecipients) {
    additionalRecipients.forEach((item) => {
      extractEmails(item).forEach((e) => recipients.add(e))
    })
  }

  return Array.from(recipients)
}

/**
 * Executes a task asynchronously without blocking the calling thread.
 * Guarantees execution via setImmediate / detached promise while safely registering
 * with Next.js after() when present in an active request lifecycle.
 */
function runNonBlocking(task: () => Promise<void>): void {
  let executed = false

  const executeOnce = async () => {
    if (executed) return
    executed = true
    try {
      // Impose a strict 4-second safety ceiling so background email dispatch NEVER keeps serverless invocation alive
      await Promise.race([
        task(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Background email task safety timeout (4s exceeded)")), 4000)
        ),
      ])
    } catch (err) {
      console.warn("[Claim Notification Service] Background task notice:", err)
    }
  }

  // Hook into Next.js request lifecycle if active
  try {
    if (typeof after === "function") {
      after(executeOnce)
    }
  } catch {
    // Expected when invoked outside dynamic request context
  }

  // Always schedule on Node.js event loop check phase to guarantee background delivery
  if (typeof setImmediate === "function") {
    setImmediate(executeOnce)
  } else {
    Promise.resolve().then(executeOnce)
  }
}

/**
 * Trigger A: Dispatches transactional email when a new claim is created
 */
export function notifyNewClaimCreated(ticket: TicketDocument): void {
  runNonBlocking(async () => {
    try {
      const emailContent = buildNewClaimEmail(ticket)
      const recipients = resolveClaimRecipients(ticket)

      console.log(
        `[Claim Notification] Dispatching new claim email for ${ticket.id} (${ticket.vendor} ${ticket.model}) to ${recipients.join(", ")} | Subject: ${emailContent.subject}`
      )

      const result = await sendEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (result.success) {
        console.log(
          `[Claim Notification Success] Email sent successfully for new claim ${ticket.id}. MessageID: ${result.messageId || "N/A"}`
        )
      } else {
        console.error(
          `[Claim Notification Error] Failed to send new claim email for ${ticket.id} to ${recipients.join(", ")}:`,
          result.error
        )
      }
    } catch (err) {
      console.error(`[Claim Notification Error] Unexpected error sending new claim email for ${ticket.id}:`, err)
    }
  })
}

export interface NotifyClaimUpdatedOptions extends ClaimUpdatedEmailParams {
  smtpSettings?: Partial<EmailConfig> | Record<string, unknown> | null
}

/**
 * Trigger B: Dispatches transactional email when an existing claim is updated or status changed
 */
export async function notifyClaimUpdated(params: NotifyClaimUpdatedOptions): Promise<SendMailResult> {
  const claimId = params.updatedTicket.id
  const prevStatus = params.previousTicket?.status || "รับแจ้ง"
  const newStatus = params.updatedTicket.status || prevStatus

  console.log('[SMTP] Attempting dispatch for:', claimId)

  try {
    const emailContent = buildClaimUpdatedEmail(params)
    const targetRecipient = (params.smtpSettings as Record<string, unknown>)?.targetRecipient as string | undefined
    const recipients = resolveClaimRecipients(
      params.updatedTicket,
      targetRecipient ? [targetRecipient] : undefined
    )

    console.log(
      `[SMTP] Dispatching claim status update email for ${claimId} ('${prevStatus}' → '${newStatus}') to: ${recipients.join(", ")} | Subject: ${emailContent.subject}`
    )

    const result = await sendEmail({
      to: recipients,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      smtpSettings: params.smtpSettings,
    })

    if (result.success) {
      console.log('[SMTP] Success, messageId:', result.messageId || "N/A")
    } else {
      console.error('[SMTP] Failed to send email:', result.error || "Unknown dispatch failure")
    }

    return result
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[SMTP] Failed to send email:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Alias for notifyClaimUpdated to explicitly semanticize status change triggers
 */
export const notifyClaimStatusChanged = notifyClaimUpdated

/**
 * Trigger C: Dispatches transactional email when an Overseas RMA record progresses through stages
 */
export function notifyRmaStageUpdated(params: RmaStageUpdatedEmailParams): void {
  const rmaId = params.updatedRma.rmaNo || params.updatedRma.id

  runNonBlocking(async () => {
    try {
      let linkedTicket: TicketDocument | null = params.ticket || null
      const targetTicketId = linkedTicket?.id || params.updatedRma.ticketId

      // Directly query targeted claim record by unique ID (params.id / claimId) from DB or persistent store
      const anyTicket = linkedTicket as unknown as Record<string, unknown> | null
      const hasEquipmentInfo = Boolean(linkedTicket?.vendor || anyTicket?.brand) && Boolean(linkedTicket?.model)
      if ((!linkedTicket || !hasEquipmentInfo) && targetTicketId) {
        if (isMongoConfigured()) {
          try {
            const db = await getDb()
            if (db) {
              const doc = await db.collection<TicketDocument>("tickets").findOne({ id: targetTicketId })
              if (doc) linkedTicket = doc
            }
          } catch (dbErr) {
            console.warn("[RMA Notification] MongoDB query for ticket failed, fallback to disk store:", dbErr)
          }
        }
        if (!linkedTicket) {
          const tickets = getPersistentTickets()
          linkedTicket = tickets.find((t) => t.id === targetTicketId) || null
        }
      }

      const emailParams: RmaStageUpdatedEmailParams = {
        ...params,
        ticket: linkedTicket,
      }

      const emailContent = buildRmaStageUpdatedEmail(emailParams)
      const recipients = resolveClaimRecipients(linkedTicket, params.additionalRecipients)

      console.log(
        `[RMA Notification] Dispatching RMA stage update email for ${rmaId} to ${recipients.join(", ")} | Subject: ${emailContent.subject}`
      )

      const result = await sendEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (result.success) {
        console.log(`[RMA Notification] Email sent successfully for RMA ${rmaId}. MessageID: ${result.messageId}`)
      } else {
        console.error(`[RMA Notification] Failed to send RMA stage email for ${rmaId}:`, result.error)
      }
    } catch (err) {
      console.error(`[RMA Notification] Unexpected error sending RMA stage email for ${rmaId}:`, err)
    }
  })
}

