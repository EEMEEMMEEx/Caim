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

export function getEmailConfig(overrideConfig?: Partial<EmailConfig> | Record<string, unknown> | null): EmailConfig {
  const overrides = overrideConfig as Record<string, unknown> | undefined

  const rawHost = String(overrides?.host || process.env.SMTP_HOST || "smtp.gmail.com").trim()
  const rawPort = overrides?.port !== undefined
    ? Number(overrides.port)
    : parseInt(process.env.SMTP_PORT || "465", 10)
  const port = isNaN(rawPort) ? 465 : rawPort

  const secure = overrides?.secure !== undefined
    ? Boolean(overrides.secure)
    : overrides?.enforceSsl !== undefined
    ? Boolean(overrides.enforceSsl)
    : process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : port === 465

  // Extract and sanitize username
  let user = String(overrides?.user || overrides?.senderEmail || process.env.SMTP_USER || "claimstickets@gmail.com").trim()
  if ((user.startsWith('"') && user.endsWith('"')) || (user.startsWith("'") && user.endsWith("'"))) {
    user = user.slice(1, -1).trim()
  }

  // Extract and sanitize password (strip wrapping quotes and internal spaces for Google App Passwords)
  let pass = String(overrides?.pass || process.env.SMTP_PASS || "yzzsapzcdvyjtzit").trim()
  if ((pass.startsWith('"') && pass.endsWith('"')) || (pass.startsWith("'") && pass.endsWith("'"))) {
    pass = pass.slice(1, -1).trim()
  }
  pass = pass.replace(/\s+/g, "")

  // Extract and sanitize primary recipient (dopa-only-tm@forth.co.th)
  let primaryRecipient = String(
    overrides?.targetRecipient || overrides?.primaryRecipient || process.env.NOTIFICATION_EMAIL_TO || "dopa-only-tm@forth.co.th"
  ).trim()
  if ((primaryRecipient.startsWith('"') && primaryRecipient.endsWith('"')) || (primaryRecipient.startsWith("'") && primaryRecipient.endsWith("'"))) {
    primaryRecipient = primaryRecipient.slice(1, -1).trim()
  }

  const senderName = String(overrides?.senderName || "CAIM Equipment Claims").trim()
  const baseUrl = getAppBaseUrl()

  return {
    host: rawHost,
    port,
    secure,
    user,
    pass,
    from: `"${senderName}" <${user}>`,
    primaryRecipient,
    baseUrl,
  }
}
