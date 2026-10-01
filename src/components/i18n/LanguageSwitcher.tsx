"use client"

import * as React from "react"
import { Globe, Check } from "lucide-react"
import { useLocale } from "@/i18n/LocaleContext"
import type { Locale } from "@/i18n/types"

interface LanguageOption {
  code: Locale
  tag: string
  label: string
  sublabel: string
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "th",
    tag: "TH",
    label: "ไทย",
    sublabel: "ภาษาไทย",
  },
  {
    code: "en",
    tag: "EN",
    label: "English",
    sublabel: "English (US)",
  },
]

interface LanguageSwitcherProps {
  className?: string
  align?: "left" | "right"
}

export function LanguageSwitcher({ className = "", align = "right" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale()
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Handle clicking outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = React.useCallback(
    (targetLocale: Locale) => {
      setLocale(targetLocale)
      setIsOpen(false)
    },
    [setLocale]
  )

  const activeOption = React.useMemo(() => {
    return LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]
  }, [locale])

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Language Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("locale.switchLanguage", "เปลี่ยนภาษา")}
        title={t("locale.switchLanguage", "เปลี่ยนภาษา")}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-95"
      >
        <Globe className="size-3.5 text-slate-400 group-hover:text-slate-200" />
        <span className="font-mono tracking-wide">{activeOption.tag}</span>
      </button>

      {/* Floating Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t("locale.language", "เลือกภาษา")}
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-2 w-44 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl p-1.5 space-y-1 animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {LANGUAGES.map((item) => {
            const isSelected = locale === item.code
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 text-white shadow-2xs"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700/50"
                    }`}
                  >
                    {item.tag}
                  </span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="font-medium">{item.label}</span>
                  </div>
                </div>

                {/* Active Indicator Dot / Check */}
                {isSelected && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <Check className="size-3.5 text-emerald-400 stroke-[2.5]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
