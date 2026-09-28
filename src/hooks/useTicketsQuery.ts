"use client"

import * as React from "react"

export const TICKETS_QUERY_KEY = ["tickets"] as const

export interface Ticket {
  id: string
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string
  status: string
  statusCode: number
  date: string
  reportedDate?: string
  deadlineDate?: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  repairResult?: string
  remarks?: string
  category?: string
  deviceType?: string
  location?: string
  warrantyStatus?: string
  serviceCenter?: string
  sentDate?: string
  sentDateIso?: string
  lastTrackDate?: string
  lastTrackDateIso?: string
  returnDate?: string
  returnDateIso?: string
  reportedDateIso?: string
  deadlineDateIso?: string
  reporter?: string
  assignee?: string
  stationId?: string
  station?: string
  province?: string
  district?: string
  subdistrict?: string
}

// Global Singleton Query Cache Store for Tickets
let globalTicketsCache: Ticket[] = []
let globalTotal: number = 0
let globalIsLoading: boolean = false
let globalIsError: boolean = false
let globalError: string | null = null
let globalLastUpdated: number = 0
let activeFetchPromise: Promise<Ticket[]> | null = null
let hasEverFetched: boolean = false

const subscribers = new Set<() => void>()

function broadcastCacheUpdate() {
  subscribers.forEach((callback) => {
    try {
      callback()
    } catch (err) {
      console.error("Error in ticket subscriber callback:", err)
    }
  })
}

/**
 * Fetch tickets directly from authoritative backend database API without mock/fallback re-population
 */
export async function fetchTicketsFromApi(force = false): Promise<Ticket[]> {
  const now = Date.now()

  // Use cached data if not forced and fetched recently (< 4 seconds)
  if (!force && globalLastUpdated > 0 && now - globalLastUpdated < 4000 && hasEverFetched) {
    return globalTicketsCache
  }

  // Wait for active in-flight request if not forcing
  if (!force && activeFetchPromise) {
    return activeFetchPromise
  }

  globalIsLoading = true
  broadcastCacheUpdate()

  const currentPromise = (async () => {
    try {
      const res = await fetch("/api/tickets", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }
      const data = await res.json()

      let fetchedList: Ticket[] = []
      const serverDeletedIds = new Set<string>(Array.isArray(data?.deletedIds) ? data.deletedIds : [])

      if (data && data.success && Array.isArray(data.tickets)) {
        // Prevent fallback/mock datasets from re-populating deleted records
        fetchedList = data.tickets.filter((t: Ticket) => !serverDeletedIds.has(t.id))
      } else {
        fetchedList = []
      }

      globalTicketsCache = fetchedList
      globalTotal = fetchedList.length
      globalIsError = false
      globalError = null
      globalLastUpdated = Date.now()
      hasEverFetched = true

      return fetchedList
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch tickets"
      globalIsError = true
      globalError = message
      console.warn("[TicketsQuery] Fetch error, preserving current state:", message)
      return globalTicketsCache
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
 * Invalidate the ['tickets'] cache immediately and trigger a background re-fetch
 */
export async function invalidateTicketsCache(): Promise<Ticket[]> {
  globalLastUpdated = 0
  return fetchTicketsFromApi(true)
}

export function applyTicketMutation(
  action: "create" | "update" | "delete",
  data: Partial<Ticket> & { id: string; description?: string; serialNumber?: string }
) {
  if (!data || !data.id) return

  const targetId = data.id

  if (action === "create") {
    const filtered = globalTicketsCache.filter((t) => t.id !== targetId)
    globalTicketsCache = [data as Ticket, ...filtered]
  } else if (action === "update") {
    globalTicketsCache = globalTicketsCache.map((t) => {
      if (t.id !== targetId) return t
      const merged = { ...t, ...data }
      if (data.problemDesc || data.description) {
        merged.problemDesc = data.problemDesc || data.description || t.problemDesc
      }
      if (data.serialNo || data.serialNumber) {
        merged.serialNo = data.serialNo || data.serialNumber || t.serialNo
      }
      return merged
    })
  } else if (action === "delete") {
    globalTicketsCache = globalTicketsCache.filter((t) => t.id !== targetId)
  }

  globalTotal = globalTicketsCache.length
  globalLastUpdated = Date.now()
  broadcastCacheUpdate()
}

/**
 * React hook for unified tickets querying, cache invalidation, and real-time synchronization
 */
export function useTicketsQuery() {
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    const onCacheUpdate = () => {
      setVersion((v) => v + 1)
    }
    subscribers.add(onCacheUpdate)

    // Initial fetch on mount
    if (!hasEverFetched || globalLastUpdated === 0) {
      fetchTicketsFromApi()
    }

    // Real-time synchronization event listener from SSE & delta poller
    const handleRealtimeTicket = (e: Event) => {
      const custom = e as CustomEvent
      const detail = custom.detail as { action?: string; data?: { id?: string } } | undefined

      if (detail?.action === "delete" && detail.data?.id) {
        applyTicketMutation("delete", { id: detail.data.id })
      }
      invalidateTicketsCache()
    }

    // Auto revalidate on tab focus and visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidateTicketsCache()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:ticket", handleRealtimeTicket)
      window.addEventListener("visibilitychange", handleVisibility)
      window.addEventListener("focus", handleVisibility)
    }

    return () => {
      subscribers.delete(onCacheUpdate)
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:ticket", handleRealtimeTicket)
        window.removeEventListener("visibilitychange", handleVisibility)
        window.removeEventListener("focus", handleVisibility)
      }
    }
  }, [])

  /**
   * Real Deletion Mutation:
   * 1. Performs optimistic UI update immediately
   * 2. Issues actual DELETE API request with record ID to backend database
   * 3. Awaits database confirmation and ensures rollback on failure
   * 4. Invalidates query cache immediately to prevent stale background restoration
   */
  const deleteTicket = React.useCallback(
    async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (!id) return { success: false, error: "Missing ticket id" }

      // 1. Snapshot previous state for rollback if server transaction fails
      const previousCache = [...globalTicketsCache]
      const previousTotal = globalTotal

      // 2. Optimistic UI update: remove row immediately and recalculate count
      applyTicketMutation("delete", { id })

      try {
        // 3. Attach real API DELETE request to backend database
        const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
          },
        })

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status} error`)
        }

        const data = await res.json()
        if (!data || !data.success) {
          throw new Error(data?.error || "Database deletion failed")
        }

        // 4. Invalidate query cache immediately so background re-fetches or real-time sync
        // do not restore deleted records from stale cache
        await invalidateTicketsCache()

        return {
          success: true,
          message: data.message || `ลบเคส ${id} ออกจากฐานข้อมูลเรียบร้อยแล้ว`,
        }
      } catch (err: unknown) {
        // Rollback optimistic update on error
        console.error("[useTicketsQuery] Deletion failed, rolling back optimistic state:", err)
        globalTicketsCache = previousCache
        globalTotal = previousTotal
        broadcastCacheUpdate()

        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบเคส"
        return { success: false, error: message }
      }
    },
    []
  )

  /**
   * Update Ticket Mutation (Database Persistence & Instant State Synchronization)
   */
  const updateTicket = React.useCallback(
    async (
      ticket: Partial<Ticket> & { id: string; description?: string; serialNumber?: string }
    ): Promise<{ success: boolean; data?: Ticket; message?: string; error?: string }> => {
      if (!ticket || !ticket.id) {
        return { success: false, error: "Missing ticket id" }
      }

      // 1. Snapshot previous state for rollback on transaction failure
      const previousCache = [...globalTicketsCache]

      // 2. Optimistic UI update
      applyTicketMutation("update", ticket)

      try {
        const payload = {
          ...ticket,
          // Support alias field names for compatibility
          description: ticket.problemDesc || ticket.description,
          serialNumber: ticket.serialNo || ticket.serialNumber,
        }

        const res = await fetch("/api/tickets", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`)
        }

        const data = await res.json()
        if (!data || !data.success) {
          throw new Error(data?.error || "Database update failed")
        }

        // 3. Immediately invalidate and refetch parent query cache to sync server-calculated fields
        await invalidateTicketsCache()

        return {
          success: true,
          data: data.ticket,
          message: data.message || `อัปเดตข้อมูลเคส ${ticket.id} เรียบร้อยแล้ว`,
        }
      } catch (err: unknown) {
        // Rollback optimistic update
        console.error("[useTicketsQuery] Update failed, rolling back state:", err)
        globalTicketsCache = previousCache
        broadcastCacheUpdate()

        const message = err instanceof Error ? err.message : "Failed to update ticket"
        return { success: false, error: message }
      }
    },
    []
  )

  return {
    queryKey: TICKETS_QUERY_KEY,
    tickets: globalTicketsCache,
    data: globalTicketsCache,
    total: globalTotal,
    isLoading: globalIsLoading,
    isError: globalIsError,
    error: globalError,
    refetch: invalidateTicketsCache,
    invalidate: invalidateTicketsCache,
    deleteTicket,
    updateTicket,
  }
}
