"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import {
  parseThaiDate,
  formatThaiDate,
  formatISODate,
  toISODateString,
  formatDisplayThaiDate,
} from "@/lib/utils/caseDuration"

export interface DatePickerInputProps {
  id?: string
  name?: string
  value?: string // Accepts Thai date string (e.g. "13 มิ.ย. 2569"), ISO string ("2026-06-13"), or "—" / empty
  onChange: (thaiDate: string, isoDate: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  min?: string
  max?: string
  allowClear?: boolean
}

/**
 * Interactive Calendar Date Picker Input Component
 * - Displays date in localized Thai Buddhist Era format (e.g. 13 มิ.ย. 2569)
 * - Clickable calendar icon & box opens native browser date picker dialog via showPicker()
 * - Provides seamless clear button (X) for resetting empty/optional dates back to empty
 * - Zero hydration warnings, timezone shifts, or NaN errors
 */
export function DatePickerInput({
  id,
  name,
  value,
  onChange,
  placeholder = "เลือกวันที่ (วว/ดด/ปปปป)",
  disabled = false,
  required = false,
  className = "",
  min,
  max,
  allowClear = true,
}: DatePickerInputProps) {
  const nativeInputRef = React.useRef<HTMLInputElement>(null)

  // Current ISO value (YYYY-MM-DD) for native <input type="date">
  const isoValue = React.useMemo(() => {
    return toISODateString(value)
  }, [value])

  // Formatted Thai display string (e.g. "13 มิ.ย. 2569")
  const displayValue = React.useMemo(() => {
    if (!value || value === "—" || value.trim() === "") return ""
    return formatDisplayThaiDate(value, "")
  }, [value])

  const hasValue = Boolean(isoValue && displayValue)

  // Handle native date picker selection
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value // e.g. "2026-06-13" or ""
    if (!newIso) {
      onChange("", "")
      return
    }
    const parsed = parseThaiDate(newIso)
    if (parsed && !isNaN(parsed.getTime())) {
      const thaiFormatted = formatThaiDate(parsed)
      const validIso = formatISODate(parsed)
      onChange(thaiFormatted, validIso)
    } else {
      onChange(newIso, newIso)
    }
  }

  // Trigger calendar dialog programmatically
  const openCalendar = (e?: React.MouseEvent) => {
    if (disabled) return
    if (e) {
      // If clicking clear button, do not open picker
      if ((e.target as HTMLElement).closest("[data-clear-btn]")) return
    }

    if (nativeInputRef.current) {
      try {
        if (typeof nativeInputRef.current.showPicker === "function") {
          nativeInputRef.current.showPicker()
          return
        }
      } catch {
        // Fallback for browsers with restricted showPicker
      }
      nativeInputRef.current.focus()
      nativeInputRef.current.click()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (disabled) return
    onChange("", "")
    if (nativeInputRef.current) {
      nativeInputRef.current.value = ""
    }
  }

  return (
    <div
      onClick={openCalendar}
      className={`group relative flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs transition-colors hover:border-slate-400 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed bg-muted/40" : ""
      } ${className}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openCalendar()
        }
      }}
    >
      {/* Hidden Native Date Input for Browser's Interactive Calendar Dialog */}
      <input
        ref={nativeInputRef}
        id={id}
        name={name}
        type="date"
        value={isoValue}
        onChange={handleNativeChange}
        disabled={disabled}
        required={required && !hasValue}
        min={min}
        max={max}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
        aria-hidden="true"
      />

      {/* Display Value (Thai Buddhist Era) */}
      <span
        className={`truncate ${
          hasValue ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
      >
        {hasValue ? displayValue : placeholder}
      </span>

      {/* Action Icons: Clear & Calendar Trigger */}
      <div className="flex items-center gap-1 shrink-0 ml-1.5">
        {allowClear && hasValue && !disabled && (
          <button
            type="button"
            data-clear-btn="true"
            onClick={handleClear}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="ล้างวันที่"
            aria-label="ล้างวันที่"
          >
            <X className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openCalendar()
          }}
          className="rounded p-0.5 text-muted-foreground group-hover:text-brand transition-colors cursor-pointer"
          title="เปิดปฏิทินเลือกวันที่"
          aria-label="เปิดปฏิทินเลือกวันที่"
        >
          <CalendarIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
