"use client"

import * as React from "react"
import { type Station } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/stationsData"

export const STATIONS_QUERY_KEY = ["stations"] as const

// Cache TTL (3 minutes) to ensure instantaneous tab transitions and avoid redundant network hits
export const STATIONS_STALE_TIME = 180_000

export interface StationQueryState {
  stations: Station[]
  total: number
  isLoading: boolean
  isError: boolean
  error: string | null
  lastUpdated: number
}

// Global Singleton Query Cache Store for Stations
let globalStationsCache: Station[] = []
let globalTotal: number = 0
let globalIsLoading: boolean = false
let globalIsError: boolean = false
let globalError: string | null = null
let globalLastUpdated: number = 0
let activeFetchPromise: Promise<Station[]> | null = null
let hasEverFetched: boolean = false

const subscribers = new Set<() => void>()

function broadcastCacheUpdate() {
  subscribers.forEach((callback) => {
    try {
      callback()
    } catch (err) {
      console.error("Error in station subscriber callback:", err)
    }
  })
}

/**
 * Fetch stations directly from authoritative backend database API with 3-minute staleTime caching
 */
export async function fetchStationsFromApi(force = false): Promise<Station[]> {
  const now = Date.now()

  // Use cached data if not forced and fetched recently (< 3 minutes)
  if (!force && globalLastUpdated > 0 && now - globalLastUpdated < STATIONS_STALE_TIME && hasEverFetched) {
    return globalStationsCache
  }

  // If forced and there is an active request in flight, wait for it to finish first
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
      const res = await fetch("/api/stations", {
        headers: {
          Accept: "application/json",
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }
      const data = await res.json()

      let fetchedList: Station[] = []
      if (data && data.success && Array.isArray(data.stations)) {
        fetchedList = data.stations
      } else {
        fetchedList = []
      }

      globalStationsCache = fetchedList
      globalTotal = typeof data?.total === "number" ? data.total : fetchedList.length
      globalIsError = false
      globalError = null
      globalLastUpdated = Date.now()
      hasEverFetched = true

      return fetchedList
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch stations"
      globalIsError = true
      globalError = message
      console.warn("[StationsQuery] Fetch error, using cached fallback:", message)
      return globalStationsCache
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
 * Invalidate the ['stations'] cache and refetch fresh records across all forms and views
 */
export async function invalidateStationsCache(): Promise<Station[]> {
  globalLastUpdated = 0
  return fetchStationsFromApi(true)
}

/**
 * Update cache with mutation event
 */
export function applyStationMutation(action: "create" | "update" | "delete", data: Partial<Station> & { id: string }) {
  if (!data || !data.id) return

  const targetId = data.id

  if (action === "create") {
    const filtered = globalStationsCache.filter((item) => item.id !== targetId)
    globalStationsCache = [data as Station, ...filtered]
  } else if (action === "update") {
    globalStationsCache = globalStationsCache.map((item) =>
      item.id === targetId ? { ...item, ...data } : item
    )
  } else if (action === "delete") {
    globalStationsCache = globalStationsCache.filter((item) => item.id !== targetId)
  }

  globalTotal = globalStationsCache.length
  globalLastUpdated = Date.now()
  broadcastCacheUpdate()
}

/**
 * Unified Query Hook for Stations Registry & Cascading Filters
 * - Shared cache key: ['stations']
 * - Single source of truth with 3-minute staleTime client cache
 */
export function useStationsQuery() {
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    const onUpdate = () => {
      setVersion((v) => v + 1)
    }
    subscribers.add(onUpdate)

    if (!hasEverFetched && !activeFetchPromise) {
      fetchStationsFromApi()
    }

    return () => {
      subscribers.delete(onUpdate)
    }
  }, [])

  const refetch = React.useCallback(async () => {
    return invalidateStationsCache()
  }, [])

  return {
    stations: globalStationsCache,
    total: globalTotal,
    isLoading: globalIsLoading && globalStationsCache.length === 0,
    isRefreshing: globalIsLoading,
    isError: globalIsError,
    error: globalError,
    lastUpdated: globalLastUpdated,
    refetch,
    applyMutation: applyStationMutation,
  }
}
