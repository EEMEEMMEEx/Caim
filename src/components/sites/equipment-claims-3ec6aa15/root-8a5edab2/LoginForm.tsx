"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProcessClaimLogoMark } from "@/components/brand/ProcessClaimLogo"
import { initDefaultSession, DEFAULT_USER_SESSION } from "@/lib/session"
import packageInfo from "../../../../../package.json"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const [isPending, setIsPending] = React.useState(false)

  const handleOneClickEntry = React.useCallback(async () => {
    setIsPending(true)

    // Initialize mock session state for indykantanat
    initDefaultSession({
      username: "indykantanat",
      email: "indykantanat@gmail.com",
      role: "เจ้าหน้าที่บริหารงานเคลม",
    })

    // Immediate smooth transition to dashboard
    router.push(next || "/dashboard")
  }, [next, router])

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/10 to-indigo-500/10 p-2 ring-1 ring-blue-500/20 shadow-xs">
          <ProcessClaimLogoMark size={44} aria-hidden="true" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-2xl tracking-tight animate-text-shimmer">
            Process Claim
          </span>
        </div>

        <p className="mt-1 text-xs text-muted-foreground font-medium">
          ระบบบริหารงานเคลมอุปกรณ์โครงข่าย SHF
        </p>

        <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span>ระบบเปิดให้เข้าใช้งานตรง (Direct Access)</span>
        </div>
      </div>

      {/* Default Profile Preview Card */}
      <div className="rounded-xl border border-border/80 bg-muted/40 p-4 transition-all">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
            <span>บัญชีผู้ใช้งานเริ่มต้น</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>ยืนยันสิทธิ์แล้ว</span>
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 shadow-2xs">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            in
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-semibold text-foreground">
              {DEFAULT_USER_SESSION.username}
            </span>
            <span className="truncate text-[11px] text-muted-foreground mt-0.5">
              {DEFAULT_USER_SESSION.email}
            </span>
          </div>
          <span className="shrink-0 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
            {DEFAULT_USER_SESSION.role}
          </span>
        </div>
      </div>

      {/* Single-Action Entry Trigger */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          disabled={isPending}
          onClick={handleOneClickEntry}
          className="h-11 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4.5 animate-spin" aria-hidden="true" />
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <>
              <span>เข้าสู่ระบบทันที</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>เข้าใช้งานระบบโดยตรงแบบคลิกเดียว</span>
          <span className="font-mono">v{packageInfo.version}</span>
        </div>
      </div>
    </div>
  )
}
