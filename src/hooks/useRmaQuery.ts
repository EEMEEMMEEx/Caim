"use client"

import * as React from "react"
import type { StageHistoryRecord, PermitTrackingInfo } from "@/types/database"

export const RMA_QUERY_KEY = ["rma"] as const

export interface RmaItem {
  id: string
  rmaNo: string
  caseName: string
  serialNo: string
  vendor: string
  model: string
  currentStageNumber: number
  totalStages: number
  currentStageName: string
  stageWaitDays: string
  currentStageStartedAt?: string
  currentStageCompletedAt?: string
  openDate: string
  totalDays: string
  statusBadge: "in_progress" | "returned"
  statusBadgeText: string
  penaltyDays: string
  penaltyStandard: string
  isOverduePenalty?: boolean
  stageHistory?: StageHistoryRecord[]
  permitInfo?: PermitTrackingInfo
  permits?: PermitTrackingInfo[]
}

// Global Singleton Query Cache Store for RMA
let globalRmaCache: RmaItem[] = []
let globalTotal: number = 0
let globalIsLoading: boolean = false
let globalIsError: boolean = false
let globalError: string | null = null
let globalLastUpdated: number = 0
let activeFetchPromise: Promise<RmaItem[]> | null = null
let hasEverFetched: boolean = false

const subscribers = new Set<() => void>()

function broadcastCacheUpdate() {
  subscribers.forEach((callback) => {
    try {
      callback()
    } catch (err) {
      console.error("Error in RMA subscriber callback:", err)
    }
  })
}

/**
 * Fetch RMA items directly from authoritative backend database API without local state reliance
 */
export async function fetchRmaFromApi(force = false): Promise<RmaItem[]> {
  const now = Date.now()

  // Use cached data if not forced and fetched recently (< 3 minutes)
  if (!force && globalLastUpdated > 0 && now - globalLastUpdated < 180_000 && hasEverFetched) {
    return globalRmaCache
  }

  // Wait for active in-flight request if not forcing
  if (!force && activeFetchPromise) {
    return activeFetchPromise
  }

  globalIsLoading = true
  broadcastCacheUpdate()

  const currentPromise = (async () => {
    try {
      const res = await fetch("/api/rma", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }
      const data = await res.json()

      let fetchedList: RmaItem[] = []
      const serverDeletedIds = new Set<string>(Array.isArray(data?.deletedIds) ? data.deletedIds : [])

      if (data && data.success && Array.isArray(data.items)) {
        fetchedList = data.items.filter((item: RmaItem) => !serverDeletedIds.has(item.id))
      } else {
        fetchedList = []
      }

      globalRmaCache = fetchedList
      globalTotal = fetchedList.length
      globalIsError = false
      globalError = null
      globalLastUpdated = Date.now()
      hasEverFetched = true

      return fetchedList
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch RMA items"
      globalIsError = true
      globalError = message
      console.warn("[RmaQuery] Fetch error, preserving current state:", message)
      return globalRmaCache
    } finally {
      globalIsLoading = false
      activeFetchPromise = null
      broadcastCacheUpdate()
    }
  })()

  activeFetchPromise = currentPromise
  return currentPromise
}

/**
 * Invalidate the ['rma'] query cache immediately upon mutation success
 */
export async function invalidateRmaCache(): Promise<RmaItem[]> {
  globalLastUpdated = 0
  return fetchRmaFromApi(true)
}

/**
 * Apply in-memory optimistic updates to global cache
 */
export function applyRmaMutation(
  action: "create" | "update" | "delete",
  payload: Partial<RmaItem> & { id: string }
) {
  if (!payload || !payload.id) return

  if (action === "create") {
    const filtered = globalRmaCache.filter((r) => r.id !== payload.id)
    globalRmaCache = [payload as RmaItem, ...filtered]
  } else if (action === "update") {
    globalRmaCache = globalRmaCache.map((r) => (r.id === payload.id ? { ...r, ...payload } : r))
  } else if (action === "delete") {
    globalRmaCache = globalRmaCache.filter((r) => r.id !== payload.id)
  }

  globalTotal = globalRmaCache.length
  globalLastUpdated = Date.now()
  broadcastCacheUpdate()
}

/**
 * Unified Query Hook for Overseas RMA records
 * - Direct remote database queries
 * - Eliminates browser-specific localStorage dependencies
 * - Auto-revalidation on window focus and cross-device SSE broadcasts
 */
export function useRmaQuery() {
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    const onCacheUpdate = () => {
      setVersion((v) => v + 1)
    }
    subscribers.add(onCacheUpdate)

    if (!hasEverFetched || globalLastUpdated === 0) {
      fetchRmaFromApi()
    }

    // Real-time synchronization event listener from SSE
    const handleRealtimeRma = (e: Event) => {
      const custom = e as CustomEvent
      const detail = custom.detail as { action?: string; data?: { id?: string } } | undefined

      if (detail?.action === "delete" && detail?.data?.id) {
        applyRmaMutation("delete", { id: detail.data.id })
      }
      invalidateRmaCache()
    }

    // Window focus / visibility change revalidation (refetchOnWindowFocus)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidateRmaCache()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:rma", handleRealtimeRma)
      window.addEventListener("visibilitychange", handleVisibility)
      window.addEventListener("focus", handleVisibility)
    }

    return () => {
      subscribers.delete(onCacheUpdate)
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:rma", handleRealtimeRma)
        window.removeEventListener("visibilitychange", handleVisibility)
        window.removeEventListener("focus", handleVisibility)
      }
    }
  }, [])

  const deleteRma = React.useCallback(
    async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (!id) return { success: false, error: "Missing RMA id" }

      const previousCache = [...globalRmaCache]
      const previousTotal = globalTotal

      // Optimistic update
      applyRmaMutation("delete", { id })

      try {
        const res = await fetch(`/api/rma?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
          },
        })

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`)
        }

        const data = await res.json()
        if (!data || !data.success) {
          throw new Error(data?.error || "Database deletion failed")
        }

        await invalidateRmaCache()

        return {
          success: true,
          message: data.message || `ลบใบส่งซ่อม ${id} ถาวรเรียบร้อยแล้ว`,
        }
      } catch (err: unknown) {
        console.error("[useRmaQuery] Deletion failed, rolling back optimistic state:", err)
        globalRmaCache = previousCache
        globalTotal = previousTotal
        broadcastCacheUpdate()

        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบใบส่งซ่อม"
        return { success: false, error: message }
      }
    },
    []
  )

  const updateRma = React.useCallback(
    async (item: Partial<RmaItem> & { id: string }): Promise<{ success: boolean; message?: string; error?: string }> => {
      applyRmaMutation("update", item)

      try {
        const res = await fetch("/api/rma", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify(item),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Update failed")
        }

        await invalidateRmaCache()
        return { success: true, message: data.message }
      } catch (err: unknown) {
        await invalidateRmaCache()
        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดตใบส่งซ่อม"
        return { success: false, error: message }
      }
    },
    []
  )

  return {
    queryKey: RMA_QUERY_KEY,
    rmaList: globalRmaCache,
    total: globalTotal,
    isLoading: globalIsLoading,
    isError: globalIsError,
    error: globalError,
    refetch: invalidateRmaCache,
    invalidate: invalidateRmaCache,
    deleteRma,
    updateRma,
  }
}
