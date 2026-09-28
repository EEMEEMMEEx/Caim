"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  House,
  ChevronRight,
  ClipboardList,
  Sun,
  CheckCircle2,
  Ban,
  Hourglass,
  AlarmClock,
  CalendarCheck2,
  Timer,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Activity
} from "lucide-react"
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard"
import type { DashboardMetrics } from "@/lib/dashboard/calculateMetrics"

export interface DashboardViewProps {
  initialMetrics?: DashboardMetrics
}

export function DashboardView({ initialMetrics }: DashboardViewProps = {}) {
  const router = useRouter()
  const { metrics, connectionStatus, lastSyncTime, isRefreshing, refresh } =
    useRealtimeDashboard({ initialMetrics })
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formattedSyncTime = React.useMemo(() => {
    if (!mounted || !lastSyncTime) return "พร้อมใช้งาน"
    try {
      return lastSyncTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return "พร้อมใช้งาน"
    }
  }, [mounted, lastSyncTime])

  return (
    <main id="main" className="flex-1 bg-slate-50/50 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. DASHBOARD HEADER & BREADCRUMB + REAL-TIME STATUS BAR
           ========================================================================= */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs text-slate-500">
                <li className="inline-flex items-center">
                  <Link
                    href="/dashboard"
                    aria-label="หน้าแรก"
                    className="transition-colors hover:text-slate-900"
                  >
                    <House className="size-3.5 text-slate-500" />
                  </Link>
                </li>
                <li className="flex items-center text-slate-400">
                  <ChevronRight className="size-3" />
                </li>
                <li className="inline-flex items-center">
                  <span className="font-normal text-slate-700">แดชบอร์ด</span>
                </li>
              </ol>
            </nav>

            {/* Title & Icon */}
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
                <Activity className="size-5 text-white" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  ภาพรวมงานเคลมอุปกรณ์
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสารแบบเรียลไทม์
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Status Badge & Manual Refresh */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs shadow-2xs">
              <span className="relative flex size-2.5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400"
                      : connectionStatus === "fallback-polling"
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                />
                <span
                  className={`relative inline-flex size-2.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500"
                      : connectionStatus === "fallback-polling"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
              </span>
              <span suppressHydrationWarning className="font-medium text-slate-700">
                {mounted
                  ? connectionStatus === "connected"
                    ? "ระบบออนไลน์ · ซิงค์สดอัตโนมัติ"
                    : connectionStatus === "fallback-polling"
                    ? "ระบบออนไลน์ · สำรองแบบ Polling"
                    : "กำลังเชื่อมต่อ..."
                  : "ระบบออนไลน์ · ซิงค์สดอัตโนมัติ"}
              </span>
              <span className="text-slate-300">|</span>
              <span suppressHydrationWarning className="text-[11px] text-slate-400">
                {mounted ? formattedSyncTime : "พร้อมใช้งาน"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => refresh()}
              disabled={isRefreshing}
              title="กดเพื่อดึงข้อมูลล่าสุดจากฐานข้อมูลทันที"
              className="inline-flex size-8.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. TOP CONTAINER: SUMMARY CARDS & CORE PERFORMANCE WIDGETS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 transition-all duration-300">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: เคสทั้งหมด (Total) */}
            <Link
              href="/tickets?status=all"
              className="group flex flex-col justify-between rounded-xl border border-blue-100/70 bg-[#eff6ff] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 cursor-pointer active:translate-y-0"
              title="ดูรายการงานเคลมทั้งหมด"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#2563eb] text-white shadow-2xs group-hover:scale-105 transition-transform">
                    <ClipboardList className="size-5" />
                  </span>
                  <span suppressHydrationWarning className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl transition-all">
                    {metrics.summary.total}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm group-hover:text-blue-700 transition-colors">เคสทั้งหมด</p>
                  <p className="text-[11px] text-slate-500">Total</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">รวมทุกสถานะในระบบ</p>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  ดูรายการ
                  <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Card 2: อยู่ระหว่างดำเนินการ (In Progress) */}
            <Link
              href="/tickets?status=in_progress"
              className="group flex flex-col justify-between rounded-xl border border-amber-100/70 bg-[#fffbeb] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-amber-300 cursor-pointer active:translate-y-0"
              title="ดูรายการที่อยู่ระหว่างดำเนินการ"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#d97706] text-white shadow-2xs group-hover:scale-105 transition-transform">
                    <Sun className="size-5" />
                  </span>
                  <span suppressHydrationWarning className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl transition-all">
                    {metrics.summary.inProgress}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm group-hover:text-amber-700 transition-colors">อยู่ระหว่างดำเนินการ</p>
                  <p className="text-[11px] text-slate-500">In Progress</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-[#ea580c] transition-all duration-500 ease-out"
                    style={{ width: `${metrics.summary.inProgressPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    {metrics.summary.inProgressPct}% ของเคสทั้งหมด
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูรายการ
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 3: เคลมสำเร็จ / ปิดเคส (Closed) */}
            <Link
              href="/tickets?status=closed"
              className="group flex flex-col justify-between rounded-xl border border-emerald-100/70 bg-[#f0fdf4] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 cursor-pointer active:translate-y-0"
              title="ดูรายการเคลมสำเร็จ / ปิดเคส"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#16a34a] text-white shadow-2xs group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <span suppressHydrationWarning className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl transition-all">
                    {metrics.summary.closed}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm group-hover:text-emerald-700 transition-colors">เคลมสำเร็จ / ปิดเคส</p>
                  <p className="text-[11px] text-slate-500">Closed</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-[#4ade80] transition-all duration-500 ease-out"
                    style={{ width: `${metrics.summary.closedPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    {metrics.summary.closedPct}% ของเคสทั้งหมด
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูรายการ
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 4: ปฏิเสธเคลม (Rejected) */}
            <Link
              href="/tickets?status=rejected"
              className="group flex flex-col justify-between rounded-xl border border-pink-100/70 bg-[#fdf2f8] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-pink-300 cursor-pointer active:translate-y-0"
              title="ดูรายการปฏิเสธเคลม"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#db2777] text-white shadow-2xs group-hover:scale-105 transition-transform">
                    <Ban className="size-5" />
                  </span>
                  <span suppressHydrationWarning className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl transition-all">
                    {metrics.summary.rejected}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm group-hover:text-pink-700 transition-colors">ปฏิเสธเคลม</p>
                  <p className="text-[11px] text-slate-500">Rejected</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-[#db2777] transition-all duration-500 ease-out"
                    style={{ width: `${metrics.summary.rejectedPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    {metrics.summary.rejectedPct}% ของเคสทั้งหมด
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูรายการ
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Performance Indicators (ตัวชี้วัดการทำงาน) */}
          <div className="mt-8">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              ตัวชี้วัดการทำงาน
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              ความเร็วและการตรงต่อกำหนดของงานเคลม (คำนวณสดจากข้อมูลในระบบ)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              ตัวเลขคิดจากข้อมูลทั้งหมดในระบบ คำนวณค่ากลางและอายุงานสดแบบเรียลไทม์
            </p>

            {/* 4 Metric Columns */}
            <div className="mt-4 grid grid-cols-1 divide-y rounded-xl border border-slate-200/80 bg-white sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4 divide-slate-200/80 overflow-hidden">
              {/* Metric 1: อายุงานค้างกลาง */}
              <Link
                href="/tickets?status=in_progress"
                className="group p-4 sm:p-5 transition-all duration-200 hover:bg-blue-50/40 cursor-pointer block"
                title="ดูรายการงานค้างทั้งหมด"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-xl font-bold text-slate-900 sm:text-2xl group-hover:text-blue-600 transition-colors">
                      {metrics.kpi.pendingMedianDays} วัน
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      n={metrics.kpi.pendingCount}
                    </span>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <Hourglass className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">อายุงานค้างกลาง</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>จากงานค้าง {metrics.kpi.pendingCount} เคส · ณ วันนี้</span>
                  <span className="inline-flex items-center gap-0.5 font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูงานค้าง
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>

              {/* Metric 2: เกินกำหนด */}
              <Link
                href="/tickets?overdue=true"
                className="group p-4 sm:p-5 transition-all duration-200 hover:bg-red-50/60 cursor-pointer block"
                title="ดูเฉพาะเคสที่เกินกำหนด SLA"
              >
                <div className="flex items-start justify-between">
                  <span suppressHydrationWarning className="tabular text-xl font-bold text-[#dc2626] sm:text-2xl group-hover:scale-105 transition-transform inline-block">
                    {metrics.kpi.overdueCount}
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-md bg-red-50 text-[#dc2626] group-hover:bg-red-100 transition-colors">
                    <AlarmClock className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700 group-hover:text-red-700 transition-colors">เกินกำหนด</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{metrics.kpi.overduePct}% ของงานค้าง</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูเคสเกินกำหนด
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>

              {/* Metric 3: ปิดทันกำหนด */}
              <Link
                href="/tickets?status=closed&onTime=true"
                className="group p-4 sm:p-5 transition-all duration-200 hover:bg-emerald-50/40 cursor-pointer block"
                title="ดูเคสที่ปิดงานทันกำหนด"
              >
                <div className="flex items-start justify-between">
                  <span suppressHydrationWarning className="tabular text-xl font-bold text-slate-700 sm:text-2xl group-hover:text-emerald-700 transition-colors">
                    {metrics.kpi.closedCount > 0 ? metrics.kpi.closedOnTimeText : "—"}
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                    <CalendarCheck2 className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">ปิดทันกำหนด</p>
                <div className="mt-1 text-[11px] leading-tight text-slate-400">
                  <div className="flex items-center justify-between">
                    <p>{metrics.kpi.closedCount > 0 ? "ตรงต่อเวลา" : "ตัวอย่างน้อยเกินกว่าจะเทียบ"}</p>
                    <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      ดูรายการ
                      <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                  <p>{metrics.kpi.closedCount > 0 ? `ปิดแล้ว ${metrics.kpi.closedCount} เคส` : "ยังไม่มีเคสในประเทศที่ปิดแล้ว"}</p>
                </div>
              </Link>

              {/* Metric 4: เวลาปิดงานกลาง */}
              <Link
                href="/tickets?status=closed"
                className="group p-4 sm:p-5 transition-all duration-200 hover:bg-blue-50/40 cursor-pointer block"
                title="ดูเคสที่ปิดแล้วทั้งหมด"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-xl font-bold text-slate-900 sm:text-2xl group-hover:text-blue-600 transition-colors">
                      {metrics.kpi.closedCount > 0 ? `${metrics.kpi.closedMedianDays} วัน` : "—"}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      n={metrics.kpi.closedCount}
                    </span>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <Timer className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">เวลาปิดงานกลาง</p>
                <div className="mt-1 text-[11px] leading-tight text-slate-400">
                  <div className="flex items-center justify-between">
                    <p>{metrics.kpi.closedCount > 0 ? "เวลาเฉลี่ยจนจบกระบวนการ" : "ตัวอย่างน้อยเกินกว่าจะเทียบ"}</p>
                    <span className="inline-flex items-center gap-0.5 font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      ดูรายการ
                      <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                  <p>
                    {metrics.kpi.closedCount > 0
                      ? `จากเคสที่ปิดแล้ว ${metrics.kpi.closedCount} เคส`
                      : "รอข้อมูลการปิดเคสเพิ่มเติม"}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORK STATUS & WEEKLY OVERVIEW
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 transition-all duration-300">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/80 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: สถานะงาน (Work Status) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">สถานะงาน</h2>
                <p className="mt-0.5 text-xs text-slate-500">ทั้งหมด {metrics.summary.total} เคส</p>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {metrics.workStatus.map((item, idx) => {
                  const showDivider = idx === 4
                  return (
                    <React.Fragment key={item.code}>
                      {showDivider && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-medium text-slate-400">ปิดงานแล้ว</p>
                        </div>
                      )}
                      <Link
                        href={`/tickets?stage=${item.code}&status=${item.code}`}
                        className="group block rounded-xl p-2 -mx-2 transition-all duration-150 hover:bg-slate-100/70 hover:shadow-2xs cursor-pointer border border-transparent hover:border-slate-200/60"
                        title={`ดูรายการเคลมสถานะ: ${item.name}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-slate-700 group-hover:text-slate-900 group-hover:font-semibold transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 tabular group-hover:text-blue-600 transition-colors">
                              {item.count}
                            </span>
                            <ChevronRight className="size-3 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5" />
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(item.pct, item.count > 0 ? 5 : 0)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </Link>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Right Column: ภาพรวมรายสัปดาห์ (Weekly Overview) */}
            <div className="pt-6 lg:pl-8 lg:pt-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  ภาพรวมรายสัปดาห์
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">เคสรับแจ้ง 7 วันล่าสุด</p>
              </div>

              {/* Main Metric & Trend */}
              <div className="mt-5">
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-3xl font-bold text-slate-900 sm:text-4xl">
                    {metrics.weekly.thisWeekCount}
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-semibold ${
                      metrics.weekly.isPositiveTrend ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {metrics.weekly.trendPct >= 0 ? `+${metrics.weekly.trendPct}%` : `${metrics.weekly.trendPct}%`}
                    {metrics.weekly.isPositiveTrend ? (
                      <TrendingUp className="ml-1 size-3.5 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="ml-1 size-3.5 stroke-[2.5]" />
                    )}
                  </span>
                </div>
                <div className="mt-2 text-xs leading-relaxed text-slate-500">
                  <p>จำนวนเคสที่รับแจ้งในสัปดาห์นี้ เทียบกับสัปดาห์ก่อนหน้า</p>
                  <p>ใช้ดูว่าปริมาณงานเข้ามามากขึ้นหรือลดลง</p>
                </div>
              </div>

              {/* Compact Calendar Days Header */}
              <div suppressHydrationWarning className="mt-6 flex justify-end gap-5 text-xs text-slate-400 pr-2">
                {metrics.weekly.daysBreakdown.map((d, i) => (
                  <span key={i} suppressHydrationWarning className="text-center w-5">{d.day}</span>
                ))}
              </div>

              {/* 3 Summary Stat Boxes */}
              <div className="mt-3 rounded-xl bg-slate-50/90 p-4">
                <div className="grid grid-cols-3 gap-2 text-left">
                  <Link
                    href="/tickets?stage=1&status=1"
                    className="p-1.5 -m-1.5 rounded-lg hover:bg-white hover:shadow-2xs transition-all cursor-pointer group block"
                    title="ดูเคสรับแจ้ง"
                  >
                    <p className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors">รับแจ้ง</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg tabular">
                      {metrics.weekly.boxReceived}
                    </p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </Link>
                  <Link
                    href="/tickets?stage=4&status=4"
                    className="p-1.5 -m-1.5 rounded-lg hover:bg-white hover:shadow-2xs transition-all cursor-pointer group block"
                    title="ดูเคสซ่อมเสร็จ รอส่งมอบ"
                  >
                    <p className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors">ซ่อมเสร็จ รอส่งมอบ</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg tabular">
                      {metrics.weekly.boxRepaired}
                    </p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </Link>
                  <Link
                    href="/tickets?status=closed"
                    className="p-1.5 -m-1.5 rounded-lg hover:bg-white hover:shadow-2xs transition-all cursor-pointer group block"
                    title="ดูเคสปิดแล้ว"
                  >
                    <p className="text-xs text-slate-500 group-hover:text-emerald-600 transition-colors">ปิดเคส</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg tabular">
                      {metrics.weekly.boxClosed}
                    </p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. PROCESS BOTTLENECKS & SERVICE CENTER METRICS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 transition-all duration-300">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/80 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: คอขวดของกระบวนการ (Process Bottlenecks) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  คอขวดของกระบวนการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  เคสค้างอยู่ในขั้นไหนนานที่สุด (คำนวณสดจากข้อมูลปัจจุบัน)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  ค่ากลางของจำนวนวัน นับจากเวลาที่บันทึกเคสในระบบ · n คือจำนวนช่วงเวลา
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2 text-xs">
                {metrics.bottlenecks.map((stage) => (
                  <Link
                    key={stage.code}
                    href={`/tickets?stage=${stage.code}&status=${stage.code}`}
                    className="group block rounded-xl p-2.5 -mx-2 transition-all duration-150 hover:bg-slate-50/90 hover:shadow-2xs cursor-pointer border border-transparent hover:border-slate-200/60"
                    title={`ดูเคสที่อยู่ในขั้น ${stage.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {stage.name}
                        </span>
                      </div>
                      <ChevronRight className="size-3 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-2 space-y-1.5 pl-4">
                      <div className="flex items-center gap-3">
                        <span className="w-12 text-slate-400">จบแล้ว</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.min(100, Math.max(15, stage.completedDays * 20))}%`,
                              backgroundColor: stage.color,
                              opacity: 0.6,
                            }}
                          />
                        </div>
                        <span className="text-slate-600">{stage.completedText}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-12 text-slate-400">ค้างอยู่</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${stage.pendingCount > 0 ? Math.min(100, Math.max(20, stage.pendingDays * 8)) : 0}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                        <span className="text-slate-600">
                          {stage.pendingCount > 0
                            ? `${stage.pendingDays} วัน ${stage.pendingCount} เคส · นานสุด ${stage.maxDays} วัน`
                            : "— ไม่มีเคสค้าง"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Column: ระยะเวลาที่งานอยู่กับศูนย์บริการ (Service Center Statistics) */}
            <div className="pt-6 lg:pl-8 lg:pt-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  ระยะเวลาที่งานอยู่กับศูนย์บริการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  นับเฉพาะช่วงที่เคสอยู่กับศูนย์ ไม่รวมช่วงที่ของกลับมาถึงเราแล้ว
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  นับขั้น &quot;ส่งศูนย์บริการแล้ว&quot; กับ &quot;รออะไหล่/กำลังซ่อม&quot; เท่านั้น
                </p>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] text-slate-600">
                      <th className="pb-2.5 font-medium">ศูนย์บริการ</th>
                      <th className="pb-2.5 text-center font-medium">เคสทั้งหมด</th>
                      <th className="pb-2.5 text-center font-medium">อยู่ที่ศูนย์ตอนนี้</th>
                      <th className="pb-2.5 font-medium">เวลาในมือศูนย์</th>
                      <th className="pb-2.5 text-center font-medium">ค้างนานสุด</th>
                      <th className="pb-2.5 text-center font-medium">เกินกำหนด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {metrics.serviceCenters.map((sc, i) => (
                      <tr
                        key={i}
                        onClick={() => router.push(`/tickets?vendor=${encodeURIComponent(sc.vendor)}`)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 font-medium text-[#1e61f0] group-hover:underline">
                          <Link
                            href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5"
                          >
                            <span>{sc.vendor}</span>
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600" />
                          </Link>
                        </td>
                        <td className="py-3 text-center tabular">
                          <Link
                            href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:font-bold hover:text-blue-600"
                          >
                            {sc.totalCases}
                          </Link>
                        </td>
                        <td className="py-3 text-center tabular">
                          {sc.atCenterNow > 0 ? (
                            <Link
                              href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}&status=in_progress`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-amber-600 hover:underline"
                            >
                              {sc.atCenterNow}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            <span className="text-slate-600">{sc.avgDaysText}</span>
                            {sc.atCenterNow > 0 && (
                              <div className="h-1 w-16 rounded-full bg-slate-300" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center tabular">{sc.maxDaysText}</td>
                        <td className="py-3 text-center tabular">
                          {sc.overdueCount > 0 ? (
                            <Link
                              href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}&overdue=true`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-[#dc2626] hover:underline hover:scale-110 inline-block transition-transform"
                              title={`ดูเคสเกินกำหนดของศูนย์บริการ ${sc.vendor}`}
                            >
                              {sc.overdueCount}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
