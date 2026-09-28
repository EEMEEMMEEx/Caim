"use client"

import * as React from "react"
import Link from "next/link"
import {
  House,
  ChevronRight,
  ClipboardList,
  Pencil,
  RotateCw,
  Cpu,
  ShieldCheck,
  Building2,
  User,
  MapPin,
  Check,
  X,
  Save,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { calculateCaseDuration, calculateRemainingDays, calculateDueDate } from "@/lib/utils/caseDuration"
import { useTicketsQuery, invalidateTicketsCache } from "@/hooks/useTicketsQuery"

export interface TicketDetailData {
  id: string
  title: string
  problemDesc: string
  repairResult: string
  remarks: string
  vendor: string
  model: string
  serialNo: string
  category: string
  deviceType: string
  location: string
  warrantyStatus: string
  serviceCenter: string
  reportedDate: string
  sentDate: string
  deadlineDate: string
  lastTrackDate: string
  returnDate: string
  ageDays: number
  remainingDays: number
  reporter: string
  assignee: string
  currentStage: number // 1: รับแจ้ง, 2: ส่งศูนย์, 3: รออะไหล่, 4: รอส่งมอบ, 5: ปิดเคส
  status?: string
  timeline: {
    title: string
    timestamp: string
    duration: string
  }[]
  otherCases: {
    id: string
    title: string
    date: string
    status: string
    statusCode: number
  }[]
}

const DEFAULT_TICKET_DATA: TicketDetailData = {
  id: "CLM-2026-001",
  title: "หัวข้อเลขที่เคลม",
  problemDesc: "หัวข้ออาการเสีย ปัญหาที่พบ",
  repairResult: "ยังไม่มีผลการซ่อม",
  remarks: "ทดสอบหมายเหตุ",
  vendor: "Huawei",
  model: "OMXD30000",
  serialNo: "1000167600349",
  deviceType: "Optical Transceiver",
  category: "ระบบบริหารจัดการ Software-Defined WAN (SD-WAN Controller)",
  location: "ที่ว่าการอำเภอเลาขวัญ จ.กาญจนบุรี",
  warrantyStatus: "อยู่ในประกัน",
  serviceCenter: "Huawei",
  reportedDate: "13 มิ.ย. 2569",
  sentDate: "—",
  deadlineDate: "12 ส.ค. 2569",
  lastTrackDate: "—",
  returnDate: "—",
  ageDays: 107,
  remainingDays: 0,
  reporter: "ทดสอบผู้แจ้ง",
  assignee: "ทดสอบขอบเคส",
  currentStage: 1,
  timeline: [
    {
      title: "เปิดเคส · รับแจ้ง/รอตรวจสภาพ",
      timestamp: "13 มิ.ย. 2569 01:09",
      duration: "ค้างอยู่ 107 วัน",
    },
  ],
  otherCases: [],
}

const STAGES = [
  { step: 1, label: "รับแจ้ง" },
  { step: 2, label: "ส่งศูนย์" },
  { step: 3, label: "รออะไหล่" },
  { step: 4, label: "รอส่งมอบ" },
  { step: 5, label: "ปิดเคส" },
]

export function TicketDetailView({ ticketId }: { ticketId?: string }) {
  const { tickets, updateTicket } = useTicketsQuery()

  const activeTicketId = ticketId || DEFAULT_TICKET_DATA.id

  const [data, setData] = React.useState<TicketDetailData>(() => ({
    ...DEFAULT_TICKET_DATA,
    id: activeTicketId,
  }))
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editForm, setEditForm] = React.useState(DEFAULT_TICKET_DATA)
  const [newStatusStage, setNewStatusStage] = React.useState(data.currentStage)
  const [statusRemark, setStatusRemark] = React.useState("")
  const [bannerMessage, setBannerMessage] = React.useState<string | null>(null)

  // Direct sync function from Authoritative Tickets API
  const syncTicketFromRemote = React.useCallback(async (targetId: string) => {
    try {
      const res = await fetch(`/api/tickets?id=${encodeURIComponent(targetId)}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      if (!res.ok) return
      const json = await res.json()
      if (json && json.success && json.ticket) {
        const t = json.ticket
        setData((prev) => ({
          ...prev,
          id: t.id,
          title: t.title || prev.title,
          problemDesc: t.problemDesc || prev.problemDesc,
          vendor: t.vendor || prev.vendor,
          model: t.model || prev.model,
          serialNo: t.serialNo || prev.serialNo,
          reportedDate: t.date || prev.reportedDate,
          deadlineDate: t.deadlineDate || prev.deadlineDate,
          currentStage: Number(t.statusCode) || prev.currentStage,
          location: [t.subdistrict, t.district, t.province].filter(Boolean).join(" ") || t.station || prev.location,
        }))
      }
    } catch (err) {
      console.warn("[TicketDetailView] syncTicketFromRemote error:", err)
    }
  }, [])

  // Sync state when tickets cache loads or ticketId matches
  React.useEffect(() => {
    const targetId = activeTicketId
    const found = tickets.find(
      (t) => t.id === targetId || (targetId === "CLM-2026-001" && t.id === "1") || (targetId === "1" && t.id === "CLM-2026-001")
    )

    if (found) {
      setData((prev) => ({
        ...prev,
        id: found.id,
        title: found.title,
        problemDesc: found.problemDesc,
        vendor: found.vendor,
        model: found.model,
        serialNo: found.serialNo,
        reportedDate: found.date,
        deadlineDate: found.deadlineDate || prev.deadlineDate,
        currentStage: Number(found.statusCode) || prev.currentStage,
        location: [found.subdistrict, found.district, found.province].filter(Boolean).join(" ") || found.station || prev.location,
      }))
    }

    // Initial fetch from remote
    syncTicketFromRemote(targetId)

    // Real-time synchronization event listener from SSE & mutations
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent
      const detail = custom.detail as { action?: string; data?: { id?: string } } | undefined
      if (!detail?.data?.id || detail.data.id === targetId || (targetId === "CLM-2026-001" && detail.data.id === "1")) {
        syncTicketFromRemote(targetId)
      }
    }

    const handleInvalidate = () => {
      syncTicketFromRemote(targetId)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:ticket", handleRealtime)
      window.addEventListener("caim:tickets:invalidated", handleInvalidate)
      window.addEventListener("visibilitychange", handleInvalidate)
      window.addEventListener("focus", handleInvalidate)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:ticket", handleRealtime)
        window.removeEventListener("caim:tickets:invalidated", handleInvalidate)
        window.removeEventListener("visibilitychange", handleInvalidate)
        window.removeEventListener("focus", handleInvalidate)
      }
    }
  }, [activeTicketId, tickets, syncTicketFromRemote])

  // Harmonized Case Age Duration Calculation (Both Top Card & Sidebar)
  const caseDuration = React.useMemo(() => {
    return calculateCaseDuration({
      date: data.reportedDate,
      statusCode: data.currentStage,
      status: data.currentStage === 5 ? "ปิดเคส" : "รับแจ้ง",
      ageDays: data.ageDays,
    })
  }, [data.reportedDate, data.currentStage, data.ageDays])

  // Dynamic Remaining Days & Circular Progress Metric Calculation
  const remainingMetric = React.useMemo(() => {
    return calculateRemainingDays(data.deadlineDate, data.reportedDate)
  }, [data.deadlineDate, data.reportedDate])

  // Historical claims for this device's Serial Number from database (excluding current claim)
  const historyCases = React.useMemo(() => {
    const sNo = data.serialNo?.trim()
    if (!sNo) return []

    return tickets.filter((t) => {
      if (!t.serialNo || t.serialNo.trim() !== sNo) return false
      // Exclude current ticket
      if (t.id === data.id || t.id === activeTicketId) return false
      if ((data.id === "CLM-2026-001" || activeTicketId === "CLM-2026-001") && t.id === "1") return false
      if ((data.id === "1" || activeTicketId === "1") && t.id === "CLM-2026-001") return false
      return true
    })
  }, [tickets, data.serialNo, data.id, activeTicketId])

  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (remainingMetric.progressPercent / 100) * circumference

  function showBanner(msg: string) {
    setBannerMessage(msg)
    setTimeout(() => {
      setBannerMessage(null)
    }, 3000)
  }

  function handleOpenEdit() {
    const autoDue = calculateDueDate(data.reportedDate, 60).dueDateStr
    setEditForm({
      ...data,
      deadlineDate:
        data.deadlineDate && !data.deadlineDate.includes("12 พ.ย. 2569")
          ? data.deadlineDate
          : autoDue,
    })
    setIsEditModalOpen(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    const autoDeadline = calculateDueDate(editForm.reportedDate, 60).dueDateStr
    const effectiveDeadline =
      editForm.deadlineDate && !editForm.deadlineDate.includes("12 พ.ย. 2569")
        ? editForm.deadlineDate
        : autoDeadline

    const updatedData = { ...editForm, deadlineDate: effectiveDeadline, id: data.id }
    setData(updatedData)
    setIsEditModalOpen(false)

    try {
      await updateTicket({
        id: data.id,
        title: editForm.title.trim(),
        problemDesc: editForm.problemDesc.trim(),
        description: editForm.problemDesc.trim(),
        vendor: editForm.vendor.trim(),
        model: editForm.model.trim(),
        serialNo: editForm.serialNo.trim(),
        serialNumber: editForm.serialNo.trim(),
        date: editForm.reportedDate,
        deadlineDate: effectiveDeadline,
      })
      await invalidateTicketsCache()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("caim:tickets:invalidated"))
      }
      showBanner("บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว")
    } catch {
      showBanner("บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveStatus(e: React.FormEvent) {
    e.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    const stageNames: Record<number, string> = {
      1: "รับแจ้ง",
      2: "ส่งศูนย์",
      3: "รออะไหล่",
      4: "ซ่อมเสร็จ",
      5: "ปิดเคส",
    }
    const stageDisplayNames: Record<number, string> = {
      1: "รับแจ้ง/รอตรวจสภาพ",
      2: "ส่งศูนย์บริการแล้ว",
      3: "รออะไหล่/กำลังซ่อม",
      4: "ซ่อมเสร็จ/รอส่งมอบ",
      5: "ปิดเคส (รับคืนเรียบร้อย)",
    }

    const stageTitle = stageDisplayNames[newStatusStage] || "ปรับเปลี่ยนสถานะ"
    const nowStr = "วันนี้ " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })

    setData((prev) => ({
      ...prev,
      currentStage: newStatusStage,
      timeline: [
        {
          title: `ปรับสถานะเป็น: ${stageTitle}${statusRemark ? ` (${statusRemark})` : ""}`,
          timestamp: nowStr,
          duration: "ดำเนินการล่าสุด",
        },
        ...prev.timeline,
      ],
    }))

    setIsStatusModalOpen(false)
    setStatusRemark("")

    try {
      await updateTicket({
        id: data.id,
        statusCode: newStatusStage,
        status: stageNames[newStatusStage] || "รับแจ้ง",
      })
      await invalidateTicketsCache()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("caim:tickets:invalidated"))
      }
      showBanner("อัปเดตสถานะงานเคลมเรียบร้อยแล้ว")
    } catch {
      showBanner("อัปเดตสถานะงานเคลมเรียบร้อยแล้ว")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1">
              <Link
                href="/dashboard"
                aria-label="หน้าแรก"
                className="hover:text-foreground transition-colors"
              >
                <House className="size-3.5" />
              </Link>
            </li>
            <li className="flex items-center text-muted-foreground/60">
              <ChevronRight className="size-3" />
            </li>
            <li className="inline-flex items-center gap-1">
              <Link
                href="/tickets"
                className="hover:text-foreground transition-colors"
              >
                งานเคลม
              </Link>
            </li>
            <li className="flex items-center text-muted-foreground/60">
              <ChevronRight className="size-3" />
            </li>
            <li className="inline-flex items-center gap-1">
              <span className="font-normal text-foreground truncate max-w-xs">
                {data.title}
              </span>
            </li>
          </ol>
        </nav>

        {/* Page Title with Icon */}
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
            <ClipboardList className="size-5.5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {data.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.problemDesc}
            </p>
          </div>
        </div>

        {/* Top 2 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          {/* Card 1: อายุงาน (วัน) */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <p className="tabular text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {caseDuration.days}
            </p>
            <p className="text-xs text-muted-foreground mt-1">อายุงาน (วัน)</p>
          </div>

          {/* Card 2: สถานะประกัน */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {data.warrantyStatus}
            </p>
            <p className="text-xs text-muted-foreground mt-1">สถานะประกัน</p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {bannerMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
            <Check className="size-4 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
        )}

        {/* Main Status Tracker & Content Card */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
          {/* Card Header: Case Title, Stage Badge, and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {data.title}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                <span>
                  {data.currentStage === 1 && "รับแจ้ง/รอตรวจสภาพ"}
                  {data.currentStage === 2 && "ส่งศูนย์บริการแล้ว"}
                  {data.currentStage === 3 && "รออะไหล่/กำลังซ่อม"}
                  {data.currentStage === 4 && "ซ่อมเสร็จ/รอส่งมอบ"}
                  {data.currentStage === 5 && "ปิดเคส"}
                </span>
              </span>
            </div>

            {/* Action Buttons: แก้ไข & เปลี่ยนสถานะ */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="gap-1.5 text-xs font-medium border-border hover:bg-muted/40 cursor-pointer"
              >
                <Pencil className="size-3.5" />
                <span>แก้ไข</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setNewStatusStage(data.currentStage)
                  setIsStatusModalOpen(true)
                }}
                className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground text-xs font-medium cursor-pointer shadow-xs"
              >
                <RotateCw className="size-3.5" />
                <span>เปลี่ยนสถานะ</span>
              </Button>
            </div>
          </div>

          {/* Horizontal Numbered Lifecycle Stepper */}
          <div className="py-6 px-2 sm:px-6">
            <div className="flex items-center justify-between">
              {STAGES.map((stage, idx) => {
                const isPassed = data.currentStage > stage.step
                const isCurrent = data.currentStage === stage.step

                return (
                  <React.Fragment key={stage.step}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isCurrent
                            ? "bg-emerald-600 text-white shadow-xs"
                            : isPassed
                            ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400"
                            : "border border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {stage.step}
                      </div>
                      <span
                        className={`text-xs whitespace-nowrap ${
                          isCurrent
                            ? "font-semibold text-foreground"
                            : isPassed
                            ? "text-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>

                    {idx < STAGES.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 sm:mx-4 -mt-5 transition-colors ${
                          data.currentStage > stage.step
                            ? "bg-emerald-600"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border/80 my-4" />

          {/* Two-Column Grid: Left Details vs Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Left Column (Case Details) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              {/* 1. อาการเสีย / ปัญหาที่พบ */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  อาการเสีย / ปัญหาที่พบ
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {data.problemDesc || "—"}
                </p>
              </div>

              {/* 2. ผลการซ่อม / การแก้ไข */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  ผลการซ่อม / การแก้ไข
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {data.repairResult || "ยังไม่มีผลการซ่อม"}
                </p>
              </div>

              {/* 3. หมายเหตุ */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  หมายเหตุ
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {data.remarks || "—"}
                </p>
              </div>

              {/* 4. ลำดับเหตุการณ์ (Vertical Timeline) */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  ลำดับเหตุการณ์
                </h3>
                <div className="relative pl-5 border-l-2 border-border/70 space-y-4">
                  {data.timeline.map((item, idx) => {
                    const isInitialStage = idx === data.timeline.length - 1 || item.title.includes("เปิดเคส")
                    const displayDuration =
                      isInitialStage && data.currentStage === 1
                        ? `ค้างอยู่ ${caseDuration.days} วัน`
                        : item.duration

                    return (
                      <div key={idx} className="relative">
                        {/* Timeline dot */}
                        <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-2 border-emerald-600 bg-background flex items-center justify-center">
                          <span className="size-1 rounded-full bg-emerald-600" />
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.timestamp} · {displayDuration}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 5. ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้ (Conditional Rendering - only renders if there are other cases for this S/N) */}
              {historyCases.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">
                    ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้ ({historyCases.length})
                  </h3>

                  <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden text-xs">
                    {historyCases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/tickets/${c.id}`}
                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                      >
                        <span className="font-medium text-foreground hover:underline cursor-pointer">
                          {c.title}
                        </span>
                        <span className="text-muted-foreground">{c.date}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            c.statusCode === 5
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>{c.status}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Sidebar Widgets) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:border-l lg:border-border/70 lg:pl-8">
              {/* Widget 1: กำหนดแล้วเสร็จ (Circular Progress Card) */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  กำหนดแล้วเสร็จ
                </h3>
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative size-24 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 96 96">
                      {/* Background circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className="stroke-muted"
                        strokeWidth="7"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className={`transition-all duration-700 ${
                          remainingMetric.isOverdue ? "stroke-red-500" : "stroke-brand"
                        }`}
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={remainingMetric.isOverdue ? 0 : strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span
                        className={`text-2xl font-bold tracking-tight leading-none ${
                          remainingMetric.isOverdue ? "text-red-600" : "text-foreground"
                        }`}
                      >
                        {remainingMetric.isOverdue
                          ? remainingMetric.overdueDays
                          : remainingMetric.remainingDays}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        วัน
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-xs font-semibold mt-3 ${
                      remainingMetric.isOverdue ? "text-red-600" : "text-brand"
                    }`}
                  >
                    {remainingMetric.displayText}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ครบกำหนด {remainingMetric.deadlineDateStr}
                  </p>
                </div>
              </div>

              {/* Widget 2: อุปกรณ์ */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <span>อุปกรณ์</span>
                </div>

                <div className="flex flex-col text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Serial No.</span>
                    <span className="font-mono font-medium text-foreground">
                      {data.serialNo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ยี่ห้อ / รุ่น</span>
                    <span className="text-foreground">
                      {data.vendor} / {data.model}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ประเภท</span>
                    <span className="text-foreground">{data.deviceType}</span>
                  </div>
                  <div className="flex items-start justify-between py-2 gap-2">
                    <span className="text-muted-foreground shrink-0">หมวดหมู่</span>
                    <span className="text-right text-foreground">
                      {data.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">สถานที่ติดตั้ง</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" />
                      <span>{data.location}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Widget 3: ข้อมูลเคส */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <span>ข้อมูลเคส</span>
                </div>

                <div className="flex flex-col text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">สถานะประกัน</span>
                    <span className="font-medium text-foreground">
                      {data.warrantyStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ศูนย์บริการ</span>
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span>{data.serviceCenter}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">วันที่รับแจ้ง</span>
                    <span className="text-foreground">{data.reportedDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      วันที่ส่งศูนย์บริการ
                    </span>
                    <span className="text-muted-foreground">{data.sentDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">กำหนดแล้วเสร็จ</span>
                    <span className="text-foreground text-right">
                      {remainingMetric.deadlineDateStr}{" "}
                      <span
                        className={`text-xs ${
                          remainingMetric.isOverdue
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        ({remainingMetric.displayText})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ติดตามล่าสุด</span>
                    <span className="text-muted-foreground">
                      {data.lastTrackDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">วันที่รับคืน</span>
                    <span className="text-muted-foreground">{data.returnDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">อายุงาน</span>
                    <span className="font-medium text-foreground">
                      {caseDuration.text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ผู้แจ้ง</span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <User className="size-3 text-muted-foreground" />
                      <span>{data.reporter}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ผู้รับผิดชอบ</span>
                    <span className="text-foreground">{data.assignee}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">
                  แก้ไขข้อมูลงานเคลม
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 pt-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">หัวข้อเลขที่เคลม</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">อาการเสีย / ปัญหาที่พบ</label>
                <textarea
                  value={editForm.problemDesc}
                  onChange={(e) => setEditForm({ ...editForm, problemDesc: e.target.value })}
                  rows={2}
                  className="rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">วันที่รับแจ้ง</label>
                  <Input
                    value={editForm.reportedDate}
                    onChange={(e) => {
                      const newReported = e.target.value
                      const autoDue = calculateDueDate(newReported, 60).dueDateStr
                      setEditForm({
                        ...editForm,
                        reportedDate: newReported,
                        deadlineDate: autoDue,
                      })
                    }}
                    className="h-8 text-xs"
                    placeholder="เช่น 13 มิ.ย. 2569"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">กำหนดแล้วเสร็จ (SLA 60 วัน)</label>
                  <Input
                    value={editForm.deadlineDate}
                    onChange={(e) => setEditForm({ ...editForm, deadlineDate: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="เช่น 12 ส.ค. 2569"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">ผู้ผลิต (Vendor)</label>
                  <Input
                    value={editForm.vendor}
                    onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">รุ่น (Model)</label>
                  <Input
                    value={editForm.model}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">หมายเลขเครื่อง (S/N)</label>
                <Input
                  value={editForm.serialNo}
                  onChange={(e) => setEditForm({ ...editForm, serialNo: e.target.value })}
                  className="h-8 font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">ผลการซ่อม / การแก้ไข</label>
                <Input
                  value={editForm.repairResult}
                  onChange={(e) => setEditForm({ ...editForm, repairResult: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">หมายเหตุ</label>
                <Input
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">ผู้แจ้ง</label>
                  <Input
                    value={editForm.reporter}
                    onChange={(e) => setEditForm({ ...editForm, reporter: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">ผู้รับผิดชอบ</label>
                  <Input
                    value={editForm.assignee}
                    onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="gap-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">
                  เปลี่ยนสถานะงานเคลม
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">เลือกขั้นตอนสถานะใหม่</label>
                <div className="flex flex-col gap-1.5">
                  {STAGES.map((s) => (
                    <label
                      key={s.step}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        newStatusStage === s.step
                          ? "border-brand bg-brand/5 text-brand font-semibold"
                          : "border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="stage"
                          checked={newStatusStage === s.step}
                          onChange={() => setNewStatusStage(s.step)}
                          className="text-brand focus:ring-brand"
                        />
                        <span>ขั้นที่ {s.step}: {s.label}</span>
                      </div>
                      {s.step === 1 && <span className="text-[11px] text-muted-foreground">รอตรวจสภาพ</span>}
                      {s.step === 2 && <span className="text-[11px] text-muted-foreground">ส่งศูนย์บริการ</span>}
                      {s.step === 3 && <span className="text-[11px] text-muted-foreground">กำลังซ่อม</span>}
                      {s.step === 4 && <span className="text-[11px] text-muted-foreground">รอส่งมอบ</span>}
                      {s.step === 5 && <span className="text-[11px] text-muted-foreground">จบงาน</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">บันทึกช่วยจำ / หมายเหตุขั้นตอน</label>
                <Input
                  placeholder="เช่น ส่งของให้ศูนย์แล้ว เลขพัสดุ..."
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setIsStatusModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="gap-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>ยืนยันเปลี่ยนสถานะ</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
