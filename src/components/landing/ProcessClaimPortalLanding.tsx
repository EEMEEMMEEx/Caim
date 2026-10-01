"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Database,
  Activity,
  Clock,
  Loader2,
} from "lucide-react"
import { ProcessClaimLogoMark } from "@/components/brand/ProcessClaimLogo"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"
import { useLocale } from "@/i18n/LocaleContext"
import { initDefaultSession } from "@/lib/session"

export function ProcessClaimPortalLanding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const { t } = useLocale()
  const [isPending, setIsPending] = React.useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  // Detect user's accessibility reduced motion preference
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      setPrefersReducedMotion(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches)
      }

      mediaQuery.addEventListener?.("change", handleChange)
      return () => mediaQuery.removeEventListener?.("change", handleChange)
    }
  }, [])

  // Ensure autoplay starts silently and reliably
  React.useEffect(() => {
    if (videoRef.current && !prefersReducedMotion) {
      videoRef.current.play().catch(() => {
        // Autoplay policy prevented playback, video smoothly falls back to poster frame
      })
    }
  }, [prefersReducedMotion])

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
          1. AMBIENT VIDEO BACKGROUND & HIGH-TECH GRADIENT OVERLAYS
          ========================================================================= */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      >
        {/* HTML5 Seamless Ambient Looping Video */}
        {!prefersReducedMotion && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="/assets/portal-bg-poster.webp"
            className="motion-reduce:hidden absolute inset-0 h-full w-full object-cover object-center scale-[1.02] filter contrast-[1.08] saturate-110 opacity-70 transition-opacity duration-1000"
          >
            <source src="/videos/portal-ambient-bg.mp4" type="video/mp4" />
          </video>
        )}

        {/* Dark Gradient Overlay for Readability Protection & Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070d18]/92 via-[#070d18]/78 to-[#0b1329]/88 backdrop-brightness-75" />

        {/* Top Header Fade Blend */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#070d18] via-[#070d18]/65 to-transparent" />

        {/* Bottom Footer Fade Blend */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070d18] via-[#070d18]/75 to-transparent" />

        {/* Subtle High-Tech Dot Grid Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />

        {/* Ambient Radial Glow Accents (Cyan / Indigo / Blue) */}
        <div className="absolute -left-20 top-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-blue-700/20 via-indigo-600/15 to-cyan-500/10 blur-[140px]" />
        <div className="absolute left-1/3 top-0 h-[400px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute right-1/4 bottom-10 h-[350px] w-[500px] rounded-full bg-indigo-500/10 blur-[130px]" />
      </div>

      {/* =========================================================================
          2. TOP NAVIGATION / BRAND HEADER
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
              {t("landing.portalSub", "SHF Radio Network System")}
            </span>
          </div>
        </div>

        {/* Right Action: Language Switcher */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      {/* =========================================================================
          3. MAIN HERO CONTENT AREA (BALANCED & STREAMLINED)
          ========================================================================= */}
      <main className="relative z-20 flex flex-1 items-center px-6 sm:px-10 lg:px-16 py-12 lg:py-20">
        <div className="mx-auto w-full max-w-4xl flex flex-col items-start gap-7">
          {/* Overline Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-500/30 bg-sky-950/50 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-sky-300 backdrop-blur-md shadow-inner">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            </span>
            <span className="font-mono text-[11px] sm:text-xs tracking-wider uppercase">
              {t("landing.badge", "EQUIPMENT CLAIM OPERATIONS & TRACKING")}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(56,189,248,0.3)]">
              {t("landing.heroTitlePrefix", "PROCESS")}
            </span>{" "}
            <span className="text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {t("landing.heroTitleSuffix", "CLAIM PORTAL")}
            </span>
          </h1>

          {/* Description Paragraph */}
          <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-2xl text-balance">
            {t("landing.description", "ศูนย์กลางบริหารและติดตามงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร เชื่อมโยงสถานะงาน การส่งซ่อมต่างประเทศ SLA และบทปรับผู้ขายไว้ในระบบเดียวที่ทันสมัย เรียบหรู และใช้งานง่าย")}
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
                  <span>{t("landing.entering", "กำลังเข้าสู่ระบบ...")}</span>
                </>
              ) : (
                <>
                  <span>{t("landing.enterPortal", "เข้าสู่ระบบจัดการงานเคลม")}</span>
                  <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          {/* Feature Badges (Translucent glassmorphic pills) */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
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
      </main>

      {/* =========================================================================
          4. FOOTER (CLEAN & MINIMALIST)
          ========================================================================= */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-[#070d18]/80 px-6 sm:px-10 lg:px-16 py-4 text-xs text-slate-400 backdrop-blur-md">
        <div>
          <span>© 2026 Process Claim · ฝ่ายสนับสนุนโครงข่ายวิทยุสื่อสาร SHF</span>
        </div>
      </footer>
    </div>
  )
}
