"use client"

import * as React from "react"
import { Key, ShieldAlert, X, Lock } from "lucide-react"

export interface SettingsPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const REQUIRED_PASSCODE = "258025"

export function SettingsPasswordDialog({
  isOpen,
  onClose,
  onSuccess,
}: SettingsPasswordDialogProps) {
  const [password, setPassword] = React.useState("")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Reset states and auto-focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setPassword("")
      setErrorMsg(null)
      setIsSubmitting(false)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!password) {
      setErrorMsg("กรุณากรอกรหัสผ่าน")
      inputRef.current?.focus()
      return
    }

    setIsSubmitting(true)
    if (password === REQUIRED_PASSCODE) {
      setErrorMsg(null)
      setIsSubmitting(false)
      onSuccess()
    } else {
      setIsSubmitting(false)
      setErrorMsg("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")
      setPassword("")
      inputRef.current?.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#1e293b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-sky-400 shadow-inner">
              <Lock className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                ยืนยันรหัสผ่านเพื่อเข้าสู่การตั้งค่า
              </h3>
              <p className="text-xs text-slate-400">
                Security Verification
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            ระบบป้องกันการแก้ไขการตั้งค่า กรุณากรอกรหัสผ่านเพื่อดำเนินการต่อ
          </p>

          {/* Password Input with Key Icon */}
          <div className="space-y-1.5">
            <label
              htmlFor="settings-guard-password"
              className="block text-xs font-medium text-slate-300"
            >
              รหัสผ่านความปลอดภัย (Security Passcode)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="size-4 text-sky-400" />
              </div>
              <input
                ref={inputRef}
                id="settings-guard-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                placeholder="กรอกรหัสผ่าน..."
                autoComplete="current-password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-900/90 text-sm text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 ${
                  errorMsg
                    ? "border-rose-500/80 focus:ring-rose-500/40 text-rose-100"
                    : "border-slate-700 focus:border-sky-500 focus:ring-sky-500/30"
                }`}
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-950/40 border border-rose-800/60 px-3.5 py-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1">
              <ShieldAlert className="size-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all border border-slate-700/60 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span>ยืนยันรหัสผ่าน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
