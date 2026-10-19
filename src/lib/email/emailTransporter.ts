import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import * as tls from "node:tls"
import { getEmailConfig } from "./emailConfig"

let cachedTransporter: Transporter | null = null

export function getEmailTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter

  const config = getEmailConfig()
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })

  return cachedTransporter
}

export interface SendMailOptions {
  to?: string | string[]
  subject: string
  html: string
  text?: string
}

export interface SendMailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Pure Node.js direct TLS SMTP sender fallback
 * Used if external module fails or in environments requiring zero-dependency direct socket dispatch.
 */
async function sendDirectTlsSmtp(options: SendMailOptions): Promise<SendMailResult> {
  const config = getEmailConfig()
  const recipients = Array.isArray(options.to)
    ? options.to
    : [options.to || config.primaryRecipient]

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: config.host,
        port: config.port,
        rejectUnauthorized: false,
        timeout: 15000,
      },
      () => {
        // Connected
      }
    )

    socket.setEncoding("utf8")

    let step = 0
    const messageId = `<caim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@${config.host}>`
    let recipientIndex = 0

    const cleanup = () => {
      try {
        socket.removeAllListeners()
        socket.end()
        socket.destroy()
      } catch {
        // Ignore cleanup errors
      }
    }

    socket.on("timeout", () => {
      cleanup()
      reject(new Error("SMTP socket timeout exceeded (15s)"))
    })

    socket.on("error", (err) => {
      cleanup()
      reject(err)
    })

    socket.on("data", (data: string) => {
      const code = parseInt(data.substring(0, 3), 10)

      if (code >= 400 && code <= 599) {
        cleanup()
        return reject(new Error(`SMTP Server Error (${code}): ${data.trim()}`))
      }

      switch (step) {
        case 0: // Banner received
          if (code === 220) {
            step = 1
            socket.write("EHLO localhost\r\n")
          }
          break

        case 1: // EHLO response received
          if (data.includes("250 ") || data.endsWith("\r\n250 \r\n")) {
            step = 2
            socket.write("AUTH LOGIN\r\n")
          }
          break

        case 2: // Prompt for Username
          if (code === 334) {
            step = 3
            socket.write(Buffer.from(config.user).toString("base64") + "\r\n")
          }
          break

        case 3: // Prompt for Password
          if (code === 334) {
            step = 4
            socket.write(Buffer.from(config.pass).toString("base64") + "\r\n")
          }
          break

        case 4: // Auth Success
          if (code === 235) {
            step = 5
            socket.write(`MAIL FROM:<${config.user}>\r\n`)
          }
          break

        case 5: // MAIL FROM ok
          if (code === 250) {
            step = 6
            socket.write(`RCPT TO:<${recipients[recipientIndex]}>\r\n`)
          }
          break

        case 6: // RCPT TO ok
          if (code === 250) {
            recipientIndex++
            if (recipientIndex < recipients.length) {
              socket.write(`RCPT TO:<${recipients[recipientIndex]}>\r\n`)
            } else {
              step = 7
              socket.write("DATA\r\n")
            }
          }
          break

        case 7: // Ready for DATA
          if (code === 354) {
            step = 8
            const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`
            const toHeader = recipients.join(", ")
            const rawDate = new Date().toUTCString()

            const headers = [
              `From: ${config.from}`,
              `To: ${toHeader}`,
              `Subject: ${encodedSubject}`,
              `Date: ${rawDate}`,
              `Message-ID: ${messageId}`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: base64`,
              "",
            ].join("\r\n")

            const bodyBase64 = Buffer.from(options.html, "utf8").toString("base64")
            // Split base64 body into lines of max 76 chars per RFC
            const formattedBody = bodyBase64.match(/.{1,76}/g)?.join("\r\n") || bodyBase64

            socket.write(headers + formattedBody + "\r\n.\r\n")
          }
          break

        case 8: // Data accepted
          if (code === 250) {
            step = 9
            socket.write("QUIT\r\n")
            cleanup()
            resolve({ success: true, messageId })
          }
          break

        default:
          break
      }
    })
  })
}

/**
 * Dispatches an email using nodemailer with automated direct TLS fallback
 */
export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const config = getEmailConfig()
  const to = options.to || config.primaryRecipient

  try {
    const transporter = getEmailTransporter()
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (nodemailerErr) {
    const errorMessage = nodemailerErr instanceof Error ? nodemailerErr.message : String(nodemailerErr)
    console.warn("[Email Dispatcher] Nodemailer primary transport notice, attempting direct TLS fallback:", errorMessage)

    try {
      const fallbackResult = await sendDirectTlsSmtp(options)
      return fallbackResult
    } catch (fallbackErr) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
      console.error("[Email Dispatcher Failure] Both nodemailer and direct TLS transport failed:", {
        primaryError: errorMessage,
        fallbackError: fallbackMessage,
        subject: options.subject,
        recipient: to,
      })
      return {
        success: false,
        error: `${errorMessage} | Fallback: ${fallbackMessage}`,
      }
    }
  }
}
