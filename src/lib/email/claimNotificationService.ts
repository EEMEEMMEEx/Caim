import { after } from "next/server"
import type { TicketDocument } from "@/types/database"
import { sendEmail } from "./emailTransporter"
import { getEmailConfig } from "./emailConfig"
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
 * Utilizes Next.js `after()` when in a request lifecycle, falling back to background Promise.
 */
function runNonBlocking(task: () => Promise<void>): void {
  try {
    if (typeof after === "function") {
      after(async () => {
        try {
          await task()
        } catch (err) {
          console.error("[Claim Notification Service] Background task unhandled error:", err)
        }
      })
      return
    }
  } catch {
    // If after() is invoked outside of request context, fall back to background promise
  }

  Promise.resolve().then(async () => {
    try {
      await task()
    } catch (err) {
      console.error("[Claim Notification Service] Background promise unhandled error:", err)
    }
  })
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
        `[Claim Notification] Dispatching new claim email for ${ticket.id} (${ticket.vendor} ${ticket.model}) to ${recipients.join(", ")}...`
      )

      const result = await sendEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (result.success) {
        console.log(`[Claim Notification] Email sent successfully for new claim ${ticket.id}. MessageID: ${result.messageId}`)
      } else {
        console.error(`[Claim Notification] Failed to send new claim email for ${ticket.id}:`, result.error)
      }
    } catch (err) {
      console.error(`[Claim Notification] Unexpected error sending new claim email for ${ticket.id}:`, err)
    }
  })
}

/**
 * Trigger B: Dispatches transactional email when an existing claim is updated or status changed
 */
export function notifyClaimUpdated(params: ClaimUpdatedEmailParams): void {
  const claimId = params.updatedTicket.id

  runNonBlocking(async () => {
    try {
      const emailContent = buildClaimUpdatedEmail(params)
      const recipients = resolveClaimRecipients(params.updatedTicket)

      console.log(
        `[Claim Notification] Dispatching claim status/update email for ${claimId} to ${recipients.join(", ")}...`
      )

      const result = await sendEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (result.success) {
        console.log(`[Claim Notification] Email sent successfully for updated claim ${claimId}. MessageID: ${result.messageId}`)
      } else {
        console.error(`[Claim Notification] Failed to send claim updated email for ${claimId}:`, result.error)
      }
    } catch (err) {
      console.error(`[Claim Notification] Unexpected error sending claim updated email for ${claimId}:`, err)
    }
  })
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
      const emailContent = buildRmaStageUpdatedEmail(params)
      const recipients = resolveClaimRecipients(params.ticket, params.additionalRecipients)

      console.log(
        `[RMA Notification] Dispatching RMA stage update email for ${rmaId} to ${recipients.join(", ")}...`
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

