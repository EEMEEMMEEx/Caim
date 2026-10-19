import { after } from "next/server"
import type { TicketDocument } from "@/types/database"
import { sendEmail } from "./emailTransporter"
import {
  buildNewClaimEmail,
  buildClaimUpdatedEmail,
  type ClaimUpdatedEmailParams,
} from "./templates/claimEmailTemplates"

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
      console.log(`[Claim Notification] Dispatching new claim email for ${ticket.id} (${ticket.vendor} ${ticket.model})...`)

      const result = await sendEmail({
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
      console.log(`[Claim Notification] Dispatching claim updated email for ${claimId}...`)

      const result = await sendEmail({
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
