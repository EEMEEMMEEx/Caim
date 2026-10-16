"use client"

import * as React from "react"
import useSWR, { mutate as globalMutate } from "swr"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
} from "@/lib/dashboard/calculateMetrics"

export type ConnectionStatus = "connected" | "connecting" | "fallback-polling"

export const DASHBOARD_STATS_API_KEY = "/api/dashboard/stats"
export const CLAIMS_OVERVIEW_API_KEY = "/api/claims/overview"

/**
 * Global Instant Cache Invalidator:
 * Dispatched whenever a claim, ticket, permit, or RMA is created, updated, or deleted.
 * Invalidates SWR memory caches, dispatches in-window events, and triggers cross-tab sync.
 */
export async function invalidateGlobalDashboardCache(): Promise<void> {
  if (typeof window === "undefined") return

  try {
    // 1. Immediately invalidate all SWR keys matching stats and overview
    globalMutate(DASHBOARD_STATS_API_KEY)
    globalMutate(CLAIMS_OVERVIEW_API_KEY)
    globalMutate(
      (key) =>
        typeof key === "string" &&
        (key.includes("/api/dashboard/stats") || key.includes("/api/claims/overview"))
    )

    // 2. Dispatch in-window real-time events
    window.dispatchEvent(
      new CustomEvent("caim:realtime:metrics", { detail: { action: "invalidate" } })
    )
    window.dispatchEvent(
      new CustomEvent("caim:realtime:ticket", { detail: { action: "invalidate" } })
    )

    // 3. Broadcast to other open browser tabs via BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("caim_global_sync")
      bc.postMessage({ type: "invalidate_dashboard", timestamp: Date.now() })
      bc.close()
    }
  } catch (err) {
    console.warn("[GlobalSync] Cache invalidation warning:", err)
  }
}

/**
 * Fast SWR fetcher targeting pre-aggregated stats endpoint with no-store cache policy
 */
const dashboardFetcher = async (url: string): Promise<DashboardMetrics> => {
  const sep = url.includes("?") ? "&" : "?"
  const fetchUrl = `${url}${sep}_t=${Date.now()}`
  const res = await fetch(fetchUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard metrics: ${res.statusText}`)
  }
  const data = await res.json()
  if (data.success && (data.metrics || data.summary)) {
    return (data.metrics || data) as DashboardMetrics
  }
  throw new Error("Invalid metrics response payload")
}

export interface UseRealtimeDashboardOptions {
  initialMetrics?: DashboardMetrics
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const { initialMetrics } = options

  // Instant SWR Sync with zero-latency revalidation:
  // 1. Initial render uses server-hydrated fallbackData (instant rendering, zero spinner)
  // 2. Revalidates immediately on mount to ensure fresh state
  // 3. Deduping interval set to 1s to prevent concurrent duplicate calls while allowing instant updates
  const {
    data: metrics,
    mutate,
    isValidating: isRefreshing,
  } = useSWR<DashboardMetrics>(DASHBOARD_STATS_API_KEY, dashboardFetcher, {
    fallbackData: initialMetrics,
    revalidateOnMount: true, // Always revalidate on mount to catch fresh server updates
    revalidateOnFocus: true, // Silent revalidation on tab/window focus
    revalidateIfStale: true, // Always refetch if stale
    revalidateOnReconnect: true,
    dedupingInterval: 1000, // Reduced from 180s to 1s for immediate synchronization
    focusThrottleInterval: 5000,
    keepPreviousData: true, // Display previous cached data instantly without flicker while revalidating
  })

  // Safe fallback ensuring metrics are always defined
  const safeMetrics = React.useMemo(() => {
    return metrics ?? initialMetrics ?? calculateDashboardMetrics([])
  }, [metrics, initialMetrics])

  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("connecting")
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)

  // Hydrate lastSyncTime on client after mount to prevent SSR/client time difference
  React.useEffect(() => {
    if (initialMetrics) {
      setLastSyncTime(new Date())
    }
  }, [initialMetrics])

  // Real-Time Server-Sent Events (SSE) & Cross-Tab Broadcast Synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let eventSource: EventSource | null = null
    let fallbackPollTimer: NodeJS.Timeout | null = null
    let syncBc: BroadcastChannel | null = null

    function startFallbackPolling() {
      if (fallbackPollTimer) return
      setConnectionStatus("fallback-polling")
      fallbackPollTimer = setInterval(() => {
        mutate()
      }, 5000)
    }

    function stopFallbackPolling() {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer)
        fallbackPollTimer = null
      }
    }

    const applyFreshMetrics = (payload: unknown) => {
      if (!payload || typeof payload !== "object") {
        mutate()
        return
      }
      const raw = payload as Record<string, unknown>
      const freshMetrics: DashboardMetrics | undefined =
        raw.metrics && typeof raw.metrics === "object" && (raw.metrics as DashboardMetrics).summary
          ? (raw.metrics as DashboardMetrics)
          : raw.summary
          ? (raw as unknown as DashboardMetrics)
          : undefined

      if (freshMetrics && freshMetrics.summary) {
        mutate(freshMetrics, { revalidate: false })
        setLastSyncTime(new Date())
        setConnectionStatus("connected")
      } else {
        mutate()
      }
    }

    try {
      setConnectionStatus("connecting")
      eventSource = new EventSource("/api/dashboard/stream")

      eventSource.addEventListener("open", () => {
        setConnectionStatus("connected")
        stopFallbackPolling()
      })

      // Support both "metrics" and "update" SSE event types
      const handleSseMessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data)
          applyFreshMetrics(payload)
        } catch (e) {
          console.warn("Failed to parse SSE metrics payload", e)
        }
      }

      eventSource.addEventListener("metrics", handleSseMessage)
      eventSource.addEventListener("update", handleSseMessage)

      eventSource.addEventListener("error", () => {
        startFallbackPolling()
      })
    } catch {
      startFallbackPolling()
    }

    // Cross-tab synchronization via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== "undefined") {
        syncBc = new BroadcastChannel("caim_global_sync")
        syncBc.onmessage = (event) => {
          if (event.data?.type === "invalidate_dashboard") {
            mutate()
          }
        }
      }
    } catch {
      // ignore BroadcastChannel errors in unsupported environments
    }

    // Window focus / visibility listener: revalidate cache silently
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutate()
      }
    }
    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    // Real-time custom event listeners from global sync and mutations
    const handleRealtimeMetricsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardMetrics | { action?: string; metrics?: DashboardMetrics }>
      if (customEvent.detail) {
        applyFreshMetrics(customEvent.detail)
      } else {
        mutate()
      }
    }

    const handleTicketChangeEvent = () => {
      mutate()
    }

    window.addEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
    window.addEventListener("caim:realtime:ticket", handleTicketChangeEvent)
    window.addEventListener("caim:realtime:rma", handleTicketChangeEvent)

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (syncBc) {
        syncBc.close()
      }
      stopFallbackPolling()
      window.removeEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
      window.removeEventListener("caim:realtime:ticket", handleTicketChangeEvent)
      window.removeEventListener("caim:realtime:rma", handleTicketChangeEvent)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [mutate])

  /**
   * Optimized Refresh Handler:
   * Triggers an instant server re-fetch bypassing memory cache & intermediate proxies,
   * updating state immediately without waiting for background deduping windows.
   */
  const refresh = React.useCallback(async () => {
    try {
      const freshData = await mutate(
        async () => {
          const res = await fetch(`/api/dashboard/stats?refresh=true&_t=${Date.now()}`, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
            },
          })
          if (!res.ok) throw new Error("Failed to refresh")
          const data = await res.json()
          return (data.metrics || data) as DashboardMetrics
        },
        { revalidate: false }
      )
      if (freshData) {
        setLastSyncTime(new Date())
      }
    } catch {
      await mutate()
      setLastSyncTime(new Date())
    }
  }, [mutate])

  return {
    metrics: safeMetrics,
    connectionStatus,
    lastSyncTime,
    isRefreshing,
    refresh,
  }
}
