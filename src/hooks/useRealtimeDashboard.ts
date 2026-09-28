"use client"

import * as React from "react"
import useSWR from "swr"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
} from "@/lib/dashboard/calculateMetrics"

export type ConnectionStatus = "connected" | "connecting" | "fallback-polling"

export const DASHBOARD_STATS_API_KEY = "/api/dashboard/stats"

/**
 * Fast SWR fetcher targeting pre-aggregated stats endpoint (< 5ms response)
 */
const dashboardFetcher = async (url: string): Promise<DashboardMetrics> => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard metrics: ${res.statusText}`)
  }
  const data = await res.json()
  if (data.success && data.metrics) {
    return data.metrics as DashboardMetrics
  }
  throw new Error("Invalid metrics response payload")
}

export interface UseRealtimeDashboardOptions {
  initialMetrics?: DashboardMetrics
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const { initialMetrics } = options

  // Stale-While-Revalidate (SWR) Caching Strategy:
  // 1. Initial render uses server-hydrated fallbackData (instant rendering, zero spinner)
  // 2. Navigation uses in-memory SWR cache (0ms delay)
  // 3. Background revalidation updates metrics silently without layout shifts
  const {
    data: metrics,
    mutate,
    isValidating: isRefreshing,
  } = useSWR<DashboardMetrics>(DASHBOARD_STATS_API_KEY, dashboardFetcher, {
    fallbackData: initialMetrics,
    revalidateOnFocus: true, // Silent revalidation on tab/window focus
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // 5s deduping window (staleTime equivalent)
    focusThrottleInterval: 5000,
    keepPreviousData: true, // Display previous cached data instantly upon navigation
  })

  // Safe fallback ensuring metrics are always defined
  const safeMetrics = React.useMemo(() => {
    return metrics ?? initialMetrics ?? calculateDashboardMetrics([])
  }, [metrics, initialMetrics])

  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("connecting")
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(() =>
    initialMetrics ? new Date() : null
  )

  // Real-Time Server-Sent Events (SSE) & Cross-Tab Broadcast Synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let eventSource: EventSource | null = null
    let fallbackPollTimer: NodeJS.Timeout | null = null

    function startFallbackPolling() {
      if (fallbackPollTimer) return
      setConnectionStatus("fallback-polling")
      fallbackPollTimer = setInterval(() => {
        mutate()
      }, 10000)
    }

    function stopFallbackPolling() {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer)
        fallbackPollTimer = null
      }
    }

    const applyFreshMetrics = (freshMetrics: DashboardMetrics) => {
      if (freshMetrics && freshMetrics.summary) {
        // Silently mutate SWR cache without refetching from server
        mutate(freshMetrics, { revalidate: false })
        setLastSyncTime(new Date())
        setConnectionStatus("connected")
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
      const customEvent = e as CustomEvent<DashboardMetrics>
      if (customEvent.detail && customEvent.detail.summary) {
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
      stopFallbackPolling()
      window.removeEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
      window.removeEventListener("caim:realtime:ticket", handleTicketChangeEvent)
      window.removeEventListener("caim:realtime:rma", handleTicketChangeEvent)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [mutate])

  const refresh = React.useCallback(async () => {
    await mutate(undefined, { revalidate: true })
    setLastSyncTime(new Date())
  }, [mutate])

  return {
    metrics: safeMetrics,
    connectionStatus,
    lastSyncTime,
    isRefreshing,
    refresh,
  }
}
