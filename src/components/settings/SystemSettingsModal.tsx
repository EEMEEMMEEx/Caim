"use client"

import * as React from "react"
import {
  X,
  Settings,
  Mail,
  Sliders,
  Eye,
  EyeOff,
  Send,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Server,
  ShieldCheck,
  RotateCcw,
} from "lucide-react"
import { type SmtpSettings, DEFAULT_SMTP_SETTINGS } from "@/types/settings"

export interface SystemSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY = "caim_smtp_settings"

export function SystemSettingsModal({ isOpen, onClose }: SystemSettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState<"smtp" | "general">("smtp")
  const [smtpSettings, setSmtpSettings] = React.useState<SmtpSettings>(DEFAULT_SMTP_SETTINGS)
  const [showPassword, setShowPassword] = React.useState(false)

  // Test email state
  const [testRecipient, setTestRecipient] = React.useState(DEFAULT_SMTP_SETTINGS.targetRecipient)
  const [isTestingEmail, setIsTestingEmail] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  // Save state
  const [isSaved, setIsSaved] = React.useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  // Load saved settings from localStorage on client mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setSmtpSettings((prev) => ({ ...prev, ...parsed }))
          if (parsed.targetRecipient) {
            setTestRecipient(parsed.targetRecipient)
          }
        }
      } catch (err) {
        console.warn("Failed to load settings from localStorage:", err)
      }
    }
  }, [])

  // Auto-switch port & SSL when toggling
  const handlePortChange = (newPort: number) => {
    setSmtpSettings((prev) => ({
      ...prev,
      port: newPort,
      secure: newPort === 465,
      enforceSsl: newPort === 465,
    }))
  }

  const handleSaveSettings = () => {
    try {
      const updated = {
        ...smtpSettings,
        targetRecipient: testRecipient,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setIsSaved(true)
      showToast("บันทึกการตั้งค่า SMTP เรียบร้อยแล้ว")
      setTimeout(() => setIsSaved(false), 2500)
    } catch (err) {
      console.error("Failed to save settings:", err)
      showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า")
    }
  }

  const handleResetDefaults = () => {
    setSmtpSettings(DEFAULT_SMTP_SETTINGS)
    setTestRecipient(DEFAULT_SMTP_SETTINGS.targetRecipient)
    localStorage.removeItem(STORAGE_KEY)
    showToast("คืนค่าเริ่มต้นเรียบร้อยแล้ว")
  }

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      showToast("กรุณาระบุอีเมลปลายทางสำหรับทดสอบ")
      return
    }

    setIsTestingEmail(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...smtpSettings,
          targetRecipient: testRecipient,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "ส่งอีเมลทดสอบสำเร็จเรียบร้อย",
        })
        showToast("ส่งอีเมลทดสอบสำเร็จเรียบร้อย")
      } else {
        setTestResult({
          success: false,
          message: data.error || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ SMTP ได้",
          details: data.details,
        })
        showToast(data.error || "การเชื่อมต่อ SMTP ล้มเหลว")
      }
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : String(err)
      setTestResult({
        success: false,
        message: "เกิดข้อผิดพลาดในการติดต่อ API ส่งเมล",
        details: errorStr,
      })
      showToast("เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์")
    } finally {
      setIsTestingEmail(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-[#1e293b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4 bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-sky-400 shadow-inner">
              <Settings className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                การตั้งค่าระบบ & การแจ้งเตือน (System Settings)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการการเชื่อมต่อ และเซิร์ฟเวอร์ SMTP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center border-b border-white/10 bg-slate-900/60 px-5 sm:px-6 shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>การตั้งค่าทั่วไป/ระบบ (General Settings)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("smtp")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "smtp"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="size-3.5" />
            <span>การแจ้งเตือน / SMTP & Alert Intervals</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {activeTab === "smtp" ? (
            <>
              {/* Section: เซิร์ฟเวอร์ SMTP */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Server className="size-4 text-sky-400" />
                    <span>เซิร์ฟเวอร์ SMTP (SMTP Server Configuration)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* SMTP Host */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Host (Server Domain)
                    </label>
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, host: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* SMTP Port Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Port & Security
                    </label>
                    <select
                      value={smtpSettings.port}
                      onChange={(e) => handlePortChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer"
                    >
                      <option value={465}>465 (SSL / Direct TLS)</option>
                      <option value={587}>587 (STARTTLS)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* SMTP Username / Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Username / Email Account
                    </label>
                    <input
                      type="email"
                      value={smtpSettings.user}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, user: e.target.value })
                      }
                      placeholder="claimstickets@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* SMTP Password with Visibility Toggle */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Password / App Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={smtpSettings.pass}
                        onChange={(e) =>
                          setSmtpSettings({ ...smtpSettings, pass: e.target.value })
                        }
                        placeholder="pyzzsapzcdvyjtzit"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Sender Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Sender Name (ชื่อผู้ส่งที่แสดงในอีเมล)
                    </label>
                    <input
                      type="text"
                      value={smtpSettings.senderName}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, senderName: e.target.value })
                      }
                      placeholder="USO Project Team"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* Sender Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Sender Email (ที่อยู่อีเมลผู้ส่ง)
                    </label>
                    <input
                      type="email"
                      value={smtpSettings.senderEmail}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, senderEmail: e.target.value })
                      }
                      placeholder="claimstickets@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>
                </div>

                {/* Protocol Switches */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-white/5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSettings.enforceSsl}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, enforceSsl: e.target.checked })
                      }
                      className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-200">Enforce SSL/TLS</span>
                      <p className="text-[11px] text-slate-400">บังคับใช้การเชื่อมต่อแบบเข้ารหัสทันที</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSettings.rejectUnauthorized}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          rejectUnauthorized: e.target.checked,
                        })
                      }
                      className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-200">
                        Strict Certificate Validation
                      </span>
                      <p className="text-[11px] text-slate-400">ตรวจสอบใบรับรองความปลอดภัย (reject_unauthorized)</p>
                    </div>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isSaved ? <Check className="size-4 text-emerald-300" /> : <Save className="size-4" />}
                    <span>{isSaved ? "บันทึกเรียบร้อย" : "บันทึกการตั้งค่า SMTP (Save Settings)"}</span>
                  </button>
                </div>
              </div>

              {/* Section: ทดสอบเชื่อมต่อและส่งอีเมล */}
              <div className="space-y-3.5 p-4 rounded-xl border border-sky-500/25 bg-slate-900/60 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wide">
                  <ShieldCheck className="size-4" />
                  <span>ทดสอบเชื่อมต่อและส่งอีเมล (Test Email Dispatch)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ทดสอบการส่งอีเมลจริงไปยังผู้รับที่ระบุ เพื่อตรวจสอบการยืนยันตัวตนและการเข้าถึงเซิร์ฟเวอร์ SMTP
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="dopa-only-tm@forth.co.th"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isTestingEmail}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isTestingEmail ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span>{isTestingEmail ? "กำลังส่งเมล..." : "ทดสอบส่งเมล (Test Email)"}</span>
                  </button>
                </div>

                {/* Test Result Message Box */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs animate-in fade-in ${
                      testResult.success
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                        : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {testResult.success ? (
                        <Check className="size-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 text-rose-400 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.details && (
                      <div className="mt-1.5 pl-6 text-[11px] font-mono text-slate-400 break-all">
                        {testResult.details}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* General Settings Tab */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/5 pb-2">
                <Sliders className="size-4 text-sky-400" />
                <span>การตั้งค่าทั่วไปของระบบ (General System Configuration)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">ชื่อระบบ (System Name)</div>
                  <div className="text-xs font-semibold text-white">ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM)</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">หน่วยงานเจ้าของโครงการ</div>
                  <div className="text-xs font-semibold text-white">Forth Corporation Public Company Limited</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">เกณฑ์เตือนใกล้หมดกำหนด SLA</div>
                  <div className="text-xs font-semibold text-amber-400">7 วัน ก่อนถึงกำหนดส่งมอบ</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">การเชื่อมต่อแบบเรียลไทม์</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Server-Sent Events (SSE) Active</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-2">
                <div className="text-xs font-semibold text-slate-200">สถาปัตยกรรมความปลอดภัยและการจัดเก็บข้อมูล</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ระบบใช้งานฐานข้อมูลแบบ Dual-Layer Persistence (MongoDB Atlas พร้อม Persistent Local Backup Store)
                  และระบบรหัสผ่านความปลอดภัยในการเข้าถึงหน้าตั้งค่าระบบ (Passcode Protected Guard)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 sm:px-6 py-3.5 bg-[#0f172a] shrink-0">
          <div className="text-[11px] text-slate-400">
            Forth CAIM Portal · Telecommunication Equipment Claims
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-700/60 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 border border-slate-700 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
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
    </div>
  )
}
