"use client"

import * as React from "react"
import Link from "next/link"
import {
  PlaneTakeoff,
  ChevronRight,
  House,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  History,
  Clock,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Undo2,
  Loader2,
  ArrowLeftRight,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Asset } from "./assetsData"
import { saveRmaApi } from "@/lib/storage/recordStorage"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useRmaQuery, applyRmaMutation, invalidateRmaCache, type RmaItem } from "@/hooks/useRmaQuery"
import {
  calculateRmaMetrics,
  calculateStageDuration,
  calculateCumulativeStagesDays,
  RMA_STAGES_CONFIG,
  type RmaStageConfig,
} from "@/lib/utils/rmaDuration"
import { StageProgressBarCell } from "./StageProgressBarCell"
import {
  calculatePermitExpirationDate,
  calculatePermitSla,
  formatPermitStepBadge,
} from "@/lib/utils/permitSla"

export { RMA_STAGES_CONFIG, type RmaStageConfig }

interface ClaimCaseOption {
  id: string
  caseNo: string
  title: string
  serialNo: string
  vendor: string
  model: string
  status: string
}

export interface StageHistoryItem {
  stageNumber: number
  name: string
  shortName: string
  standardDays: number
  hasVendorPenalty?: boolean
  startDate: string
  endDate: string
  actualDays: number
  status: "completed" | "active" | "pending"
  notes?: string
}

function getInitialDateTimeLocal() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function toDateTimeLocalString(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const h = d.getHours() || 9
  const m = d.getMinutes() || 0
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`
}

function formatToInputDateTime(dt: string | undefined): string {
  if (!dt) return ""
  if (dt.includes("T") && dt.length >= 16) {
    return dt.substring(0, 16)
  }
  const d = new Date(dt)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`
}

function formatDisplayDateTime(dtStr: string) {
  if (!dtStr) return ""
  try {
    const d = new Date(dtStr)
    if (isNaN(d.getTime())) return dtStr
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ]
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear() + 543
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${day} ${month} ${year} ${hours}:${minutes} น.`
  } catch {
    return dtStr
  }
}


function getInitialDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  let hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  const strHours = String(hours).padStart(2, "0")
  return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`
}

export function OverseasView() {
  const { rmaList, deleteRma, updateRma, refetch: refetchRma } = useRmaQuery()

  // Empty Table State flag on filter reset
  const [isTableCleared, setIsTableCleared] = React.useState(false)

  // Deletion Confirmation & Feedback States
  const [itemToDelete, setItemToDelete] = React.useState<RmaItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Success Alert Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Real-time synchronization for Overseas RMA records
  useRealtimeSync()

  // State for available claim cases & equipments from DB
  const [availableCases, setAvailableCases] = React.useState<ClaimCaseOption[]>([])
  const [equipmentsData, setEquipmentsData] = React.useState<Asset[]>([])

  // Sync available tickets for case options from DB on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
            const mappedCases: ClaimCaseOption[] = data.tickets.map((t: { id: string; title?: string; problemDesc?: string; serialNo?: string; vendor?: string; model?: string; status?: string }) => ({
              id: t.id,
              caseNo: t.title || t.id,
              title: t.problemDesc || t.title,
              serialNo: t.serialNo,
              vendor: t.vendor,
              model: t.model,
              status: t.status,
            }))
            setAvailableCases(mappedCases)
          }
        })
        .catch((err) => console.warn("Could not sync tickets for RMA:", err))

      // 3. Fetch live equipments
      fetch("/api/equipments")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.equipments) && data.equipments.length > 0) {
            setEquipmentsData(data.equipments)
          }
        })
        .catch((err) => console.warn("Could not sync equipments for RMA:", err))
    }
  }, [])

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [vendorFilter, setVendorFilter] = React.useState("all")
  const [onlyOverduePenalty, setOnlyOverduePenalty] = React.useState(false)

  // Applied Filter
  const [appliedFilters, setAppliedFilters] = React.useState({
    query: "",
    stage: "all",
    status: "all",
    vendor: "all",
    onlyOverdue: false,
  })

  // Selected item for timeline modal
  const [timelineItem, setTimelineItem] = React.useState<RmaItem | null>(null)
  const [timelineModalTab, setTimelineModalTab] = React.useState<"timeline" | "permits">("timeline")
  const [isRetroactiveEditing, setIsRetroactiveEditing] = React.useState(false)
  const [actualDateTime, setActualDateTime] = React.useState<string>(getInitialDateTimeLocal)
  const [isSubmittingStage, setIsSubmittingStage] = React.useState(false)
  const [retroactiveStages, setRetroactiveStages] = React.useState<StageHistoryItem[]>([])
  const [stagesSnapshot, setStagesSnapshot] = React.useState<StageHistoryItem[]>([])
  const dateTimeInputRef = React.useRef<HTMLInputElement>(null)

  // Synchronize timelineItem with active rmaList record whenever rmaList updates
  React.useEffect(() => {
    if (timelineItem) {
      const fresh = rmaList.find((r) => r.id === timelineItem.id || r.rmaNo === timelineItem.rmaNo)
      if (fresh && fresh !== timelineItem) {
        setTimelineItem(fresh)
      }
    }
  }, [rmaList, timelineItem])

  // Initialize stage history & date-time whenever timelineItem changes
  React.useEffect(() => {
    if (!timelineItem) {
      setIsRetroactiveEditing(false)
      setStagesSnapshot([])
      return
    }

    setActualDateTime(getInitialDateTimeLocal())

    // If item already has persistent stageHistory, refresh dynamic elapsed days for active steps
    if (
      Array.isArray(timelineItem.stageHistory) &&
      timelineItem.stageHistory.length === 8
    ) {
      const refreshedStages: StageHistoryItem[] = timelineItem.stageHistory.map((s) => {
        const duration = calculateStageDuration(s)
        return {
          ...s,
          actualDays: duration.elapsedDays,
        }
      })
      setRetroactiveStages(refreshedStages)
      setStagesSnapshot(JSON.parse(JSON.stringify(refreshedStages)))
      setIsRetroactiveEditing(false)
      return
    }

    const currentNum = timelineItem.currentStageNumber || 1
    const baseDate = new Date(timelineItem.openDate || new Date())
    if (isNaN(baseDate.getTime())) {
      baseDate.setTime(Date.now() - 15 * 86400000)
    }

    let runningDate = new Date(baseDate)

    const initialStages: StageHistoryItem[] = RMA_STAGES_CONFIG.map((cfg) => {
      const stageNum = cfg.stageNumber
      let status: "completed" | "active" | "pending" = "pending"
      let actualDays = 0
      let startStr = ""
      let endStr = ""

      if (stageNum < currentNum) {
        status = "completed"
        startStr = toDateTimeLocalString(runningDate)
        actualDays = Math.max(0, cfg.standardDays - 1 + (stageNum % 3))
        runningDate = new Date(runningDate.getTime() + actualDays * 86400000)
        endStr = toDateTimeLocalString(runningDate)
        runningDate = new Date(runningDate.getTime() + 1 * 86400000)
      } else if (stageNum === currentNum) {
        status = "active"
        startStr = toDateTimeLocalString(runningDate)
        const duration = calculateStageDuration({
          startDate: startStr,
          endDate: "",
          status: "active",
          standardDays: cfg.standardDays,
        })
        actualDays = duration.elapsedDays || parseInt(timelineItem.stageWaitDays || "0") || 1
        endStr = ""
      } else {
        status = "pending"
        startStr = ""
        endStr = ""
        actualDays = 0
      }

      return {
        ...cfg,
        startDate: startStr,
        endDate: endStr,
        actualDays,
        status,
        notes: "",
      }
    })

    setRetroactiveStages(initialStages)
    setStagesSnapshot(JSON.parse(JSON.stringify(initialStages)))
    setIsRetroactiveEditing(false)
  }, [timelineItem])

  // Logical Validation: Check if any step has end date earlier than start date
  const dateValidationErrors = React.useMemo(() => {
    const errors: Record<number, string> = {}
    for (const s of retroactiveStages) {
      if (s.startDate && s.endDate) {
        const start = new Date(s.startDate).getTime()
        const end = new Date(s.endDate).getTime()
        if (!isNaN(start) && !isNaN(end) && end < start) {
          errors[s.stageNumber] = "วันและเวลาสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"
        }
      }
    }
    return errors
  }, [retroactiveStages])

  const hasValidationErrors = Object.keys(dateValidationErrors).length > 0

  // Dynamic Overall Summary Counter: Recalculate total elapsed days live
  const totalRecomputedDays = React.useMemo(() => {
    return calculateCumulativeStagesDays(retroactiveStages)
  }, [retroactiveStages])

  // Dynamic Duration Handler: Update start/end date-time and recalculate days immediately
  const handleStageDateChange = (
    stageNumber: number,
    field: "startDate" | "endDate",
    value: string
  ) => {
    setRetroactiveStages((prev) =>
      prev.map((stage) => {
        if (stage.stageNumber !== stageNumber) return stage

        const updatedStage = { ...stage, [field]: value }
        const startStr = field === "startDate" ? value : stage.startDate
        const endStr = field === "endDate" ? value : stage.endDate

        const duration = calculateStageDuration({
          startDate: startStr,
          endDate: endStr,
          status: stage.status,
          standardDays: stage.standardDays,
          actualDays: stage.actualDays,
        })
        updatedStage.actualDays = duration.elapsedDays

        return updatedStage
      })
    )
  }

  // Stage Status Change Handler for Retroactive Edit
  const handleStageStatusChange = (
    stageNumber: number,
    newStatus: "completed" | "active" | "pending"
  ) => {
    setRetroactiveStages((prev) =>
      prev.map((stage) => {
        if (stage.stageNumber !== stageNumber) return stage
        const updated = { ...stage, status: newStatus }
        if (newStatus === "pending") {
          updated.startDate = ""
          updated.endDate = ""
          updated.actualDays = 0
        } else if (newStatus === "active") {
          if (!updated.startDate) {
            updated.startDate = getInitialDateTimeLocal()
          }
          updated.endDate = ""
          const duration = calculateStageDuration({
            startDate: updated.startDate,
            endDate: "",
            status: "active",
            standardDays: stage.standardDays,
          })
          updated.actualDays = duration.elapsedDays || 1
        } else if (newStatus === "completed") {
          if (!updated.startDate) {
            updated.startDate = getInitialDateTimeLocal()
          }
          if (!updated.endDate) {
            const startD = new Date(updated.startDate)
            const endD = new Date(startD.getTime() + (stage.standardDays || 2) * 86400000)
            updated.endDate = toDateTimeLocalString(endD)
          }
          const duration = calculateStageDuration({
            startDate: updated.startDate,
            endDate: updated.endDate,
            status: "completed",
            standardDays: stage.standardDays,
          })
          updated.actualDays = duration.elapsedDays || stage.standardDays || 2
        }
        return updated
      })
    )
  }

  const handleEnterRetroactiveEdit = () => {
    setStagesSnapshot(JSON.parse(JSON.stringify(retroactiveStages)))
    setIsRetroactiveEditing(true)
  }

  const handleCancelRetroactive = () => {
    if (stagesSnapshot.length > 0) {
      setRetroactiveStages(stagesSnapshot)
    }
    setIsRetroactiveEditing(false)
  }

  const currentStageNum = timelineItem ? timelineItem.currentStageNumber || 1 : 1
  const currentStage =
    RMA_STAGES_CONFIG.find((s) => s.stageNumber === currentStageNum) || RMA_STAGES_CONFIG[0]
  const isLastStage = currentStageNum >= 8
  const nextStage = isLastStage
    ? null
    : RMA_STAGES_CONFIG.find((s) => s.stageNumber === currentStageNum + 1)

  const primaryTransitionButtonLabel = isLastStage
    ? "ปิดใบส่งซ่อม RMA (ของกลับถึงแล้ว)"
    : `ปิดขั้น "${currentStage.shortName}" → เข้าขั้น "${nextStage?.shortName}"`

  const handleOpenDatePicker = () => {
    if (dateTimeInputRef.current) {
      if (typeof dateTimeInputRef.current.showPicker === "function") {
        dateTimeInputRef.current.showPicker()
      } else {
        dateTimeInputRef.current.focus()
      }
    }
  }

  const handleAdvanceStage = async () => {
    if (!timelineItem) return
    setIsSubmittingStage(true)
    try {
      const nextStageNum = Math.min(8, currentStageNum + 1)
      const nextStageObj = RMA_STAGES_CONFIG.find((s) => s.stageNumber === nextStageNum)
      const isCompleted = currentStageNum >= 8
      const transitionTime = actualDateTime || toDateTimeLocalString(new Date())

      // Update retroactiveStages for timeline tracking and lock previous stage duration
      const updatedStages: StageHistoryItem[] = (
        retroactiveStages.length === 8 ? retroactiveStages : []
      ).map((s) => {
        if (s.stageNumber === currentStageNum) {
          // Finalize current stage: lock duration to elapsed days between startDate and transitionTime
          const sDate = s.startDate || transitionTime
          const eDate = transitionTime
          const duration = calculateStageDuration({
            startDate: sDate,
            endDate: eDate,
            status: "completed",
            standardDays: s.standardDays,
          })
          return {
            ...s,
            status: "completed" as const,
            endDate: eDate,
            actualDays: duration.elapsedDays,
          }
        }
        if (!isCompleted && s.stageNumber === nextStageNum) {
          // Initialize new active stage: reset duration counter to count from day 0
          return {
            ...s,
            status: "active" as const,
            startDate: transitionTime,
            endDate: "",
            actualDays: 0,
          }
        }
        return s
      })

      // If completing at stage 8, ensure stage 8 is locked to its elapsed days
      const stage8 = updatedStages.find((s) => s.stageNumber === 8)
      const stage8LockedDays = stage8?.actualDays || 0

      const updates: Partial<RmaItem> & { id: string } = {
        id: timelineItem.id,
        currentStageNumber: nextStageNum,
        currentStageName: nextStageObj?.name || "ของกลับถึงแล้ว (เสร็จสิ้น)",
        currentStageStartedAt: isCompleted ? (stage8?.startDate || transitionTime) : transitionTime,
        currentStageCompletedAt: isCompleted ? transitionTime : undefined,
        stageWaitDays: isCompleted ? `${stage8LockedDays} วัน` : "0 วัน",
        statusBadge: isCompleted ? "returned" : "in_progress",
        statusBadgeText: isCompleted ? "ของกลับถึงแล้ว" : "กำลังดำเนินการ",
        stageHistory: updatedStages.length === 8 ? updatedStages : timelineItem.stageHistory,
      }

      const res = await updateRma(updates)
      if (res.success) {
        const formattedDate = formatDisplayDateTime(actualDateTime)
        showToast(
          isCompleted
            ? `ปิดใบส่งซ่อม RMA ${timelineItem.rmaNo} เรียบร้อยแล้ว (ของกลับถึงแล้ว ณ ${formattedDate})`
            : `อัปเดตสถานะเป็น "${nextStageObj?.shortName}" (บันทึกเวลา: ${formattedDate})`
        )
        setTimelineItem((prev) => (prev ? { ...prev, ...updates } : null))
        if (updatedStages.length === 8) {
          setRetroactiveStages(updatedStages)
          setStagesSnapshot(JSON.parse(JSON.stringify(updatedStages)))
        }
        await refetchRma()
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการอัปเดตขั้นตอน")
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล")
    } finally {
      setIsSubmittingStage(false)
    }
  }

  const handleSaveRetroactive = async () => {
    if (!timelineItem) return
    if (hasValidationErrors) {
      showToast("กรุณาแก้ไขวันและเวลาสิ้นสุดที่ไม่ถูกต้องก่อนบันทึก")
      return
    }

    setIsSubmittingStage(true)
    try {
      const activeStage = retroactiveStages.find((s) => s.status === "active")
      const completedStages = retroactiveStages.filter((s) => s.status === "completed")
      const newStageNum = activeStage
        ? activeStage.stageNumber
        : Math.min(8, completedStages.length + 1)
      const effectiveStageNum = Math.max(1, Math.min(8, newStageNum))
      const stageConfig = RMA_STAGES_CONFIG.find((s) => s.stageNumber === effectiveStageNum)

      const isCompleted =
        effectiveStageNum >= 8 && retroactiveStages.every((s) => s.status === "completed")

      // Stage 6 penalty calculation (จีน — เข้ากระบวนการซ่อม, standard 14 days)
      const chinaStage = retroactiveStages.find((s) => s.stageNumber === 6)
      const chinaDuration = chinaStage ? calculateStageDuration(chinaStage) : null
      const isOverduePenalty = Boolean(chinaDuration && chinaDuration.isOverStandard)
      const overdueDays = chinaDuration?.overdueDays || 0
      const penaltyDaysStr =
        !chinaStage || chinaStage.status === "pending"
          ? "0 วัน"
          : isOverduePenalty
          ? `เกิน ${overdueDays} วัน`
          : `${chinaDuration?.elapsedDays || 0} วัน`
      const penaltyStandardStr =
        chinaStage?.status === "completed" ? "จาก 14 วัน · ซ่อมเสร็จแล้ว" : "จาก 14 วัน"

      const stage8Item = retroactiveStages.find((s) => s.stageNumber === 8)
      const updates: Partial<RmaItem> & { id: string } = {
        id: timelineItem.id,
        currentStageNumber: effectiveStageNum,
        currentStageName: stageConfig?.name || timelineItem.currentStageName,
        currentStageStartedAt: activeStage?.startDate || (isCompleted ? stage8Item?.startDate : undefined),
        currentStageCompletedAt: isCompleted ? (stage8Item?.endDate || activeStage?.endDate) : undefined,
        totalDays: `${totalRecomputedDays} วัน`,
        stageWaitDays: isCompleted
          ? `${stage8Item?.actualDays || 0} วัน`
          : `${activeStage?.actualDays || 0} วัน`,
        statusBadge: isCompleted ? "returned" : "in_progress",
        statusBadgeText: isCompleted ? "ของกลับถึงแล้ว" : "กำลังดำเนินการ",
        penaltyDays: penaltyDaysStr,
        penaltyStandard: penaltyStandardStr,
        isOverduePenalty,
        stageHistory: retroactiveStages,
      }

      const res = await updateRma(updates)
      if (res.success) {
        showToast("บันทึกการแก้ไขวันและเวลาเรียบร้อยแล้ว — ตารางหลักอัปเดตทันที")
        setTimelineItem((prev) => (prev ? { ...prev, ...updates } : null))
        setStagesSnapshot(JSON.parse(JSON.stringify(retroactiveStages)))
        setIsRetroactiveEditing(false)
        await refetchRma()
      } else {
        showToast(res.error || "ไม่สามารถบันทึกข้อมูลย้อนหลังได้")
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล")
    } finally {
      setIsSubmittingStage(false)
    }
  }

  const handleUpdateRetroactiveField = (
    stageNumber: number,
    field: keyof StageHistoryItem,
    value: string | number
  ) => {
    setRetroactiveStages((prev) =>
      prev.map((s) => (s.stageNumber === stageNumber ? { ...s, [field]: value } : s))
    )
  }

  // Equipment options from live DB equipments
  const equipmentOptions = React.useMemo(() => {
    const map = new Map<string, Asset>()
    for (const a of equipmentsData) {
      if (a.serial && !map.has(a.serial)) {
        map.set(a.serial, a)
      }
    }
    return Array.from(map.values()).slice(0, 150)
  }, [equipmentsData])

  // New RMA Modal state
  const [newRmaModalOpen, setNewRmaModalOpen] = React.useState(false)
  const [newRmaForm, setNewRmaForm] = React.useState({
    rmaNo: "",
    status: "in_progress",
    selectedAssetSerial: "",
    linkedCaseId: "",
    serviceCenter: "",
    destination: "",
    openDate: getInitialDateTime(),
    remarks: "",
  })
  const [formValidationError, setFormValidationError] = React.useState<string | null>(null)

  // New Import/Export Permit Modal state with 90-Day SLA & Lifecycle Tracking
  const [isImportExportModalOpen, setIsImportExportModalOpen] = React.useState(false)
  const [isSubmittingPermit, setIsSubmittingPermit] = React.useState(false)
  const [importExportForm, setImportExportForm] = React.useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      permitNo: "",
      permitType: "export_for_repair" as "export_for_repair" | "import_after_repair" | "nbtc_permit" | "customs_clearance",
      authority: "กสทช. (NBTC)",
      linkedRmaNo: "",
      selectedAssetSerial: "",
      destinationCountry: "ฮ่องกง (Hong Kong)",
      issueDate: today,
      expiryDate: calculatePermitExpirationDate(today, 90),
      remarks: "",
    }
  })
  const [importExportValidationError, setImportExportValidationError] = React.useState<string | null>(null)

  const handlePermitIssueDateChange = (newDate: string) => {
    const calculatedExpiry = calculatePermitExpirationDate(newDate, 90)
    setImportExportForm((prev) => ({
      ...prev,
      issueDate: newDate,
      expiryDate: calculatedExpiry,
    }))
  }

  const handleCaseChange = (caseId: string) => {
    setNewRmaForm((prev) => {
      const updated = { ...prev, linkedCaseId: caseId }
      if (caseId && caseId !== "none") {
        const foundCase = availableCases.find((c) => c.id === caseId)
        if (foundCase) {
          if (!prev.serviceCenter) {
            updated.serviceCenter = foundCase.vendor
          }
          if (!prev.destination) {
            updated.destination =
              foundCase.vendor === "Hytera" ? "Hytera Hongkong" : "Huawei Service Center"
          }
        }
      }
      return updated
    })
    if (formValidationError) setFormValidationError(null)
  }

  const handleEquipmentChange = (serial: string) => {
    setNewRmaForm((prev) => {
      const updated = { ...prev, selectedAssetSerial: serial }
      if (serial) {
        const foundAsset = equipmentsData.find((a) => a.serial === serial)
        if (foundAsset) {
          if (!prev.serviceCenter && foundAsset.vendor) {
            updated.serviceCenter = foundAsset.vendor
          }
          if (!prev.destination && foundAsset.vendor) {
            updated.destination =
              foundAsset.vendor === "Hytera" ? "Hytera Hongkong" : "Huawei Service Center"
          }
        }
      }
      return updated
    })
    if (formValidationError) setFormValidationError(null)
  }

  // Edit RMA state
  const [editingItem, setEditingItem] = React.useState<RmaItem | null>(null)

  const handleSearch = React.useCallback(() => {
    // Re-enable table rendering upon manual search trigger
    setIsTableCleared(false)

    setAppliedFilters({
      query: searchQuery.trim(),
      stage: stageFilter,
      status: statusFilter,
      vendor: vendorFilter,
      onlyOverdue: onlyOverduePenalty,
    })
  }, [searchQuery, stageFilter, statusFilter, vendorFilter, onlyOverduePenalty])

  const handleResetFilters = React.useCallback(() => {
    // 1. Reset all inputs to default empty/placeholder states
    setSearchQuery("")
    setStageFilter("all")
    setStatusFilter("all")
    setVendorFilter("all")
    setOnlyOverduePenalty(false)

    // 2. Empty Table State: Clear all rendered records until manually searched
    setIsTableCleared(true)

    setAppliedFilters({
      query: "",
      stage: "all",
      status: "all",
      vendor: "all",
      onlyOverdue: false,
    })
  }, [])

  // Permanent Record Deletion Handlers
  const confirmDeleteItem = React.useCallback((item: RmaItem) => {
    setItemToDelete(item)
  }, [])

  const executeDeleteItem = React.useCallback(async () => {
    if (!itemToDelete) return
    const targetId = itemToDelete.id
    const targetRmaNo = itemToDelete.rmaNo
    setIsDeleting(true)

    try {
      const res = await deleteRma(targetId)
      if (!res.success) {
        throw new Error(res.error || "Failed to delete RMA")
      }
      showToast(res.message || `ลบใบส่งซ่อม "${targetRmaNo}" ถาวรเรียบร้อยแล้ว`)
    } catch (err) {
      console.error("Failed to delete RMA record", err)
      showToast("เกิดข้อผิดพลาดในการลบใบส่งซ่อม")
    } finally {
      setIsDeleting(false)
      setItemToDelete(null)
    }
  }, [itemToDelete, deleteRma])

  const filteredItems = React.useMemo(() => {
    // Empty Table State: When filters are cleared, completely clear all rendered records
    if (isTableCleared) {
      return []
    }

    return rmaList.filter((item) => {
      if (appliedFilters.query) {
        const q = appliedFilters.query.toLowerCase()
        const match =
          item.rmaNo.toLowerCase().includes(q) ||
          item.caseName.toLowerCase().includes(q) ||
          item.serialNo.toLowerCase().includes(q) ||
          item.vendor.toLowerCase().includes(q)
        if (!match) return false
      }
      if (appliedFilters.stage !== "all" && String(item.currentStageNumber) !== appliedFilters.stage) {
        return false
      }
      if (appliedFilters.status !== "all" && item.statusBadge !== appliedFilters.status) {
        return false
      }
      if (appliedFilters.vendor !== "all" && item.vendor !== appliedFilters.vendor) {
        return false
      }
      if (appliedFilters.onlyOverdue) {
        const metrics = calculateRmaMetrics(item)
        if (!metrics.penalty.isOverdue) {
          return false
        }
      }
      return true
    })
  }, [rmaList, appliedFilters, isTableCleared])

  const handleCreateRma = (e: React.FormEvent) => {
    e.preventDefault()

    const hasEquipment = Boolean(newRmaForm.selectedAssetSerial)
    const hasCase = Boolean(newRmaForm.linkedCaseId && newRmaForm.linkedCaseId !== "none")

    if (!hasEquipment && !hasCase) {
      setFormValidationError("กรุณาเลือกอุปกรณ์จากทะเบียน หรือผูกกับเคสแจ้งเคลมอย่างน้อยหนึ่งอย่าง")
      return
    }

    setFormValidationError(null)

    let resolvedCaseName = "ไม่ผูกเคส"
    let resolvedSerial = "S/N-PENDING"
    let resolvedVendor = newRmaForm.serviceCenter || "Hytera"
    let resolvedModel = "อุปกรณ์สื่อสาร"

    if (hasCase) {
      const foundCase = availableCases.find((c) => c.id === newRmaForm.linkedCaseId)
      if (foundCase) {
        resolvedCaseName = foundCase.caseNo
        resolvedSerial = foundCase.serialNo
        resolvedVendor = foundCase.vendor
        resolvedModel = foundCase.model
      }
    }

    if (hasEquipment) {
      const foundAsset = equipmentsData.find((a) => a.serial === newRmaForm.selectedAssetSerial)
      if (foundAsset) {
        resolvedSerial = foundAsset.serial
        resolvedVendor = foundAsset.vendor || resolvedVendor
        resolvedModel = foundAsset.name || foundAsset.model || resolvedModel
      }
    }

    if (newRmaForm.serviceCenter) {
      resolvedVendor = newRmaForm.serviceCenter
    }

    const generatedRmaNo =
      newRmaForm.rmaNo.trim() ||
      `RMA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`

    const statusBadgeMap: Record<string, { badge: "in_progress" | "returned"; text: string }> = {
      in_progress: { badge: "in_progress", text: "กำลังดำเนินการ" },
      pending: { badge: "in_progress", text: "รอดำเนินการ" },
      shipped: { badge: "in_progress", text: "จัดส่งแล้ว" },
      returned: { badge: "returned", text: "ของกลับถึงแล้ว" },
      completed: { badge: "returned", text: "เสร็จสิ้น" },
    }

    const badgeInfo = statusBadgeMap[newRmaForm.status] || {
      badge: "in_progress",
      text: "กำลังดำเนินการ",
    }

    const rmaOpenDate = newRmaForm.openDate.split(" ")[0] || "24 ก.ย. 2569"
    const initialMetrics = calculateRmaMetrics({
      openDate: rmaOpenDate,
      statusBadge: badgeInfo.badge,
      currentStageNumber: 1,
    })

    const newItem: RmaItem = {
      id: String(Date.now()),
      rmaNo: generatedRmaNo,
      caseName: resolvedCaseName,
      serialNo: resolvedSerial,
      vendor: resolvedVendor,
      model: resolvedModel,
      currentStageNumber: 1,
      totalStages: 8,
      currentStageName: "1. ระบบใบ RMA",
      stageWaitDays: "0 วัน",
      currentStageStartedAt: rmaOpenDate,
      openDate: rmaOpenDate,
      totalDays: initialMetrics.total.text,
      statusBadge: initialMetrics.total.statusBadge,
      statusBadgeText: initialMetrics.total.statusBadgeText,
      penaltyDays: initialMetrics.penalty.penaltyDaysText,
      penaltyStandard: initialMetrics.penalty.penaltyStandardText,
      isOverduePenalty: initialMetrics.penalty.isOverdue,
    }

    // 1. Persist to Database API & Transaction Log, then refetch
    saveRmaApi({
      id: newItem.id,
      rmaNo: newItem.rmaNo,
      caseName: newItem.caseName,
      ticketId: newRmaForm.linkedCaseId && newRmaForm.linkedCaseId !== "none" ? newRmaForm.linkedCaseId : undefined,
      serialNo: newItem.serialNo,
      vendor: newItem.vendor,
      model: newItem.model,
      destination: newRmaForm.destination || "ต่างประเทศ",
      status: newRmaForm.status,
      statusBadge: newItem.statusBadge,
      statusBadgeText: newItem.statusBadgeText,
      currentStageNumber: newItem.currentStageNumber,
      totalStages: newItem.totalStages,
      currentStageName: newItem.currentStageName,
      stageWaitDays: newItem.stageWaitDays,
      currentStageStartedAt: newItem.currentStageStartedAt,
      openDate: newItem.openDate,
      totalDays: newItem.totalDays,
      penaltyDays: newItem.penaltyDays,
      penaltyStandard: newItem.penaltyStandard,
      isOverduePenalty: newItem.isOverduePenalty,
      remarks: newRmaForm.remarks,
    })
      .then(() => {
        refetchRma()
      })
      .catch((err) => console.warn("Failed to persist RMA:", err))

    setNewRmaModalOpen(false)
    setNewRmaForm({
      rmaNo: "",
      status: "in_progress",
      selectedAssetSerial: "",
      linkedCaseId: "",
      serviceCenter: "",
      destination: "",
      openDate: getInitialDateTime(),
      remarks: "",
    })
    showToast(`เปิดใบส่งซ่อม ${generatedRmaNo} และบันทึกเข้าฐานข้อมูลเรียบร้อยแล้ว`)
  }

  const handleCreateImportExportPermit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingPermit(true)
    setImportExportValidationError(null)

    try {
      console.log("[PermitSubmit] Submitting permit payload...", importExportForm)

      const generatedPermitNo =
        importExportForm.permitNo.trim() ||
        (importExportForm.permitType === "import_after_repair"
          ? `IMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
          : `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)

      const calculatedExpiry =
        importExportForm.expiryDate || calculatePermitExpirationDate(importExportForm.issueDate, 90)

      const payload = {
        ...importExportForm,
        permitNo: generatedPermitNo,
        expiryDate: calculatedExpiry,
        rmaNo: importExportForm.linkedRmaNo,
        rmaId: importExportForm.linkedRmaNo,
        serialNo: importExportForm.selectedAssetSerial,
      }

      console.log("[PermitSubmit] Sending payload to /api/rma/permit:", payload)

      const res = await fetch("/api/rma/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log("[PermitSubmit] API response:", data)

      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกใบอนุญาต")
      }

      // Optimistically update in-memory cache and revalidate remote query
      if (data.linkedRma) {
        applyRmaMutation("update", data.linkedRma)
        setTimelineItem(data.linkedRma)
      }
      await invalidateRmaCache()

      setIsImportExportModalOpen(false)
      showToast("บันทึกใบอนุญาตนำเข้า-ส่งออกสำเร็จ")
    } catch (err: unknown) {
      console.error("[PermitSubmit] Submission failure:", err)
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกใบอนุญาต"
      setImportExportValidationError(msg)
      showToast(`บันทึกไม่สำเร็จ: ${msg}`)
    } finally {
      setIsSubmittingPermit(false)
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    updateRma(editingItem)
    setEditingItem(null)
    showToast("บันทึกข้อมูลใบส่งซ่อมลงฐานข้อมูลเรียบร้อยแล้ว")
  }

  return (
    <main id="main" className="flex-1 bg-transparent py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-top-2">
            <Check className="size-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* =========================================================================
            1. HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col gap-3">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li className="inline-flex items-center">
                <Link
                  href="/dashboard"
                  aria-label="หน้าแรก"
                  className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <House className="size-3.5 text-slate-500 dark:text-slate-400" />
                </Link>
              </li>
              <li className="flex items-center text-slate-400 dark:text-slate-500">
                <ChevronRight className="size-3" />
              </li>
              <li className="inline-flex items-center">
                <span className="font-normal text-slate-700 dark:text-slate-200">ส่งเคลมต่างประเทศ</span>
              </li>
            </ol>
          </nav>

          {/* Title & Action Button */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] dark:bg-blue-600 text-white shadow-xs">
                <PlaneTakeoff className="size-5.5 text-white" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  ส่งเคลมต่างประเทศ
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  ติดตามอุปกรณ์ที่ส่งเคลมไปต่างประเทศทีละขั้น พร้อมนาฬิกาบทปรับของผู้ขาย
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsImportExportModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700/90 text-slate-100 border border-slate-700/80 hover:border-slate-600 shadow-sm transition-all active:scale-[0.98] min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation"
              >
                <ArrowLeftRight className="size-4 text-cyan-400" />
                <span>เปิดใบนำเข้า-ส่งออก</span>
              </button>

              <button
                type="button"
                onClick={() => setNewRmaModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0c1a30] dark:bg-blue-600 hover:bg-[#1e293b] dark:hover:bg-blue-500 h-10 px-4 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer touch-manipulation"
              >
                <Plus className="size-4" />
                <span>เปิดใบส่งซ่อม</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. FILTER & SEARCH PANEL
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card sm:p-6 transition-all duration-300">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* ค้นหา */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">ค้นหา</label>
              <Input
                placeholder="เลขใบ RMA, เลขที่เคส, S/N, ยี่ห้อ.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* ขั้นตอน */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">ขั้นตอน</label>
              <div className="relative">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกขั้นตอน</option>
                  <option value="1">1. ระบบใบ RMA</option>
                  <option value="2">2. Forth ตรวจสอบ</option>
                  <option value="3">3. กสทช. ตรวจสอบ</option>
                  <option value="4">4. ส่งออก</option>
                  <option value="5">5. ถึงศูนย์ต่างประเทศ</option>
                  <option value="6">6. จีน เข้ากระบวนการซ่อม</option>
                  <option value="7">7. ส่งกลับเครื่องบิน</option>
                  <option value="8">8. เคลียร์ศุลกากร</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* สถานะใบ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">สถานะใบ</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="returned">ของกลับถึงแล้ว</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* ศูนย์บริการ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">ศูนย์บริการ</label>
              <div className="relative">
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกศูนย์บริการ</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Hytera">Hytera</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* เฉพาะที่เกินบทปรับ Toggle */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setOnlyOverduePenalty((v) => !v)}
                className={`flex h-9 items-center justify-center rounded-lg border text-xs font-normal transition-all cursor-pointer ${
                  onlyOverduePenalty
                    ? "border-red-400 dark:border-rose-500/40 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 shadow-2xs"
                    : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>เฉพาะที่เกินบทปรับ</span>
              </button>
            </div>
          </div>

          {/* Filter Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="size-3.5 text-slate-500 dark:text-slate-400" />
              <span>ล้างตัวกรอง</span>
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0c1a30] dark:bg-blue-600 px-4.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#1e293b] dark:hover:bg-blue-500 cursor-pointer"
            >
              <Search className="size-3.5" />
              <span>ค้นหา</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. RMA DATA TABLE & SEGMENTED PROGRESS BARS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs shadow-card overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/90 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="sticky left-0 z-20 px-5 py-3.5 font-medium bg-slate-50 dark:bg-[#0f172a] shadow-[1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)]">ใบ RMA / เคส</th>
                  <th className="px-4 py-3.5 font-medium min-w-[140px]">อุปกรณ์</th>
                  <th className="px-4 py-3.5 font-medium min-w-[200px]">ขั้นตอนปัจจุบัน</th>
                  <th className="px-4 py-3.5 font-medium min-w-[100px]">เปิดใบ</th>
                  <th className="px-4 py-3.5 font-medium min-w-[110px]">รวม</th>
                  <th className="px-4 py-3.5 font-medium min-w-[140px]">บทปรับผู้ขาย</th>
                  <th className="sticky right-0 z-20 px-4 py-3.5 text-right font-medium min-w-[110px] bg-slate-50 dark:bg-[#0f172a] shadow-[-1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.08)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90 dark:divide-white/10">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      {isTableCleared ? (
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <RotateCcw className="size-5.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              ล้างตัวกรองแล้ว — ไม่มีรายการแสดงผล
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              ระบบได้ล้างรายการข้อมูลออกจากตารางแล้ว กรุณาเลือกเงื่อนไขที่ต้องการหรือกดปุ่ม &quot;ค้นหา&quot; เพื่อแสดงรายการ RMA
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="mt-2 inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-[#0c1a30] px-4 text-xs font-medium text-white shadow-xs hover:bg-[#1e293b] cursor-pointer transition-colors"
                          >
                            <Search className="size-3.5" />
                            <span>ค้นหาข้อมูล</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                          <p className="text-sm font-medium text-slate-600">
                            ไม่พบรายการส่งซ่อมต่างประเทศที่ตรงกับเงื่อนไข
                          </p>
                          <p className="text-xs text-slate-400">
                            ลองปรับเปลี่ยนเงื่อนไขการค้นหาใหม่
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const metrics = calculateRmaMetrics(item)
                    const isOverdue = metrics.penalty.isOverdue

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isOverdue
                            ? "bg-[#fff5f5] dark:bg-rose-950/20 hover:bg-[#ffebeb] dark:hover:bg-rose-950/30"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* ใบ RMA / เคส (Sticky Left Column) */}
                        <td className="sticky left-0 z-10 px-5 py-3.5 bg-white/95 dark:bg-[#1e293b] shadow-[1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)]">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {item.rmaNo}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px] sm:max-w-[180px]" title={item.caseName}>
                            {item.caseName}
                          </p>
                          {/* Attached Permit Indicator Badge/Chip inside RMA row */}
                          {(() => {
                            const permitList =
                              item.permits && item.permits.length > 0
                                ? item.permits
                                : item.permitInfo
                                ? [item.permitInfo]
                                : []
                            if (permitList.length === 0) return null
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {permitList.map((p) => (
                                  <span
                                    key={p.permitNo}
                                    className="inline-flex items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-50 dark:bg-cyan-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-800 dark:text-cyan-300 shadow-2xs"
                                    title={`ใบอนุญาต: ${p.permitNo} (${p.authority}) ออกเมื่อ ${p.issueDate} หมดอายุ ${p.expiryDate}`}
                                  >
                                    <ShieldCheck className="size-2.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                                    <span className="truncate max-w-[140px]">
                                      {p.permitType === "import_after_repair" ? "ใบนำเข้า: " : "ใบส่งออก: "}
                                      {p.permitNo}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )
                          })()}
                        </td>

                        {/* อุปกรณ์ */}
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate max-w-[130px] sm:max-w-none" title={`S/N: ${item.serialNo}`}>
                            {item.serialNo}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px] sm:max-w-none" title={`${item.vendor} / ${item.model}`}>
                            {item.vendor} / {item.model}
                          </p>
                        </td>

                        {/* ขั้นตอนปัจจุบัน (Segmented Progress Bars) */}
                        <StageProgressBarCell item={item} />

                        {/* เปิดใบ */}
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {item.openDate}
                        </td>

                        {/* รวม (Elapsed Days & Status Badge) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                            {metrics.total.text}
                          </p>
                          {metrics.total.statusBadge === "in_progress" ? (
                            <span className="mt-1 inline-block rounded-full border border-blue-200/60 dark:border-blue-500/30 bg-[#eff6ff] dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-medium text-[#2563eb] dark:text-blue-300">
                              {metrics.total.statusBadgeText}
                            </span>
                          ) : (
                            <span className="mt-1 inline-block rounded-full border border-emerald-200/60 dark:border-emerald-500/30 bg-[#ecfdf5] dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-[#059669] dark:text-emerald-300">
                              {metrics.total.statusBadgeText}
                            </span>
                          )}
                        </td>

                        {/* บทปรับผู้ขาย */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isOverdue ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-[#dc2626] dark:text-rose-400 text-xs">
                                  {metrics.penalty.penaltyDaysText}
                                </p>
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-red-200/80 dark:border-rose-500/30 bg-[#fee2e2]/70 dark:bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-medium text-[#dc2626] dark:text-rose-400">
                                  <AlertTriangle className="size-2.5" />
                                  <span>เกินกำหนด</span>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {metrics.penalty.penaltyStandardText}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                                {metrics.penalty.penaltyDaysText}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {metrics.penalty.penaltyStandardText}
                              </p>
                            </div>
                          )}
                        </td>

                        {/* Action Links (Sticky Right Column) */}
                        <td className="sticky right-0 z-10 px-4 py-3.5 text-right whitespace-nowrap bg-white/95 dark:bg-[#1e293b] shadow-[-1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.08)]">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setTimelineItem(item)}
                              className="rounded-lg p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors touch-manipulation"
                              title="ดูไทม์ไลน์กระบวนการ"
                              aria-label="ดูไทม์ไลน์"
                            >
                              <History className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItem({ ...item })}
                              className="rounded-lg p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors touch-manipulation"
                              title="แก้ไข"
                              aria-label="แก้ไข"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeleteItem(item)}
                              className="rounded-lg p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors touch-manipulation"
                              title="ลบใบส่งซ่อมนี้ถาวร"
                              aria-label="ลบ"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-2.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span>แถวต่อหน้า 20</span>
                  <ChevronDown className="size-3.5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <span className="text-slate-500 dark:text-slate-400">
                แสดง 1–{filteredItems.length} จาก {filteredItems.length} ใบ
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 px-2.5 text-xs text-slate-400 dark:text-slate-600 cursor-not-allowed"
              >
                <ChevronLeft className="size-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="px-2 text-xs font-normal text-slate-700 dark:text-slate-300">
                หน้า 1/1
              </span>

              <button
                type="button"
                disabled
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 px-2.5 text-xs text-slate-400 dark:text-slate-600 cursor-not-allowed"
              >
                <span>ถัดไป</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. TIMELINE TRACKING MODAL (ใบ TEST20)
           ========================================================================= */}
        {timelineItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setTimelineItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Tabs */}
              <div className="border-b border-slate-200/80 dark:border-white/10 px-6 pt-4 pb-0 bg-white dark:bg-[#0f172a]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        ใบ {timelineItem.rmaNo}
                      </h3>
                      {isRetroactiveEditing && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Pencil className="size-3" />
                          <span>โหมดแก้ไขข้อมูลย้อนหลัง</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      S/N {timelineItem.serialNo} · เคส {timelineItem.caseName} · {timelineItem.vendor} Hongkong
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRetroactiveEditing) {
                        handleCancelRetroactive()
                      }
                      setTimelineItem(null)
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>

                {/* Sub-Panel Tabs Navigation */}
                <div className="flex items-center gap-1 mt-3">
                  <button
                    type="button"
                    onClick={() => setTimelineModalTab("timeline")}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      timelineModalTab === "timeline"
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    ไทม์ไลน์ขั้นตอน (8 ขั้นตอน)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineModalTab("permits")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      timelineModalTab === "permits"
                        ? "border-cyan-500 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>ใบอนุญาตขนส่ง (Permits)</span>
                    {((timelineItem.permits && timelineItem.permits.length > 0) || timelineItem.permitInfo) && (
                      <span className="ml-1 rounded-full bg-cyan-100 dark:bg-cyan-950 px-1.5 py-0.2 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                        {(timelineItem.permits?.length || (timelineItem.permitInfo ? 1 : 0))}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Timeline & Inline Date-Time Editing Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isRetroactiveEditing && (
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-3 mb-5 shadow-2xs animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 rounded-md bg-amber-100/80 text-amber-700 shrink-0 mt-0.5">
                        <Pencil className="size-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-900">
                            แก้ไขวันและเวลารายขั้นตอน (กรอกย้อนหลัง)
                          </h4>
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                            คำนวณวันจริง &amp; บทปรับสด
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                          สามารถปรับแก้เวลาเริ่มต้นและเวลาสิ้นสุดได้โดยตรงที่แต่ละขั้น ระบบจะคำนวณระยะเวลา (วัน) และตรวจสอบเงื่อนไขเวลาเกินมาตรฐานทันที
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {timelineModalTab === "permits" ? (
                  /* =========================================================================
                      SUB-PANEL: DEDICATED PERMITS & AUDIT LOG TAB
                     ========================================================================= */
                  <div className="space-y-4 animate-in fade-in">
                    {(() => {
                      const activePermits =
                        timelineItem.permits && timelineItem.permits.length > 0
                          ? timelineItem.permits
                          : timelineItem.permitInfo
                          ? [timelineItem.permitInfo]
                          : []

                      if (activePermits.length === 0) {
                        return (
                          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                            <ShieldCheck className="size-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              ยังไม่มีใบอนุญาตขนส่งผูกกับใบส่งซ่อมนี้
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                              สามารถออกใบอนุญาตส่งออกเพื่อซ่อมแซม หรือใบอนุญาตนำเข้าหลังซ่อมผ่านปุ่ม &apos;เปิดใบนำเข้า-ส่งออก&apos; ที่แถบเครื่องมือ
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setImportExportForm((prev) => ({
                                  ...prev,
                                  linkedRmaNo: timelineItem.rmaNo,
                                  selectedAssetSerial: timelineItem.serialNo,
                                }))
                                setIsImportExportModalOpen(true)
                              }}
                              className="mt-4 gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              <Plus className="size-3.5" />
                              <span>เปิดใบนำเข้า-ส่งออกสำหรับเคสนี้</span>
                            </Button>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-4">
                          {activePermits.map((permit, idx) => {
                            const sla = calculatePermitSla(permit.issueDate, permit.expiryDate)
                            const isExport = permit.permitType === "export_for_repair"
                            return (
                              <div
                                key={permit.permitNo || idx}
                                className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-xs space-y-4"
                              >
                                {/* Permit Header & Status Badge */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                                      <ShieldCheck className="size-5" />
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                          {permit.permitNo}
                                        </h4>
                                        <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300/60 dark:border-cyan-800 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-800 dark:text-cyan-300">
                                          {isExport ? "ส่งออกเพื่อซ่อมแซม" : "นำเข้าหลังการซ่อมแซม"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        หน่วยงานผู้อนุญาต: {permit.authority}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                                        sla.isExpired
                                          ? "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300"
                                          : sla.isExpiringSoon
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                          : "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300"
                                      }`}
                                    >
                                      <Clock className="size-3" />
                                      <span>{sla.badgeText}</span>
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                      {sla.subtext}
                                    </p>
                                  </div>
                                </div>

                                {/* 90-Day SLA Progress Bar */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>{sla.subtext}</span>
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                      {sla.badgeText}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        sla.isExpired ? "bg-red-500" : sla.isExpiringSoon ? "bg-amber-500" : "bg-cyan-500"
                                      }`}
                                      style={{ width: `${sla.progressPercent}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Permit Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/50 dark:border-white/5">
                                  <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">วันที่ออกใบอนุญาต</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{permit.issueDate}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">วันหมดอายุ (90 วัน)</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{permit.expiryDate}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ขั้นตอนที่คุ้มครอง</span>
                                    <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                                      {isExport ? "ขั้นตอนที่ 1 – 5" : "ขั้นตอนที่ 5 – 8"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ประเทศปลายทาง / ต้นทาง</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{permit.destinationCountry || "ฮ่องกง"}</span>
                                  </div>
                                  <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-white/5">
                                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">หมายเหตุ / ข้อมูลกำกับ</span>
                                    <span className="text-slate-700 dark:text-slate-300">{permit.remarks || "ไม่มีหมายเหตุเพิ่มเติม"}</span>
                                  </div>
                                </div>

                                {/* Audit Log Details */}
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-1">
                                  <span>บันทึกเมื่อ: {permit.createdAt ? new Date(permit.createdAt).toLocaleString("th-TH") : "พร้อมการเปิดเคส"}</span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">● ผูกสมบูรณ์ (Active Linkage)</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  /* =========================================================================
                      TIMELINE STEPS TAB WITH VISUAL COVERAGE & GLOWING NODES
                     ========================================================================= */
                  <>
                    {/* Active Permit SLA Summary Banner (if RMA has covered permits) */}
                    {(() => {
                      const activePermits =
                        timelineItem.permits && timelineItem.permits.length > 0
                          ? timelineItem.permits
                          : timelineItem.permitInfo
                          ? [timelineItem.permitInfo]
                          : []

                      if (activePermits.length === 0) {
                        return (
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <ShieldCheck className="size-4 text-slate-400" />
                              <span>เคสนี้ยังไม่มีใบอนุญาตนำเข้า-ส่งออกผูกอยู่</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setImportExportForm((prev) => ({
                                  ...prev,
                                  linkedRmaNo: timelineItem.rmaNo,
                                  selectedAssetSerial: timelineItem.serialNo,
                                }))
                                setIsImportExportModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs cursor-pointer transition-colors"
                            >
                              <Plus className="size-3.5" />
                              <span>+ ออกใบอนุญาตสำหรับเคสนี้</span>
                            </button>
                          </div>
                        )
                      }

                      return (
                        <div className="mb-4 space-y-2">
                          {activePermits.map((permit) => {
                            const sla = calculatePermitSla(permit.issueDate, permit.expiryDate)
                            const isExport = permit.permitType === "export_for_repair"
                            return (
                              <div
                                key={permit.permitNo}
                                className={`rounded-xl border p-3 text-xs transition-all ${
                                  sla.isExpired
                                    ? "border-red-300 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30"
                                    : sla.isExpiringSoon
                                    ? "border-amber-300 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30"
                                    : "border-cyan-300/70 bg-cyan-50/60 dark:border-cyan-900/60 dark:bg-cyan-950/30"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                                      <ShieldCheck className="size-4" />
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-100">
                                          ใบอนุญาต: {permit.permitNo}
                                        </span>
                                        <span className="rounded-full bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                          {isExport ? "ส่งออกเพื่อซ่อมแซม (ขั้นตอน 1–5)" : "นำเข้าหลังการซ่อมแซม (ขั้นตอน 5–8)"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        หน่วยงาน: {permit.authority} · วันที่ออก {permit.issueDate} · หมดอายุ {permit.expiryDate}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                        sla.isExpired
                                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                          : sla.isExpiringSoon
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                          : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300"
                                      }`}
                                    >
                                      <Clock className="size-3" />
                                      <span>{sla.badgeText}</span>
                                    </span>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                      {sla.subtext}
                                    </p>
                                  </div>
                                </div>

                                {/* SLA Progress Bar */}
                                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      sla.isExpired
                                        ? "bg-red-500"
                                        : sla.isExpiringSoon
                                        ? "bg-amber-500"
                                        : "bg-cyan-500"
                                    }`}
                                    style={{ width: `${sla.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {/* Vertical Timeline */}
                    <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                      {retroactiveStages.map((stage) => {
                        const isCompleted = stage.status === "completed"
                        const isActive = stage.status === "active"
                        const isPending = stage.status === "pending"
                        const isEditableStep = isCompleted || isActive
                        const hasDateError = Boolean(dateValidationErrors[stage.stageNumber])
                        const stageDuration = calculateStageDuration(stage)
                        const isOverStandard = stageDuration.isOverStandard

                        const activePermits =
                          timelineItem.permits && timelineItem.permits.length > 0
                            ? timelineItem.permits
                            : timelineItem.permitInfo
                            ? [timelineItem.permitInfo]
                            : []

                        const coveringPermits = activePermits.filter(
                          (p) => p.coveredSteps && p.coveredSteps.includes(stage.stageNumber)
                        )
                        const isCovered = coveringPermits.length > 0

                        const startingPermits = activePermits.filter(
                          (p) =>
                            p.coveredSteps &&
                            Math.min(...p.coveredSteps) === stage.stageNumber
                        )

                        return (
                          <div key={stage.stageNumber} className="relative">
                            {/* Attached permit pills above the covered step range for each starting permit */}
                            {startingPermits.map((p) => {
                              const sla = calculatePermitSla(p.issueDate, p.expiryDate)
                              const isImport = p.permitType === "import_after_repair"
                              return (
                                <div key={p.permitNo} className="mb-2 -ml-3 pl-3 animate-in fade-in">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/80 bg-cyan-100/90 dark:bg-cyan-950/90 px-3 py-1 text-[11px] font-semibold text-cyan-900 dark:text-cyan-200 shadow-xs">
                                    <ShieldCheck className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                                    <span>
                                      {isImport ? "ใบอนุญาตนำเข้า: " : "ใบอนุญาตส่งออก: "}
                                      {p.permitNo} | คุ้มครองขั้นตอน {isImport ? "5–8" : "1–5"} | เหลือ {sla.remainingDays} วัน
                                    </span>
                                  </span>
                                </div>
                              )
                            })}

                            <div
                              className={`relative flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs p-3 rounded-xl transition-all ${
                                isCovered
                                  ? "bg-cyan-50/50 dark:bg-cyan-950/20 border-2 border-cyan-400/70 dark:border-cyan-500/60 shadow-sm shadow-cyan-500/10"
                                  : isRetroactiveEditing
                                  ? isOverStandard
                                    ? "bg-amber-50/40 border border-amber-200/70 shadow-2xs"
                                    : "bg-slate-50/60 border border-slate-200/70"
                                  : "border border-transparent"
                              }`}
                            >
                              {/* Stage Icon Marker with Distinct Glowing Ring for Covered Steps */}
                              {isCompleted && (
                                <span
                                  className={`absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px] ${
                                    isCovered ? "ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900 shadow-xs" : ""
                                  }`}
                                >
                                  ✓
                                </span>
                              )}
                              {isActive && (
                                <span
                                  className={`absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#2563eb] text-white font-bold text-xs shadow-xs ${
                                    isCovered ? "ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900" : ""
                                  }`}
                                >
                                  {stage.stageNumber}
                                </span>
                              )}
                              {isPending && (
                                <span
                                  className={`absolute -left-6 flex size-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs ${
                                    isCovered ? "ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900 border-cyan-400 text-cyan-700 dark:text-cyan-300 font-semibold" : ""
                                  }`}
                                >
                                  {stage.stageNumber}
                                </span>
                              )}

                              {/* Stage Info (Left Column) */}
                              <div className="pl-3 flex-1 pr-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p
                                    className={`text-xs ${
                                      isActive
                                        ? "font-bold text-slate-900 dark:text-white"
                                        : isCompleted
                                        ? "font-semibold text-slate-900 dark:text-white"
                                        : "text-slate-600 dark:text-slate-300 font-medium"
                                    }`}
                                  >
                                    {stage.name}
                                  </p>
                                  {isActive && stage.hasVendorPenalty && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-[#fff7ed] px-2 py-0.5 text-[11px] font-medium text-[#d97706]">
                                      <Clock className="size-3" />
                                      <span>เริ่มนับบทปรับผู้ขาย</span>
                                    </span>
                                  )}
                                   {/* Conditional Step-Coverage Permit Badges */}
                                   {coveringPermits.map((p) => {
                                     const badgeInfo = formatPermitStepBadge(p)
                                     const isImport = p.permitType === "import_after_repair"
                                     return (
                                       <span
                                         key={p.permitNo}
                                         className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all ${
                                           badgeInfo.isExpired
                                             ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                                             : badgeInfo.isExpiringSoon
                                             ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse"
                                             : "border-cyan-300/80 bg-cyan-50/80 text-cyan-800 dark:border-cyan-700/60 dark:bg-cyan-950/40 dark:text-cyan-300"
                                         }`}
                                         title={`ใบอนุญาต: ${p.permitNo} (${p.authority}) ออกเมื่อ ${p.issueDate} หมดอายุ ${p.expiryDate}`}
                                       >
                                         <ShieldCheck className="size-3 shrink-0" />
                                         <span>
                                           {isImport ? "ใบนำเข้า: " : "ใบส่งออก: "}
                                           {p.permitNo} · เหลืออีก {badgeInfo.remainingDays} วัน
                                         </span>
                                       </span>
                                     )
                                   })}
                                  {isRetroactiveEditing && (
                                    <select
                                      value={stage.status}
                                      onChange={(e) =>
                                        handleStageStatusChange(
                                          stage.stageNumber,
                                          e.target.value as "completed" | "active" | "pending"
                                        )
                                      }
                                      className="h-6 text-[10px] rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] px-1.5 py-0 text-slate-700 dark:text-slate-200 font-medium focus:border-blue-500 focus:outline-none cursor-pointer"
                                    >
                                      <option value="completed">เสร็จสิ้นแล้ว</option>
                                      <option value="active">กำลังดำเนินการ</option>
                                      <option value="pending">ยังไม่ถึงขั้นนี้</option>
                                    </select>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  มาตรฐาน {stage.standardDays} วัน
                                  {stage.notes && !isRetroactiveEditing ? ` · หมายเหตุ: ${stage.notes}` : ""}
                                </p>
                                {isRetroactiveEditing && (
                                  <input
                                    type="text"
                                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                    value={stage.notes || ""}
                                    onChange={(e) =>
                                      handleUpdateRetroactiveField(stage.stageNumber, "notes", e.target.value)
                                    }
                                    className="mt-1.5 h-6.5 w-full rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] px-2 text-[11px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                                  />
                                )}
                              </div>

                              {/* Stage Timestamps / Interactive Inputs (Right Column) */}
                              <div className="pl-3 md:pl-0 text-left md:text-right text-xs shrink-0">
                                {isRetroactiveEditing ? (
                                  /* Inline Date-Time Editing Mode */
                                  <div className="flex flex-col items-start md:items-end gap-1.5">
                                    {isEditableStep ? (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {/* Start Date-Time Picker Input */}
                                        <div className="relative inline-flex items-center">
                                          <input
                                            type="datetime-local"
                                            value={formatToInputDateTime(stage.startDate)}
                                            onChange={(e) =>
                                              handleStageDateChange(stage.stageNumber, "startDate", e.target.value)
                                            }
                                            onClick={(e) => {
                                              try {
                                                if (typeof e.currentTarget.showPicker === "function") {
                                                  e.currentTarget.showPicker()
                                                }
                                              } catch {}
                                            }}
                                            className={`h-7.5 rounded-md border bg-white dark:bg-[#0f172a] px-2 pr-7 text-[11px] font-mono text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                                              hasDateError ? "border-red-400 ring-1 ring-red-400 bg-red-50/20" : "border-slate-200 dark:border-white/10"
                                            }`}
                                            title="เลือกวันและเวลาเริ่มต้น"
                                          />
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={(e) => {
                                              const input = e.currentTarget.parentElement?.querySelector("input")
                                              if (input) {
                                                try {
                                                  if (typeof input.showPicker === "function") {
                                                    input.showPicker()
                                                  }
                                                } catch {}
                                              }
                                            }}
                                            className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                          >
                                            <Calendar className="size-3.5" />
                                          </button>
                                        </div>

                                        <span className="text-slate-400 text-[10px]">ถึง</span>

                                        {/* End Date-Time Picker Input */}
                                        <div className="relative inline-flex items-center">
                                          <input
                                            type="datetime-local"
                                            value={formatToInputDateTime(stage.endDate)}
                                            onChange={(e) =>
                                              handleStageDateChange(stage.stageNumber, "endDate", e.target.value)
                                            }
                                            onClick={(e) => {
                                              try {
                                                if (typeof e.currentTarget.showPicker === "function") {
                                                  e.currentTarget.showPicker()
                                                }
                                              } catch {}
                                            }}
                                            className={`h-7.5 rounded-md border bg-white dark:bg-[#0f172a] px-2 pr-7 text-[11px] font-mono text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                                              hasDateError ? "border-red-400 ring-1 ring-red-400 bg-red-50/20" : "border-slate-200 dark:border-white/10"
                                            }`}
                                            title="เลือกวันและเวลาสิ้นสุด"
                                          />
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={(e) => {
                                              const input = e.currentTarget.parentElement?.querySelector("input")
                                              if (input) {
                                                try {
                                                  if (typeof input.showPicker === "function") {
                                                    input.showPicker()
                                                  }
                                                } catch {}
                                              }
                                            }}
                                            className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                          >
                                            <Calendar className="size-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">ยังไม่เริ่มดำเนินการ</span>
                                    )}

                                    {/* Inline calculated stage duration badge */}
                                    {isEditableStep && (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span
                                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                                            isOverStandard
                                              ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300"
                                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                          }`}
                                        >
                                          {isOverStandard && <AlertTriangle className="size-2.5 text-red-600" />}
                                          <span>ใช้เวลา: {stageDuration.badgeText}</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Static View Mode */
                                  <div>
                                    {stage.startDate ? (
                                      <>
                                        <p className="font-mono text-slate-700 dark:text-slate-200 text-xs">
                                          {formatDisplayDateTime(stage.startDate)}
                                        </p>
                                        {stage.endDate && (
                                          <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                                            ถึง {formatDisplayDateTime(stage.endDate)}
                                          </p>
                                        )}
                                        <div className="mt-1 flex items-center justify-start md:justify-end gap-1">
                                          <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                              isOverStandard
                                                ? "text-red-600 font-semibold"
                                                : "text-slate-500 dark:text-slate-400"
                                            }`}
                                          >
                                            {isOverStandard && <AlertTriangle className="size-2.5 text-red-500" />}
                                            <span>ใช้เวลา: {stageDuration.badgeText}</span>
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">ยังไม่ถึงขั้นนี้</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] p-5">
                {isRetroactiveEditing ? (
                  /* =========================================================================
                     RETROACTIVE EDIT CONTROLS & LIVE SUMMARY COUNTER
                     ========================================================================= */
                  <>
                    <div className="mb-3.5 flex flex-wrap items-center justify-between rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-slate-800/80 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          ใช้ไปแล้วรวม:{" "}
                          <span
                            className={`text-sm font-bold ${
                              totalRecomputedDays > 60 ? "text-[#ea580c] dark:text-orange-400" : "text-blue-600 dark:text-sky-400"
                            }`}
                          >
                            {totalRecomputedDays} วัน
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          · แผนมาตรฐานรวม 60 วัน (ไม่ใช่วันครบกำหนด)
                        </span>
                      </div>
                      {totalRecomputedDays > 60 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="size-3" />
                          <span>เกินแผนมาตรฐาน (+{totalRecomputedDays - 60} วัน)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isSubmittingStage}
                        onClick={handleCancelRetroactive}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <Undo2 className="size-3.5 text-slate-500 dark:text-slate-400" />
                        <span>ยกเลิก</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingStage || hasValidationErrors}
                        onClick={handleSaveRetroactive}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title={hasValidationErrors ? "กรุณาแก้ไขวันและเวลาที่ระบุไม่ถูกต้องก่อนบันทึก" : undefined}
                      >
                        {isSubmittingStage ? (
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
                      </button>
                    </div>
                  </>
                ) : (
                  /* =========================================================================
                     STANDARD TIMELINE CONTROLS
                     ========================================================================= */
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-3">
                      ใช้ไปแล้ว <span className="font-bold text-slate-900 dark:text-slate-100">{totalRecomputedDays} วัน</span> · แผนมาตรฐานรวม 60 วัน (ไม่ใช่วันครบกำหนด — กระบวนการจริงราว 2-3 เดือน)
                    </p>

                    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">วันและเวลาที่เกิดขึ้นจริง</p>
                        {actualDateTime && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {formatDisplayDateTime(actualDateTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div
                          onClick={handleOpenDatePicker}
                          className="relative flex-1 cursor-pointer group"
                        >
                          <input
                            ref={dateTimeInputRef}
                            type="datetime-local"
                            value={actualDateTime}
                            onChange={(e) => setActualDateTime(e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-9 text-xs font-mono text-slate-700 dark:text-slate-200 shadow-none hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            aria-label="วันและเวลาที่เกิดขึ้นจริง"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDatePicker()
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="เลือกวันและเวลาจากปฏิทิน"
                            aria-label="เปิดปฏิทินเลือกวันและเวลา"
                          >
                            <Calendar className="size-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={isSubmittingStage}
                          onClick={handleAdvanceStage}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0c1a30] dark:bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1e293b] dark:hover:bg-blue-500 active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isSubmittingStage ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>กำลังบันทึก...</span>
                            </>
                          ) : (
                            <span>› {primaryTransitionButtonLabel}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleEnterRetroactiveEdit}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                      <span>แก้ไขที่รายขั้น (กรอกย้อนหลัง)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. CREATE NEW RMA MODAL
           ========================================================================= */}
        {/* =========================================================================
            5.1 CREATE NEW IMPORT/EXPORT PERMIT MODAL
           ========================================================================= */}
        {isImportExportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsImportExportModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-2xl p-6 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <ArrowLeftRight className="size-4.5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      เปิดใบอนุญาตนำเข้า-ส่งออก
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      บันทึกคำขอและใบอนุญาตขนส่งอุปกรณ์ไปซ่อมต่างประเทศ (กสทช. / ศุลกากร)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportExportModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Validation Alert */}
              {importExportValidationError && (
                <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{importExportValidationError}</span>
                </div>
              )}

              <form onSubmit={handleCreateImportExportPermit} className="mt-4 space-y-3.5 text-xs">
                {/* Row 1: เลขที่ใบอนุญาต & ประเภทคำขอ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      เลขที่ใบอนุญาต / เลขที่คำขอ
                    </label>
                    <Input
                      placeholder="เช่น EXP-2026-0089 หรือ เว้นว่างเพื่อให้อัตโนมัติ"
                      value={importExportForm.permitNo}
                      onChange={(e) =>
                        setImportExportForm((prev) => ({ ...prev, permitNo: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-cyan-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      เว้นว่างไว้เพื่อรันเลขเอกสารอัตโนมัติ
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ประเภทใบอนุญาต <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={importExportForm.permitType}
                        onChange={(e) =>
                          setImportExportForm((prev) => ({
                            ...prev,
                            permitType: e.target.value as
                              | "export_for_repair"
                              | "import_after_repair"
                              | "nbtc_permit"
                              | "customs_clearance",
                          }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                        required
                      >
                        <option value="export_for_repair">ส่งออกเพื่อซ่อมแซม (Export for Repair)</option>
                        <option value="import_after_repair">นำเข้าหลังการซ่อมแซม (Import after Repair)</option>
                        <option value="nbtc_permit">ใบอนุญาต กสทช. (NBTC Type Approval Permit)</option>
                        <option value="customs_clearance">ใบขนส่งสินค้าขาออก/เข้า ศุลกากร</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Row 2: หน่วยงานผู้อนุญาต & ปลายทาง */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      หน่วยงานผู้อนุญาต / ออกเอกสาร
                    </label>
                    <div className="relative">
                      <select
                        value={importExportForm.authority}
                        onChange={(e) =>
                          setImportExportForm((prev) => ({ ...prev, authority: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="กสทช. (NBTC)">สำนักงาน กสทช. (NBTC)</option>
                        <option value="กรมศุลกากร (Customs)">กรมศุลกากร (Thai Customs)</option>
                        <option value="กระทรวงพาณิชย์">กรมการค้าต่างประเทศ</option>
                        <option value="ผู้ให้บริการขนส่ง (DHL/FedEx)">ผู้ให้บริการโลจิสติกส์ (DHL / FedEx)</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ประเทศปลายทาง / ต้นทาง
                    </label>
                    <Input
                      placeholder="เช่น ฮ่องกง (Hong Kong), จีน, สิงคโปร์"
                      value={importExportForm.destinationCountry}
                      onChange={(e) =>
                        setImportExportForm((prev) => ({ ...prev, destinationCountry: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Row 3: ผูกกับใบส่งซ่อม RMA หรือเลือกอุปกรณ์ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ผูกกับใบส่งซ่อม (RMA)
                    </label>
                    <div className="relative">
                      <select
                        value={importExportForm.linkedRmaNo}
                        onChange={(e) => {
                          const rmaNo = e.target.value
                          const found = rmaList.find((r) => r.rmaNo === rmaNo)
                          setImportExportForm((prev) => ({
                            ...prev,
                            linkedRmaNo: rmaNo,
                            selectedAssetSerial: found?.serialNo || prev.selectedAssetSerial,
                          }))
                        }}
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">ไม่ระบุ / เอกสารกลาง</option>
                        {rmaList.map((r) => (
                          <option key={r.id} value={r.rmaNo}>
                            {r.rmaNo} — {r.vendor} ({r.model})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      อุปกรณ์ที่เกี่ยวข้อง (S/N)
                    </label>
                    <div className="relative">
                      <select
                        value={importExportForm.selectedAssetSerial}
                        onChange={(e) =>
                          setImportExportForm((prev) => ({ ...prev, selectedAssetSerial: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">เลือกอุปกรณ์จากทะเบียน</option>
                        {equipmentOptions.map((asset) => (
                          <option key={asset.serial} value={asset.serial}>
                            {asset.serial} — {asset.name || asset.model} ({asset.vendor})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Step Coverage Indicator Preview */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 p-3 text-xs">
                  <div className="flex items-start gap-2.5 text-cyan-800 dark:text-cyan-300">
                    <ShieldCheck className="size-4 shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        {importExportForm.permitType === "export_for_repair"
                          ? "คุ้มครองขั้นตอนที่ 1 – 5 (Export for Repair)"
                          : importExportForm.permitType === "import_after_repair"
                          ? "คุ้มครองขั้นตอนที่ 5 – 8 (Import after Repair)"
                          : "คุ้มครองตามข้อกำหนดใบอนุญาต"}
                      </span>
                      <p className="text-[11px] text-cyan-700/80 dark:text-cyan-400/80 mt-0.5">
                        {importExportForm.permitType === "export_for_repair"
                          ? "ผูกความคุ้มครอง: 1. เปิดใบ RMA → 2. Forth ตรวจสอบ → 3. กสทช. อนุมัติ → 4. ส่งออก → 5. ถึงศูนย์ต่างประเทศ"
                          : importExportForm.permitType === "import_after_repair"
                          ? "ผูกความคุ้มครอง: 5. ถึงศูนย์ต่างประเทศ → 6. กระบวนการซ่อมแซม → 7. ส่งกลับเครื่องบิน → 8. ศุลกากรขาเข้า"
                          : "ผูกความคุ้มครองขั้นตอนตามประเภทใบอนุญาต"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 4: วันที่ออกเอกสาร & วันหมดอายุ (90-Day SLA Window) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      วันที่ออกใบอนุญาต
                    </label>
                    <Input
                      type="date"
                      value={importExportForm.issueDate}
                      onChange={(e) => handlePermitIssueDateChange(e.target.value)}
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      วันหมดอายุ (กรอบเวลา 90 วัน) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={importExportForm.expiryDate}
                      onChange={(e) =>
                        setImportExportForm((prev) => ({ ...prev, expiryDate: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-cyan-500"
                      required
                    />
                    <p className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="size-3 shrink-0" />
                      <span>คำนวณวันหมดอายุอัตโนมัติ (issueDate + 90 วัน)</span>
                    </p>
                  </div>

                  {/* Real-time Dynamic SLA Preview */}
                  <div className="col-span-full rounded-xl border border-cyan-300/60 bg-cyan-50/70 dark:border-cyan-800/60 dark:bg-cyan-950/40 p-3 space-y-2">
                    {(() => {
                      const modalSla = calculatePermitSla(
                        importExportForm.issueDate,
                        importExportForm.expiryDate
                      )
                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                              <ShieldCheck className="size-4 text-cyan-600 dark:text-cyan-400" />
                              <span>การประเมินกรอบเวลา SLA 90 วัน (Real-Time)</span>
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                modalSla.isExpired
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
                                  : modalSla.isExpiringSoon
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                                  : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200"
                              }`}
                            >
                              <Clock className="size-3" />
                              <span>{modalSla.badgeText}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{modalSla.subtext}</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              ความคืบหน้า {modalSla.progressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full transition-all duration-300 ${
                                modalSla.isExpired
                                  ? "bg-red-500"
                                  : modalSla.isExpiringSoon
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                              }`}
                              style={{ width: `${modalSla.progressPercent}%` }}
                            />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Row 5: หมายเหตุ */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุ / รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={importExportForm.remarks}
                    onChange={(e) =>
                      setImportExportForm((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder="เช่น ระบุรหัส HS Code, ใบรับรองการนำกลับ, เลข AWB.."
                    className="w-full rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] p-2.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmittingPermit}
                    onClick={() => setIsImportExportModalOpen(false)}
                    className="h-9 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingPermit}
                    className="h-9 px-4 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer gap-1.5"
                  >
                    {isSubmittingPermit ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowLeftRight className="size-3.5" />
                    )}
                    <span>{isSubmittingPermit ? "กำลังบันทึก..." : "บันทึกใบนำเข้า-ส่งออก"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            5.2 CREATE NEW RMA MODAL
           ========================================================================= */}
        {newRmaModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setNewRmaModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-2xl p-6 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    เปิดใบส่งเคลมต่างประเทศ
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    เลือกอุปกรณ์ หรือผูกกับเคสแจ้งเคลมอย่างน้อยหนึ่งอย่าง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewRmaModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Validation Alert */}
              {formValidationError && (
                <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>{formValidationError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRma} className="mt-4 space-y-3.5 text-xs">
                {/* Row 1: เลขที่ใบ RMA & สถานะใบ * */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">เลขที่ใบ RMA</label>
                    <Input
                      placeholder="เช่น RMA-2026-014"
                      value={newRmaForm.rmaNo}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, rmaNo: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      ยังไม่ออกเลขก็บันทึกได้ ค่อยมาเติมทีหลัง
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      สถานะใบ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={newRmaForm.status}
                        onChange={(e) =>
                          setNewRmaForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="in_progress">กำลังดำเนินการ</option>
                        <option value="pending">รอดำเนินการ</option>
                        <option value="shipped">จัดส่งแล้ว</option>
                        <option value="returned">ของกลับถึงแล้ว</option>
                        <option value="completed">เสร็จสิ้น</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Row 2: อุปกรณ์ที่ส่งไปซ่อม */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">อุปกรณ์ที่ส่งไปซ่อม</label>
                  <div className="relative">
                    <select
                      value={newRmaForm.selectedAssetSerial}
                      onChange={(e) => handleEquipmentChange(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">เลือกอุปกรณ์จากทะเบียน</option>
                      {equipmentOptions.map((asset) => (
                        <option key={asset.serial} value={asset.serial}>
                          {asset.serial} — {asset.name || asset.model} ({asset.vendor})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    ถ้าผูกกับเคสอยู่แล้ว เว้นว่างได้ ระบบจะดึงอุปกรณ์จากเคสมาให้เอง
                  </p>
                </div>

                {/* Row 3: ผูกกับเคสแจ้งเคลม */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">ผูกกับเคสแจ้งเคลม</label>
                  <div className="relative">
                    <select
                      value={newRmaForm.linkedCaseId}
                      onChange={(e) => handleCaseChange(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">ไม่ผูกกับเคส</option>
                      {availableCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.caseNo}: {c.title} — {c.model} (S/N: {c.serialNo})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    ไม่บังคับ — เลือกได้เฉพาะเคสที่ยังไม่จบงานและยังไม่มีใบส่งซ่อม
                  </p>
                </div>

                {/* Row 4: ศูนย์บริการ / ผู้รับเคลม & ปลายทาง */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">ศูนย์บริการ / ผู้รับเคลม</label>
                    <div className="relative">
                      <select
                        value={newRmaForm.serviceCenter}
                        onChange={(e) =>
                          setNewRmaForm((prev) => ({ ...prev, serviceCenter: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">เลือกศูนย์บริการ</option>
                        <option value="Hytera">Hytera</option>
                        <option value="Huawei">Huawei</option>
                        <option value="Forth">Forth</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">ปลายทาง</label>
                    <Input
                      placeholder="เช่น Hytera Hongkong"
                      value={newRmaForm.destination}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, destination: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      เช่น Hytera Hongkong
                    </p>
                  </div>
                </div>

                {/* Row 5: วันที่เปิดใบ * */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    วันที่เปิดใบ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full sm:max-w-xs">
                    <Input
                      type="text"
                      required
                      value={newRmaForm.openDate}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, openDate: e.target.value }))
                      }
                      className="h-9 pr-9 text-xs font-mono rounded-lg border-slate-200/80 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                {/* Row 6: หมายเหตุ */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={3}
                    placeholder="เช่น รอเอกสารอนุมัติจาก กสทช. ก่อนส่งออก"
                    value={newRmaForm.remarks}
                    onChange={(e) =>
                      setNewRmaForm((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRmaModalOpen(false)}
                    className="h-9 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4 bg-[#0c1a30] dark:bg-blue-600 text-white hover:bg-[#1e293b] dark:hover:bg-blue-500 text-xs font-medium rounded-lg shadow-xs cursor-pointer"
                  >
                    เปิดใบส่งซ่อม
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. EDIT RMA MODAL
           ========================================================================= */}
        {editingItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setEditingItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  แก้ไขข้อมูลใบส่งซ่อม ({editingItem.rmaNo})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-medium text-slate-700">เลขใบ RMA</label>
                  <Input
                    required
                    value={editingItem.rmaNo}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, rmaNo: e.target.value } : null
                      )
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">เคส / ปัญหา</label>
                  <Input
                    required
                    value={editingItem.caseName}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, caseName: e.target.value } : null
                      )
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700">S/N</label>
                    <Input
                      value={editingItem.serialNo}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, serialNo: e.target.value } : null
                        )
                      }
                      className="mt-1 h-9 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">รุ่นอุปกรณ์</label>
                    <Input
                      value={editingItem.model}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, model: e.target.value } : null
                        )
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(null)}
                    className="text-xs"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-1.5 bg-[#0c1a30] text-white hover:bg-[#1e293b] text-xs"
                  >
                    <Check className="size-3.5" />
                    <span>บันทึกการแก้ไข</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permanent RMA Deletion Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isDeleting && setItemToDelete(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] p-6 shadow-2xl transition-all z-10 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ยืนยันการลบใบส่งซ่อมต่างประเทศถาวร
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    คุณต้องการลบใบ RMA{" "}
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                      &quot;{itemToDelete.rmaNo}&quot;
                    </strong>{" "}
                    ({itemToDelete.vendor} {itemToDelete.model} S/N: {itemToDelete.serialNo}) ใช่หรือไม่?
                  </p>
                  <div className="mt-3 rounded-lg border border-red-200/80 dark:border-rose-500/30 bg-red-50/70 dark:bg-rose-950/40 p-2.5 text-[11px] text-red-700 dark:text-rose-300 leading-relaxed">
                    <span className="font-semibold">ข้อควรระวัง:</span> คำขอนี้จะลบรายการออกจากฐานข้อมูลอย่างถาวร ข้อมูลจะไม่สามารถเรียกคืนได้แม้จะรีเฟรชหน้าเว็บ
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDeleteItem}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>{isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
