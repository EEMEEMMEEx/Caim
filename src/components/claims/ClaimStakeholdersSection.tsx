"use client"

import * as React from "react"
import { Users } from "lucide-react"

export interface ClaimStakeholdersSectionProps {
  reporterName: string
  setReporterName: (value: string) => void
  assigneeName: string
  setAssigneeName: (value: string) => void
  remarks: string
  setRemarks: (value: string) => void
  disabled?: boolean
  errors?: {
    reporterName?: string
    assigneeName?: string
    remarks?: string
  }
}

// Preset technicians & coordinators for rapid selection
const PRESET_ASSIGNEES = [
  { label: "-- เลือกผู้รับผิดชอบเคส / ทีมช่าง --", value: "" },
  { label: "สมศักดิ์ ช่างเทคนิค (Forth Support Tier 1)", value: "สมศักดิ์ ช่างเทคนิค (Forth Support Tier 1)" },
  { label: "เอกชัย วิศวกรฮาร์ดแวร์ (HW Repair Specialist)", value: "เอกชัย วิศวกรฮาร์ดแวร์ (HW Repair Specialist)" },
  { label: "ธีรเดช ทีมปฏิบัติการภาคสนาม (Field Ops Engineer)", value: "ธีรเดช ทีมปฏิบัติการภาคสนาม (Field Ops Engineer)" },
  { label: "กิตติพงษ์ ผู้ประสานงานส่งเคลม (RMA Coordinator)", value: "กิตติพงษ์ ผู้ประสานงานส่งเคลม (RMA Coordinator)" },
  { label: "มนตรี วิศวกรเครือข่ายวิทยุ (Radio Network Engineer)", value: "มนตรี วิศวกรเครือข่ายวิทยุ (Radio Network Engineer)" },
  { label: "ภัทรวดี ฝ่ายสนับสนุนลูกค้า (Customer Care Lead)", value: "ภัทรวดี ฝ่ายสนับสนุนลูกค้า (Customer Care Lead)" },
]

// Preset suggestion list for device owners / reporters
const REPORTER_SUGGESTIONS = [
  "สมชาย ใจดี (หัวหน้าศูนย์ควบคุม)",
  "วิชัย พัฒนกิจ (เจ้าหน้าที่ประจำสถานี)",
  "ประเสริฐ สุขสวัสดิ์ (วิศวกรโครงข่าย Forth)",
  "ณัฐวุฒิ เกียรติชัย (ผู้ดูแลอุปกรณ์ประจำจุด)",
  "สุพจน์ นพคุณ (เจ้าหน้าที่ประสานงานพื้นที่)",
]

export function ClaimStakeholdersSection({
  reporterName,
  setReporterName,
  assigneeName,
  setAssigneeName,
  remarks,
  setRemarks,
  disabled = false,
  errors = {},
}: ClaimStakeholdersSectionProps) {
  const isCustomAssignee =
    assigneeName !== "" &&
    !PRESET_ASSIGNEES.some((item) => item.value === assigneeName)

  const [useCustomAssignee, setUseCustomAssignee] = React.useState<boolean>(isCustomAssignee)

  // Synchronize custom state if external assigneeName changes to non-preset
  React.useEffect(() => {
    if (assigneeName && !PRESET_ASSIGNEES.some((item) => item.value === assigneeName)) {
      setUseCustomAssignee(true)
    }
  }, [assigneeName])

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="text-slate-100 font-semibold text-base flex items-center gap-2">
          <Users className="size-5 text-blue-400 shrink-0" />
          <span>ผู้เกี่ยวข้อง</span>
        </div>
        <span className="text-[11px] text-slate-400 font-normal">
          Stakeholders &amp; Personnel
        </span>
      </div>

      {/* Form Fields Layout */}
      <div className="flex flex-col gap-4">
        {/* Top Row (2 Columns on medium/desktop, 1 column on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: ผู้แจ้ง / เจ้าของเครื่อง (Reporter / Device Owner) */}
          <div className="flex flex-col">
            <label
              htmlFor="reporterName"
              className="text-xs font-medium text-slate-300 mb-1.5 block"
            >
              ผู้แจ้ง / เจ้าของเครื่อง
            </label>
            <div className="relative">
              <input
                id="reporterName"
                name="reporterName"
                type="text"
                list="reporter-suggestions"
                disabled={disabled}
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="ระบุชื่อผู้แจ้ง หรือเจ้าของเครื่อง..."
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
              />
              <datalist id="reporter-suggestions">
                {REPORTER_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
            {errors.reporterName ? (
              <span className="text-[11px] text-rose-400 mt-1 font-normal">
                {errors.reporterName}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-1">
                พิมพ์ชื่อบุคคลหรือเลือกจากรายการแนะนำ
              </span>
            )}
          </div>

          {/* Column 2: ผู้รับผิดชอบเคส (Case Assignee / Responsible Person) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="assigneeName"
                className="text-xs font-medium text-slate-300 block"
              >
                ผู้รับผิดชอบเคส
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseCustomAssignee(!useCustomAssignee)
                  if (!useCustomAssignee) {
                    setAssigneeName("")
                  }
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {useCustomAssignee ? "เลือกจากทีมช่าง" : "ระบุเอง"}
              </button>
            </div>

            {useCustomAssignee ? (
              <input
                id="assigneeName"
                name="assigneeName"
                type="text"
                disabled={disabled}
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="ระบุชื่อวิศวกรหรือผู้รับผิดชอบเคส..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
              />
            ) : (
              <select
                id="assigneeName"
                name="assigneeName"
                disabled={disabled}
                value={assigneeName}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "__custom__") {
                    setUseCustomAssignee(true)
                    setAssigneeName("")
                  } else {
                    setAssigneeName(val)
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
              >
                {PRESET_ASSIGNEES.map((option) => (
                  <option
                    key={option.value || "default"}
                    value={option.value}
                    className="bg-slate-900 text-slate-100 py-1"
                  >
                    {option.label}
                  </option>
                ))}
                <option value="__custom__" className="bg-slate-900 text-blue-400 py-1">
                  + ระบุชื่อผู้รับผิดชอบเอง (Custom)
                </option>
              </select>
            )}

            {errors.assigneeName ? (
              <span className="text-[11px] text-rose-400 mt-1 font-normal">
                {errors.assigneeName}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-1">
                กำหนดผู้ประสานงานหลัก หรือช่างเทคนิคที่รับผิดชอบการซ่อม
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row (Full Width): หมายเหตุ (Remarks / Additional Notes) */}
        <div className="flex flex-col">
          <label
            htmlFor="remarks"
            className="text-xs font-medium text-slate-300 mb-1.5 block"
          >
            หมายเหตุ
          </label>
          <textarea
            id="remarks"
            name="remarks"
            rows={3}
            disabled={disabled}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="ระบุหมายเหตุเพิ่มเติม ข้อมูลส่งมอบงาน หรือข้อควรระวังในการซ่อม..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm resize-y disabled:opacity-50"
          />
          {errors.remarks ? (
            <span className="text-[11px] text-rose-400 mt-1 font-normal">
              {errors.remarks}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-1">
              บันทึกข้อความเฉพาะเคส ประวัติการส่งมอบ หรือเบอร์ติดต่อประสานงานด่วน
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
