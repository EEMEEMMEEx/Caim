"use client"

import * as React from "react"

export interface ProcessClaimLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

/**
 * Custom Brand Logo Mark for 'Process Claim'
 * Conceptual design combining the letters 'P' and 'C' with an interlocking
 * continuous workflow progression loop and verification node.
 */
export function ProcessClaimLogoMark({
  size = 34,
  className = "",
  ...props
}: ProcessClaimLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <defs>
        {/* Brand Deep Blue Gradient */}
        <linearGradient id="pc-bg-grad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e61f0" />
          <stop offset="100%" stopColor="#0f3aa8" />
        </linearGradient>

        {/* Dynamic Workflow Accent Gradient */}
        <linearGradient id="pc-accent-grad" x1="12" y1="12" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>

        {/* Glow Stroke Gradient */}
        <linearGradient id="pc-stroke-glow" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Squircle Badge Container */}
      <rect
        x="1.5"
        y="1.5"
        width="33"
        height="33"
        rx="9.5"
        fill="url(#pc-bg-grad)"
        stroke="url(#pc-stroke-glow)"
        strokeWidth="1.25"
      />

      {/* Stylized 'P' Workflow Stem & Loop (Core Integrity) */}
      <path
        d="M11 25.5V10.5H17.5C20.5376 10.5 23 12.9624 23 16C23 19.0376 20.5376 21.5 17.5 21.5H11"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Interlocking 'C' Workflow Progression Loop (Lifecycle Arc) */}
      <path
        d="M24.75 13C26.75 14.75 27.5 17.5 27.5 20.25C27.5 24.25 24.5 27.25 20.25 27.25C16.5 27.25 13.5 25 12.75 21.75"
        stroke="url(#pc-accent-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Active Verification Pulse Node */}
      <circle cx="20.25" cy="27.25" r="1.5" fill="#38bdf8" />
      <circle cx="20.25" cy="27.25" r="2.75" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.75" />
    </svg>
  )
}

export interface ProcessClaimBrandHeaderProps {
  collapsed?: boolean
  className?: string
}

/**
 * Full Brand Header unit featuring the Process Claim Logo Mark and modern typographic title
 */
export function ProcessClaimBrandHeader({
  collapsed = false,
  className = "",
}: ProcessClaimBrandHeaderProps) {
  return (
    <div
      className={`flex items-center gap-2.5 select-none transition-all duration-200 ${
        collapsed ? "justify-center" : ""
      } ${className}`}
    >
      <ProcessClaimLogoMark size={34} aria-hidden="true" />
      <div
        className={`flex flex-col leading-tight min-w-0 transition-opacity duration-200 ${
          collapsed ? "hidden" : "flex"
        }`}
      >
        <span className="font-bold text-base tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap">
          Process<span className="text-[#1e61f0] dark:text-[#38bdf8] ml-1">Claim</span>
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase whitespace-nowrap">
          Equipment Claims
        </span>
      </div>
    </div>
  )
}
