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
import { useLocale } from "@/i18n/LocaleContext"
import type { DashboardMetrics } from "@/lib/dashboard/calculateMetrics"

export interface DashboardViewProps {
  initialMetrics?: DashboardMetrics
}

export function DashboardView({ initialMetrics }: DashboardViewProps = {}) {
  const router = useRouter()
  const { metrics, connectionStatus, lastSyncTime, isRefreshing, refresh } =
    useRealtimeDashboard({ initialMetrics })
  const { t, locale } = useLocale()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formattedSyncTime = React.useMemo(() => {
    if (!mounted || !lastSyncTime) return locale === "th" ? "พร้อมใช้งาน" : "Ready"
    try {
      return lastSyncTime.toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return locale === "th" ? "พร้อมใช้งาน" : "Ready"
    }
  }, [mounted, lastSyncTime, locale])

  return (
    <main id="main" className="flex-1 bg-transparent py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. DASHBOARD HEADER & BREADCRUMB + REAL-TIME STATUS BAR
           ========================================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2.5">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs text-slate-500">
                <li className="inline-flex items-center">
                  <Link
                    href="/dashboard"
                    aria-label={t("nav.dashboard", "หน้าแรก")}
                    className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <House className="size-3.5 text-slate-500 dark:text-slate-400" />
                  </Link>
                </li>
                <li className="flex items-center text-slate-400">
                  <ChevronRight className="size-3" />
                </li>
                <li className="inline-flex items-center">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {t("nav.context.dashboard", "ภาพรวมแดชบอร์ด")}
                  </span>
                </li>
              </ol>
            </nav>

            {/* Title & Icon */}
            <div className="flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md ring-1 ring-white/20">
                <Activity className="size-6 text-blue-400" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {t("dashboard.title", "ภาพรวมงานเคลมอุปกรณ์")}
                  </h1>
                  <span
                    role="status"
                    aria-label={t("dashboard.online", "ระบบออนไลน์")}
                    title={
                      mounted && lastSyncTime
                        ? `${t("dashboard.online", "ระบบออนไลน์")} (${t("dashboard.lastSync", "ซิงก์ล่าสุด")}: ${formattedSyncTime})`
                        : t("dashboard.online", "ระบบออนไลน์")
                    }
                    className="relative flex h-2.5 w-2.5 cursor-default shrink-0 items-center justify-center"
                  >
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
                      className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                        connectionStatus === "connected"
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                          : connectionStatus === "fallback-polling"
                          ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                          : "bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                      }`}
                    />
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm mt-0.5">
                  {t("dashboard.subtitle", "สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสารแบบเรียลไทม์")}
                </p>
              </div>
            </div>
          </div>

          {/* Action Trigger: Refresh Button */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={isRefreshing}
              title={
                mounted && lastSyncTime
                  ? `${t("dashboard.lastSync", "อัปเดตล่าสุด")}: ${formattedSyncTime}`
                  : locale === "th"
                  ? "กดเพื่อดึงข้อมูลล่าสุดจากฐานข้อมูลทันที"
                  : "Click to refresh latest data from database immediately"
              }
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 shadow-xs transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
              />
              <span>{isRefreshing ? t("dashboard.refreshing", "กำลังรีเฟรช...") : t("dashboard.refresh", "รีเฟรชข้อมูล")}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. TOP CONTAINER: SUMMARY CARDS & CORE PERFORMANCE WIDGETS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card sm:p-6 transition-all duration-300">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: เคสทั้งหมด (Total) */}
            <Link
              href="/tickets?status=all"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a]/70 hover:dark:bg-[#0f172a] p-5 shadow-xs hover:shadow-card-hover hover:border-blue-400/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              title={locale === "th" ? "ดูรายการงานเคลมทั้งหมด" : "View all claim cases"}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 opacity-90 group-hover:h-1.5 transition-all" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                    <ClipboardList className="size-5.5" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t("dashboard.cards.totalBadge", "Total")}
                  </span>
                </div>
                <div className="mt-4">
                  <span suppressHydrationWarning className="tabular font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors">
                    {metrics.summary.total}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("dashboard.cards.total", "เคสทั้งหมด")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {t("dashboard.cards.totalSub", "รวมทุกสถานะในระบบ")}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  {t("dashboard.cards.viewList", "ดูรายการ")}
                  <ChevronRight className="size-3.5" />
                </span>
              </div>
            </Link>

            {/* Card 2: อยู่ระหว่างดำเนินการ (In Progress) */}
            <Link
              href="/tickets?status=in_progress"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a]/70 hover:dark:bg-[#0f172a] p-5 shadow-xs hover:shadow-card-hover hover:border-amber-400/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              title={locale === "th" ? "ดูรายการที่อยู่ระหว่างดำเนินการ" : "View in-progress cases"}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 opacity-90 group-hover:h-1.5 transition-all" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
                    <Sun className="size-5.5" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium">
                    {t("dashboard.cards.inProgressBadge", "In Progress")}
                  </span>
                </div>
                <div className="mt-4">
                  <span suppressHydrationWarning className="tabular font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 transition-colors">
                    {metrics.summary.inProgress}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("dashboard.cards.inProgress", "อยู่ระหว่างดำเนินการ")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(metrics.summary.inProgressPct, metrics.summary.inProgress > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {metrics.summary.inProgressPct}% {t("dashboard.cards.inProgressSub", "ของเคสทั้งหมด")}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    {t("dashboard.cards.viewList", "ดูรายการ")}
                    <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 3: เคลมสำเร็จ / ปิดเคส (Closed) */}
            <Link
              href="/tickets?status=closed"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a]/70 hover:dark:bg-[#0f172a] p-5 shadow-xs hover:shadow-card-hover hover:border-emerald-400/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              title={locale === "th" ? "ดูรายการเคลมสำเร็จ / ปิดเคส" : "View closed cases"}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-90 group-hover:h-1.5 transition-all" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                    <CheckCircle2 className="size-5.5" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium">
                    {t("dashboard.cards.closedBadge", "Closed")}
                  </span>
                </div>
                <div className="mt-4">
                  <span suppressHydrationWarning className="tabular font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">
                    {metrics.summary.closed}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("dashboard.cards.closed", "เคลมสำเร็จ / ปิดเคส")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(metrics.summary.closedPct, metrics.summary.closed > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {metrics.summary.closedPct}% {t("dashboard.cards.closedSub", "ของเคสทั้งหมด")}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    {t("dashboard.cards.viewList", "ดูรายการ")}
                    <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 4: ปฏิเสธเคลม (Rejected) */}
            <Link
              href="/tickets?status=rejected"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a]/70 hover:dark:bg-[#0f172a] p-5 shadow-xs hover:shadow-card-hover hover:border-rose-400/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              title={locale === "th" ? "ดูรายการปฏิเสธเคลม" : "View rejected cases"}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 opacity-90 group-hover:h-1.5 transition-all" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                    <Ban className="size-5.5" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20 px-2.5 py-0.5 text-[11px] font-medium">
                    Rejected
                  </span>
                </div>
                <div className="mt-4">
                  <span suppressHydrationWarning className="tabular font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight group-hover:text-rose-600 transition-colors">
                    {metrics.summary.rejected}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {locale === "th" ? "ปฏิเสธเคลม" : "Rejected"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(metrics.summary.rejectedPct, metrics.summary.rejected > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {metrics.summary.rejectedPct}% {t("dashboard.cards.closedSub", "ของเคสทั้งหมด")}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:translate-x-0.5 transition-transform">
                    {t("dashboard.cards.viewList", "ดูรายการ")}
                    <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Performance Indicators (ตัวชี้วัดการทำงาน) */}
          <div className="mt-8">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              ตัวชี้วัดการทำงาน (KPIs)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              ความเร็วและการตรงต่อกำหนดของงานเคลม (คำนวณสดจากข้อมูลในระบบ)
            </p>

            {/* 4 Metric Columns */}
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Metric 1: อายุงานค้างกลาง */}
              <Link
                href="/tickets?status=in_progress"
                className="group flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a]/60 p-4.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-card transition-all duration-200 cursor-pointer"
                title="ดูรายการงานค้างทั้งหมด"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                      {metrics.kpi.pendingMedianDays} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">วัน</span>
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                      n={metrics.kpi.pendingCount}
                    </span>
                  </div>
                  <span className="flex size-8.5 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-300 ring-1 ring-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                    <Hourglass className="size-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">อายุงานค้างกลาง</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>จากงานค้าง {metrics.kpi.pendingCount} เคส</span>
                    <span className="font-semibold text-blue-600 dark:text-sky-300 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ดูงานค้าง <ChevronRight className="size-3" />
                    </span>
                  </p>
                </div>
              </Link>

              {/* Metric 2: เกินกำหนด */}
              <Link
                href="/tickets?overdue=true"
                className="group flex flex-col justify-between rounded-xl border border-rose-200/60 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 p-4.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-card transition-all duration-200 cursor-pointer"
                title="ดูเฉพาะเคสที่เกินกำหนด SLA"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-2xl font-extrabold text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform inline-block">
                      {metrics.kpi.overdueCount} <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">เคส</span>
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {metrics.kpi.overduePct}% งานค้าง
                    </span>
                  </div>
                  <span className="flex size-8.5 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                    <AlarmClock className="size-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">เกินกำหนด SLA</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{metrics.kpi.overduePct}% ของงานค้าง</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ดูเคสเกิน <ChevronRight className="size-3" />
                    </span>
                  </p>
                </div>
              </Link>

              {/* Metric 3: ปิดทันกำหนด */}
              <Link
                href="/tickets?status=closed&onTime=true"
                className="group flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a]/60 p-4.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-card transition-all duration-200 cursor-pointer"
                title="ดูเคสที่ปิดงานทันกำหนด"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {metrics.kpi.closedCount > 0 ? metrics.kpi.closedOnTimeText : "—"}
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold">
                      ตรงต่อเวลา
                    </span>
                  </div>
                  <span className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                    <CalendarCheck2 className="size-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">ปิดทันกำหนด</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{metrics.kpi.closedCount > 0 ? `ปิดแล้ว ${metrics.kpi.closedCount} เคส` : "ยังไม่มีเคสที่ปิดแล้ว"}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ดูรายการ <ChevronRight className="size-3" />
                    </span>
                  </p>
                </div>
              </Link>

              {/* Metric 4: เวลาปิดงานกลาง */}
              <Link
                href="/tickets?status=closed"
                className="group flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a]/60 p-4.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-card transition-all duration-200 cursor-pointer"
                title="ดูเคสที่ปิดแล้วทั้งหมด"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span suppressHydrationWarning className="tabular text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                      {metrics.kpi.closedCount > 0 ? `${metrics.kpi.closedMedianDays} วัน` : "—"}
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                      n={metrics.kpi.closedCount}
                    </span>
                  </div>
                  <span className="flex size-8.5 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                    <Timer className="size-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">เวลาปิดงานกลาง</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>ค่าเฉลี่ยจนจบกระบวนการ</span>
                    <span className="font-semibold text-blue-600 dark:text-sky-300 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ดูรายการ <ChevronRight className="size-3" />
                    </span>
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORK STATUS & WEEKLY OVERVIEW
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card sm:p-6 transition-all duration-300">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/70 dark:divide-white/10 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: สถานะงาน (Work Status) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">สถานะงานในระบบ</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">สัดส่วนและจำนวนเคสทั้งหมด {metrics.summary.total} เคส</p>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {metrics.workStatus.map((item, idx) => {
                  const showDivider = idx === 4
                  return (
                    <React.Fragment key={item.code}>
                      {showDivider && (
                        <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ปิดงานแล้ว</p>
                        </div>
                      )}
                      <Link
                        href={`/tickets?stage=${item.code}&status=${item.code}`}
                        className="group block rounded-xl p-2.5 -mx-2 transition-all duration-150 hover:bg-slate-50/90 dark:hover:bg-white/[0.04] hover:shadow-2xs cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-white/10"
                        title={`ดูรายการเคลมสถานะ: ${item.name}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="size-2.5 rounded-full shrink-0 ring-2 ring-white/80 dark:ring-slate-800 group-hover:scale-125 transition-transform"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white tabular group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                              {item.count} <span className="text-[10px] font-normal text-slate-400">({item.pct}%)</span>
                            </span>
                            <ChevronRight className="size-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-all group-hover:translate-x-0.5" />
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  ภาพรวมรายสัปดาห์
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">เคสรับแจ้ง 7 วันล่าสุดและเปรียบเทียบสถิติ</p>
              </div>

              {/* Main Metric & Trend */}
              <div className="mt-5 flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="tabular text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                      {metrics.weekly.thisWeekCount}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                        metrics.weekly.isPositiveTrend
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
                          : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-rose-500/20"
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
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    เทียบกับสัปดาห์ก่อนหน้า ({metrics.weekly.lastWeekCount} เคส)
                  </p>
                </div>

                {/* 7-Day Mini Activity Chart */}
                <div suppressHydrationWarning className="flex items-end gap-1.5 h-12 pt-2">
                  {metrics.weekly.daysBreakdown.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-5 h-8 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex items-end p-0.5">
                        <div
                          className="w-full bg-blue-500 rounded-xs transition-all duration-300"
                          style={{ height: d.count > 0 ? "75%" : "15%", opacity: d.count > 0 ? 1 : 0.25 }}
                        />
                      </div>
                      <span suppressHydrationWarning className="text-[10px] text-slate-400 font-medium">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Summary Stat Boxes */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Link
                  href="/tickets?stage=1&status=1"
                  className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-[#0f172a]/60 p-3.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-card transition-all cursor-pointer group block"
                  title="ดูเคสรับแจ้ง"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">รับแจ้ง</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular">
                    {metrics.weekly.boxReceived}
                  </p>
                  <div className="mt-2 h-1 w-full rounded-full bg-blue-200 dark:bg-blue-900" />
                </Link>
                <Link
                  href="/tickets?stage=4&status=4"
                  className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-[#0f172a]/60 p-3.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-card transition-all cursor-pointer group block"
                  title="ดูเคสซ่อมเสร็จ รอส่งมอบ"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">ซ่อมเสร็จ</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular">
                    {metrics.weekly.boxRepaired}
                  </p>
                  <div className="mt-2 h-1 w-full rounded-full bg-amber-200 dark:bg-amber-900" />
                </Link>
                <Link
                  href="/tickets?status=closed"
                  className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-[#0f172a]/60 p-3.5 hover:bg-white dark:hover:bg-[#0f172a] hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-card transition-all cursor-pointer group block"
                  title="ดูเคสปิดแล้ว"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">ปิดเคส</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular">
                    {metrics.weekly.boxClosed}
                  </p>
                  <div className="mt-2 h-1 w-full rounded-full bg-emerald-200 dark:bg-emerald-900" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. PROCESS BOTTLENECKS & SERVICE CENTER METRICS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card sm:p-6 transition-all duration-300">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/70 dark:divide-white/10 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: คอขวดของกระบวนการ (Process Bottlenecks) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  คอขวดของกระบวนการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  เคสค้างอยู่ในขั้นไหนนานที่สุด (คำนวณสดจากข้อมูลปัจจุบัน)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  ค่ากลางของจำนวนวัน นับจากเวลาที่บันทึกเคสในระบบ · n คือจำนวนช่วงเวลา
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2 text-xs">
                {metrics.bottlenecks.map((stage) => (
                  <Link
                    key={stage.code}
                    href={`/tickets?stage=${stage.code}&status=${stage.code}`}
                    className="group block rounded-xl p-2.5 -mx-2 transition-all duration-150 hover:bg-slate-50/90 dark:hover:bg-white/[0.04] hover:shadow-2xs cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-white/10"
                    title={`ดูเคสที่อยู่ในขั้น ${stage.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0 ring-2 ring-white/80 dark:ring-slate-800 group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                          {stage.name}
                        </span>
                      </div>
                      <ChevronRight className="size-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-all group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-2 space-y-1.5 pl-4">
                      <div className="flex items-center gap-3">
                        <span className="w-12 text-slate-400 dark:text-slate-500">จบแล้ว</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-28">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.min(100, Math.max(15, stage.completedDays * 20))}%`,
                              backgroundColor: stage.color,
                              opacity: 0.6,
                            }}
                          />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">{stage.completedText}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-12 text-slate-400 dark:text-slate-500">ค้างอยู่</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-28">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${stage.pendingCount > 0 ? Math.min(100, Math.max(20, stage.pendingDays * 8)) : 0}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">
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
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  ระยะเวลาที่งานอยู่กับศูนย์บริการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  นับเฉพาะช่วงที่เคสอยู่กับศูนย์ ไม่รวมช่วงที่ของกลับมาถึงเราแล้ว
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  นับขั้น &quot;ส่งศูนย์บริการแล้ว&quot; กับ &quot;รออะไหล่/กำลังซ่อม&quot; เท่านั้น
                </p>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400">
                      <th className="pb-2.5 font-medium">ศูนย์บริการ</th>
                      <th className="pb-2.5 text-center font-medium">เคสทั้งหมด</th>
                      <th className="pb-2.5 text-center font-medium">อยู่ที่ศูนย์ตอนนี้</th>
                      <th className="pb-2.5 font-medium">เวลาในมือศูนย์</th>
                      <th className="pb-2.5 text-center font-medium">ค้างนานสุด</th>
                      <th className="pb-2.5 text-center font-medium">เกินกำหนด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-slate-700 dark:text-slate-300">
                    {metrics.serviceCenters.map((sc, i) => (
                      <tr
                        key={i}
                        onClick={() => router.push(`/tickets?vendor=${encodeURIComponent(sc.vendor)}`)}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 font-medium text-[#1e61f0] dark:text-sky-400 group-hover:underline">
                          <Link
                            href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5"
                          >
                            <span>{sc.vendor}</span>
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600 dark:text-sky-400" />
                          </Link>
                        </td>
                        <td className="py-3 text-center tabular">
                          <Link
                            href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:font-bold hover:text-blue-600 dark:hover:text-sky-300 text-slate-900 dark:text-slate-200"
                          >
                            {sc.totalCases}
                          </Link>
                        </td>
                        <td className="py-3 text-center tabular">
                          {sc.atCenterNow > 0 ? (
                            <Link
                              href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}&status=in_progress`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              {sc.atCenterNow}
                            </Link>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            <span className="text-slate-600 dark:text-slate-300">{sc.avgDaysText}</span>
                            {sc.atCenterNow > 0 && (
                              <div className="h-1 w-16 rounded-full bg-slate-300 dark:bg-slate-700" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center tabular text-slate-700 dark:text-slate-300">{sc.maxDaysText}</td>
                        <td className="py-3 text-center tabular">
                          {sc.overdueCount > 0 ? (
                            <Link
                              href={`/tickets?vendor=${encodeURIComponent(sc.vendor)}&overdue=true`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-[#dc2626] dark:text-rose-400 hover:underline hover:scale-110 inline-block transition-transform"
                              title={`ดูเคสเกินกำหนดของศูนย์บริการ ${sc.vendor}`}
                            >
                              {sc.overdueCount}
                            </Link>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
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
