"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Database,
  Activity,
  Clock,
  Radio,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { ProcessClaimLogoMark } from "@/components/brand/ProcessClaimLogo"
import { initDefaultSession } from "@/lib/session"
import packageInfo from "../../../package.json"

export function ProcessClaimPortalLanding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const [isPending, setIsPending] = React.useState(false)

  const handleEnterPortal = React.useCallback(async () => {
    setIsPending(true)

    // Silently auto-initialize default staff session in the background
    initDefaultSession()

    // Immediate seamless transition to dashboard
    router.push(next || "/dashboard")
  }, [next, router])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070d18] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* =========================================================================
          1. BACKGROUND ATMOSPHERE & AMBIENT GLOW
          ========================================================================= */}
      {/* Subtle Dot Grid Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-25"
      />

      {/* Primary Radial Glow Behind Typography (Cyan / Indigo / Blue) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-1/4 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-700/25 via-indigo-600/15 to-cyan-500/10 blur-[130px]"
      />

      {/* Secondary Top Ambient Accent Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/3 top-0 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]"
      />

      {/* =========================================================================
          2. TELECOMMUNICATION INFRASTRUCTURE BACKDROP (RIGHT SIDE)
          ========================================================================= */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[58%] overflow-hidden select-none"
      >
        <div className="relative h-full w-full opacity-40 lg:opacity-50 transition-opacity duration-700">
          <Image
            src="/images/IMG_8154_enhanced_2x.webp"
            alt="Telecommunication Infrastructure"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            quality={85}
            className="object-cover object-center lg:object-right"
          />

          {/* Multilayered Gradient Masking to blend seamlessly into #070d18 */}
          {/* Left blend to canvas */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-[#070d18] via-[#070d18]/85 to-transparent" />
          {/* Top blend */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#070d18] via-[#070d18]/70 to-transparent" />
          {/* Bottom blend */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#070d18] via-[#070d18]/80 to-transparent" />
          {/* Cyan/Blue High-Tech Color Tint Overlay */}
          <div className="absolute inset-0 bg-[#070d18]/30 mix-blend-multiply" />
        </div>
      </div>

      {/* =========================================================================
          3. TOP NAVIGATION / BRAND HEADER
          ========================================================================= */}
      <header className="relative z-20 flex h-20 w-full items-center justify-between px-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900/80 p-1.5 ring-1 ring-white/10 shadow-xs backdrop-blur-md">
            <ProcessClaimLogoMark size={28} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>Process Claim</span>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.2 text-[10px] font-medium text-cyan-300 ring-1 ring-cyan-500/30">
                PORTAL
              </span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              SHF Radio Network System
            </span>
          </div>
        </div>

        {/* System Online Node & Version Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span>ระบบออนไลน์ · โครงข่าย SHF</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-slate-400 backdrop-blur-md">
            v{packageInfo.version}
          </span>
        </div>
      </header>

      {/* =========================================================================
          4. MAIN HERO CONTENT AREA
          ========================================================================= */}
      <main className="relative z-20 flex flex-1 items-center px-6 sm:px-10 lg:px-16 py-10 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Hero Typography, CTA & Highlight Pills (7 cols on lg) */}
          <div className="flex flex-col items-start gap-6 lg:col-span-7 max-w-2xl">
            {/* Overline Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-500/30 bg-sky-950/50 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-sky-300 backdrop-blur-md shadow-inner">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
              </span>
              <span className="font-mono text-[11px] sm:text-xs tracking-wider uppercase">
                EQUIPMENT CLAIM OPERATIONS &amp; TRACKING
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(56,189,248,0.3)]">
                PROCESS
              </span>{" "}
              <span className="text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                CLAIM PORTAL
              </span>
            </h1>

            {/* Description Paragraph */}
            <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal text-balance">
              ศูนย์กลางบริหารและติดตามงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร เชื่อมโยงสถานะงาน การส่งซ่อมต่างประเทศ SLA และบทปรับผู้ขายไว้ในระบบเดียวที่ทันสมัย เรียบหรู และใช้งานง่าย
            </p>

            {/* CTA Action Area */}
            <div className="flex items-center w-full pt-2">
              {/* Primary CTA Button */}
              <button
                type="button"
                disabled={isPending}
                onClick={handleEnterPortal}
                className="group relative inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-8 text-sm sm:text-base font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบงาน</span>
                    <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>

            {/* Feature Badges (Translucent glassmorphic pills) */}
            <div className="pt-3 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 backdrop-blur-md transition-colors shadow-2xs">
                <Database className="size-3.5 text-cyan-400 shrink-0" />
                <span>รวมข้อมูลเป็นศูนย์กลาง</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 backdrop-blur-md transition-colors shadow-2xs">
                <Activity className="size-3.5 text-blue-400 shrink-0" />
                <span>ติดตามสถานะเรียลไทม์</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 backdrop-blur-md transition-colors shadow-2xs">
                <Clock className="size-3.5 text-indigo-400 shrink-0" />
                <span>คำนวณ SLA และบทปรับอัตโนมัติ</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Tech Telemetry Widget Card (5 cols on lg) */}
          <div className="hidden lg:flex lg:col-span-5 justify-end">
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
                    <Radio className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      SHF Telemetry System
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Real-time Network Mesh
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Telemetry Metrics */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="text-slate-400">ความพร้อมใช้งานระบบ</span>
                  <span className="font-semibold text-emerald-400 font-mono">99.98%</span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="text-slate-400">ทะเบียนอุปกรณ์ในระบบ</span>
                  <span className="font-semibold text-white font-mono">5,300+ รายการ</span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="text-slate-400">สถานีโครงข่ายวิทยุสื่อสาร</span>
                  <span className="font-semibold text-cyan-300 font-mono">450+ สถานี</span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="text-slate-400">การซิงก์ข้อมูลสถานะ</span>
                  <span className="font-semibold text-blue-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-blue-400" />
                    SSE Stream Ready
                  </span>
                </div>
              </div>

              {/* Bottom Quick Action Note */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>พร้อมเชื่อมโยงฐานข้อมูล</span>
                <span className="text-cyan-400 font-medium cursor-pointer hover:underline" onClick={handleEnterPortal}>
                  เปิดแดชบอร์ด →
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          5. FOOTER
          ========================================================================= */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-[#070d18]/80 px-6 sm:px-10 lg:px-16 py-4 text-xs text-slate-400 backdrop-blur-md">
        <div>
          <span>© 2026 Process Claim · ฝ่ายสนับสนุนโครงข่ายวิทยุสื่อสาร SHF</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500">ระบบบริหารงานเคลมอุปกรณ์มาตรฐานสากล</span>
          <span>·</span>
          <span className="font-mono text-slate-400">v{packageInfo.version}</span>
        </div>
      </footer>
    </div>
  )
}
