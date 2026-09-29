"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ProcessClaimBrandHeader } from "@/components/brand/ProcessClaimLogo"
import {
  LayoutDashboard,
  Radar,
  Wrench,
  PlaneTakeoff,
  HardDrive,
  MapPin,
  BookOpen,
  Menu,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  X,
  Sun,
  Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { getCurrentSession, clearSession, type UserSession, DEFAULT_USER_SESSION } from "@/lib/session"
import packageInfo from "../../../../../package.json"

interface AppShellProps {
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "ภาพรวม",
    items: [
      {
        label: "หน้าหลัก",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "งานเคลม",
    items: [
      {
        label: "รายการงานเคลม",
        href: "/tickets",
        icon: Radar,
      },
      {
        label: "แจ้งเคลม",
        href: "/tickets/new",
        icon: Wrench,
      },
      {
        label: "ส่งเคลมต่างประเทศ",
        href: "/repairs/overseas",
        icon: PlaneTakeoff,
      },
    ],
  },
  {
    title: "จัดการข้อมูล",
    items: [
      {
        label: "ข้อมูลอุปกรณ์",
        href: "/assets",
        icon: HardDrive,
      },
      {
        label: "ข้อมูลสถานี",
        href: "/stations",
        icon: MapPin,
      },
    ],
  },
]

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false)
  const [session, setSession] = React.useState<UserSession>(DEFAULT_USER_SESSION)
  const { theme, toggleTheme, mounted } = useTheme()

  // Load active user session on client mount
  React.useEffect(() => {
    setSession(getCurrentSession())
  }, [])

  // Auto close mobile drawer on navigation
  React.useEffect(() => {
    setMobileMenuOpen(false)
    setUserDropdownOpen(false)
  }, [pathname])

  const isItemActive = React.useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return pathname === "/dashboard" || pathname === "/"
      }
      if (href === "/tickets") {
        return (
          pathname === "/tickets" ||
          (pathname?.startsWith("/tickets/") && !pathname?.startsWith("/tickets/new"))
        )
      }
      return pathname === href || pathname?.startsWith(`${href}/`)
    },
    [pathname]
  )

  const handleLogout = React.useCallback(() => {
    clearSession()
    router.push("/")
  }, [router])

  return (
    <div className="flex min-h-screen bg-slate-100/60 dark:bg-[#0b0f19] dark-ambient-mesh text-foreground transition-colors duration-200">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden backdrop-blur-xs animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer (Surface: #0f172a, Translucent Border) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#0f172a] backdrop-blur-xl transition-all duration-200 ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-16"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 dark:border-white/10 px-3.5">
            <Link
              href="/dashboard"
              className={`flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                !sidebarOpen ? "lg:justify-center lg:w-full" : ""
              }`}
              aria-label="Process Claim Home"
            >
              <ProcessClaimBrandHeader collapsed={!sidebarOpen && !mobileMenuOpen} />
            </Link>

            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
                aria-label="ปิดเมนู"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav
            aria-label="เมนูหลัก"
            className="flex flex-1 flex-col gap-5 overflow-y-auto py-4 px-3"
          >
            {NAV_SECTIONS.map((sec, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-1">
                {sidebarOpen && (
                  <p className="px-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                    {sec.title}
                  </p>
                )}
                {sec.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center rounded-xl text-sm font-medium transition-all duration-150 h-10 gap-2.5 px-3 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none ${
                        active
                          ? "bg-blue-50/90 text-blue-700 font-semibold ring-1 ring-blue-600/15 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/25 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 hover:translate-x-0.5 active:scale-[0.98]"
                      }`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon
                        className={`size-4.5 shrink-0 transition-colors ${
                          active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        }`}
                        aria-hidden="true"
                      />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Manual Link */}
          <div className="shrink-0 border-t border-slate-200/70 dark:border-white/10 py-2.5 px-3">
            <Link
              href="/manual"
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center rounded-xl text-sm font-medium transition-all duration-150 h-10 gap-2.5 px-3 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none ${
                pathname === "/manual"
                  ? "bg-blue-50/90 text-blue-700 font-semibold ring-1 ring-blue-600/15 dark:bg-blue-950/60 dark:text-sky-300 dark:ring-sky-500/30 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 hover:translate-x-0.5 active:scale-[0.98]"
              }`}
              title={!sidebarOpen ? "คู่มือการใช้งาน" : undefined}
            >
              <BookOpen className="size-4.5 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" aria-hidden="true" />
              {sidebarOpen && <span className="truncate">คู่มือการใช้งาน</span>}
            </Link>
          </div>

          {/* User Profile Footer */}
          <div className="relative shrink-0 border-t border-slate-200/70 dark:border-white/10 py-3 px-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-xl p-1.5 text-left w-full hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-[#0f172a]/90 transition-all duration-150 active:scale-[0.98]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white ring-1 ring-white/10 shadow-xs">
                  PC
                </span>
                {sidebarOpen && (
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {session.name || session.username}
                    </span>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{session.role}</span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">v{packageInfo.version}</span>
                    </div>
                  </div>
                )}
              </button>
            </div>

            {/* Logout Dropdown */}
            {userDropdownOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-xs border-b border-slate-100 dark:border-white/10">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{session.name || session.username}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{session.role} · {session.department}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-1 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div
        className={`flex flex-1 flex-col transition-all duration-200 ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        }`}
      >
        {/* Sticky Top Header (Surface: #0f172a/85 with translucent border) */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-[#0f172a]/85 backdrop-blur-md px-4 shadow-2xs transition-colors duration-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="size-8.5 lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
            aria-label="เปิดเมนู"
          >
            <Menu className="size-5 text-slate-600 dark:text-slate-300" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            className="size-8.5 hidden lg:inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label={sidebarOpen ? "ยุบเมนู" : "ขยายเมนู"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeft className="size-5" />
            )}
          </Button>

          <div className="h-5 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Quick Active Page / System Context */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {pathname === "/dashboard" || pathname === "/"
                ? "แดชบอร์ดภาพรวม"
                : pathname === "/tickets"
                ? "รายการงานเคลม"
                : pathname === "/tickets/new"
                ? "แจ้งเคลมอุปกรณ์"
                : pathname === "/assets"
                ? "ข้อมูลอุปกรณ์"
                : pathname === "/stations"
                ? "ข้อมูลสถานี"
                : pathname === "/repairs/overseas"
                ? "ส่งเคลมต่างประเทศ"
                : "ระบบจัดการงานเคลม"}
            </span>
            <span>·</span>
            <span className="text-slate-400 dark:text-slate-500">ระบบบริหารงานเคลมโครงข่าย SHF</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex size-8.5 items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-800/80 text-slate-600 dark:text-amber-300 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all duration-200 active:scale-95 cursor-pointer"
              aria-label={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"}
              title={theme === "dark" ? "โหมดมืด (คลิกเพื่อเปลี่ยนเป็นโหมดสว่าง)" : "โหมดสว่าง (คลิกเพื่อเปลี่ยนเป็นโหมดมืด)"}
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="size-4.5 text-amber-300 transition-transform duration-300 hover:rotate-45" />
                ) : (
                  <Moon className="size-4.5 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
                )
              ) : (
                <span className="size-4.5" />
              )}
            </button>

            {/* Online Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-medium shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span>ระบบออนไลน์</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  )
}
