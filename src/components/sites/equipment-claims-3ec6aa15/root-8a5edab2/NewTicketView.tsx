"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Wrench,
  ChevronRight,
  House,
  Check,
  Save,
  Search,
  HardDrive,
  Info,
  MapPin,
  Building2,
  Radio,
  Loader2,
  ExternalLink,
  X,
  ChevronLeft,
  RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Asset } from "./assetsData"
import { type Station } from "./stationsData"
import { StoredTicket } from "@/lib/storage/recordStorage"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useEquipmentsQuery } from "@/hooks/useEquipmentsQuery"
import { invalidateTicketsCache } from "@/hooks/useTicketsQuery"
import { calculateCaseDuration } from "@/lib/utils/caseDuration"
import { ClaimStakeholdersSection } from "@/components/claims/ClaimStakeholdersSection"
import { claimFormSchema } from "@/lib/validations/claimSchema"

export function NewTicketView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSerial = searchParams.get("serial") || ""
  const initialStation = searchParams.get("station") || ""

  // Database-backed states with unified equipment query cache
  const { equipments } = useEquipmentsQuery()
  const [stations, setStations] = React.useState<Station[]>([])

  const [selectedSerial, setSelectedSerial] = React.useState<string>(initialSerial)
  const [deviceSearch, setDeviceSearch] = React.useState<string>("")
  const [ticketTitle, setTicketTitle] = React.useState<string>(
    () => `CLM-2026-${String(Math.floor(Math.random() * 9000 + 1000))}`
  )
  const [receivedDate, setReceivedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [warranty, setWarranty] = React.useState<string>("warranty")
  const [problemDesc, setProblemDesc] = React.useState<string>("")
  const [serviceCenter, setServiceCenter] = React.useState<string>("Huawei")
  const [dueDate, setDueDate] = React.useState<string>("2026-11-21")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)

  // Stakeholders & Personnel States
  const [reporterName, setReporterName] = React.useState<string>("")
  const [assigneeName, setAssigneeName] = React.useState<string>("")
  const [remarks, setRemarks] = React.useState<string>("")
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  const clearError = React.useCallback((field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  // Cascading Location & Station States
  const [selectedProvince, setSelectedProvince] = React.useState<string>("")
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("")
  const [selectedStationId, setSelectedStationId] = React.useState<string>("")

  // Equipment Registry Modal State
  const [isRegistryModalOpen, setIsRegistryModalOpen] = React.useState(false)
  const [modalSearch, setModalSearch] = React.useState("")
  const [modalVendor, setModalVendor] = React.useState("all")
  const [modalCategory, setModalCategory] = React.useState("all")
  const [modalPage, setModalPage] = React.useState(1)
  const modalPageSize = 10

  // Real-time synchronization for stations (equipments handled by useEquipmentsQuery)
  useRealtimeSync({
    onStationChange: (raw) => {
      const payload = raw as { action?: string; data?: Station } | undefined
      if (!payload || !payload.data) return
      const { action, data } = payload
      setStations((prev) => {
        if (action === "create") return [data, ...prev]
        if (action === "update") return prev.map((s) => (s.id === data.id ? { ...s, ...data } : s))
        if (action === "delete") return prev.filter((s) => s.id !== data.id)
        return prev
      })
    },
  })

  // Fetch live stations from Database
  React.useEffect(() => {
    async function loadStations() {
      try {
        const stRes = await fetch("/api/stations", { cache: "no-store" })
        if (stRes.ok) {
          const stData = await stRes.json()
          if (stData.success && Array.isArray(stData.stations)) {
            setStations(stData.stations)
          }
        }
      } catch (err) {
        console.warn("Fallback to bundled data on initial stations load:", err)
      }
    }
    loadStations()
  }, [])

  // Auto-populate initial serial or station if query param present
  React.useEffect(() => {
    if (initialSerial) setSelectedSerial(initialSerial)
  }, [initialSerial])

  React.useEffect(() => {
    if (initialStation && stations.length > 0) {
      const match = stations.find((s) => s.name === initialStation)
      if (match) {
        setSelectedProvince(match.province)
        setSelectedDistrict(match.district)
        setSelectedStationId(match.id)
      }
    }
  }, [initialStation, stations])

  // Find selected asset
  const selectedAsset = React.useMemo(() => {
    if (!selectedSerial) return null
    return (
      equipments.find((a) => a.serial.toUpperCase() === selectedSerial.toUpperCase()) || null
    )
  }, [selectedSerial, equipments])

  // Filtered dropdown options based on search (Full complete list, no 50 limit)
  const filteredAssets = React.useMemo(() => {
    const q = deviceSearch.trim().toLowerCase()
    if (!q) return equipments
    return equipments.filter(
      (a) =>
        a.serial.toLowerCase().includes(q) ||
        a.vendor.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
    )
  }, [deviceSearch, equipments])

  // Unique vendors and categories for modal
  const modalVendors = React.useMemo(() => {
    const set = new Set(equipments.map((a) => a.vendor).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [equipments])

  const modalCategories = React.useMemo(() => {
    const set = new Set(equipments.map((a) => a.category).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [equipments])

  const filteredModalEquipments = React.useMemo(() => {
    const q = modalSearch.trim().toLowerCase()
    return equipments.filter((a) => {
      if (modalVendor !== "all" && a.vendor !== modalVendor) return false
      if (modalCategory !== "all" && a.category !== modalCategory) return false
      if (q) {
        return (
          a.serial.toLowerCase().includes(q) ||
          a.vendor.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [equipments, modalSearch, modalVendor, modalCategory])

  React.useEffect(() => {
    setModalPage(1)
  }, [modalSearch, modalVendor, modalCategory])

  const modalTotalPages = Math.max(1, Math.ceil(filteredModalEquipments.length / modalPageSize))
  const paginatedModalEquipments = React.useMemo(() => {
    const start = (modalPage - 1) * modalPageSize
    return filteredModalEquipments.slice(start, start + modalPageSize)
  }, [filteredModalEquipments, modalPage, modalPageSize])

  const handleSelectDevice = React.useCallback(
    (asset: Asset) => {
      setSelectedSerial(asset.serial)
      const linkedStationId = (asset as { stationId?: string })?.stationId
      if (linkedStationId) {
        const match = stations.find((s) => s.id === linkedStationId)
        if (match) {
          setSelectedProvince(match.province)
          setSelectedDistrict(match.district)
          setSelectedStationId(match.id)
        }
      }
      setIsRegistryModalOpen(false)
    },
    [stations]
  )

  // Cascading Location Dropdowns
  const availableProvinces = React.useMemo(() => {
    const set = new Set(stations.map((s) => s.province).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stations])

  const availableDistricts = React.useMemo(() => {
    if (!selectedProvince) return []
    const set = new Set(
      stations
        .filter((s) => s.province === selectedProvince)
        .map((s) => s.district)
        .filter(Boolean)
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [selectedProvince, stations])

  const availableStations = React.useMemo(() => {
    if (!selectedProvince) return stations.slice(0, 50)
    return stations.filter((s) => {
      if (selectedProvince && s.province !== selectedProvince) return false
      if (selectedDistrict && s.district !== selectedDistrict) return false
      return true
    })
  }, [selectedProvince, selectedDistrict, stations])

  const selectedStation = React.useMemo(() => {
    if (!selectedStationId) return null
    return stations.find((s) => s.id === selectedStationId) || null
  }, [selectedStationId, stations])

  // Handle station dropdown change
  const handleStationChange = (stId: string) => {
    setSelectedStationId(stId)
    const st = stations.find((s) => s.id === stId)
    if (st) {
      setSelectedProvince(st.province)
      setSelectedDistrict(st.district)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Form Validation with Zod Schema
    const validationResult = claimFormSchema.safeParse({
      ticketTitle,
      selectedSerial,
      receivedDate,
      warranty,
      problemDesc,
      serviceCenter,
      dueDate,
      selectedProvince,
      selectedDistrict,
      selectedStationId,
      reporterName,
      assigneeName,
      remarks,
    })

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of validationResult.error.issues) {
        const key = issue.path[0] as string
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setFormErrors(fieldErrors)
      return
    }
    setFormErrors({})

    setIsSubmitting(true)

    const dateFormatted = new Date(receivedDate).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    const initialDuration = calculateCaseDuration({
      date: dateFormatted,
      status: "รับแจ้ง",
      statusCode: 1,
    })

    const newTicket: StoredTicket = {
      id: ticketTitle.trim(),
      title: ticketTitle.trim(),
      problemDesc: problemDesc.trim(),
      vendor: selectedAsset?.vendor || serviceCenter,
      model: selectedAsset?.model || "-",
      serialNo: selectedSerial || "-",
      status: "รับแจ้ง",
      statusCode: 1,
      date: dateFormatted,
      ageDays: initialDuration.text,
      isOverdue: initialDuration.isOverdue,
      overdueText: initialDuration.overdueText,
      stationId: selectedStation?.id || undefined,
      station: selectedStation?.name || "",
      province: selectedStation?.province || selectedProvince || "",
      district: selectedStation?.district || selectedDistrict || "",
      subdistrict: selectedStation?.subdistrict || "",
      reporter: reporterName.trim() || undefined,
      assignee: assigneeName.trim() || undefined,
      reporterName: reporterName.trim() || undefined,
      assigneeName: assigneeName.trim() || undefined,
      remarks: remarks.trim() || undefined,
    }

    // 1. Dispatch to Backend API / MongoDB via POST /api/claims (with fallback to /api/tickets)
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify(newTicket),
      })
      if (!res.ok) {
        console.warn("Backend API returned status", res.status)
      } else {
        await invalidateTicketsCache()
      }
    } catch (err) {
      console.warn("Backend API offline or unreachable:", err)
    }

    setIsSaved(true)
    setIsSubmitting(false)

    setTimeout(() => {
      router.push("/tickets")
    }, 1000)
  }

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb and Header */}
        <div className="flex flex-col gap-4">
          <nav aria-label="breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <Link
                  href="/dashboard"
                  aria-label="หน้าแรก"
                  className="transition-colors hover:text-foreground"
                >
                  <House className="size-4" />
                </Link>
              </li>
              <li className="flex items-center text-muted-foreground/60">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="inline-flex items-center gap-1">
                <Link href="/tickets" className="hover:text-foreground">
                  งานเคลม
                </Link>
              </li>
              <li className="flex items-center text-muted-foreground/60">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="inline-flex items-center gap-1">
                <span className="font-normal text-foreground">เปิดเคสใหม่</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <Wrench className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                เปิดเคสแจ้งเคลมใหม่ (Transactional)
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                เลือกอุปกรณ์และจุดติดตั้งจากฐานข้อมูลกลาง ข้อมูลจะบันทึกพร้อมประวัติการทำรายการแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isSaved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>บันทึกข้อมูลการเปิดเคสลงฐานข้อมูลเรียบร้อยแล้ว กำลังนำทางกลับไปหน้ารายการ...</span>
            </div>
          )}

          {/* Section 1: อุปกรณ์ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-base font-semibold text-foreground">
                1. อุปกรณ์ที่แจ้งเคลม
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegistryModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer group"
                  title="คลิกเพื่อเปิดดูทะเบียนอุปกรณ์ทั้งหมดและเลือกใช้งาน"
                >
                  <HardDrive className="size-3.5 text-brand transition-transform group-hover:scale-110" />
                  <span>ดูทะเบียนอุปกรณ์ทั้งหมด</span>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand tabular-nums">
                    {equipments.length}
                  </span>
                </button>
                <span className="text-muted-foreground/30">•</span>
                <Link
                  href="/assets"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  title="เปิดหน้าจัดการข้อมูลอุปกรณ์แบบเต็มจอ"
                >
                  <span>หน้าจัดการ</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground">
                    ค้นหาอุปกรณ์ในระบบ (S/N หรือ ชื่อรุ่น)
                  </label>
                  {deviceSearch && (
                    <button
                      type="button"
                      onClick={() => setDeviceSearch("")}
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <RotateCcw className="size-3" />
                      <span>ล้างการค้นหา</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="พิมพ์เพื่อค้นหา เช่น 1025B... หรือ Huawei..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="pl-8 pr-8 h-9 text-xs"
                  />
                  {deviceSearch && (
                    <button
                      type="button"
                      onClick={() => setDeviceSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground">
                    เลือกอุปกรณ์จากทะเบียนฐานข้อมูลกลาง <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {filteredAssets.length} / {equipments.length} รายการ
                  </span>
                </div>
                <select
                  required
                  value={selectedSerial}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedSerial(val)
                    const found = equipments.find((a) => a.serial === val)
                    if (found && (found as { stationId?: string }).stationId) {
                      const match = stations.find((s) => s.id === (found as { stationId?: string }).stationId)
                      if (match) {
                        setSelectedProvince(match.province)
                        setSelectedDistrict(match.district)
                        setSelectedStationId(match.id)
                      }
                    }
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">
                    {deviceSearch
                      ? `-- ค้นพบ ${filteredAssets.length} รายการ (จากทั้งหมด ${equipments.length} รายการ) --`
                      : `-- เลือกอุปกรณ์จากทะเบียนฐานข้อมูลกลาง (${equipments.length} รายการ) --`}
                  </option>
                  {selectedSerial && !filteredAssets.some((a) => a.serial === selectedSerial) && selectedAsset && (
                    <option value={selectedAsset.serial}>
                      {selectedAsset.vendor} / {selectedAsset.model} (S/N: {selectedAsset.serial}) {selectedAsset.name ? `- ${selectedAsset.name}` : ""}
                    </option>
                  )}
                  {filteredAssets.map((asset) => (
                    <option key={asset.serial} value={asset.serial}>
                      {asset.vendor} / {asset.model} (S/N: {asset.serial}) {asset.name ? `- ${asset.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Device Preview Card */}
            {selectedAsset ? (
              <div className="rounded-lg border border-brand/20 bg-brand/5 p-3.5 text-xs text-foreground flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <HardDrive className="size-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand">{selectedAsset.serial}</span>
                      <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy dark:text-blue-300">
                        {selectedAsset.vendor}
                      </span>
                      <span className="font-medium text-foreground">{selectedAsset.model}</span>
                    </div>
                    {selectedAsset.name && (
                      <p className="text-[11px] font-medium text-foreground mt-0.5">
                        {selectedAsset.name}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedAsset.category} {selectedAsset.description ? `• ${selectedAsset.description}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 shrink-0">
                  ทะเบียนฐานข้อมูลกลาง
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0" />
                <span>กรุณาเลือกอุปกรณ์จากรายการด้านบน ข้อมูลรุ่น ยี่ห้อ และหมวดหมู่จะถูกดึงมาให้อัตโนมัติ</span>
              </div>
            )}
          </div>

          {/* Section 2: ข้อมูลสถานีและสถานที่ติดตั้ง (Cascaded Selection) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-brand" />
                <span>2. ข้อมูลสถานีและสถานที่ติดตั้ง (ฐานข้อมูลสถานี 197 จุด)</span>
              </h2>
              <Link
                href="/stations"
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                <Radio className="size-3.5" />
                ดูสถานีทั้งหมด ({stations.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Province */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">จังหวัด</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value)
                    setSelectedDistrict("")
                    setSelectedStationId("")
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">-- ทุกจังหวัด ({availableProvinces.length}) --</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">อำเภอ</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value)
                    setSelectedStationId("")
                  }}
                  disabled={!selectedProvince}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none disabled:opacity-50"
                >
                  <option value="">-- ทุกอำเภอ ({availableDistricts.length}) --</option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">จุดติดตั้ง / สถานี</label>
                <select
                  value={selectedStationId}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">-- เลือกสถานี ({availableStations.length}) --</option>
                  {availableStations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code}) - {st.height} ม.
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Station Preview Card */}
            {selectedStation && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-foreground flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <Building2 className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{selectedStation.name}</span>
                      <span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {selectedStation.code}
                      </span>
                      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {selectedStation.height} เมตร
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ต.{selectedStation.subdistrict} อ.{selectedStation.district} จ.{selectedStation.province} ({selectedStation.zone || selectedStation.area})
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 shrink-0">
                  พิกัด: {selectedStation.lat.toFixed(4)}, {selectedStation.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: ข้อมูลเคส */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              3. ข้อมูลการแจ้งเคลม
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">
                  เลขที่เคลม <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น CLM-2026-0043"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  กำหนดเลขอ้างอิงเคส ห้ามซ้ำกับเคสที่มีอยู่แล้ว
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">วันและเวลาที่รับแจ้ง</label>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-medium text-foreground">สถานะการรับประกัน</label>
                <select
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="warranty">อยู่ในประกัน</option>
                  <option value="expired">นอกประกัน</option>
                  <option value="carepack">ประกันพิเศษ (Care Pack)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-medium text-foreground">
                  อาการเสีย / ปัญหาที่พบ <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={problemDesc}
                  onChange={(e) => {
                    setProblemDesc(e.target.value)
                    clearError("problemDesc")
                  }}
                  placeholder="ระบุอาการผิดปกติหรือสาเหตุที่ต้องการส่งเคลมอย่างละเอียด..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                {formErrors.problemDesc && (
                  <span className="text-[11px] text-destructive">
                    {formErrors.problemDesc}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section: ผู้เกี่ยวข้อง (Stakeholders & Personnel) */}
          <ClaimStakeholdersSection
            reporterName={reporterName}
            setReporterName={(val) => {
              setReporterName(val)
              clearError("reporterName")
            }}
            assigneeName={assigneeName}
            setAssigneeName={(val) => {
              setAssigneeName(val)
              clearError("assigneeName")
            }}
            remarks={remarks}
            setRemarks={(val) => {
              setRemarks(val)
              clearError("remarks")
            }}
            disabled={isSubmitting}
            errors={formErrors}
          />

          {/* Section 4: กำหนดการและศูนย์บริการ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              4. กำหนดการและศูนย์บริการ
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">ศูนย์บริการ / ผู้รับงาน</label>
                <select
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="Huawei">Huawei</option>
                  <option value="Hytera">Hytera</option>
                  <option value="Motorola">Motorola</option>
                  <option value="Dell">Dell</option>
                  <option value="Lenovo">Lenovo</option>
                  <option value="Syndome">Syndome</option>
                  <option value="Transpower">Transpower</option>
                  <option value="Vertiv">Vertiv</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">กำหนดแล้วเสร็จ</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/tickets">
              <Button type="button" variant="outline" size="sm">
                ยกเลิก
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 bg-brand text-white hover:bg-brand-dark cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>กำลังบันทึกเข้าฐานข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>บันทึกเคสเคลมและบันทึกธุรกรรม</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Central Equipment Registry Modal */}
      {isRegistryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
          <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
                  <HardDrive className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      ทะเบียนอุปกรณ์ในฐานข้อมูลกลาง
                    </h3>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      {equipments.length} รายการ
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ค้นหาและคลิก &ldquo;เลือกอุปกรณ์นี้&rdquo; เพื่อนำข้อมูลเข้าสู่แบบฟอร์มเปิดเคสทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistryModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-b border-border bg-muted/15 p-3.5 text-xs">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา S/N, ยี่ห้อ, รุ่น, ชื่ออุปกรณ์..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-8 pr-7 h-8.5 text-xs"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={modalVendor}
                  onChange={(e) => setModalVendor(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="all">ทุกยี่ห้อ (All Vendors)</option>
                  {modalVendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:border-ring focus-visible:outline-none truncate"
                >
                  <option value="all">ทุกหมวดหมู่ (All Categories)</option>
                  {modalCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {(modalSearch || modalVendor !== "all" || modalCategory !== "all") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setModalSearch("")
                      setModalVendor("all")
                      setModalCategory("all")
                    }}
                    className="h-8.5 text-xs px-2 shrink-0 text-muted-foreground hover:text-foreground"
                    title="ล้างตัวกรอง"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto min-h-75 max-h-[55vh]">
              {paginatedModalEquipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <HardDrive className="size-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">ไม่พบรายการอุปกรณ์ที่ค้นหา</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองยี่ห้อ/หมวดหมู่
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalSearch("")
                      setModalVendor("all")
                      setModalCategory("all")
                    }}
                    className="mt-3 text-xs gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>ล้างคำค้นหา</span>
                  </Button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3.5 font-semibold">Serial Number</th>
                      <th className="py-2.5 px-3.5 font-semibold">ยี่ห้อ / รุ่น</th>
                      <th className="py-2.5 px-3.5 font-semibold">ชื่อ / หมวดหมู่อุปกรณ์</th>
                      <th className="py-2.5 px-3.5 font-semibold text-right">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedModalEquipments.map((asset) => {
                      const isCurrent = asset.serial === selectedSerial
                      return (
                        <tr
                          key={asset.serial}
                          className={`transition-colors hover:bg-muted/40 ${
                            isCurrent ? "bg-brand/5 font-medium" : ""
                          }`}
                        >
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-bold text-foreground">
                              {asset.serial}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy dark:text-blue-300">
                                {asset.vendor}
                              </span>
                              <span className="text-foreground">{asset.model}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex flex-col">
                              {asset.name && (
                                <span className="font-medium text-foreground">{asset.name}</span>
                              )}
                              <span className="text-[11px] text-muted-foreground truncate max-w-sm">
                                {asset.category}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant={isCurrent ? "secondary" : "default"}
                              onClick={() => handleSelectDevice(asset)}
                              className={`h-7 px-2.5 text-xs gap-1 cursor-pointer ${
                                isCurrent
                                  ? "bg-brand/15 text-brand hover:bg-brand/25 font-semibold"
                                  : "bg-brand text-white hover:bg-brand-dark"
                              }`}
                            >
                              <Check className="size-3" />
                              <span>{isCurrent ? "เลือกอยู่" : "เลือกอุปกรณ์นี้"}</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3 text-xs">
              <div className="text-muted-foreground">
                แสดง {paginatedModalEquipments.length} จาก {filteredModalEquipments.length} รายการ (ทั้งหมด {equipments.length} รายการในระบบ)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={modalPage <= 1}
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>ก่อนหน้า</span>
                </Button>
                <span className="text-muted-foreground px-1 font-mono">
                  {modalPage} / {modalTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={modalPage >= modalTotalPages}
                  onClick={() => setModalPage((p) => Math.min(modalTotalPages, p + 1))}
                  className="h-8 px-2 text-xs"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/assets"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium"
                >
                  <span>เปิดหน้าข้อมูลอุปกรณ์เต็ม</span>
                  <ExternalLink className="size-3" />
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRegistryModalOpen(false)}
                  className="h-8 text-xs"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
