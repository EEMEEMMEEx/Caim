"use client"

import * as React from "react"

export type Theme = "light" | "dark" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeContextType {
  theme: "light" | "dark"
  rawTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [rawTheme, setRawThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")
  const [mounted, setMounted] = React.useState(false)

  // Initialize theme on mount from localStorage or system
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null
      const initialTheme = stored || defaultTheme
      setRawThemeState(initialTheme)

      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const activeTheme: "light" | "dark" =
        initialTheme === "system"
          ? systemPrefersDark
            ? "dark"
            : "light"
          : initialTheme === "dark"
          ? "dark"
          : "light"

      setResolvedTheme(activeTheme)
      if (activeTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    } catch {
      // Fallback if localStorage or matchMedia is inaccessible
      setResolvedTheme("light")
      document.documentElement.classList.remove("dark")
    } finally {
      setMounted(true)
    }
  }, [defaultTheme, storageKey])

  // Listen for OS system theme changes when user has set theme to 'system'
  React.useEffect(() => {
    if (!mounted) return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      if (rawTheme === "system") {
        const nextResolved: "light" | "dark" = e.matches ? "dark" : "light"
        setResolvedTheme(nextResolved)
        if (nextResolved === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [rawTheme, mounted])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // Ignore localStorage error in restricted environments
      }
      setRawThemeState(newTheme)

      const isDark =
        newTheme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
          : newTheme === "dark"

      const nextResolved: "light" | "dark" = isDark ? "dark" : "light"
      setResolvedTheme(nextResolved)

      if (isDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    },
    [storageKey]
  )

  const toggleTheme = React.useCallback(() => {
    setResolvedTheme((prev) => {
      const next: "light" | "dark" = prev === "dark" ? "light" : "dark"
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // Ignore localStorage error
      }
      setRawThemeState(next)
      if (next === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }, [storageKey])

  const value = React.useMemo<ThemeContextType>(
    () => ({
      theme: resolvedTheme,
      rawTheme,
      setTheme,
      toggleTheme,
      mounted,
    }),
    [resolvedTheme, rawTheme, setTheme, toggleTheme, mounted]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
