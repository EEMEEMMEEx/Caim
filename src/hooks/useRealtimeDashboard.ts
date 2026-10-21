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

    // 2. Dispatch in-window real-time metrics invalidation event
    // NOTE: DO NOT dispatch caim:realtime:ticket here, as tickets hooks call this function,
    // which would create a synchronous infinite recursion loop!
    window.dispatchEvent(
      new CustomEvent("caim:realtime:metrics", { detail: { action: "invalidate" } })
    )

    // 3. Broadcast to other open browser tabs via BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("caim_global_sync")
        bc.postMessage({ type: "invalidate_dashboard", timestamp: Date.now() })
        bc.close()
      } catch {
        // ignore BroadcastChannel errors in unsupported environments
      }
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

function areMetricsEqual(a?: DashboardMetrics, b?: DashboardMetrics): boolean {
  if (!a || !b) return false
  const sA = a.summary
  const sB = b.summary
  if (!sA || !sB) return false
  return (
    sA.total === sB.total &&
    sA.inProgress === sB.inProgress &&
    sA.closed === sB.closed &&
    sA.rejected === sB.rejected &&
    a.kpi?.overdueCount === b.kpi?.overdueCount
  )
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const { initialMetrics } = options

  // Instant SWR Sync with zero-latency revalidation:
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
    dedupingInterval: 1000,
    focusThrottleInterval: 5000,
    keepPreviousData: true,
  })

  // Safe fallback ensuring metrics are always defined
  const safeMetrics = React.useMemo(() => {
    return metrics ?? initialMetrics ?? calculateDashboardMetrics([])
  }, [metrics, initialMetrics])

  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("connecting")
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)

  // Keep a stable ref to current metrics to compare before re-rendering
  const currentMetricsRef = React.useRef<DashboardMetrics | undefined>(metrics ?? initialMetrics)
  React.useEffect(() => {
    currentMetricsRef.current = metrics ?? initialMetrics
  }, [metrics, initialMetrics])

  // Hydrate lastSyncTime on client after mount (only once) to prevent SSR/client time differences
  const initialHydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (!initialHydratedRef.current && initialMetrics) {
      initialHydratedRef.current = true
      setLastSyncTime(new Date())
    }
  }, [initialMetrics])

  // Real-Time Server-Sent Events (SSE) & Cross-Tab Broadcast Synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let mutateDebounceTimer: NodeJS.Timeout | null = null
    let syncBc: BroadcastChannel | null = null

    // Debounced mutate helper to coalesce high-frequency events
    const throttledMutate = () => {
      if (mutateDebounceTimer) return
      mutateDebounceTimer = setTimeout(() => {
        mutateDebounceTimer = null
        mutate()
      }, 400)
    }

    const applyFreshMetrics = (payload: unknown) => {
      if (!payload || typeof payload !== "object") {
        throttledMutate()
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
        // Only update state if metrics data actually changed to avoid infinite re-render loops
        if (!areMetricsEqual(currentMetricsRef.current, freshMetrics)) {
          mutate(freshMetrics, { revalidate: false })
          setLastSyncTime(new Date())
        }
        setConnectionStatus((prev) => (prev !== "connected" ? "connected" : prev))
      } else {
        throttledMutate()
      }
    }

    // Centralized event bus is managed by useRealtimeSync; mark connected and listen for events
    setConnectionStatus("connected")

    // Cross-tab synchronization via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== "undefined") {
        syncBc = new BroadcastChannel("caim_global_sync")
        syncBc.onmessage = (event) => {
          if (event.data?.type === "invalidate_dashboard") {
            throttledMutate()
          }
        }
      }
    } catch {
      // ignore BroadcastChannel errors in unsupported environments
    }

    // Window focus / visibility listener: revalidate cache silently with throttle
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        throttledMutate()
      }
    }
    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    // Real-time custom event listeners from global sync and mutations
    const handleRealtimeMetricsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardMetrics | { action?: string; metrics?: DashboardMetrics }>
      if (customEvent.detail && "action" in customEvent.detail && customEvent.detail.action === "invalidate") {
        throttledMutate()
      } else if (customEvent.detail) {
        applyFreshMetrics(customEvent.detail)
      } else {
        throttledMutate()
      }
    }

    const handleTicketChangeEvent = () => {
      throttledMutate()
    }

    window.addEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
    window.addEventListener("caim:realtime:ticket", handleTicketChangeEvent)
    window.addEventListener("caim:realtime:rma", handleTicketChangeEvent)

    return () => {
      if (syncBc) {
        syncBc.close()
        syncBc = null
      }
      if (mutateDebounceTimer) {
        clearTimeout(mutateDebounceTimer)
        mutateDebounceTimer = null
      }
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
