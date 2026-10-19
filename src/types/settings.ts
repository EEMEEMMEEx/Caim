export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  senderName: string
  senderEmail: string
  enforceSsl: boolean
  rejectUnauthorized: boolean
  targetRecipient: string
}

export const DEFAULT_SMTP_SETTINGS: SmtpSettings = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "claimstickets@gmail.com",
  pass: "pyzzsapzcdvyjtzit",
  senderName: "USO Project Team",
  senderEmail: "claimstickets@gmail.com",
  enforceSsl: true,
  rejectUnauthorized: false,
  targetRecipient: "dopa-only-tm@forth.co.th",
}
