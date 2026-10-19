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

export interface ClaimUpdatedEmailParams {
  previousTicket: TicketDocument | null
  updatedTicket: TicketDocument
  modifiedFields?: Record<string, unknown>
}

/**
 * Trigger B: Claim Updated / Status Changed
 * Generates subject and responsive enterprise dark HTML body summarizing modified fields
 */
export function buildClaimUpdatedEmail(params: ClaimUpdatedEmailParams): { subject: string; html: string; text: string } {
  const { previousTicket, updatedTicket, modifiedFields } = params
  const baseUrl = getAppBaseUrl()
  const claimId = updatedTicket.id
  const subject = `[Process Claim] อัปเดตสถานะงานเคลม: ${claimId}`
  const claimDetailUrl = `${baseUrl}/tickets/${encodeURIComponent(claimId)}`

  const prevStatus = previousTicket?.status || "รับแจ้ง"
  const newStatus = updatedTicket.status || prevStatus
  const isStatusChanged = prevStatus !== newStatus

  // Build summary of changed/modified fields
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

  // If no explicit changes detected above, fallback to listing active fields
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

  const brand = updatedTicket.vendor || "Other"
  const model = updatedTicket.model || "-"
  const serialNo = updatedTicket.serialNo || "-"

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
                      อัปเดตสถานะและข้อมูลงานเคลม
                    </h1>
                  </td>
                  <td align="right" valign="top">
                    ${getStatusBadgeHtml(newStatus)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Transition Banner (if changed) -->
          ${isStatusChanged ? `
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px;">
                <tr>
                  <td align="center" style="font-size: 12px; color: #94a3b8; padding-bottom: 8px;">
                    การเปลี่ยนสถานะการดำเนินงาน (Status Transition)
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; padding: 4px 10px; font-size: 12px; color: #94a3b8; background: rgba(255, 255, 255, 0.05); border-radius: 6px; text-decoration: line-through;">
                            ${escapeHtml(prevStatus)}
                          </span>
                        </td>
                        <td style="padding: 0 12px; color: #38bdf8; font-size: 16px; font-weight: 700;">&rarr;</td>
                        <td align="center">
                          ${getStatusBadgeHtml(newStatus)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- Claim ID & Equipment Info -->
          <tr>
            <td style="padding: ${isStatusChanged ? '8px' : '24px'} 32px 12px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 14px 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">เลขที่เคลม (Claim ID)</div>
                    <div style="font-family: ui-monospace, monospace; font-size: 16px; font-weight: 700; color: #38bdf8;">
                      ${escapeHtml(claimId)}
                    </div>
                  </td>
                  <td align="right">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">อุปกรณ์ / S/N</div>
                    <div style="font-size: 13px; font-weight: 600; color: #f1f5f9;">
                      ${escapeHtml(brand)} ${escapeHtml(model)} (${escapeHtml(serialNo)})
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary of Modified Fields -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-left: 3px solid #8b5cf6; padding-left: 8px;">
                สรุปรายการที่ปรับปรุง (Summary of Modifications)
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
                ${changes.length > 0 ? changes.map((c, idx) => `
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
                `).join("") : `
                <tr>
                  <td style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">
                    บันทึกการปรับปรุงข้อมูลเคสเรียบร้อยแล้ว
                  </td>
                </tr>
                `}
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
                      ตรวจสอบรายละเอียดงานเคลมล่าสุด &rarr;
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

  const text = `[Process Claim] อัปเดตสถานะงานเคลม: ${claimId}
-------------------------------------------------------------
เลขที่เคลม: ${claimId}
สถานะ: ${prevStatus} -> ${newStatus}
อุปกรณ์: ${brand} ${model} (${serialNo})
รายการปรับปรุง:
${changes.map(c => `- ${c.label}: ${c.oldValue ? `${c.oldValue} -> ` : ""}${c.newValue}`).join("\n")}

เปิดดูรายละเอียดเคส: ${claimDetailUrl}
`

  return { subject, html, text }
}
