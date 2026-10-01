"use client"

import * as React from "react"
import type { Locale, TranslationDictionary, TranslationKey } from "./types"
import th from "./locales/th.json"
import en from "./locales/en.json"

const dictionaries: Record<Locale, TranslationDictionary> = {
  th,
  en,
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey | string, fallback?: string) => string
  dict: TranslationDictionary
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = "locale"
const COOKIE_NAME = "locale"

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "th"

  try {
    // 1. Try localStorage
    const local = localStorage.getItem(STORAGE_KEY)
    if (local === "th" || local === "en") {
      return local
    }

    // 2. Try cookie
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
    if (match) {
      const cookieVal = decodeURIComponent(match[1])
      if (cookieVal === "th" || cookieVal === "en") {
        return cookieVal
      }
    }
  } catch {
    // Ignore storage errors in restrictive environments
  }

  return "th"
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, locale)
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`
    document.documentElement.lang = locale
  } catch {
    // Ignore storage errors
  }
}

// Deep get helper for nested object keys
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("th")

  // Initialize from storage on client mount
  React.useEffect(() => {
    const initial = getStoredLocale()
    setLocaleState(initial)
    if (document.documentElement.lang !== initial) {
      document.documentElement.lang = initial
    }
  }, [])

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    persistLocale(newLocale)
  }, [])

  const dict = React.useMemo(() => {
    return dictionaries[locale] || dictionaries.th
  }, [locale])

  const t = React.useCallback(
    (key: TranslationKey | string, fallback?: string): string => {
      // 1. Lookup in current dictionary
      const currentVal = getNestedValue(dict as unknown as Record<string, unknown>, key)
      if (typeof currentVal === "string") return currentVal

      // 2. Fallback to Thai dictionary
      if (locale !== "th") {
        const thaiVal = getNestedValue(dictionaries.th as unknown as Record<string, unknown>, key)
        if (typeof thaiVal === "string") return thaiVal
      }

      // 3. Explicit fallback or key string
      return fallback !== undefined ? fallback : key
    },
    [dict, locale]
  )

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dict,
    }),
    [locale, setLocale, t, dict]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const context = React.useContext(LocaleContext)
  if (!context) {
    // Fallback safe value when rendered outside provider
    return {
      locale: "th",
      setLocale: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
      dict: dictionaries.th,
    }
  }
  return context
}
