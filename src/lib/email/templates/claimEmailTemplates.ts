import type { TicketDocument } from "@/types/database"
import { getAppBaseUrl } from "../emailConfig"

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "-"
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  "รับแจ้ง": { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.35)" },
  "ส่งศูนย์": { bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa", border: "rgba(139, 92, 246, 0.35)" },
  "รออะไหล่": { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.35)" },
  "ซ่อมเสร็จ": { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.35)" },
  "รอส่งมอบ": { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.35)" },
  "ปิดเคส": { bg: "rgba(148, 163, 184, 0.15)", text: "#cbd5e1", border: "rgba(148, 163, 184, 0.35)" },
  "ปฏิเสธเคลม": { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.35)" },
}

function getStatusBadgeHtml(statusName: string): string {
  const normalized = statusName || "รับแจ้ง"
  const colors = STATUS_COLOR_MAP[normalized] || {
    bg: "rgba(59, 130, 246, 0.15)",
    text: "#60a5fa",
    border: "rgba(59, 130, 246, 0.35)",
  }

  return `<span style="display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: ${colors.text}; background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 9999px;">${escapeHtml(normalized)}</span>`
}

/**
 * Trigger A: New Claim Created
 * Generates subject and responsive enterprise dark HTML body
 */
export function buildNewClaimEmail(ticket: TicketDocument): { subject: string; html: string; text: string } {
  const baseUrl = getAppBaseUrl()
  const claimId = ticket.id
  const brand = ticket.vendor || "Other"
  const model = ticket.model || "-"
  const equipmentName = `${brand} ${model}`.trim()
  const serialNo = ticket.serialNo || "-"
  const location = ticket.location || ticket.station || [ticket.subdistrict, ticket.district, ticket.province].filter(Boolean).join(" ") || "-"
  const problemDesc = ticket.problemDesc || "-"
  const reporter = ticket.reporterName || ticket.reporter || "ไม่ระบุ"
  const assignee = ticket.assigneeName || ticket.assignee || "รอระบุผู้รับผิดชอบ"
  const status = ticket.status || "รับแจ้ง"
  const reportedDate = ticket.date || ticket.reportedDate || new Date().toLocaleDateString("th-TH")
  const deadlineDate = ticket.deadlineDate || "-"
  const remarks = ticket.remarks || ""

  const claimDetailUrl = `${baseUrl}/tickets/${encodeURIComponent(claimId)}`
  const subject = `[Process Claim] แจ้งเปิดเคสงานเคลมใหม่: ${claimId} (${equipmentName})`

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #1e293b; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Accent Banner -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #2563eb, #38bdf8, #10b981);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #0f172a; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      FORTH CORPORATION · CAIM PORTAL
                    </div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                      แจ้งเปิดเคสงานเคลมอุปกรณ์ใหม่
                    </h1>
                  </td>
                  <td align="right" valign="top">
                    ${getStatusBadgeHtml(status)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Claim ID & Summary Box -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">เลขที่เคลม (Claim Number)</div>
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 18px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px;">
                      ${escapeHtml(claimId)}
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="font-size: 12px; color: #94a3b8;">วันที่รับแจ้ง</div>
                    <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${escapeHtml(reportedDate)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Equipment Info Section -->
          <tr>
            <td style="padding: 12px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 8px;">
                ข้อมูลอุปกรณ์ (Equipment Details)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <tr>
                  <td style="padding: 12px 16px; width: 40%; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ยี่ห้อ / แบรนด์ (Brand)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(brand)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">รุ่นอุปกรณ์ (Model)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(model)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">หมายเลขซีเรียล (S/N)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-family: ui-monospace, monospace; font-weight: 600; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(serialNo)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8;">สถานที่ติดตั้ง / สถานี (Location)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f1f5f9;">${escapeHtml(location)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Issue & Symptoms Section -->
          <tr>
            <td style="padding: 12px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #f59e0b; padding-left: 8px;">
                อาการเสีย / ปัญหาที่พบ (Issue &amp; Symptoms)
              </div>
              <div style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 14px 16px; font-size: 14px; line-height: 1.6; color: #f8fafc;">
                ${escapeHtml(problemDesc)}
              </div>
            </td>
          </tr>

          <!-- Stakeholders & SLA Section -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #10b981; padding-left: 8px;">
                ผู้เกี่ยวข้องและกำหนดการ (Stakeholders &amp; SLA)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <tr>
                  <td style="padding: 12px 16px; width: 40%; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้แจ้งเคลม (Reporter)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 500; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(reporter)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้รับผิดชอบ (Assignee)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(assignee)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; ${remarks ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.05);' : ''}">กำหนด SLA (Due Date)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #fbbf24; ${remarks ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.05);' : ''}">${escapeHtml(deadlineDate)}</td>
                </tr>
                ${remarks ? `
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8;">หมายเหตุ (Remarks)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0;">${escapeHtml(remarks)}</td>
                </tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Direct CTA Button -->
          <tr>
            <td align="center" style="padding: 12px 32px 36px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                    <a href="${claimDetailUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      เปิดดูรายละเอียดเคสในระบบ CAIM &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-top: 12px;">
                หรือเปิดลิงก์: <a href="${claimDetailUrl}" style="color: #38bdf8; text-decoration: underline;">${escapeHtml(claimDetailUrl)}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 4px;">
                ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM)
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                Forth Corporation Public Company Limited · กรมการปกครอง (DOPA)
              </div>
              <div style="font-size: 11px; color: #475569;">
                อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `[Process Claim] แจ้งเปิดเคสงานเคลมใหม่: ${claimId} (${equipmentName})
-------------------------------------------------------------
เลขที่เคลม: ${claimId}
วันที่รับแจ้ง: ${reportedDate}
อุปกรณ์: ${equipmentName}
หมายเลขซีเรียล: ${serialNo}
สถานที่ติดตั้ง: ${location}
ปัญหาที่พบ: ${problemDesc}
ผู้แจ้งเคลม: ${reporter}
ผู้รับผิดชอบ: ${assignee}
กำหนด SLA: ${deadlineDate}

เปิดดูรายละเอียดเคส: ${claimDetailUrl}
`

  return { subject, html, text }
}

function formatThaiDateTime(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date()
  const d = isNaN(date.getTime()) ? new Date() : date
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]
  const day = d.getDate()
  const month = thaiMonths[d.getMonth()]
  const year = d.getFullYear() + 543
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`
}

export interface ClaimUpdatedEmailParams {
  previousTicket: TicketDocument | null
  updatedTicket: TicketDocument
  modifiedFields?: Record<string, unknown>
}

/**
 * Trigger B: Claim Status Changed / Updated
 * Generates subject and responsive enterprise dark HTML body with:
 * - Subject: [Process Claim] อัปเดตสถานะเคส: {claimId} ({equipmentName}) → {newStatus}
 * - Header: Process Claim brand styling with timestamp
 * - Status Transition Banner: สถานะเดิม: {previousStatus} → สถานะใหม่: {newStatus}
 * - Core Metadata Summary Card: Claim ID, Equipment, Location, Assignee/Reporter, Remarks/Notes
 * - CTA Button: 'เปิดดูรายละเอียดเคส'
 */
export function buildClaimUpdatedEmail(params: ClaimUpdatedEmailParams): { subject: string; html: string; text: string } {
  const { previousTicket, updatedTicket, modifiedFields } = params
  const baseUrl = getAppBaseUrl()
  const claimId = updatedTicket.id || "CLM-UNKNOWN"
  const brand = updatedTicket.vendor || "Other"
  const model = updatedTicket.model || "-"
  const equipmentName = `${brand} ${model}`.trim() || "อุปกรณ์"
  const serialNo = updatedTicket.serialNo || "-"
  const location =
    updatedTicket.location ||
    updatedTicket.station ||
    [updatedTicket.subdistrict, updatedTicket.district, updatedTicket.province].filter(Boolean).join(" ") ||
    "-"
  const assignee = updatedTicket.assigneeName || updatedTicket.assignee || "รอระบุผู้รับผิดชอบ"
  const reporter = updatedTicket.reporterName || updatedTicket.reporter || "ไม่ระบุผู้แจ้ง"

  const prevStatus = previousTicket?.status || "รับแจ้ง"
  const newStatus = updatedTicket.status || prevStatus
  const isStatusChanged = prevStatus !== newStatus

  // Format remarks / repair outcome / notes
  const outcomePart = updatedTicket.repairOutcome
    ? `ผลการซ่อม: ${updatedTicket.repairOutcome}`
    : updatedTicket.repairResult
    ? `ผลการซ่อม: ${updatedTicket.repairResult}`
    : ""
  const remarksPart = updatedTicket.remarks ? `หมายเหตุ: ${updatedTicket.remarks}` : ""
  const remarksOrNotes = [outcomePart, remarksPart].filter(Boolean).join(" | ") || "ไม่มีบันทึกเพิ่มเติม"

  const subject = `[Process Claim] อัปเดตสถานะเคส: ${claimId} (${equipmentName}) → ${newStatus}`
  const claimDetailUrl = `${baseUrl}/tickets/${encodeURIComponent(claimId)}`
  const formattedTimestamp = formatThaiDateTime(updatedTicket.updatedAt || new Date())

  // Build summary of changed/modified fields if available
  const changes: Array<{ label: string; oldValue?: string; newValue: string }> = []

  if (isStatusChanged) {
    changes.push({
      label: "สถานะงานเคลม (Status Transition)",
      oldValue: prevStatus,
      newValue: newStatus,
    })
  }

  // Repair Outcome / Notes
  const prevOutcome = previousTicket?.repairOutcome || previousTicket?.repairResult
  const newOutcome = updatedTicket.repairOutcome || updatedTicket.repairResult
  if (newOutcome && newOutcome !== prevOutcome) {
    changes.push({
      label: "ผลการซ่อม / บันทึกผลช่าง (Repair Outcome)",
      oldValue: prevOutcome ? String(prevOutcome) : "—",
      newValue: String(newOutcome),
    })
  }

  // Permit / RMA Linkage
  const prevRma = previousTicket?.rmaId
  const newRma = updatedTicket.rmaId
  if (newRma && newRma !== prevRma) {
    changes.push({
      label: "หนังสืออนุญาต / Overseas RMA (Permit Linkage)",
      oldValue: prevRma ? String(prevRma) : "—",
      newValue: String(newRma),
    })
  }

  // SLA Schedule Adjustments
  const prevDeadline = previousTicket?.deadlineDate
  const newDeadline = updatedTicket.deadlineDate
  if (newDeadline && newDeadline !== prevDeadline) {
    changes.push({
      label: "กำหนดการ SLA (SLA Schedule)",
      oldValue: prevDeadline ? String(prevDeadline) : "—",
      newValue: String(newDeadline),
    })
  }

  // Assignee
  const prevAssignee = previousTicket?.assigneeName || previousTicket?.assignee
  const newAssignee = updatedTicket.assigneeName || updatedTicket.assignee
  if (newAssignee && newAssignee !== prevAssignee) {
    changes.push({
      label: "ผู้รับผิดชอบเคส (Assignee)",
      oldValue: prevAssignee ? String(prevAssignee) : "—",
      newValue: String(newAssignee),
    })
  }

  // Remarks
  const prevRemarks = previousTicket?.remarks
  const newRemarks = updatedTicket.remarks
  if (newRemarks && newRemarks !== prevRemarks) {
    changes.push({
      label: "หมายเหตุเพิ่มเติม (Remarks)",
      oldValue: prevRemarks ? String(prevRemarks) : "—",
      newValue: String(newRemarks),
    })
  }

  // Fallback to checking modifiedFields map
  if (changes.length === 0 && modifiedFields) {
    for (const [key, val] of Object.entries(modifiedFields)) {
      if (key !== "id" && key !== "updatedAt" && val !== undefined) {
        changes.push({
          label: key,
          newValue: String(val),
        })
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #1e293b; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Accent Banner -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #38bdf8);"></td>
          </tr>

          <!-- Email Header: Process Claim brand styling with timestamp -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #0f172a; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      FORTH CORPORATION · CAIM PORTAL
                    </div>
                    <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                      อัปเดตสถานะเคสงานเคลม (Process Claim)
                    </h1>
                    <div style="font-size: 12px; color: #94a3b8;">
                      เวลาที่อัปเดต: <span style="color: #cbd5e1; font-weight: 500;">${escapeHtml(formattedTimestamp)}</span>
                    </div>
                  </td>
                  <td align="right" valign="top">
                    ${getStatusBadgeHtml(newStatus)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Transition Banner: สถานะเดิม: {previousStatus} → สถานะใหม่: {newStatus} -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 18px 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 8px;">
                    การเปลี่ยนสถานะเคสงานเคลม (Status Transition)
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 15px; font-weight: 600; color: #e2e8f0; line-height: 1.6;">
                      <span style="color: #94a3b8;">สถานะเดิม:</span>
                      <span style="display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #94a3b8; background-color: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 9999px; text-decoration: line-through; margin: 0 6px;">
                        ${escapeHtml(prevStatus)}
                      </span>
                      <span style="display: inline-block; margin: 0 8px; color: #38bdf8; font-weight: 700; font-size: 16px;">&rarr;</span>
                      <span style="color: #38bdf8; font-weight: 700;">สถานะใหม่:</span>
                      <span style="display: inline-block; margin-left: 6px;">
                        ${getStatusBadgeHtml(newStatus)}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Core Metadata Summary Card -->
          <tr>
            <td style="padding: 12px 32px 16px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #38bdf8; padding-left: 8px;">
                ข้อมูลสรุปเคสงานเคลม (Core Case Summary)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.45); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.07); overflow: hidden;">
                <!-- เลขที่เคส (Claim ID) -->
                <tr>
                  <td style="padding: 12px 16px; width: 38%; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">เลขที่เคส (Claim ID)</td>
                  <td style="padding: 12px 16px; font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(claimId)}</td>
                </tr>
                <!-- อุปกรณ์ (Equipment) -->
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">อุปกรณ์ (Equipment)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f1f5f9; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <span style="font-weight: 600; color: #ffffff;">${escapeHtml(brand)} ${escapeHtml(model)}</span>
                    <span style="display: block; font-family: ui-monospace, monospace; font-size: 12px; color: #38bdf8; margin-top: 2px;">S/N: ${escapeHtml(serialNo)}</span>
                  </td>
                </tr>
                <!-- สถานที่ติดตั้ง (Location) -->
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">สถานที่ติดตั้ง (Location)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(location)}</td>
                </tr>
                <!-- ผู้รับผิดชอบ / ช่าง & ผู้แจ้ง -->
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้รับผิดชอบ / ช่าง (Assignee)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(assignee)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้แจ้ง (Reporter)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f1f5f9; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(reporter)}</td>
                </tr>
                <!-- บันทึกเพิ่มเติม / ผลการดำเนินการ (Remarks/Notes) -->
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; vertical-align: top;">บันทึกเพิ่มเติม / ผลการดำเนินการ (Remarks/Notes)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0; line-height: 1.5;">${escapeHtml(remarksOrNotes)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${changes.length > 0 ? `
          <!-- Summary of Modified Fields (if present) -->
          <tr>
            <td style="padding: 8px 32px 20px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #8b5cf6; padding-left: 8px;">
                สรุปรายการที่ปรับปรุงเพิ่มเติม (Additional Modifications)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
                ${changes.map((c, idx) => `
                <tr>
                  <td style="padding: 12px 16px; width: 45%; font-size: 13px; color: #94a3b8; vertical-align: top; ${idx < changes.length - 1 ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.05);' : ''}">
                    ${escapeHtml(c.label)}
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f8fafc; ${idx < changes.length - 1 ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.05);' : ''}">
                    ${c.oldValue ? `
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">เดิม: ${escapeHtml(c.oldValue)}</div>
                    <div style="font-weight: 600; color: #38bdf8;">ใหม่: ${escapeHtml(c.newValue)}</div>
                    ` : `
                    <div style="font-weight: 600; color: #38bdf8;">${escapeHtml(c.newValue)}</div>
                    `}
                  </td>
                </tr>
                `).join("")}
              </table>
            </td>
          </tr>` : ""}

          <!-- Action Button / CTA: direct link button labeled 'เปิดดูรายละเอียดเคส' -->
          <tr>
            <td align="center" style="padding: 12px 32px 36px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                    <a href="${claimDetailUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                      เปิดดูรายละเอียดเคส &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-top: 12px;">
                หรือเปิดลิงก์: <a href="${claimDetailUrl}" style="color: #38bdf8; text-decoration: underline;">${escapeHtml(claimDetailUrl)}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 4px;">
                ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM)
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                Forth Corporation Public Company Limited · กรมการปกครอง (DOPA)
              </div>
              <div style="font-size: 11px; color: #475569;">
                อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `[Process Claim] อัปเดตสถานะเคส: ${claimId} (${equipmentName}) → ${newStatus}
-------------------------------------------------------------
สถานะเดิม: ${prevStatus} → สถานะใหม่: ${newStatus}
เวลาที่อัปเดต: ${formattedTimestamp}

ข้อมูลสรุปเคสงานเคลม (Core Case Summary):
- เลขที่เคส (Claim ID): ${claimId}
- อุปกรณ์ (Equipment): ${brand} ${model} (S/N: ${serialNo})
- สถานที่ติดตั้ง (Location): ${location}
- ผู้รับผิดชอบ / ช่าง (Assignee): ${assignee}
- ผู้แจ้ง (Reporter): ${reporter}
- บันทึกเพิ่มเติม / ผลการดำเนินการ (Remarks/Notes): ${remarksOrNotes}

เปิดดูรายละเอียดเคส: ${claimDetailUrl}
`

  return { subject, html, text }
}

/**
 * Trigger C: Overseas RMA 8-Stage Progression Update
 */
export interface RmaStageUpdatedEmailParams {
  previousRma?: import("@/types/database").RmaDocument | null
  updatedRma: import("@/types/database").RmaDocument
  ticket?: TicketDocument | null
  additionalRecipients?: string[]
}

export function buildRmaStageUpdatedEmail(params: RmaStageUpdatedEmailParams): { subject: string; html: string; text: string } {
  const { previousRma, updatedRma, ticket } = params
  const baseUrl = getAppBaseUrl()

  const rmaNo = updatedRma.rmaNo || updatedRma.id
  const claimId = ticket?.id || updatedRma.ticketId || rmaNo
  const brand = updatedRma.vendor || ticket?.vendor || "Other"
  const model = updatedRma.model || ticket?.model || "-"
  const equipmentName = `${brand} ${model}`.trim() || "อุปกรณ์"
  const serialNo = updatedRma.serialNo || ticket?.serialNo || "-"
  const destination = updatedRma.destination || "ต่างประเทศ"
  const location = ticket?.location || ticket?.station || destination
  const assignee = ticket?.assigneeName || ticket?.assignee || "ทีมบริหารงานส่งซ่อมต่างประเทศ"
  const reporter = ticket?.reporterName || ticket?.reporter || "ไม่ระบุผู้แจ้ง"

  const prevStageNumber = previousRma?.currentStageNumber || 1
  const newStageNumber = updatedRma.currentStageNumber || prevStageNumber
  const prevStageName = previousRma?.currentStageName || `ขั้นตอนที่ ${prevStageNumber}`
  const newStageName = updatedRma.currentStageName || `ขั้นตอนที่ ${newStageNumber}`

  const prevStatus = previousRma?.status || prevStageName
  const newStatus = updatedRma.status || newStageName

  const subject = `[Process Claim] อัปเดตสถานะเคส: ${claimId} (${equipmentName}) → ขั้นที่ ${newStageNumber}: ${newStageName}`
  const claimDetailUrl = ticket?.id
    ? `${baseUrl}/tickets/${encodeURIComponent(ticket.id)}`
    : `${baseUrl}/overseas-rma`
  const formattedTimestamp = formatThaiDateTime(updatedRma.updatedAt || new Date())
  const remarksOrNotes = updatedRma.notes || updatedRma.remarks || ticket?.remarks || "ไม่มีบันทึกเพิ่มเติม"

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #1e293b; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Accent Banner -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #3b82f6, #ec4899, #8b5cf6);"></td>
          </tr>

          <!-- Email Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #0f172a; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #ec4899; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      FORTH CORPORATION · OVERSEAS RMA TRACKING
                    </div>
                    <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                      อัปเดตขั้นตอนส่งซ่อมต่างประเทศ (8-Stage Tracking)
                    </h1>
                    <div style="font-size: 12px; color: #94a3b8;">
                      เวลาที่อัปเดต: <span style="color: #cbd5e1; font-weight: 500;">${escapeHtml(formattedTimestamp)}</span>
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #f472b6; background-color: rgba(236, 72, 153, 0.15); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 9999px;">
                      ขั้นตอน ${newStageNumber}/8
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Transition Banner -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 700; color: #f472b6; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 8px;">
                    ความคืบหน้ากระบวนการส่งซ่อมต่างประเทศ (Overseas Repair Stage)
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 15px; font-weight: 600; color: #e2e8f0; line-height: 1.6;">
                      <span style="color: #94a3b8;">สถานะเดิม:</span>
                      <span style="display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #94a3b8; background-color: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 9999px; text-decoration: line-through; margin: 0 6px;">
                        ${escapeHtml(prevStageName)}
                      </span>
                      <span style="display: inline-block; margin: 0 8px; color: #ec4899; font-weight: 700; font-size: 16px;">&rarr;</span>
                      <span style="color: #f472b6; font-weight: 700;">สถานะใหม่:</span>
                      <span style="display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #38bdf8; background-color: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 9999px; margin-left: 6px;">
                        ${escapeHtml(newStageName)}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Core Metadata Summary Card -->
          <tr>
            <td style="padding: 12px 32px 16px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #ec4899; padding-left: 8px;">
                ข้อมูลสรุปเคสงานเคลม / RMA (Core Case Summary)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.45); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.07); overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; width: 38%; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">เลขที่เคส / ใบ RMA (ID)</td>
                  <td style="padding: 12px 16px; font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(claimId)} / ${escapeHtml(rmaNo)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">อุปกรณ์ (Equipment)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f1f5f9; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <span style="font-weight: 600; color: #ffffff;">${escapeHtml(brand)} ${escapeHtml(model)}</span>
                    <span style="display: block; font-family: ui-monospace, monospace; font-size: 12px; color: #38bdf8; margin-top: 2px;">S/N: ${escapeHtml(serialNo)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">สถานที่ / ปลายทาง (Destination)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(destination)} (${escapeHtml(location)})</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้รับผิดชอบ (Assignee)</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(assignee)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">ผู้แจ้ง (Reporter)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f1f5f9; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(reporter)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; vertical-align: top;">บันทึกเพิ่มเติม / ผลการดำเนินการ</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0; line-height: 1.5;">${escapeHtml(remarksOrNotes)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button / CTA -->
          <tr>
            <td align="center" style="padding: 12px 32px 36px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                    <a href="${claimDetailUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      เปิดดูรายละเอียดเคส &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-top: 12px;">
                หรือเปิดลิงก์: <a href="${claimDetailUrl}" style="color: #38bdf8; text-decoration: underline;">${escapeHtml(claimDetailUrl)}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 4px;">
                ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM)
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                Forth Corporation Public Company Limited · กรมการปกครอง (DOPA)
              </div>
              <div style="font-size: 11px; color: #475569;">
                อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `[Process Claim] อัปเดตสถานะเคส: ${claimId} (${equipmentName}) → ขั้นที่ ${newStageNumber}: ${newStageName}
-------------------------------------------------------------
สถานะเดิม: ${prevStatus} → สถานะใหม่: ${newStatus}
เวลาที่อัปเดต: ${formattedTimestamp}

ข้อมูลสรุปเคสงานเคลม / RMA:
- เลขที่เคส / ใบ RMA: ${claimId} / ${rmaNo}
- อุปกรณ์: ${brand} ${model} (S/N: ${serialNo})
- ปลายทาง: ${destination} (${location})
- ผู้รับผิดชอบ: ${assignee}
- ผู้แจ้ง: ${reporter}
- บันทึกเพิ่มเติม / ผลการดำเนินการ: ${remarksOrNotes}

เปิดดูรายละเอียดเคส: ${claimDetailUrl}
`

  return { subject, html, text }
}

export const buildClaimStatusChangedEmail = buildClaimUpdatedEmail

