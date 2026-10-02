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
            <input
              id="reporterName"
              name="reporterName"
              type="text"
              disabled={disabled}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="ระบุชื่อผู้แจ้ง หรือเจ้าของเครื่อง..."
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
            />
            {errors.reporterName && (
              <span className="text-[11px] text-rose-400 mt-1 font-normal">
                {errors.reporterName}
              </span>
            )}
          </div>

          {/* Column 2: ผู้รับผิดชอบเคส (Case Assignee / Technician Team) */}
          <div className="flex flex-col">
            <label
              htmlFor="assigneeName"
              className="text-xs font-medium text-slate-300 mb-1.5 block"
            >
              ผู้รับผิดชอบเคส
            </label>
            <input
              id="assigneeName"
              name="assigneeName"
              type="text"
              disabled={disabled}
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="ระบุชื่อผู้รับผิดชอบเคส หรือทีมช่าง..."
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
            />
            {errors.assigneeName && (
              <span className="text-[11px] text-rose-400 mt-1 font-normal">
                {errors.assigneeName}
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
          {errors.remarks && (
            <span className="text-[11px] text-rose-400 mt-1 font-normal">
              {errors.remarks}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
