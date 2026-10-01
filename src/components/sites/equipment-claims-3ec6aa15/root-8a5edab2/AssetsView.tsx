"use client"

import * as React from "react"
import Link from "next/link"
import {
  HardDrive,
  ChevronRight,
  House,
  Search,
  Plus,
  Download,
  Copy,
  Check,
  Eye,
  X,
  RotateCcw,
  Wrench,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Asset } from "./assetsData"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useEquipmentsQuery } from "@/hooks/useEquipmentsQuery"
import { useLocale } from "@/i18n/LocaleContext"

interface AssetTableRowProps {
  item: Asset
  index: number
  isCopied: boolean
  onCopy: (serial: string) => void
  onDetail: (asset: Asset) => void
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

const AssetTableRow = React.memo(function AssetTableRow({
  item,
  index,
  isCopied,
  onCopy,
  onDetail,
  onEdit,
  onDelete,
}: AssetTableRowProps) {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
      <td className="sticky left-0 z-10 py-3.5 px-4 text-center font-mono text-slate-400 bg-white/95 dark:bg-[#1e293b] shadow-[1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)]">
        {index}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none" title={`S/N: ${item.serial}`}>{item.serial}</span>
          <button
            type="button"
            onClick={() => onCopy(item.serial)}
            className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg touch-manipulation cursor-pointer"
            title="คัดลอก S/N"
          >
            {isCopied ? (
              <Check className="size-3 text-emerald-600" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
      </td>
      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
        <span className="truncate max-w-[160px] sm:max-w-none block" title={item.name || "-"}>{item.name || "-"}</span>
      </td>
      <td className="py-3.5 px-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 shadow-2xs">
          {item.vendor}
        </span>
      </td>
      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
        <span className="truncate max-w-[120px] sm:max-w-none block" title={item.model}>{item.model}</span>
      </td>
      <td className="py-3.5 px-4 text-slate-500 max-w-xs">
        <span className="line-clamp-2">{item.category}</span>
      </td>
      <td className="sticky right-0 z-10 py-3.5 px-4 text-right bg-white/95 dark:bg-[#1e293b] shadow-[-1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDetail(item)}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="ดูรายละเอียด"
          >
            <Eye className="size-3.5" />
          </Button>
          <Link
            href={`/tickets/new?serial=${encodeURIComponent(item.serial)}`}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="เปิดเคสเคลม"
          >
            <Wrench className="size-3.5" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="แก้ไขข้อมูล"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="ลบอุปกรณ์"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
})

export function AssetsView() {
  const { t, locale } = useLocale()
  const {
    equipments: assetsList,
    isLoading,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  } = useEquipmentsQuery()

  const [, startTransition] = React.useTransition()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedVendor, setSelectedVendor] = React.useState<string>("all")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [pageSize, setPageSize] = React.useState<number>(25)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [copiedSerial, setCopiedSerial] = React.useState<string | null>(null)

  // Loading and feedback states
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Modals
  const [detailAsset, setDetailAsset] = React.useState<Asset | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false)
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null)
  const [deletingAsset, setDeletingAsset] = React.useState<Asset | null>(null)

  // Form State
  const [newSerial, setNewSerial] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [newVendor, setNewVendor] = React.useState("")
  const [newModel, setNewModel] = React.useState("")
  const [newCategory, setNewCategory] = React.useState("")
  const [newDescription, setNewDescription] = React.useState("")

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Real-time connection status
  useRealtimeSync({})

  const deferredQuery = React.useDeferredValue(searchQuery)

  // Unique vendors and categories
  const vendors = React.useMemo(() => {
    const set = new Set(assetsList.map((a) => a.vendor).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [assetsList])

  const categories = React.useMemo(() => {
    const set = new Set(assetsList.map((a) => a.category).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [assetsList])

  // Filtered Assets
  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return assetsList.filter((a) => {
      if (selectedVendor !== "all" && a.vendor !== selectedVendor) return false
      if (selectedCategory !== "all" && a.category !== selectedCategory) return false
      if (q) {
        const matchesSerial = a.serial.toLowerCase().includes(q)
        const matchesVendor = a.vendor.toLowerCase().includes(q)
        const matchesModel = a.model.toLowerCase().includes(q)
        const matchesCategory = a.category.toLowerCase().includes(q)
        const matchesName = a.name ? a.name.toLowerCase().includes(q) : false
        const matchesDesc = a.description ? a.description.toLowerCase().includes(q) : false
        if (!matchesSerial && !matchesVendor && !matchesModel && !matchesCategory && !matchesName && !matchesDesc) {
          return false
        }
      }
      return true
    })
  }, [assetsList, deferredQuery, selectedVendor, selectedCategory])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredQuery, selectedVendor, selectedCategory, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedAssets = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const handleCopySerial = React.useCallback((serial: string) => {
    navigator.clipboard.writeText(serial)
    setCopiedSerial(serial)
    setTimeout(() => setCopiedSerial(null), 1500)
  }, [])

  const handlePageChange = React.useCallback((page: number | ((p: number) => number)) => {
    startTransition(() => {
      setCurrentPage(page)
    })
  }, [])

  const handleExportCSV = () => {
    const headers = ["Serial Number", "อุปกรณ์ (Name)", "ยี่ห้อ (Vendor)", "รุ่น (Model)", "หมวดหมู่ (Category)", "รายละเอียด (Description)"]
    const rows = filtered.map((item) => [
      `"${item.serial.replace(/"/g, '""')}"`,
      `"${(item.name || "").replace(/"/g, '""')}"`,
      `"${item.vendor.replace(/"/g, '""')}"`,
      `"${item.model.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${(item.description || "").replace(/"/g, '""')}"`
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `equipment-assets-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Create or Update Equipment
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedSerial = newSerial.trim()
    const trimmedVendor = newVendor.trim()

    if (!trimmedSerial) {
      setErrorMessage("กรุณาระบุหมายเลขอุปกรณ์ (Serial Number)")
      return
    }
    if (!trimmedVendor) {
      setErrorMessage("กรุณาระบุยี่ห้อ (Vendor)")
      return
    }

    const deviceData: Asset = {
      serial: trimmedSerial,
      name: newName.trim() || undefined,
      vendor: trimmedVendor,
      model: newModel.trim() || "-",
      category: newCategory.trim() || "อื่นๆ",
      description: newDescription.trim() || undefined,
    }

    setIsSubmitting(true)

    try {
      const isEdit = Boolean(editingAsset)
      const res = isEdit
        ? await updateEquipment(deviceData)
        : await createEquipment(deviceData)

      if (!res.success) {
        throw new Error(res.error || "ไม่สามารถบันทึกข้อมูลอุปกรณ์ได้")
      }

      showToast(`บันทึกอุปกรณ์ ${deviceData.serial} สำเร็จแล้ว`)

      // On new equipment creation, reset search and filters and go to page 1 so it appears at top
      if (!isEdit) {
        setSearchQuery("")
        setSelectedVendor("all")
        setSelectedCategory("all")
        setCurrentPage(1)
      }

      setIsAddModalOpen(false)
      setEditingAsset(null)
      setNewSerial("")
      setNewName("")
      setNewVendor("")
      setNewModel("")
      setNewCategory("")
      setNewDescription("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกอุปกรณ์"
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Device
  const handleDeleteDevice = async () => {
    if (!deletingAsset) return
    setIsSubmitting(true)
    const res = await deleteEquipment(deletingAsset.serial)
    setIsSubmitting(false)
    if (res.success) {
      setDeletingAsset(null)
      showToast(`ลบอุปกรณ์ ${deletingAsset.serial} เรียบร้อยแล้ว`)
    } else {
      showToast(res.error || "เกิดข้อผิดพลาดในการลบ")
    }
  }

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset)
    setNewSerial(asset.serial)
    setNewName(asset.name || "")
    setNewVendor(asset.vendor)
    setNewModel(asset.model)
    setNewCategory(asset.category)
    setNewDescription(asset.description || "")
    setErrorMessage(null)
    setIsAddModalOpen(true)
  }

  const openAddModal = () => {
    setEditingAsset(null)
    setNewSerial("")
    setNewName("")
    setNewVendor("")
    setNewModel("")
    setNewCategory("")
    setNewDescription("")
    setErrorMessage(null)
    setIsAddModalOpen(true)
  }

  const handleDetail = React.useCallback((asset: Asset) => {
    setDetailAsset(asset)
  }, [])

  const handleEdit = React.useCallback((asset: Asset) => {
    openEditModal(asset)
  }, [])

  const handleDeletePrompt = React.useCallback((asset: Asset) => {
    setDeletingAsset(asset)
  }, [])

  return (
    <main id="main" className="flex-1 bg-transparent py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
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
                  <span className="font-normal text-foreground">ข้อมูลอุปกรณ์</span>
                </li>
              </ol>
            </nav>

            <div className="mt-2.5 flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                <HardDrive className="size-6 text-brand-gold" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  ทะเบียนข้อมูลอุปกรณ์
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ฐานข้อมูลอุปกรณ์ระบบโทรคมนาคม (ทั้งหมด {assetsList.length.toLocaleString()} รายการ)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-10 px-3.5 min-h-[44px] min-w-[44px] rounded-xl gap-1.5 border-border bg-card text-xs font-semibold hover:bg-muted text-foreground touch-manipulation cursor-pointer"
            >
              <Download className="size-3.5" />
              ส่งออก CSV
            </Button>
            <Button
              size="sm"
              onClick={openAddModal}
              className="h-10 px-3.5 min-h-[44px] min-w-[44px] rounded-xl gap-1.5 bg-brand text-white hover:bg-brand/90 text-xs font-semibold shadow-xs touch-manipulation cursor-pointer"
            >
              <Plus className="size-3.5" />
              เพิ่มอุปกรณ์ใหม่
            </Button>
            <Link href="/tickets/new">
              <Button
                size="sm"
                className="h-10 px-3.5 min-h-[44px] min-w-[44px] rounded-xl gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 text-xs font-semibold shadow-xs touch-manipulation cursor-pointer"
              >
                <Wrench className="size-3.5" />
                เปิดเคสใหม่
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs p-5 shadow-card flex flex-col gap-3 transition-all duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา Serial Number, ยี่ห้อ, รุ่น, ชื่ออุปกรณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <select
              value={selectedVendor}
              onChange={(e) => {
                const val = e.target.value
                startTransition(() => {
                  setSelectedVendor(val)
                })
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
            >
              <option value="all">ทุกยี่ห้อ ({vendors.length})</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value
                startTransition(() => {
                  setSelectedCategory(val)
                })
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
            >
              <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || selectedVendor !== "all" || selectedCategory !== "all") && (
            <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
              <span>พบ {filtered.length} รายการ</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setSearchQuery("")
                    setSelectedVendor("all")
                    setSelectedCategory("all")
                  })
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="size-3" />
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs shadow-card overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="w-full text-left text-xs border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10 bg-slate-50/90 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="sticky left-0 z-20 py-3.5 px-4 w-16 text-center bg-slate-50 dark:bg-[#0f172a] shadow-[1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)]">{t("table.no", "ลำดับ")}</th>
                  <th className="py-3.5 px-4 min-w-40">{t("table.serialNumber", "Serial Number")}</th>
                  <th className="py-3.5 px-4 min-w-44">{t("table.equipment", "อุปกรณ์")}</th>
                  <th className="py-3.5 px-4 w-28">{locale === "th" ? "ยี่ห้อ" : "Brand"}</th>
                  <th className="py-3.5 px-4 min-w-32">{locale === "th" ? "รุ่น" : "Model"}</th>
                  <th className="py-3.5 px-4 min-w-56">{t("table.category", "หมวดหมู่")}</th>
                  <th className="sticky right-0 z-20 py-3.5 px-4 text-right w-36 bg-slate-50 dark:bg-[#0f172a] shadow-[-1px_0_0_0_rgba(226,232,240,0.8)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.08)]">{t("table.actions", "จัดการ")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-brand" />
                        <span>กำลังโหลดข้อมูลอุปกรณ์จากฐานข้อมูลกลาง...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HardDrive className="size-8 text-muted-foreground/40" />
                        <span className="font-medium text-foreground">ไม่พบข้อมูลอุปกรณ์</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map((item, idx) => (
                    <AssetTableRow
                      key={item.serial}
                      item={item}
                      index={(currentPage - 1) * pageSize + idx + 1}
                      isCopied={copiedSerial === item.serial}
                      onCopy={handleCopySerial}
                      onDetail={handleDetail}
                      onEdit={handleEdit}
                      onDelete={handleDeletePrompt}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                แสดง {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} จากทั้งหมด {filtered.length.toLocaleString()} รายการ
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              >
                <option value={15}>15 รายการ/หน้า</option>
                <option value={25}>25 รายการ/หน้า</option>
                <option value={50}>50 รายการ/หน้า</option>
                <option value={100}>100 รายการ/หน้า</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-navy text-white">
                <HardDrive className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingAsset ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่เข้าระบบ"}
                </h2>
                <p className="text-xs text-muted-foreground">บันทึกข้อมูลอุปกรณ์ลงในฐานข้อมูลกลาง</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveDevice} className="flex flex-col gap-3 py-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">
                  หมายเลขอุปกรณ์ (Serial Number) <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น 1025B6610999"
                  disabled={Boolean(editingAsset)}
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">ชื่ออุปกรณ์ (Equipment Name)</label>
                <Input
                  placeholder="เช่น iMaster NCE_RTN Lite หรือ Switch 24-Port"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">
                    ยี่ห้อ (Vendor) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น Huawei, Motorola"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">รุ่น (Model)</label>
                  <Input
                    placeholder="เช่น 2280 หรือ SLR 5500"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">หมวดหมู่อุปกรณ์ (Category)</label>
                <Input
                  placeholder="เช่น ชุดอุปกรณ์ทวนสัญญาณผ่านคลื่นความถี่สูง (SHF)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">รายละเอียดเพิ่มเติม (Description)</label>
                <textarea
                  rows={2}
                  placeholder="ระบุสเปกหรือหมายเหตุของอุปกรณ์..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:border-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-brand text-white hover:bg-brand-dark text-xs gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{editingAsset ? "บันทึกการแก้ไข" : "บันทึกอุปกรณ์"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">ยืนยันการลบอุปกรณ์</h3>
                <p className="text-xs text-muted-foreground">
                  คุณต้องการลบอุปกรณ์ S/N <span className="font-mono font-semibold text-foreground">{deletingAsset.serial}</span> ({deletingAsset.vendor}) หรือไม่?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAsset(null)}
                className="h-8.5 text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleDeleteDevice}
                className="h-8.5 gap-1.5 bg-destructive text-white hover:bg-destructive/90 text-xs font-medium"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <button
              type="button"
              onClick={() => setDetailAsset(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-navy text-white">
                <HardDrive className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">รายละเอียดอุปกรณ์</h2>
                <p className="text-xs font-mono text-brand">{detailAsset.serial}</p>
              </div>
            </div>

            <div className="divide-y divide-border/60 py-4 text-xs">
              <div className="grid grid-cols-3 py-2">
                <span className="font-medium text-muted-foreground">Serial Number:</span>
                <span className="col-span-2 font-mono font-semibold text-foreground">{detailAsset.serial}</span>
              </div>
              <div className="grid grid-cols-3 py-2">
                <span className="font-medium text-muted-foreground">ชื่ออุปกรณ์:</span>
                <span className="col-span-2 text-foreground">{detailAsset.name || "-"}</span>
              </div>
              <div className="grid grid-cols-3 py-2">
                <span className="font-medium text-muted-foreground">ยี่ห้อ:</span>
                <span className="col-span-2 text-foreground font-medium">{detailAsset.vendor}</span>
              </div>
              <div className="grid grid-cols-3 py-2">
                <span className="font-medium text-muted-foreground">รุ่น (Model):</span>
                <span className="col-span-2 text-foreground">{detailAsset.model}</span>
              </div>
              <div className="grid grid-cols-3 py-2">
                <span className="font-medium text-muted-foreground">หมวดหมู่:</span>
                <span className="col-span-2 text-foreground">{detailAsset.category}</span>
              </div>
              {detailAsset.description && (
                <div className="grid grid-cols-3 py-2">
                  <span className="font-medium text-muted-foreground">รายละเอียด:</span>
                  <span className="col-span-2 text-muted-foreground leading-relaxed">{detailAsset.description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Link href={`/tickets/new?serial=${encodeURIComponent(detailAsset.serial)}`}>
                <Button size="sm" className="bg-brand text-white hover:bg-brand-dark text-xs gap-1.5">
                  <Wrench className="size-3.5" />
                  <span>เปิดเคสแจ้งเคลมอุปกรณ์นี้</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setDetailAsset(null)} className="text-xs">
                ปิด
              </Button>
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
