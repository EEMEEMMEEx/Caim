/**
 * Centralized SMTP Email Notification Configuration
 * Configures Gmail SMTP transport and recipient settings from environment variables.
 */

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  primaryRecipient: string
  baseUrl: string
}

export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "")
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST || "smtp.gmail.com"
  const port = parseInt(process.env.SMTP_PORT || "465", 10)
  // Port 465 typically uses SSL/TLS direct connection (secure: true)
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : port === 465

  const user = process.env.SMTP_USER || "claimstickets@gmail.com"
  const pass = process.env.SMTP_PASS || "pyzzsapzcdvyjtzit"
  const primaryRecipient = process.env.NOTIFICATION_EMAIL_TO || "dopa-only-tm@forth.co.th"
  const baseUrl = getAppBaseUrl()

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: `"CAIM Equipment Claims" <${user}>`,
    primaryRecipient,
    baseUrl,
  }
}
