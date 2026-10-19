import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { getEmailConfig } from "@/lib/email/emailConfig"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

/**
 * POST /api/settings/test-email
 * Tests live SMTP connectivity by dispatching a test email with the provided or stored configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const serverConfig = getEmailConfig()

    const host = String(body.host || serverConfig.host).trim()
    const port = Number(body.port || serverConfig.port)
    const secure = body.enforceSsl !== undefined
      ? Boolean(body.enforceSsl)
      : body.secure !== undefined
      ? Boolean(body.secure)
      : port === 465

    const user = String(body.user || serverConfig.user).trim()
    const pass = String(body.pass || serverConfig.pass).trim()
    const senderName = String(body.senderName || "USO Project Team").trim()
    const senderEmail = String(body.senderEmail || user).trim()
    const from = `"${senderName}" <${senderEmail}>`

    const targetRecipient = String(body.targetRecipient || body.recipient || serverConfig.primaryRecipient).trim()
    const rejectUnauthorized = body.rejectUnauthorized !== undefined ? Boolean(body.rejectUnauthorized) : false

    if (!targetRecipient) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุอีเมลปลายทางสำหรับทดสอบ (Recipient Email)" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const testTimestamp = new Date().toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "medium",
    })

    const subject = `[CAIM Test] ทดสอบการเชื่อมต่อเซิร์ฟเวอร์ SMTP สำเร็จ (${testTimestamp})`

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <tr>
      <td style="height: 4px; background: linear-gradient(90deg, #10b981, #38bdf8, #3b82f6);"></td>
    </tr>
    <tr>
      <td style="padding: 24px 28px; background-color: #0f172a; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
          CAIM · FORTH CORPORATION
        </div>
        <h2 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 700;">
          ผลการทดสอบการเชื่อมต่อเซิร์ฟเวอร์ SMTP สำเร็จ
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 28px;">
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: 600; color: #34d399; margin-bottom: 4px;">
            ✓ ส่งอีเมลทดสอบและเชื่อมต่อสำเร็จ
          </div>
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            ระบบสามารถเชื่อมต่อกับเซิร์ฟเวอร์เมลและตรวจสอบสิทธิ์ได้เรียบร้อยแล้ว
          </div>
        </div>

        <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; border-left: 3px solid #38bdf8; padding-left: 8px;">
          ข้อมูลการกำหนดค่าที่ใช้ทดสอบ (Configuration Summary)
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; width: 40%; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">SMTP Host</td>
            <td style="padding: 10px 14px; font-weight: 600; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${host}:${port}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ความปลอดภัย (Security)</td>
            <td style="padding: 10px 14px; font-weight: 500; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${secure ? "SSL / TLS (พอร์ต 465)" : "STARTTLS (พอร์ต 587)"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้ส่ง (Sender)</td>
            <td style="padding: 10px 14px; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${senderName} &lt;${senderEmail}&gt;</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้รับทดสอบ (Recipient)</td>
            <td style="padding: 10px 14px; font-weight: 600; color: #10b981; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${targetRecipient}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">เวลาที่ส่ง (Timestamp)</td>
            <td style="padding: 10px 14px; color: #e2e8f0;">${testTimestamp}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 11px; color: #64748b;">
        ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM) · Forth Corporation Public Company Limited
      </td>
    </tr>
  </table>
</body>
</html>`

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    const info = await transporter.sendMail({
      from,
      to: targetRecipient,
      subject,
      html,
      text: `ทดสอบการเชื่อมต่อเซิร์ฟเวอร์ SMTP สำเร็จ\nโฮสต์: ${host}:${port}\nผู้ส่ง: ${from}\nผู้รับ: ${targetRecipient}\nเวลา: ${testTimestamp}`,
    })

    return NextResponse.json(
      {
        success: true,
        message: `เชื่อมต่อและส่งอีเมลทดสอบไปยัง ${targetRecipient} สำเร็จเรียบร้อยแล้ว`,
        messageId: info.messageId,
        timestamp: testTimestamp,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error)
    console.error("[Test Email Endpoint Failure]:", rawMessage)

    // Format clean user-friendly Thai error explanations
    let thaiExplanation = rawMessage
    if (rawMessage.includes("535") || rawMessage.includes("BadCredentials") || rawMessage.includes("Username and Password not accepted")) {
      thaiExplanation = "ชื่อผู้ใช้ (Username) หรือรหัสผ่านแอป (App Password) ไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่าน 16 ตัวอักษรของ Gmail"
    } else if (rawMessage.includes("ETIMEDOUT") || rawMessage.includes("timeout")) {
      thaiExplanation = "การเชื่อมต่อไปยังเซิร์ฟเวอร์ SMTP หมดเวลา (Connection Timeout) กรุณาตรวจสอบ Host และ Port"
    } else if (rawMessage.includes("ENOTFOUND")) {
      thaiExplanation = "ไม่พบโฮสต์เซิร์ฟเวอร์ SMTP (Host not found) กรุณาตรวจสอบชื่อโดเมนโฮสต์"
    } else if (rawMessage.includes("certificate") || rawMessage.includes("self-signed")) {
      thaiExplanation = "ใบรับรองความปลอดภัย SSL/TLS ไม่ผ่านการตรวจสอบ (Certificate validation failed)"
    }

    return NextResponse.json(
      {
        success: false,
        error: `การเชื่อมต่อ SMTP ล้มเหลว: ${thaiExplanation}`,
        details: rawMessage,
      },
      { status: 400, headers: NO_CACHE_HEADERS }
    )
  }
}
