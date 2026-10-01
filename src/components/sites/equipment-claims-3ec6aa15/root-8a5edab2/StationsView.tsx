"use client"

import * as React from "react"
import Link from "next/link"
import {
  MapPin,
  ChevronRight,
  House,
  Search,
  Building2,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Eye,
  X,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Mountain,
  TowerControl,
  Plus,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { type Station } from "./stationsData"
import { saveStationApi, deleteStationApi } from "@/lib/storage/recordStorage"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useStationsQuery } from "@/hooks/useStationsQuery"

interface StationTableRowProps {
  item: Station
  index: number
  copiedCode: string | null
  onCopyCode: (code: string) => void
  onViewDetail: (station: Station) => void
  onEdit: (station: Station) => void
  onDelete: (station: Station) => void
}

const StationTableRow = React.memo(function StationTableRow({
  item,
  index,
  copiedCode,
  onCopyCode,
  onViewDetail,
  onEdit,
  onDelete,
}: StationTableRowProps) {
  return (
    <tr className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors group">
      {/* Index */}
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex size-6.5 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-semibold text-slate-500">
          {index}
        </span>
      </td>

      {/* Code */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-lg bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20">
            {item.code}
          </span>
          <button
            type="button"
            onClick={() => onCopyCode(item.code)}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="คัดลอกรหัสสถานี"
          >
            {copiedCode === item.code ? (
              <Check className="size-3 text-emerald-600" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
      </td>

      {/* Name & Site Type */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug">
            {item.name}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Building2 className="size-3 shrink-0 text-slate-400" />
              {item.siteType}
            </span>
            {item.towerType && (
              <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-600 dark:text-slate-300">
                {item.towerType}
              </span>
            )}
          </span>
        </div>
      </td>

      {/* Height */}
      <td className="py-3.5 px-4 text-center">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs ${
            item.height === 60
              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300"
              : item.height === 30
              ? "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-950/50 dark:text-purple-300"
              : item.height === 18
              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          {item.height} ม.
        </span>
      </td>

      {/* Sub-district & District */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-slate-800 dark:text-slate-200">ต.{item.subdistrict}</span>
          <span className="text-[11px] text-slate-400">อ.{item.district}</span>
        </div>
      </td>

      {/* Province & Area */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.province}</span>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.2 rounded">
            {item.zone || item.area}
          </span>
        </div>
      </td>

      {/* Coordinates */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-1">
          <a
            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors w-fit ring-1 ring-blue-600/15"
            title="เปิดแผนที่ Google Maps"
          >
            <span>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</span>
            <ExternalLink className="size-2.5 shrink-0" />
          </a>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Mountain className="size-3" />
            {item.seaLevel > 0 ? `${item.seaLevel} ม. จากระดับทะเล` : "-"}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(item)}
            className="size-7.5 p-0 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-blue-200"
            title="ดูรายละเอียด"
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="size-7.5 p-0 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-amber-200"
            title="แก้ไขข้อมูล"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="size-7.5 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-rose-200"
            title="ลบสถานี"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
})

export function StationsView() {
  const {
    stations: stationsList,
    isLoading,
    applyMutation: applyStationMutation,
  } = useStationsQuery()

  const [, startTransition] = React.useTransition()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedHeight, setSelectedHeight] = React.useState<string>("all")
  const [selectedArea, setSelectedArea] = React.useState<string>("all")
  const [selectedProvince, setSelectedProvince] = React.useState<string>("all")
  const [selectedSiteType, setSelectedSiteType] = React.useState<string>("all")
  const [pageSize, setPageSize] = React.useState<number>(25)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Modals
  const [detailStation, setDetailStation] = React.useState<Station | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [editingStation, setEditingStation] = React.useState<Station | null>(null)
  const [deletingStation, setDeletingStation] = React.useState<Station | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form states for Add/Edit
  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    subdistrict: "",
    district: "",
    province: "กาญจนบุรี",
    area: "ภาคกลาง",
    zone: "เขต 1",
    siteType: "ที่ว่าการอำเภอ",
    contractor: "FORTH",
    towerType: "Self-Support",
    height: 60,
    seaLevel: 50,
    lat: 14.0,
    lng: 99.5,
    category: "เสาสัญญาณหลัก 60 เมตร",
  })

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Real-time synchronization subscription
  useRealtimeSync({
    onStationChange: (raw) => {
      const payload = raw as { action?: "create" | "update" | "delete"; data?: Station } | undefined
      if (!payload || !payload.data) return
      const { action, data } = payload
      if (action) {
        applyStationMutation(action, data)
      }
      showToast("ข้อมูลสถานีได้รับการอัปเดตแบบเรียลไทม์")
    },
  })

  const deferredQuery = React.useDeferredValue(searchQuery)

  // Unique filter lists
  const provinces = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.province).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  const areas = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.area).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  const heights = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.height).filter(Boolean))
    return Array.from(set).sort((a, b) => b - a)
  }, [stationsList])

  const siteTypes = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.siteType).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  // Filtered stations
  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return stationsList.filter((s) => {
      if (selectedHeight !== "all" && s.height !== Number(selectedHeight)) return false
      if (selectedArea !== "all" && s.area !== selectedArea) return false
      if (selectedProvince !== "all" && s.province !== selectedProvince) return false
      if (selectedSiteType !== "all" && s.siteType !== selectedSiteType) return false
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q)
        const matchesCode = s.code.toLowerCase().includes(q)
        const matchesProvince = s.province.toLowerCase().includes(q)
        const matchesDistrict = s.district.toLowerCase().includes(q)
        const matchesSubdistrict = s.subdistrict.toLowerCase().includes(q)
        const matchesZone = s.zone ? s.zone.toLowerCase().includes(q) : false
        const matchesCategory = s.category ? s.category.toLowerCase().includes(q) : false
        const matchesSiteType = s.siteType ? s.siteType.toLowerCase().includes(q) : false
        if (
          !matchesName &&
          !matchesCode &&
          !matchesProvince &&
          !matchesDistrict &&
          !matchesSubdistrict &&
          !matchesZone &&
          !matchesCategory &&
          !matchesSiteType
        ) {
          return false
        }
      }
      return true
    })
  }, [stationsList, deferredQuery, selectedHeight, selectedArea, selectedProvince, selectedSiteType])

  // Reset page on filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredQuery, selectedHeight, selectedArea, selectedProvince, selectedSiteType, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedStations = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const handleCopyCode = React.useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }, [])

  const handleViewDetail = React.useCallback((st: Station) => {
    setDetailStation(st)
  }, [])

  const handleEdit = React.useCallback((station: Station) => {
    setEditingStation(station)
    setFormData({
      name: station.name,
      code: station.code,
      subdistrict: station.subdistrict,
      district: station.district,
      province: station.province,
      area: station.area,
      zone: station.zone || "",
      siteType: station.siteType,
      contractor: station.contractor || "FORTH",
      towerType: station.towerType || "Self-Support",
      height: station.height,
      seaLevel: station.seaLevel,
      lat: station.lat,
      lng: station.lng,
      category: station.category,
    })
    setIsAddModalOpen(true)
  }, [])

  const handleDelete = React.useCallback((st: Station) => {
    setDeletingStation(st)
  }, [])

  const handleProvinceChange = React.useCallback((val: string) => {
    startTransition(() => {
      setSelectedProvince(val)
      setCurrentPage(1)
    })
  }, [])

  const handleHeightChange = React.useCallback((val: string) => {
    startTransition(() => {
      setSelectedHeight(val)
      setCurrentPage(1)
    })
  }, [])

  const handleAreaChange = React.useCallback((val: string) => {
    startTransition(() => {
      setSelectedArea(val)
      setCurrentPage(1)
    })
  }, [])

  const handleSiteTypeChange = React.useCallback((val: string) => {
    startTransition(() => {
      setSelectedSiteType(val)
      setCurrentPage(1)
    })
  }, [])

  const handleResetFilters = React.useCallback(() => {
    startTransition(() => {
      setSearchQuery("")
      setSelectedHeight("all")
      setSelectedArea("all")
      setSelectedProvince("all")
      setSelectedSiteType("all")
      setCurrentPage(1)
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

  const handleExportCSV = React.useCallback(() => {
    const headers = [
      "รหัสสถานี (Code)",
      "ชื่อสถานี (Station Name)",
      "ประเภทสถานที่ (Site Type)",
      "ความสูงเสา (Height m)",
      "ชนิดเสา (Tower Type)",
      "ตำบล (Subdistrict)",
      "อำเภอ (District)",
      "จังหวัด (Province)",
      "ภาค (Area)",
      "เขต (Zone)",
      "ละติจูด (Lat)",
      "ลองจิจูด (Lng)",
      "ระดับน้ำทะเล (Sea Level m)",
      "ผู้รับเหมา (Contractor)",
    ]

    const rows = filtered.map((item) => [
      `"${item.code}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.siteType}"`,
      item.height,
      `"${item.towerType || ""}"`,
      `"${item.subdistrict}"`,
      `"${item.district}"`,
      `"${item.province}"`,
      `"${item.area}"`,
      `"${item.zone || ""}"`,
      item.lat,
      item.lng,
      item.seaLevel,
      `"${item.contractor || ""}"`,
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `forth-stations-data-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filtered])

  // Handle Create or Update Station
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    const isEdit = Boolean(editingStation)
    const payload = {
      id: editingStation ? editingStation.id : `st-${Date.now()}`,
      code: formData.code.trim() || `ST-${String(Math.floor(Math.random() * 900 + 100))}`,
      name: formData.name.trim(),
      subdistrict: formData.subdistrict.trim(),
      district: formData.district.trim(),
      province: formData.province.trim(),
      area: formData.area.trim(),
      zone: formData.zone.trim(),
      siteType: formData.siteType.trim(),
      contractor: formData.contractor.trim(),
      towerType: formData.towerType.trim(),
      height: Number(formData.height) || 60,
      seaLevel: Number(formData.seaLevel) || 0,
      lat: Number(formData.lat) || 0,
      lng: Number(formData.lng) || 0,
      category: formData.category.trim(),
    }

    const res = await saveStationApi(payload, isEdit)
    setIsSubmitting(false)

    if (res.success) {
      const savedStation = (res.station as Station) || (payload as Station)
      applyStationMutation(isEdit ? "update" : "create", savedStation)
      setIsAddModalOpen(false)
      setEditingStation(null)
      showToast(res.message || "บันทึกข้อมูลสถานีสำเร็จแล้ว")
    } else {
      showToast(res.message || "เกิดข้อผิดพลาดในการบันทึก")
    }
  }

  // Handle Delete Station
  const handleDeleteStation = async () => {
    if (!deletingStation) return
    setIsSubmitting(true)
    const res = await deleteStationApi(deletingStation.id)
    setIsSubmitting(false)
    if (res.success) {
      applyStationMutation("delete", { id: deletingStation.id })
      setDeletingStation(null)
      showToast(res.message || "ลบสถานีเรียบร้อยแล้ว")
    } else {
      showToast(res.message || "เกิดข้อผิดพลาดในการลบ")
    }
  }

  const openAddModal = () => {
    setEditingStation(null)
    setFormData({
      name: "",
      code: `ST-${String(Math.floor(Math.random() * 900 + 100))}`,
      subdistrict: "",
      district: "",
      province: provinces[0] || "กาญจนบุรี",
      area: "ภาคกลาง",
      zone: "เขต 1",
      siteType: "ที่ว่าการอำเภอ",
      contractor: "FORTH",
      towerType: "Self-Support",
      height: 60,
      seaLevel: 50,
      lat: 14.0,
      lng: 99.5,
      category: "เสาสัญญาณหลัก 60 เมตร",
    })
    setIsAddModalOpen(true)
  }

  const statsTotal = stationsList.length
  const stats60m = stationsList.filter((s) => s.height === 60).length
  const statsRepeaters = stationsList.filter((s) => s.height < 60).length
  const statsProvinces = provinces.length

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedHeight !== "all" ||
    selectedArea !== "all" ||
    selectedProvince !== "all" ||
    selectedSiteType !== "all"

  return (
    <main id="main" className="flex-1 bg-transparent py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-top-2">
            <Check className="size-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Breadcrumb and Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-1">
                  <Link href="/dashboard" aria-label="หน้าแรก" className="hover:text-foreground">
                    <House className="size-4" />
                  </Link>
                </li>
                <li className="flex items-center text-muted-foreground/60">
                  <ChevronRight className="size-3.5" />
                </li>
                <li className="inline-flex items-center gap-1">
                  <span className="font-normal text-foreground">ข้อมูลสถานี</span>
                </li>
              </ol>
            </nav>

            <div className="mt-2.5 flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                <Radio className="size-6 text-brand-gold" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  จัดการข้อมูลสถานีและจุดติดตั้งเสาสัญญาณ
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ทะเบียนข้อมูลสถานีฐานและจุดติดตั้งเสารับ-ส่งสัญญาณระบบวิทยุ SHF ในพื้นที่ 10 จังหวัด (รวม {statsTotal} จุดติดตั้ง)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 gap-1.5 border-border bg-card text-xs font-medium hover:bg-muted text-foreground"
            >
              <Download className="size-3.5" />
              ส่งออก CSV
            </Button>
            <Button
              size="sm"
              onClick={openAddModal}
              className="h-9 gap-1.5 bg-brand text-white hover:bg-brand/90 text-xs font-medium shadow-xs"
            >
              <Plus className="size-3.5" />
              เพิ่มสถานีใหม่
            </Button>
            <Link href="/tickets/new">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 text-xs font-medium shadow-xs"
              >
                <Plus className="size-3.5" />
                สร้างใบแจ้งเคลม
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-4.5 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">จุดติดตั้งทั้งหมด</span>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {statsTotal} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">สถานี</span>
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-300 ring-1 ring-blue-500/20">
              <MapPin className="size-5" />
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-4.5 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">เสาหลัก 60 เมตร</span>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats60m} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ต้น</span>
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
              <TowerControl className="size-5" />
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-4.5 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">สถานีทวนสัญญาณ (ต่ำกว่า 60 ม.)</span>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {statsRepeaters} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ต้น</span>
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
              <Radio className="size-5" />
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-4.5 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">พื้นที่ครอบคลุม</span>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {statsProvinces} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">จังหวัด</span>
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <Building2 className="size-5" />
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card flex flex-col gap-3.5 transition-all duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="ค้นหาชื่อสถานี, รหัส, จังหวัด, อำเภอ, ตำบล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:bg-white dark:focus-visible:bg-[#0f172a]"
              />
            </div>

            {/* Province Filter */}
            <select
              value={selectedProvince}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="h-9.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus-visible:border-blue-500 focus-visible:outline-none focus-visible:bg-white dark:focus-visible:bg-[#0f172a]"
            >
              <option value="all">ทุกจังหวัด ({provinces.length})</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>

            {/* Height Filter */}
            <select
              value={selectedHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="h-9.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus-visible:border-blue-500 focus-visible:outline-none focus-visible:bg-white dark:focus-visible:bg-[#0f172a]"
            >
              <option value="all">ทุกความสูงเสา ({heights.length})</option>
              {heights.map((h) => (
                <option key={h} value={String(h)}>
                  {h} เมตร
                </option>
              ))}
            </select>

            {/* Area Filter */}
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="h-9.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus-visible:border-blue-500 focus-visible:outline-none focus-visible:bg-white dark:focus-visible:bg-[#0f172a]"
            >
              <option value="all">ทุกภาค ({areas.length})</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Site Type Filter */}
            <select
              value={selectedSiteType}
              onChange={(e) => handleSiteTypeChange(e.target.value)}
              className="h-9.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0f172a] px-3 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus-visible:border-blue-500 focus-visible:outline-none focus-visible:bg-white dark:focus-visible:bg-[#0f172a]"
            >
              <option value="all">ทุกสถานที่ ({siteTypes.length})</option>
              {siteTypes.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Row & Reset */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-white/10 pt-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span>พบทั้งหมด {filtered.length} สถานีจากตัวกรอง</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 gap-1 active:scale-95 transition-all"
              >
                <RotateCcw className="size-3" />
                ล้างตัวกรองทั้งหมด
              </Button>
            </div>
          )}
        </div>

        {/* Stations Table */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs shadow-card overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/90 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">ลำดับ</th>
                  <th className="py-3 px-4 w-28">รหัสสถานี</th>
                  <th className="py-3 px-4 min-w-56">ชื่อสถานี / สถานที่ติดตั้ง</th>
                  <th className="py-3 px-4 text-center">ความสูงเสา</th>
                  <th className="py-3 px-4 min-w-36">ตำบล / อำเภอ</th>
                  <th className="py-3 px-4 min-w-36">จังหวัด / เขต</th>
                  <th className="py-3 px-4 min-w-36">พิกัด GPS</th>
                  <th className="py-3 px-4 text-right w-36">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && paginatedStations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-brand" />
                        <span>กำลังโหลดข้อมูลสถานีจากฐานข้อมูลกลาง...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedStations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MapPin className="size-8 text-muted-foreground/40" />
                        <span className="font-medium text-foreground">ไม่พบข้อมูลสถานีที่ค้นหา</span>
                        <span className="text-xs">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStations.map((item, idx) => (
                    <StationTableRow
                      key={item.id}
                      item={item}
                      index={(currentPage - 1) * pageSize + idx + 1}
                      copiedCode={copiedCode}
                      onCopyCode={handleCopyCode}
                      onViewDetail={handleViewDetail}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="border-t border-slate-200/70 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-[#0f172a]/80 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                แสดง {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-7.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] px-2 text-xs text-slate-700 dark:text-slate-200 shadow-2xs focus-visible:outline-none"
              >
                <option value={15}>15 รายการ/หน้า</option>
                <option value={25}>25 รายการ/หน้า</option>
                <option value={50}>50 รายการ/หน้า</option>
                <option value={100}>100 รายการ/หน้า</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200/80 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                title="หน้าแรก"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200/80 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2.5 font-medium text-slate-700 dark:text-slate-200">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200/80 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                title="หน้าถัดไป"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200/80 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                title="หน้าสุดท้าย"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Station Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="size-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStation ? "แก้ไขข้อมูลสถานี" : "เพิ่มสถานีใหม่เข้าสู่ระบบ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-medium text-foreground">
                    ชื่อสถานี / จุดติดตั้ง <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น ที่ว่าการอำเภอเลาขวัญ, อบต.หมูสี"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">
                    รหัสสถานี (Station Code) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น GOV-03"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">ความสูงเสา (เมตร)</label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">จังหวัด</label>
                  <Input
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">อำเภอ</label>
                  <Input
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">ตำบล</label>
                  <Input
                    value={formData.subdistrict}
                    onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">สถานที่ติดตั้ง</label>
                  <Input
                    value={formData.siteType}
                    onChange={(e) => setFormData({ ...formData, siteType: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">ละติจูด (Lat)</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">ลองจิจูด (Lng)</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-8.5 text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8.5 gap-1.5 bg-brand text-white hover:bg-brand/90 text-xs font-medium"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  {editingStation ? "บันทึกการแก้ไข" : "บันทึกเข้าฐานข้อมูล"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">ยืนยันการลบสถานี</h3>
                <p className="text-xs text-muted-foreground">
                  คุณต้องการลบสถานี <span className="font-semibold text-foreground">{deletingStation.name}</span> ({deletingStation.code}) หรือไม่?
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-destructive/5 p-3 rounded-lg border border-destructive/20">
              การลบนี้จะถูกบันทึกลงฐานข้อมูลและประวัติการทำรายการ (Transaction Log) แบบเรียลไทม์
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingStation(null)}
                className="h-8.5 text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleDeleteStation}
                className="h-8.5 gap-1.5 bg-destructive text-white hover:bg-destructive/90 text-xs font-medium"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {detailStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-navy text-white">
                  <Radio className="size-5 text-brand-gold" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {detailStation.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    รหัสสถานี: {detailStation.code} · หมวดหมู่: {detailStation.category}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailStation(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">รหัสสถานี</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                  {detailStation.code}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ความสูงและชนิดเสา</span>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  {detailStation.height} เมตร ({detailStation.towerType || "Self-Support"})
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ตำบล / อำเภอ</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  ต.{detailStation.subdistrict} อ.{detailStation.district}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">จังหวัด / ภาค</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  จ.{detailStation.province} ({detailStation.area})
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">เขตศูนย์สื่อสารกรมการปกครอง</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.zone || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">สถานที่ติดตั้ง</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.siteType}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ผู้รับเหมาโครงสร้างเสา</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.contractor || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">พิกัดทางภูมิศาสตร์ (GPS)</span>
                <p className="mt-0.5 font-mono font-semibold text-foreground">
                  {detailStation.lat}, {detailStation.lng}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ระดับความสูงจากน้ำทะเล (Sea Level)</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.seaLevel > 0 ? `${detailStation.seaLevel} เมตร` : "ไม่ระบุ"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <a
                href={`https://www.google.com/maps?q=${detailStation.lat},${detailStation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Compass className="size-4" />
                เปิดดูใน Google Maps
                <ExternalLink className="size-3" />
              </a>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailStation(null)}
                  className="h-8.5 text-xs"
                >
                  ปิดหน้าต่าง
                </Button>
                <Link href={`/tickets/new?station=${encodeURIComponent(detailStation.name)}`}>
                  <Button
                    size="sm"
                    className="h-8.5 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 text-xs font-medium"
                  >
                    <Plus className="size-3.5" />
                    เปิดใบเคลมสถานีนี้
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
