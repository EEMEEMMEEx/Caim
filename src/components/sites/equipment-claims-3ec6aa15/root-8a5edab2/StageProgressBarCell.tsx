"use client"

import * as React from "react"
import {
  calculateCurrentStageDuration,
  type RmaCalculationItem,
} from "@/lib/utils/rmaDuration"

export interface StageProgressBarProps {
  item: RmaCalculationItem
  currentDate?: Date
  className?: string
}

/**
 * Segmented progress bar element displaying the active stage,
 * segmented pill steps, step ratio, and strictly dynamic current-stage duration.
 */
export function StageProgressBar({
  item,
  currentDate,
  className = "",
}: StageProgressBarProps) {
  const currentStageDuration = calculateCurrentStageDuration(item, currentDate)
  const currentStageNumber = Math.max(1, Math.min(8, item.currentStageNumber ?? 1))
  const totalStages = item.totalStages || 8
  const isFinalized = currentStageDuration.isFinalized

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Segmented Progress Bars Pill Row */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalStages }).map((_, idx) => {
          const step = idx + 1
          let color = "bg-slate-200 dark:bg-slate-700"

          if (step < currentStageNumber) {
            color = "bg-emerald-500"
          } else if (step === currentStageNumber) {
            color =
              isFinalized || currentStageNumber === totalStages
                ? "bg-emerald-500"
                : "bg-blue-600"
          }

          return (
            <span
              key={idx}
              className={`h-1.5 w-3.5 rounded-full transition-colors ${color}`}
            />
          )
        })}
        <span className="ml-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium font-mono">
          {currentStageNumber}/{totalStages}
        </span>
      </div>

      {/* Stage Label & Dynamic Active Duration Subtext */}
      <div className="mt-1.5">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
          {currentStageDuration.stageName}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {currentStageDuration.text}
        </p>
      </div>
    </div>
  )
}

export interface StageProgressBarCellProps extends StageProgressBarProps {
  cellClassName?: string
}

/**
 * Table cell (<td>) wrapper for the overseas tracking segmented progress bar.
 */
export function StageProgressBarCell({
  item,
  currentDate,
  className = "",
  cellClassName = "",
}: StageProgressBarCellProps) {
  return (
    <td className={`px-4 py-3.5 whitespace-nowrap ${cellClassName}`}>
      <StageProgressBar item={item} currentDate={currentDate} className={className} />
    </td>
  )
}

export default StageProgressBarCell
