"use client"

import * as React from "react"
import { type Asset } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/assetsData"

export const EQUIPMENTS_QUERY_KEY = ["equipments"] as const

export interface EquipmentQueryState {
  equipments: Asset[]
  total: number
  isLoading: boolean
  isError: boolean
  error: string | null
  lastUpdated: number
}

// Global Singleton Query Cache Store
let globalEquipmentsCache: Asset[] = []
let globalTotal: number = 0
let globalIsLoading: boolean = false
let globalIsError: boolean = false
let globalError: string | null = null
let globalLastUpdated: number = 0
let activeFetchPromise: Promise<Asset[]> | null = null
let hasEverFetched: boolean = false

const subscribers = new Set<() => void>()

function broadcastCacheUpdate() {
  subscribers.forEach((callback) => {
    try {
      callback()
    } catch (err) {
      console.error("Error in equipment subscriber callback:", err)
    }
  })
}

/**
 * Fetch equipments directly from authoritative database API without local device partitioning
 */
export async function fetchEquipmentsFromApi(force = false): Promise<Asset[]> {
  const now = Date.now()

  // Use cached data if not forced and fetched recently (< 3 minutes)
  if (!force && globalLastUpdated > 0 && now - globalLastUpdated < 180_000 && hasEverFetched) {
    return globalEquipmentsCache
  }

  // If forced and there is an active request in flight, wait for it to finish first, then do a fresh fetch
  if (force && activeFetchPromise) {
    try {
      await activeFetchPromise
    } catch {
      // ignore
    }
  } else if (!force && activeFetchPromise) {
    return activeFetchPromise
  }

  globalIsLoading = true
  broadcastCacheUpdate()

  const currentPromise = (async () => {
    try {
      const res = await fetch("/api/equipments", {
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

      let fetchedList: Asset[] = []
      if (data && data.success && Array.isArray(data.equipments)) {
        fetchedList = data.equipments
      } else {
        fetchedList = []
      }

      globalEquipmentsCache = fetchedList
      globalTotal = typeof data?.total === "number" ? data.total : fetchedList.length
      globalIsError = false
      globalError = null
      globalLastUpdated = Date.now()
      hasEverFetched = true

      return fetchedList
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch equipments"
      globalIsError = true
      globalError = message
      console.warn("[EquipmentsQuery] Fetch error, using cached fallback:", message)
      return globalEquipmentsCache
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
 * Invalidate the ['equipments'] cache and refetch fresh records across all forms and dropdowns
 */
export async function invalidateEquipmentsCache(): Promise<Asset[]> {
  globalLastUpdated = 0
  return fetchEquipmentsFromApi(true)
}

/**
 * Update cache with mutation event
 */
export function applyEquipmentMutation(action: "create" | "update" | "delete", data: Partial<Asset> & { serial: string }) {
  if (!data || !data.serial) return

  const targetSerial = data.serial.toUpperCase()

  if (action === "create") {
    const filtered = globalEquipmentsCache.filter((item) => item.serial.toUpperCase() !== targetSerial)
    globalEquipmentsCache = [data as Asset, ...filtered]
  } else if (action === "update") {
    globalEquipmentsCache = globalEquipmentsCache.map((item) =>
      item.serial.toUpperCase() === targetSerial ? { ...item, ...data } : item
    )
  } else if (action === "delete") {
    globalEquipmentsCache = globalEquipmentsCache.filter((item) => item.serial.toUpperCase() !== targetSerial)
  }

  globalTotal = globalEquipmentsCache.length
  globalLastUpdated = Date.now()
  broadcastCacheUpdate()
}

/**
 * Unified Query Hook for Equipment Information Registry & New Claim Case Form
 * - Shared cache key: ['equipments']
 * - Single source of truth from database
 * - Bidirectional real-time cross-client consistency
 */
export function useEquipmentsQuery() {
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    // Subscribe component to central cache updates
    const onCacheUpdate = () => {
      setVersion((v) => v + 1)
    }
    subscribers.add(onCacheUpdate)

    // Initial fetch if cache is empty or never fetched
    if (globalLastUpdated === 0) {
      fetchEquipmentsFromApi()
    }

    // Real-time synchronization event listener from SSE / cross-client sync
    const handleRealtimeEquipment = () => {
      invalidateEquipmentsCache()
    }

    // Revalidate when user returns to tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidateEquipmentsCache()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:equipment", handleRealtimeEquipment)
      window.addEventListener("visibilitychange", handleVisibility)
      window.addEventListener("focus", handleVisibility)
    }

    return () => {
      subscribers.delete(onCacheUpdate)
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:equipment", handleRealtimeEquipment)
        window.removeEventListener("visibilitychange", handleVisibility)
        window.removeEventListener("focus", handleVisibility)
      }
    }
  }, [])

  // Create mutation: writes directly to database API
  const createEquipment = React.useCallback(async (asset: Asset): Promise<{ success: boolean; error?: string; equipment?: Asset }> => {
    try {
      const res = await fetch("/api/equipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(asset),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create equipment")
      }

      const createdItem: Asset = data.equipment || asset

      // Optimistically place at the very top (index 0)
      applyEquipmentMutation("create", createdItem)

      // Invalidate and refetch immediately to ensure single source of truth
      await invalidateEquipmentsCache()

      return { success: true, equipment: createdItem }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create equipment"
      return { success: false, error: message }
    }
  }, [])

  // Update mutation
  const updateEquipment = React.useCallback(async (asset: Asset): Promise<{ success: boolean; error?: string; equipment?: Asset }> => {
    try {
      const res = await fetch("/api/equipments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(asset),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update equipment")
      }

      const updatedItem: Asset = { ...asset }
      applyEquipmentMutation("update", updatedItem)
      await invalidateEquipmentsCache()

      return { success: true, equipment: updatedItem }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update equipment"
      return { success: false, error: message }
    }
  }, [])

  // Delete mutation
  const deleteEquipment = React.useCallback(async (serial: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/equipments?serial=${encodeURIComponent(serial)}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete equipment")
      }

      applyEquipmentMutation("delete", { serial })
      await invalidateEquipmentsCache()

      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete equipment"
      return { success: false, error: message }
    }
  }, [])

  return {
    queryKey: EQUIPMENTS_QUERY_KEY,
    equipments: globalEquipmentsCache,
    data: globalEquipmentsCache,
    total: globalTotal,
    isLoading: globalIsLoading,
    isError: globalIsError,
    error: globalError,
    refetch: invalidateEquipmentsCache,
    invalidate: invalidateEquipmentsCache,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  }
}
