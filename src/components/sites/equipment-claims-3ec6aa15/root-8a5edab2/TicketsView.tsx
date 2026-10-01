"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useTicketsQuery, invalidateTicketsCache, type Ticket } from "@/hooks/useTicketsQuery"
import { useStationsQuery } from "@/hooks/useStationsQuery"
import { calculateCaseDuration, formatDisplayThaiDate } from "@/lib/utils/caseDuration"
import { TableActionCell } from "./TableActionCell"
import { useLocale } from "@/i18n/LocaleContext"

interface TicketTableRowProps {
  item: Ticket
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onView: (item: Ticket) => void
  onEdit: (item: Ticket) => void
  onConfirmDelete: (item: Ticket) => void
}

const TicketTableRow = React.memo(function TicketTableRow({
  item,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onConfirmDelete,
}: TicketTableRowProps) {
  const duration = React.useMemo(() => calculateCaseDuration(item), [item])
  const isOverdue = duration.isOverdue

  return (
    <tr
      className={`transition-colors duration-150 ${
        isOverdue
          ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/30"
          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
      } ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/40" : ""}`}
    >
      {/* Checkbox */}
      <td className="px-4 py-3.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="size-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
          aria-label={`เลือกเคส ${item.title}`}
        />
      </td>

      {/* เคส (Title & Description) */}
      <td className="px-4 py-3.5">
        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
          {item.title}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs truncate">
          {item.problemDesc}
        </p>
        {item.station && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
            <MapPin className="size-3 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{item.station}</span>
            {(item.district || item.province) && (
              <span className="text-slate-400 dark:text-slate-500">
                ({[item.district && `อ.${item.district}`, item.province && `จ.${item.province}`].filter(Boolean).join(", ")})
              </span>
            )}
          </div>
        )}
      </td>

      {/* อุปกรณ์ (Chip Icon & S/N) */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/10 shadow-2xs">
            <Cpu className="size-3.5" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
              {item.vendor} / {item.model}
            </p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              S/N {item.serialNo}
            </p>
          </div>
        </div>
      </td>

      {/* สถานะ (Status Pill Badges with Pastel Background & Ring) */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {item.statusCode === 1 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30 shadow-2xs">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>รับแจ้ง</span>
          </span>
        )}
        {item.statusCode === 2 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 ring-1 ring-purple-600/20 dark:ring-purple-500/30 shadow-2xs">
            <span className="size-1.5 rounded-full bg-purple-500" />
            <span>ส่งศูนย์</span>
          </span>
        )}
        {item.statusCode === 3 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 ring-1 ring-amber-600/20 dark:ring-amber-500/30 shadow-2xs">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>รออะไหล่</span>
          </span>
        )}
        {item.statusCode === 4 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20 dark:ring-blue-500/30 shadow-2xs">
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span>ซ่อมเสร็จ</span>
          </span>
        )}
        {item.statusCode === 5 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-600/15 dark:ring-white/10 shadow-2xs">
            <span className="size-1.5 rounded-full bg-slate-500" />
            <span>ปิดเคส</span>
          </span>
        )}
        {item.statusCode === 6 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 ring-1 ring-rose-600/20 dark:ring-rose-500/30 shadow-2xs">
            <span className="size-1.5 rounded-full bg-rose-500" />
            <span>ปฏิเสธเคลม</span>
          </span>
        )}
        {(!item.statusCode || item.statusCode < 1 || item.statusCode > 6) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-600/15 dark:ring-white/10 shadow-2xs">
            <span className="size-1.5 rounded-full bg-slate-500" />
            <span>{item.status || "รับแจ้ง"}</span>
          </span>
        )}
      </td>

      {/* รับแจ้ง (Date) */}
      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {formatDisplayThaiDate(item.date)}
      </td>

      {/* อายุงาน (Duration & Overdue Alert) */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {isOverdue ? (
          <div className="leading-tight">
            <p className="font-bold text-rose-600 dark:text-rose-400">
              {duration.text}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 ring-1 ring-rose-600/20 dark:ring-rose-500/30 shadow-2xs">
              <AlertTriangle className="size-2.5" />
              <span>{duration.overdueText}</span>
            </span>
          </div>
        ) : (
          <span className="text-slate-600 dark:text-slate-300">{duration.text}</span>
        )}
      </td>

      {/* Action Links (ดู / แก้ไข / ลบ) with clean icon-only triggers & tooltips */}
      <TableActionCell
        onView={() => onView(item)}
        onEdit={() => onEdit(item)}
        onDelete={() => onConfirmDelete(item)}
        viewLabel="ดูรายละเอียด"
        editLabel="แก้ไข"
        deleteLabel="ลบ"
      />
    </tr>
  )
})

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
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { tickets, deleteTicket, updateTicket } = useTicketsQuery()
  const { stations: stationsList } = useStationsQuery()
  const [, startTransition] = React.useTransition()

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

  // Real-time synchronization subscription for Tickets
  const { isConnected } = useRealtimeSync({})

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
    onTime: false,
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

  // Dynamic Vendors extracted from database & default presets
  const availableVendors = React.useMemo(() => {
    const defaultList = ["Huawei", "Hytera", "Dell", "Lenovo", "Syndome", "Vertiv", "Forth", "Cisco"]
    const fromTickets = tickets.map((t) => t.vendor).filter(Boolean)
    const set = new Set([...defaultList, ...fromTickets])
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [tickets])

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
    startTransition(() => {
      setProvinceFilter(newProvince)
      setDistrictFilter("all")
      setSubdistrictFilter("all")
      setStationFilter("all")
    })
  }, [])

  const handleDistrictChange = React.useCallback((newDistrict: string) => {
    startTransition(() => {
      setDistrictFilter(newDistrict)
      setSubdistrictFilter("all")
      setStationFilter("all")
    })
  }, [])

  const handleSubdistrictChange = React.useCallback((newSubdistrict: string) => {
    startTransition(() => {
      setSubdistrictFilter(newSubdistrict)
      setStationFilter("all")
    })
  }, [])

  const handleStationChange = React.useCallback((newStation: string) => {
    startTransition(() => {
      setStationFilter(newStation)
    })
  }, [])

  // Reactive synchronization with URL Query Search Parameters (e.g. from Dashboard click-throughs)
  React.useEffect(() => {
    if (!searchParams) return

    const rawStatus = searchParams.get("status") || searchParams.get("stage")
    const rawOverdue = searchParams.get("overdue") || searchParams.get("onlyOverdue")
    const rawVendor = searchParams.get("vendor")
    const rawCategory = searchParams.get("category")
    const rawSn = searchParams.get("sn")
    const rawCaseNo = searchParams.get("caseNo")
    const rawProv = searchParams.get("province")
    const rawDist = searchParams.get("district")
    const rawSub = searchParams.get("subdistrict")
    const rawSta = searchParams.get("station")
    const rawOnTime = searchParams.get("onTime")

    // Map status & stage aliases into canonical form
    let resolvedStatus: string | undefined = undefined
    if (rawStatus) {
      const lower = rawStatus.toLowerCase()
      if (lower === "all") resolvedStatus = "all"
      else if (lower === "in_progress" || lower === "pending") resolvedStatus = "in_progress"
      else if (lower === "closed" || lower === "5") resolvedStatus = "5"
      else if (lower === "rejected" || lower === "6") resolvedStatus = "6"
      else if (lower === "waiting_inspection" || lower === "1") resolvedStatus = "1"
      else if (lower === "sent_center" || lower === "2") resolvedStatus = "2"
      else if (lower === "waiting_parts" || lower === "3") resolvedStatus = "3"
      else if (lower === "repaired" || lower === "4") resolvedStatus = "4"
      else resolvedStatus = rawStatus
    }

    const isOverdueParam = rawOverdue === "true" || rawOverdue === "1"
    const isOnTimeParam = rawOnTime === "true" || rawOnTime === "1"

    if (resolvedStatus !== undefined) setStatusFilter(resolvedStatus)
    if (isOverdueParam) setOnlyOverdue(true)
    if (rawVendor) setVendorFilter(rawVendor)
    if (rawCategory) setCategoryFilter(rawCategory)
    if (rawSn) setSnFilter(rawSn)
    if (rawCaseNo) setCaseNoFilter(rawCaseNo)
    if (rawProv) setProvinceFilter(rawProv)
    if (rawDist) setDistrictFilter(rawDist)
    if (rawSub) setSubdistrictFilter(rawSub)
    if (rawSta) setStationFilter(rawSta)

    if (
      resolvedStatus !== undefined ||
      isOverdueParam ||
      rawVendor ||
      rawCategory ||
      rawSn ||
      rawCaseNo ||
      rawProv ||
      rawDist ||
      rawSub ||
      rawSta ||
      isOnTimeParam
    ) {
      setIsTableCleared(false)
      setCurrentPage(1)
      setAppliedFilters((prev) => ({
        ...prev,
        status: resolvedStatus !== undefined ? resolvedStatus : prev.status,
        onlyOverdue: isOverdueParam ? true : prev.onlyOverdue,
        vendor: rawVendor || prev.vendor,
        category: rawCategory || prev.category,
        sn: rawSn || prev.sn,
        caseNo: rawCaseNo || prev.caseNo,
        province: rawProv || prev.province,
        district: rawDist || prev.district,
        subdistrict: rawSub || prev.subdistrict,
        station: rawSta || prev.station,
        onTime: isOnTimeParam,
      }))
    }
  }, [searchParams])

  const handleSearch = React.useCallback(() => {
    startTransition(() => {
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
        onTime: false,
      })
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
    startTransition(() => {
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
        onTime: false,
      })
    })
  }, [])

  const handlePageChange = React.useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(page)
    })
  }, [])

  const handlePageSizeChange = React.useCallback((size: number) => {
    startTransition(() => {
      setPageSize(size)
      setCurrentPage(1)
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
      if (appliedFilters.status !== "all") {
        if (appliedFilters.status === "in_progress") {
          // In-progress: stages 1 to 4 (not closed and not rejected)
          if (
            t.statusCode === 5 ||
            t.statusCode === 6 ||
            t.status === "ปิดเคส" ||
            t.status === "ปฏิเสธเคลม"
          ) {
            return false
          }
        } else if (appliedFilters.status === "closed" || appliedFilters.status === "5") {
          if (t.statusCode !== 5 && t.status !== "ปิดเคส") {
            return false
          }
        } else if (appliedFilters.status === "rejected" || appliedFilters.status === "6") {
          if (t.statusCode !== 6 && t.status !== "ปฏิเสธเคลม") {
            return false
          }
        } else if (String(t.statusCode) !== appliedFilters.status) {
          return false
        }
      }
      if (
        appliedFilters.vendor !== "all" &&
        t.vendor.toLowerCase() !== appliedFilters.vendor.toLowerCase()
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
      if (appliedFilters.onTime && (t.isOverdue || t.statusCode !== 5)) {
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
    <main id="main" className="flex-1 bg-transparent py-7">
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  รายการงานเคลม
                </h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  <Wifi className="size-3" />
                  {isConnected ? "ซิงก์เรียลไทม์" : "ออฟไลน์/แคช"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                ทุกเคสเคลมที่บันทึกไว้ในฐานข้อมูลกลาง เลือกเงื่อนไขในการ์ดค้นหาแล้วกดค้นหา
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. FILTER CARD (2 Rows + Aligned Search Action)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card sm:p-6 transition-all duration-300">
          {/* Row 1: 5 Columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* สถานะ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">สถานะ</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="in_progress">อยู่ระหว่างดำเนินการ (In Progress)</option>
                  <option value="1">1. รับแจ้ง / รอตรวจสภาพ</option>
                  <option value="2">2. ส่งศูนย์บริการแล้ว</option>
                  <option value="3">3. รออะไหล่ / กำลังซ่อม</option>
                  <option value="4">4. ซ่อมเสร็จ / รอส่งมอบ</option>
                  <option value="5">5. เคลมสำเร็จ / ปิดเคส</option>
                  <option value="6">6. ปฏิเสธเคลม (นอกเงื่อนไข)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* เลขที่เคส */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">เลขที่เคส</label>
              <Input
                placeholder=""
                value={caseNoFilter}
                onChange={(e) => setCaseNoFilter(e.target.value)}
                className="h-9 rounded-lg border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-xs text-slate-700 dark:text-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* S/N */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">S/N</label>
              <Input
                placeholder="หมายเลขเครื่อง"
                value={snFilter}
                onChange={(e) => setSnFilter(e.target.value)}
                className="h-9 rounded-lg border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* หมวดหมู่ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">หมวดหมู่</label>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  <option value="module">โมดูลสื่อสาร</option>
                  <option value="radio">วิทยุสื่อสาร</option>
                  <option value="antenna">เสาอากาศ</option>
                  <option value="power">พาวเวอร์ซัพพลาย</option>
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
                  <option value="all">ทุกศูนย์บริการ ({availableVendors.length} ราย)</option>
                  {availableVendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          </div>

          {/* Row 2: 5 Columns - Cascading Location Hierarchy */}
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* จังหวัด */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">จังหวัด</label>
              <div className="relative">
                <select
                  value={provinceFilter}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกจังหวัด ({availableProvinces.length} จังหวัด)</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* อำเภอ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">อำเภอ</label>
              <div className="relative">
                <select
                  value={districtFilter}
                  disabled={provinceFilter === "all"}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className={`h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    provinceFilter === "all"
                      ? "border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200"
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
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* ตำบล */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">ตำบล</label>
              <div className="relative">
                <select
                  value={subdistrictFilter}
                  disabled={districtFilter === "all"}
                  onChange={(e) => handleSubdistrictChange(e.target.value)}
                  className={`h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    districtFilter === "all"
                      ? "border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200"
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
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* สถานี */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">สถานี</label>
              <div className="relative">
                <select
                  value={stationFilter}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 pr-8 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
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
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* เฉพาะที่เกินกำหนด Toggle Card/Button */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setOnlyOverdue((v) => !v)}
                className={`flex h-9 items-center justify-center rounded-lg border text-xs font-normal transition-all cursor-pointer ${
                  onlyOverdue
                    ? "border-red-400 dark:border-rose-500/40 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 shadow-2xs"
                    : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>เฉพาะที่เกินกำหนด</span>
              </button>
            </div>
          </div>

          {/* Row 3: Action Buttons & Filter Summary */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 dark:border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                ผลการค้นหา: <strong className="text-slate-800 dark:text-slate-200">{filteredTickets.length}</strong> รายการ
              </span>
              {(appliedFilters.province !== "all" ||
                appliedFilters.district !== "all" ||
                appliedFilters.subdistrict !== "all" ||
                appliedFilters.station !== "all") && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                  <MapPin className="size-3 text-blue-600 dark:text-blue-400" />
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
        </div>

        {/* =========================================================================
            3. DATA TABLE & SELECTABLE ROWS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs shadow-card overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/90 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="size-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                      aria-label={t("table.selectAll", "เลือกทั้งหมด")}
                    />
                  </th>
                  <th className="px-4 py-3.5">{t("table.case", "เคส")}</th>
                  <th className="px-4 py-3.5">{t("table.equipment", "อุปกรณ์")}</th>
                  <th className="px-4 py-3.5">{t("table.status", "สถานะ")}</th>
                  <th className="px-4 py-3.5">{t("table.reportedDate", "รับแจ้ง")}</th>
                  <th className="px-4 py-3.5">{t("table.age", "อายุงาน")}</th>
                  <th className="px-4 py-3.5">{t("table.actions", "จัดการ")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90 dark:divide-white/10">
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
                  paginatedTickets.map((item) => (
                    <TicketTableRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.includes(item.id)}
                      onToggleSelect={handleToggleSelectRow}
                      onView={handleView}
                      onEdit={handleEdit}
                      onConfirmDelete={confirmDeleteTicket}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              4. PAGINATION & FOOTER CONTROLS
             ========================================================================= */}
          <div className="flex flex-col gap-3 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-400">
            {/* Left: Rows Per Page & Summary */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="flex h-8 items-center rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-2.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="จำนวนรายการต่อหน้า"
                >
                  <option value={10}>10 รายการ/หน้า</option>
                  <option value={20}>20 รายการ/หน้า</option>
                  <option value={50}>50 รายการ/หน้า</option>
                </select>
              </div>
              <span className="text-slate-500 dark:text-slate-400">
                แสดง {totalFiltered > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalFiltered)} จาก {totalFiltered} เคส
              </span>
            </div>

            {/* Right: Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors ${
                  currentPage <= 1
                    ? "border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                }`}
                aria-label="ไปหน้าก่อนหน้า"
              >
                <ChevronLeft className="size-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="px-2 text-xs font-normal text-slate-700 dark:text-slate-300">
                หน้า {currentPage}/{totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors ${
                  currentPage >= totalPages
                    ? "border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
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
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-5 py-4 bg-slate-50/50 dark:bg-[#0f172a]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1e61f0] dark:text-sky-300">
                    {modalMode === "edit" ? (
                      <Pencil className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {modalMode === "edit"
                        ? "แก้ไขข้อมูลงานเคลม"
                        : "รายละเอียดงานเคลม"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เคส ID: {selectedTicket.id} · {selectedTicket.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                <div className="space-y-4 p-5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">หัวข้อเคลม</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {selectedTicket.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">สถานะปัจจุบัน</p>
                      <p className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-slate-800 dark:text-slate-200">
                          {selectedTicket.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">อาการเสีย / ปัญหาที่พบ</p>
                    <p className="mt-1 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 p-2.5 text-slate-800 dark:text-slate-200 leading-relaxed">
                      {selectedTicket.problemDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/10 pt-3">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">อุปกรณ์ / รุ่น</p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                        {selectedTicket.vendor} / {selectedTicket.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">หมายเลขเครื่อง (S/N)</p>
                      <p className="mt-1 font-mono text-slate-900 dark:text-slate-100">
                        {selectedTicket.serialNo}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/10 pt-3">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">วันที่รับแจ้ง</p>
                      <p className="mt-1 text-slate-900 dark:text-slate-100">{formatDisplayThaiDate(selectedTicket.date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">อายุงาน</p>
                      <p className="mt-1 text-slate-900 dark:text-slate-100 font-semibold">{calculateCaseDuration(selectedTicket).text}</p>
                    </div>
                  </div>

                  {(selectedTicket.station || selectedTicket.province) && (
                    <div className="rounded-lg border border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-[#0f172a] p-3">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <MapPin className="size-3.5 text-blue-600 dark:text-sky-400" />
                        <span>ข้อมูลสถานี / จุดติดตั้ง</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">ชื่อสถานี: </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedTicket.station || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">พื้นที่: </span>
                          <span className="text-slate-800 dark:text-slate-200">
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

                  <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
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
                      <Button size="sm" className="gap-1.5 bg-[#0c1a30] dark:bg-blue-600 text-white hover:bg-[#1e293b] dark:hover:bg-blue-500 text-xs">
                        <span>เปิดดูหน้ารายละเอียดเต็ม</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveTicket} className="p-5 text-xs text-slate-700 dark:text-slate-300">
                  {editForm && (
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300">
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
                        <label className="font-medium text-slate-700 dark:text-slate-300">
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
                          className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-medium text-slate-700 dark:text-slate-300">ผู้ผลิต (Vendor)</label>
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
                          <label className="font-medium text-slate-700 dark:text-slate-300">รุ่น (Model)</label>
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
                        <label className="font-medium text-slate-700 dark:text-slate-300">
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
                        <label className="font-medium text-slate-700 dark:text-slate-300">เปลี่ยนสถานะ</label>
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
                                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 font-semibold shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500"
                                    : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                                }`}
                              >
                                {st.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
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
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] p-6 shadow-2xl transition-all z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-rose-950/60 text-red-600 dark:text-rose-400">
                <Trash2 className="size-5 text-red-600 dark:text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ยืนยันการลบเคสแจ้งเคลมถาวร
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  คุณต้องการลบเคส{" "}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    &quot;{ticketToDelete.title}&quot;
                  </strong>{" "}
                  (S/N: {ticketToDelete.serialNo}) ใช่หรือไม่?
                </p>
                <div className="mt-3 rounded-lg border border-red-150 dark:border-rose-500/20 bg-red-50/70 dark:bg-rose-950/30 p-2.5 text-[11px] text-red-700 dark:text-rose-300 leading-relaxed">
                  <span className="font-semibold">ข้อควรระวัง:</span> คำขอนี้จะลบรายการออกจากฐานข้อมูลอย่างถาวร ข้อมูลจะไม่ถูกกู้คืนแม้จะรีเฟรชหน้าเว็บ
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTicketToDelete(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
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
