"use client"

import * as React from "react"
import Link from "next/link"
import {
  ClipboardList,
  Search,
  Cpu,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Check,
  X,
  MapPin,
  RotateCcw,
  Trash2,
  Wifi,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Station } from "./stationsData"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useTicketsQuery, invalidateTicketsCache, type Ticket } from "@/hooks/useTicketsQuery"
import { calculateCaseDuration } from "@/lib/utils/caseDuration"

/**
 * Helper to construct URLSearchParams for claim list API queries
 */
export interface ClaimFilterParams {
  status?: string
  caseNo?: string
  sn?: string
  vendor?: string
  category?: string
  province?: string
  district?: string
  subdistrict?: string
  station?: string
  onlyOverdue?: boolean
}

export function buildClaimFiltersQuery(filters: ClaimFilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.caseNo) params.set("caseNo", filters.caseNo)
  if (filters.sn) params.set("sn", filters.sn)
  if (filters.vendor && filters.vendor !== "all") params.set("vendor", filters.vendor)
  if (filters.category && filters.category !== "all") params.set("category", filters.category)
  if (filters.province && filters.province !== "all") params.set("province", filters.province)
  if (filters.district && filters.district !== "all") params.set("district", filters.district)
  if (filters.subdistrict && filters.subdistrict !== "all") params.set("subdistrict", filters.subdistrict)
  if (filters.station && filters.station !== "all") params.set("station", filters.station)
  if (filters.onlyOverdue) params.set("onlyOverdue", "true")
  return params
}

export function TicketsView() {
  const { tickets, deleteTicket, updateTicket } = useTicketsQuery()
  const [stationsList, setStationsList] = React.useState<Station[]>([])

  // Pagination States
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  // Empty Table State flag on filter reset
  const [isTableCleared, setIsTableCleared] = React.useState(false)

  // Deletion Confirmation & Feedback States
  const [ticketToDelete, setTicketToDelete] = React.useState<Ticket | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Real-time synchronization subscription for Stations
  const { isConnected } = useRealtimeSync({
    onStationChange: (raw) => {
      const payload = raw as { action?: string; data?: Station } | undefined
      if (!payload || !payload.data) return
      const { action, data } = payload
      setStationsList((prev) => {
        if (action === "create") return [data, ...prev]
        if (action === "update") return prev.map((s) => (s.id === data.id ? { ...s, ...data } : s))
        if (action === "delete") return prev.filter((s) => s.id !== data.id)
        return prev
      })
    },
  })

  // Sync stations from backend API on mount
  React.useEffect(() => {
    fetch("/api/stations")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.stations)) {
          setStationsList(data.stations)
        }
      })
      .catch((err) => console.warn("Could not sync stations:", err))
  }, [])

  // Filter Form States
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [caseNoFilter, setCaseNoFilter] = React.useState("")
  const [snFilter, setSnFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [vendorFilter, setVendorFilter] = React.useState("all")
  const [provinceFilter, setProvinceFilter] = React.useState("all")
  const [districtFilter, setDistrictFilter] = React.useState("all")
  const [subdistrictFilter, setSubdistrictFilter] = React.useState("all")
  const [stationFilter, setStationFilter] = React.useState("all")
  const [onlyOverdue, setOnlyOverdue] = React.useState(false)

  // Applied Filter States (triggered on 'ค้นหา' click)
  const [appliedFilters, setAppliedFilters] = React.useState({
    status: "all",
    caseNo: "",
    sn: "",
    vendor: "all",
    category: "all",
    province: "all",
    district: "all",
    subdistrict: "all",
    station: "all",
    onlyOverdue: false,
  })

  // Selected Checkboxes
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  // View / Edit Modal State
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [modalMode, setModalMode] = React.useState<"view" | "edit">("view")
  const [editForm, setEditForm] = React.useState<Ticket | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  // =========================================================================
  // CASCADING LOCATION & STATION DATA EXTRACTION FROM STATIONS DATABASE
  // =========================================================================

  // 1. Province ('จังหวัด'): Distinct provinces extracted directly from stationsList
  const availableProvinces = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.province).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  // 2. District ('อำเภอ'): Filter districts based on selected province
  const availableDistricts = React.useMemo(() => {
    if (provinceFilter === "all") return []
    const set = new Set(
      stationsList
        .filter((s) => s.province === provinceFilter)
        .map((s) => s.district)
        .filter(Boolean)
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [provinceFilter, stationsList])

  // 3. Sub-district ('ตำบล'): Filter sub-districts based on selected district & province
  const availableSubdistricts = React.useMemo(() => {
    if (districtFilter === "all" || provinceFilter === "all") return []
    const set = new Set(
      stationsList
        .filter(
          (s) =>
            s.province === provinceFilter &&
            s.district === districtFilter
        )
        .map((s) => s.subdistrict)
        .filter(Boolean)
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [provinceFilter, districtFilter, stationsList])

  // 4. Station Linking ('สถานี'): Matching selected location hierarchy
  const availableStations = React.useMemo(() => {
    return stationsList.filter((s) => {
      if (provinceFilter !== "all" && s.province !== provinceFilter) return false
      if (districtFilter !== "all" && s.district !== districtFilter) return false
      if (subdistrictFilter !== "all" && s.subdistrict !== subdistrictFilter) return false
      return true
    })
  }, [provinceFilter, districtFilter, subdistrictFilter, stationsList])

  // Cascading Handlers
  const handleProvinceChange = React.useCallback((newProvince: string) => {
    setProvinceFilter(newProvince)
    setDistrictFilter("all")
    setSubdistrictFilter("all")
    setStationFilter("all")
  }, [])

  const handleDistrictChange = React.useCallback((newDistrict: string) => {
    setDistrictFilter(newDistrict)
    setSubdistrictFilter("all")
    setStationFilter("all")
  }, [])

  const handleSubdistrictChange = React.useCallback((newSubdistrict: string) => {
    setSubdistrictFilter(newSubdistrict)
    setStationFilter("all")
  }, [])

  const handleStationChange = React.useCallback((newStation: string) => {
    setStationFilter(newStation)
  }, [])

  // Sync query params if present (on initial mount)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const st = params.get("status")
      const prov = params.get("province")
      const dist = params.get("district")
      const sub = params.get("subdistrict")
      const sta = params.get("station")

      if (st) setStatusFilter(st)
      if (prov) setProvinceFilter(prov)
      if (dist) setDistrictFilter(dist)
      if (sub) setSubdistrictFilter(sub)
      if (sta) setStationFilter(sta)

      if (st || prov || dist || sub || sta) {
        setAppliedFilters((prev) => ({
          ...prev,
          status: st || prev.status,
          province: prov || prev.province,
          district: dist || prev.district,
          subdistrict: sub || prev.subdistrict,
          station: sta || prev.station,
        }))
      }
    }
  }, [])

  const handleSearch = React.useCallback(() => {
    // Re-enable table rendering upon manual search trigger
    setIsTableCleared(false)
    setCurrentPage(1)

    setAppliedFilters({
      status: statusFilter,
      caseNo: caseNoFilter.trim(),
      sn: snFilter.trim(),
      vendor: vendorFilter,
      category: categoryFilter,
      province: provinceFilter,
      district: districtFilter,
      subdistrict: subdistrictFilter,
      station: stationFilter,
      onlyOverdue,
    })
  }, [
    statusFilter,
    caseNoFilter,
    snFilter,
    vendorFilter,
    categoryFilter,
    provinceFilter,
    districtFilter,
    subdistrictFilter,
    stationFilter,
    onlyOverdue,
  ])

  const handleResetFilters = React.useCallback(() => {
    // 1. Reset all input fields and dropdowns back to their default empty/placeholder states
    setStatusFilter("all")
    setCaseNoFilter("")
    setSnFilter("")
    setCategoryFilter("all")
    setVendorFilter("all")
    setProvinceFilter("all")
    setDistrictFilter("all")
    setSubdistrictFilter("all")
    setStationFilter("all")
    setOnlyOverdue(false)
    setSelectedIds([])
    setCurrentPage(1)

    // 2. Empty Table State: Clear all rendered records from the table completely
    // Do not automatically reload or display the default case list until user clicks 'ค้นหา'
    setIsTableCleared(true)

    setAppliedFilters({
      status: "all",
      caseNo: "",
      sn: "",
      vendor: "all",
      category: "all",
      province: "all",
      district: "all",
      subdistrict: "all",
      station: "all",
      onlyOverdue: false,
    })
  }, [])

  // Permanent Record Deletion Handlers
  const confirmDeleteTicket = React.useCallback((ticket: Ticket) => {
    setTicketToDelete(ticket)
  }, [])

  const executeDeleteTicket = React.useCallback(async () => {
    if (!ticketToDelete) return
    const targetId = ticketToDelete.id
    const targetTitle = ticketToDelete.title
    setIsDeleting(true)

    try {
      // 1. Clear selected row if it was checked
      setSelectedIds((prev) => prev.filter((id) => id !== targetId))

      // 2. Trigger real backend API DELETE mutation with optimistic update & cache invalidation
      const res = await deleteTicket(targetId)
      if (!res.success) {
        throw new Error(res.error || "เกิดข้อผิดพลาดในการลบเคส")
      }

      showToast(res.message || `ลบเคส "${targetTitle}" ถาวรเรียบร้อยแล้ว`)
      setTicketToDelete(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบเคส"
      console.error("[TicketsView] Failed to delete ticket:", err)
      showToast(message)
    } finally {
      setIsDeleting(false)
    }
  }, [ticketToDelete, deleteTicket, showToast])

  const filteredTickets = React.useMemo(() => {
    // Empty Table State: When filters are cleared, completely clear all rendered records
    if (isTableCleared) {
      return []
    }

    return tickets.filter((t) => {
      if (
        appliedFilters.status !== "all" &&
        String(t.statusCode) !== appliedFilters.status
      ) {
        return false
      }
      if (
        appliedFilters.vendor !== "all" &&
        t.vendor !== appliedFilters.vendor
      ) {
        return false
      }
      if (
        appliedFilters.caseNo &&
        !t.title.toLowerCase().includes(appliedFilters.caseNo.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.sn &&
        !t.serialNo.toLowerCase().includes(appliedFilters.sn.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.onlyOverdue && !t.isOverdue) {
        return false
      }
      // Location Hierarchy Filters
      if (
        appliedFilters.province !== "all" &&
        t.province &&
        t.province !== appliedFilters.province
      ) {
        return false
      }
      if (
        appliedFilters.district !== "all" &&
        t.district &&
        t.district !== appliedFilters.district
      ) {
        return false
      }
      if (
        appliedFilters.subdistrict !== "all" &&
        t.subdistrict &&
        t.subdistrict !== appliedFilters.subdistrict
      ) {
        return false
      }
      if (
        appliedFilters.station !== "all" &&
        t.station &&
        t.station !== appliedFilters.station
      ) {
        return false
      }
      return true
    })
  }, [tickets, appliedFilters, isTableCleared])

  // Pagination & Counts Calculations
  const totalFiltered = filteredTickets.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  // Auto-adjust page if current page exceeds total pages after deletion
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedTickets = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, currentPage, pageSize])

  // Select all / individual toggle for visible paginated rows
  const isAllSelected =
    paginatedTickets.length > 0 &&
    paginatedTickets.every((t) => selectedIds.includes(t.id))

  const handleToggleSelectAll = React.useCallback(() => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedTickets.map((t) => t.id))
    }
  }, [isAllSelected, paginatedTickets])

  const handleToggleSelectRow = React.useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const STATUS_MAP: Record<number, string> = React.useMemo(
    () => ({
      1: "รับแจ้ง",
      2: "ส่งศูนย์",
      3: "รออะไหล่",
      4: "ซ่อมเสร็จ",
      5: "ปิดเคส",
      6: "ปฏิเสธเคลม",
    }),
    []
  )

  const STATUS_TO_CODE: Record<string, number> = React.useMemo(
    () => ({
      "รับแจ้ง": 1,
      "ส่งศูนย์": 2,
      "รออะไหล่": 3,
      "ซ่อมเสร็จ": 4,
      "ปิดเคส": 5,
      "ปฏิเสธเคลม": 6,
    }),
    []
  )

  const [isSaving, setIsSaving] = React.useState(false)

  // Modal handlers
  const handleView = React.useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket)
    setModalMode("view")
    setSaveSuccess(false)
  }, [])

  const handleEdit = React.useCallback(
    (ticket: Ticket) => {
      const code = Number(ticket.statusCode) || STATUS_TO_CODE[ticket.status] || 1
      const label = ticket.status || STATUS_MAP[code] || "รับแจ้ง"

      setSelectedTicket(ticket)
      setEditForm({
        ...ticket,
        statusCode: code,
        status: label,
      })
      setModalMode("edit")
      setSaveSuccess(false)
    },
    [STATUS_MAP, STATUS_TO_CODE]
  )

  const handleCloseModal = React.useCallback(() => {
    setSelectedTicket(null)
    setEditForm(null)
    setSaveSuccess(false)
    setIsSaving(false)
  }, [])

  const handleStatusChange = React.useCallback(
    (newStatusCode: number) => {
      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              statusCode: newStatusCode,
              status: STATUS_MAP[newStatusCode] || prev.status,
            }
          : null
      )
    },
    [STATUS_MAP]
  )

  const handleSaveTicket = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editForm || isSaving) return

      setIsSaving(true)

      // Transactional Database Update & Realtime Propagation via useTicketsQuery
      try {
        const payload = {
          id: editForm.id,
          title: editForm.title.trim(),
          problemDesc: editForm.problemDesc.trim(),
          description: editForm.problemDesc.trim(),
          vendor: editForm.vendor.trim(),
          model: editForm.model.trim(),
          serialNo: editForm.serialNo.trim(),
          serialNumber: editForm.serialNo.trim(),
          status: editForm.status,
          statusCode: editForm.statusCode,
          date: editForm.date,
          stationId: editForm.stationId,
          station: editForm.station,
          province: editForm.province,
          district: editForm.district,
          subdistrict: editForm.subdistrict,
        }

        const res = await updateTicket(payload)
        if (!res.success) {
          throw new Error(res.error || "Failed to update ticket")
        }

        // Show confirmation toast notification
        showToast(`อัปเดตข้อมูลเคส ${editForm.id} ในฐานข้อมูลเรียบร้อยแล้ว`)

        // Invalidate parent table query cache immediately so outer table updates in real time
        await invalidateTicketsCache()

        // Close modal automatically upon successful save as requested
        handleCloseModal()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
        console.error("[TicketsView] API update error:", message)
        showToast(message)
      } finally {
        setIsSaving(false)
      }
    },
    [editForm, isSaving, updateTicket, showToast, handleCloseModal]
  )

  return (
    <main id="main" className="flex-1 bg-slate-50/50 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. HEADER SECTION
           ========================================================================= */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
              <ClipboardList className="size-5.5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  รายการงานเคลม
                </h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                }`}>
                  <Wifi className="size-3" />
                  {isConnected ? "ซิงก์เรียลไทม์" : "ออฟไลน์/แคช"}
                </span>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm">
                ทุกเคสเคลมที่บันทึกไว้ในฐานข้อมูลกลาง เลือกเงื่อนไขในการ์ดค้นหาแล้วกดค้นหา
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. FILTER CARD (2 Rows + Aligned Search Action)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          {/* Row 1: 5 Columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* สถานะ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">สถานะ</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="1">รับแจ้ง / รอตรวจสภาพ</option>
                  <option value="2">ส่งศูนย์บริการแล้ว</option>
                  <option value="3">รออะไหล่ / กำลังซ่อม</option>
                  <option value="4">ซ่อมเสร็จ / รอส่งมอบ</option>
                  <option value="5">ปิดเคส (รับคืนเรียบร้อย)</option>
                  <option value="6">ปฏิเสธเคลม (นอกเงื่อนไข)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* เลขที่เคส */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">เลขที่เคส</label>
              <Input
                placeholder=""
                value={caseNoFilter}
                onChange={(e) => setCaseNoFilter(e.target.value)}
                className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* S/N */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">S/N</label>
              <Input
                placeholder="หมายเลขเครื่อง"
                value={snFilter}
                onChange={(e) => setSnFilter(e.target.value)}
                className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* หมวดหมู่ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">หมวดหมู่</label>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  <option value="module">โมดูลสื่อสาร</option>
                  <option value="radio">วิทยุสื่อสาร</option>
                  <option value="antenna">เสาอากาศ</option>
                  <option value="power">พาวเวอร์ซัพพลาย</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* ศูนย์บริการ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">ศูนย์บริการ</label>
              <div className="relative">
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกศูนย์บริการ</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Hytera">Hytera</option>
                  <option value="Dell">Dell</option>
                  <option value="Lenovo">Lenovo</option>
                  <option value="Syndome">Syndome</option>
                  <option value="Vertiv">Vertiv</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Row 2: 5 Columns - Cascading Location Hierarchy */}
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* จังหวัด */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">จังหวัด</label>
              <div className="relative">
                <select
                  value={provinceFilter}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกจังหวัด ({availableProvinces.length} จังหวัด)</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* อำเภอ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">อำเภอ</label>
              <div className="relative">
                <select
                  value={districtFilter}
                  disabled={provinceFilter === "all"}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className={`h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    provinceFilter === "all"
                      ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {provinceFilter === "all" ? (
                    <option value="all">เลือกจังหวัดก่อน</option>
                  ) : (
                    <>
                      <option value="all">ทุกอำเภอ ({availableDistricts.length} อำเภอ)</option>
                      {availableDistricts.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* ตำบล */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">ตำบล</label>
              <div className="relative">
                <select
                  value={subdistrictFilter}
                  disabled={districtFilter === "all"}
                  onChange={(e) => handleSubdistrictChange(e.target.value)}
                  className={`h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    districtFilter === "all"
                      ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {districtFilter === "all" ? (
                    <option value="all">เลือกอำเภอก่อน</option>
                  ) : (
                    <>
                      <option value="all">ทุกตำบล ({availableSubdistricts.length} ตำบล)</option>
                      {availableSubdistricts.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* สถานี */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">สถานี</label>
              <div className="relative">
                <select
                  value={stationFilter}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">
                    ทุกสถานี ({availableStations.length} สถานี)
                  </option>
                  {availableStations.length === 0 ? (
                    <option value="none" disabled>
                      ไม่พบสถานีในพื้นที่ที่เลือก
                    </option>
                  ) : (
                    <>
                      {availableStations.some((s) => s.height === 60) && (
                        <optgroup
                          label={`สถานีหลัก 60 เมตร (${
                            availableStations.filter((s) => s.height === 60).length
                          } สถานี)`}
                        >
                          {availableStations
                            .filter((s) => s.height === 60)
                            .map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.code} - {s.name} ({s.district ? `${s.district}, ` : ""}{s.province})
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {availableStations.some((s) => s.height < 60) && (
                        <optgroup
                          label={`เสารับ-ส่งสัญญาณ 9, 18, 30 เมตร (${
                            availableStations.filter((s) => s.height < 60).length
                          } สถานี)`}
                        >
                          {availableStations
                            .filter((s) => s.height < 60)
                            .map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.code} - {s.name} ({s.district ? `${s.district}, ` : ""}{s.province})
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* เฉพาะที่เกินกำหนด Toggle Card/Button */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setOnlyOverdue((v) => !v)}
                className={`flex h-9 items-center justify-center rounded-lg border text-xs font-normal transition-all cursor-pointer ${
                  onlyOverdue
                    ? "border-red-400 bg-red-50 text-red-700 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>เฉพาะที่เกินกำหนด</span>
              </button>
            </div>
          </div>

          {/* Row 3: Action Buttons & Filter Summary */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                ผลการค้นหา: <strong>{filteredTickets.length}</strong> รายการ
              </span>
              {(appliedFilters.province !== "all" ||
                appliedFilters.district !== "all" ||
                appliedFilters.subdistrict !== "all" ||
                appliedFilters.station !== "all") && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                  <MapPin className="size-3 text-blue-600" />
                  <span>
                    {[
                      appliedFilters.province !== "all" && `จ.${appliedFilters.province}`,
                      appliedFilters.district !== "all" && `อ.${appliedFilters.district}`,
                      appliedFilters.subdistrict !== "all" && `ต.${appliedFilters.subdistrict}`,
                      appliedFilters.station !== "all" && appliedFilters.station,
                    ]
                      .filter(Boolean)
                      .join(" › ")}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="size-3.5 text-slate-500" />
                <span>ล้างตัวกรอง</span>
              </button>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0c1a30] px-4.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#1e293b] cursor-pointer"
              >
                <Search className="size-3.5" />
                <span>ค้นหา</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. DATA TABLE & SELECTABLE ROWS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-white text-slate-600">
                <tr>
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="size-4 rounded-full border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                      aria-label="เลือกทั้งหมด"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-medium">เคส</th>
                  <th className="px-4 py-3.5 font-medium">อุปกรณ์</th>
                  <th className="px-4 py-3.5 font-medium">สถานะ</th>
                  <th className="px-4 py-3.5 font-medium">รับแจ้ง</th>
                  <th className="px-4 py-3.5 font-medium">อายุงาน</th>
                  <th className="px-4 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.length === 0 ? (
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
                              ระบบได้ล้างรายการข้อมูลออกจากตารางแล้ว กรุณาเลือกเงื่อนไขที่ต้องการหรือกดปุ่ม &quot;ค้นหา&quot; เพื่อแสดงรายการงานเคลม
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
                            ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหา
                          </p>
                          <p className="text-xs text-slate-400">
                            ลองปรับเปลี่ยนตัวกรองหรือกดล้างตัวกรองเพื่อค้นหาใหม่
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const duration = calculateCaseDuration(item)
                    const isOverdue = duration.isOverdue

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isOverdue
                            ? "bg-[#fff5f5] hover:bg-[#ffebeb]"
                            : "hover:bg-slate-50/70"
                        } ${isSelected ? "bg-blue-50/40" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="size-4 rounded-full border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                            aria-label={`เลือกเคส ${item.title}`}
                          />
                        </td>

                        {/* เคส (Title & Description) */}
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800 text-xs">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                            {item.problemDesc}
                          </p>
                          {item.station && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
                              <MapPin className="size-3 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-700">{item.station}</span>
                              {(item.district || item.province) && (
                                <span className="text-slate-400">
                                  ({[item.district && `อ.${item.district}`, item.province && `จ.${item.province}`].filter(Boolean).join(", ")})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* อุปกรณ์ (Chip Icon & S/N) */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                              <Cpu className="size-3.5" />
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs text-slate-700">
                                {item.vendor} / {item.model}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                S/N {item.serialNo}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* สถานะ (Status Pill Badges) */}
                        <td className="px-4 py-3.5">
                          {item.statusCode === 1 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-medium text-[#059669]">
                              <span className="size-1.5 rounded-full bg-[#059669]" />
                              <span>รับแจ้ง</span>
                            </span>
                          )}
                          {item.statusCode === 2 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-[#f5f3ff] px-2.5 py-0.5 text-[11px] font-medium text-[#7c3aed]">
                              <span className="size-1.5 rounded-full bg-[#7c3aed]" />
                              <span>ส่งศูนย์</span>
                            </span>
                          )}
                          {item.statusCode === 3 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-[#fffbeb] px-2.5 py-0.5 text-[11px] font-medium text-[#d97706]">
                              <span className="size-1.5 rounded-full bg-[#d97706]" />
                              <span>รออะไหล่</span>
                            </span>
                          )}
                          {item.statusCode === 4 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-[#eff6ff] px-2.5 py-0.5 text-[11px] font-medium text-[#2563eb]">
                              <span className="size-1.5 rounded-full bg-[#2563eb]" />
                              <span>ซ่อมเสร็จ</span>
                            </span>
                          )}
                          {item.statusCode === 5 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-medium text-[#059669]">
                              <span className="size-1.5 rounded-full bg-[#059669]" />
                              <span>ปิดเคส</span>
                            </span>
                          )}
                          {item.statusCode === 6 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200/60 bg-[#fdf2f8] px-2.5 py-0.5 text-[11px] font-medium text-[#db2777]">
                              <span className="size-1.5 rounded-full bg-[#db2777]" />
                              <span>ปฏิเสธเคลม</span>
                            </span>
                          )}
                          {(!item.statusCode || item.statusCode < 1 || item.statusCode > 6) && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                              <span className="size-1.5 rounded-full bg-slate-500" />
                              <span>{item.status || "รับแจ้ง"}</span>
                            </span>
                          )}
                        </td>

                        {/* รับแจ้ง (Date) */}
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {item.date}
                        </td>

                        {/* อายุงาน (Duration & Overdue Alert) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isOverdue ? (
                            <div className="leading-tight">
                              <p className="font-bold text-[#dc2626]">
                                {duration.text}
                              </p>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-red-200/80 bg-[#fee2e2]/70 px-1.5 py-0.5 text-[10px] font-medium text-[#dc2626]">
                                <AlertTriangle className="size-2.5" />
                                <span>{duration.overdueText}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">{duration.text}</span>
                          )}
                        </td>

                        {/* Action Links (ดู / แก้ไข / ลบ) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => handleView(item)}
                              className="text-[#1e61f0] hover:underline cursor-pointer"
                              aria-label={`ดูรายละเอียดเคส ${item.title}`}
                            >
                              ดู
                            </button>
                            <span className="text-slate-300">/</span>
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="text-[#1e61f0] hover:underline cursor-pointer"
                              aria-label={`แก้ไขข้อมูลเคส ${item.title}`}
                            >
                              แก้ไข
                            </button>
                            <span className="text-slate-300">/</span>
                            <button
                              type="button"
                              onClick={() => confirmDeleteTicket(item)}
                              className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                              aria-label={`ลบเคส ${item.title}`}
                              title="ลบเคสนี้ถาวร"
                            >
                              <Trash2 className="size-3 text-red-500" />
                              <span>ลบ</span>
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

          {/* =========================================================================
              4. PAGINATION & FOOTER CONTROLS
             ========================================================================= */}
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
            {/* Left: Rows Per Page & Summary */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="จำนวนรายการต่อหน้า"
                >
                  <option value={10}>10 รายการ/หน้า</option>
                  <option value={20}>20 รายการ/หน้า</option>
                  <option value={50}>50 รายการ/หน้า</option>
                </select>
              </div>
              <span className="text-slate-500">
                แสดง {totalFiltered > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalFiltered)} จาก {totalFiltered} เคส
              </span>
            </div>

            {/* Right: Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs transition-colors ${
                  currentPage <= 1
                    ? "bg-slate-50/50 text-slate-400 cursor-not-allowed"
                    : "bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                }`}
                aria-label="ไปหน้าก่อนหน้า"
              >
                <ChevronLeft className="size-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="px-2 text-xs font-normal text-slate-700">
                หน้า {currentPage}/{totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs transition-colors ${
                  currentPage >= totalPages
                    ? "bg-slate-50/50 text-slate-400 cursor-not-allowed"
                    : "bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                }`}
                aria-label="ไปหน้าถัดไป"
              >
                <span>ถัดไป</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. VIEW / EDIT MODAL DIALOG
           ========================================================================= */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={handleCloseModal}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-[#1e61f0]">
                    {modalMode === "edit" ? (
                      <Pencil className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {modalMode === "edit"
                        ? "แก้ไขข้อมูลงานเคลม"
                        : "รายละเอียดงานเคลม"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      เคส ID: {selectedTicket.id} · {selectedTicket.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Success Banner */}
              {saveSuccess && (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 animate-in fade-in">
                  <Check className="size-3.5 shrink-0" />
                  <span>บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว</span>
                </div>
              )}

              {/* Modal Body */}
              {modalMode === "view" ? (
                <div className="space-y-4 p-5 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-medium">หัวข้อเคลม</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedTicket.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">สถานะปัจจุบัน</p>
                      <p className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                          {selectedTicket.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 font-medium">อาการเสีย / ปัญหาที่พบ</p>
                    <p className="mt-1 rounded-lg bg-slate-50 p-2.5 text-slate-800 leading-relaxed">
                      {selectedTicket.problemDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-slate-500 font-medium">อุปกรณ์ / รุ่น</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {selectedTicket.vendor} / {selectedTicket.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">หมายเลขเครื่อง (S/N)</p>
                      <p className="mt-1 font-mono text-slate-900">
                        {selectedTicket.serialNo}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-slate-500 font-medium">วันที่รับแจ้ง</p>
                      <p className="mt-1 text-slate-900">{selectedTicket.date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">อายุงาน</p>
                      <p className="mt-1 text-slate-900 font-semibold">{calculateCaseDuration(selectedTicket).text}</p>
                    </div>
                  </div>

                  {(selectedTicket.station || selectedTicket.province) && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin className="size-3.5 text-blue-600" />
                        <span>ข้อมูลสถานี / จุดติดตั้ง</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">ชื่อสถานี: </span>
                          <span className="font-semibold text-slate-800">
                            {selectedTicket.station || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">พื้นที่: </span>
                          <span className="text-slate-800">
                            {[
                              selectedTicket.subdistrict && `ต.${selectedTicket.subdistrict}`,
                              selectedTicket.district && `อ.${selectedTicket.district}`,
                              selectedTicket.province && `จ.${selectedTicket.province}`,
                            ]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(selectedTicket)}
                      className="gap-1.5 text-xs"
                    >
                      <Pencil className="size-3.5" />
                      <span>แก้ไข</span>
                    </Button>
                    <Link href={`/tickets/${selectedTicket.id}`}>
                      <Button size="sm" className="gap-1.5 bg-[#0c1a30] text-white hover:bg-[#1e293b] text-xs">
                        <span>เปิดดูหน้ารายละเอียดเต็ม</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveTicket} className="p-5 text-xs text-slate-700">
                  {editForm && (
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium text-slate-700">
                          หัวข้อเคลม <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, title: e.target.value } : null
                            )
                          }
                          className="mt-1 h-9 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-medium text-slate-700">
                          อาการเสีย / ปัญหาที่พบ <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={editForm.problemDesc}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, problemDesc: e.target.value } : null
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-medium text-slate-700">ผู้ผลิต (Vendor)</label>
                          <Input
                            value={editForm.vendor}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, vendor: e.target.value } : null
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-slate-700">รุ่น (Model)</label>
                          <Input
                            value={editForm.model}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, model: e.target.value } : null
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-medium text-slate-700">
                          หมายเลขเครื่อง (S/N)
                        </label>
                        <Input
                          value={editForm.serialNo}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, serialNo: e.target.value } : null
                            )
                          }
                          className="mt-1 h-9 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-medium text-slate-700">เปลี่ยนสถานะ</label>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {[
                            { code: 1, label: "รับแจ้ง" },
                            { code: 2, label: "ส่งศูนย์" },
                            { code: 3, label: "รออะไหล่" },
                            { code: 4, label: "ซ่อมเสร็จ" },
                            { code: 5, label: "ปิดเคส" },
                            { code: 6, label: "ปฏิเสธเคลม" },
                          ].map((st) => {
                            const isSelected = editForm.statusCode === st.code || editForm.status === st.label
                            return (
                              <button
                                key={st.code}
                                type="button"
                                onClick={() => handleStatusChange(st.code)}
                                aria-pressed={isSelected}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 font-semibold shadow-xs"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                              >
                                {st.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          onClick={handleCloseModal}
                          className="text-xs cursor-pointer"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSaving}
                          size="sm"
                          className="gap-1.5 bg-[#0c1a30] text-white hover:bg-[#1e293b] text-xs disabled:opacity-60 cursor-pointer"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>กำลังบันทึก...</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" />
                              <span>บันทึกการแก้ไข</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Permanent Deletion Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setTicketToDelete(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบเคสแจ้งเคลมถาวร
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  คุณต้องการลบเคส{" "}
                  <strong className="text-slate-800 font-semibold">
                    &quot;{ticketToDelete.title}&quot;
                  </strong>{" "}
                  (S/N: {ticketToDelete.serialNo}) ใช่หรือไม่?
                </p>
                <div className="mt-3 rounded-lg border border-red-150 bg-red-50/70 p-2.5 text-[11px] text-red-700 leading-relaxed">
                  <span className="font-semibold">ข้อควรระวัง:</span> คำขอนี้จะลบรายการออกจากฐานข้อมูลอย่างถาวร ข้อมูลจะไม่ถูกกู้คืนแม้จะรีเฟรชหน้าเว็บ
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTicketToDelete(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteTicket}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>{isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 border border-slate-800">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </main>
  )
}
