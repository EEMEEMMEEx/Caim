"use client"

import * as React from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"

export interface TableActionButtonsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  viewLabel?: string
  editLabel?: string
  deleteLabel?: string
  className?: string
}

/**
 * Clean icon-only table row action buttons with interactive enterprise hover tooltips.
 */
export function TableActionButtons({
  onView,
  onEdit,
  onDelete,
  viewLabel = "ดูรายละเอียด",
  editLabel = "แก้ไข",
  deleteLabel = "ลบ",
  className = "",
}: TableActionButtonsProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* 1. ดู (View / Details) */}
      {onView && (
        <div className="relative group/tooltip inline-flex items-center">
          <button
            type="button"
            onClick={onView}
            aria-label={viewLabel}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-colors cursor-pointer touch-manipulation"
          >
            <Eye className="size-4" />
          </button>
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:flex items-center px-2 py-1 text-xs font-medium rounded-md shadow-lg bg-slate-900 text-slate-100 border border-slate-700/60 pointer-events-none whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {viewLabel}
          </span>
        </div>
      )}

      {/* 2. แก้ไข (Edit) */}
      {onEdit && (
        <div className="relative group/tooltip inline-flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label={editLabel}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 active:scale-95 transition-colors cursor-pointer touch-manipulation"
          >
            <Pencil className="size-4" />
          </button>
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:flex items-center px-2 py-1 text-xs font-medium rounded-md shadow-lg bg-slate-900 text-slate-100 border border-slate-700/60 pointer-events-none whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {editLabel}
          </span>
        </div>
      )}

      {/* 3. ลบ (Delete) */}
      {onDelete && (
        <div className="relative group/tooltip inline-flex items-center">
          <button
            type="button"
            onClick={onDelete}
            aria-label={deleteLabel}
            className="p-2 sm:p-1.5 min-h-[38px] min-w-[38px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-colors cursor-pointer touch-manipulation"
          >
            <Trash2 className="size-4" />
          </button>
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:flex items-center px-2 py-1 text-xs font-medium rounded-md shadow-lg bg-slate-900 text-slate-100 border border-slate-700/60 pointer-events-none whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {deleteLabel}
          </span>
        </div>
      )}
    </div>
  )
}

export interface TableActionCellProps extends TableActionButtonsProps {
  cellClassName?: string
}

/**
 * Standard table row cell (<td>) wrapper for action buttons with hover tooltips.
 */
export function TableActionCell({
  cellClassName = "",
  ...buttonProps
}: TableActionCellProps) {
  return (
    <td className={`px-4 py-3.5 whitespace-nowrap ${cellClassName}`}>
      <TableActionButtons {...buttonProps} />
    </td>
  )
}

export default TableActionCell
