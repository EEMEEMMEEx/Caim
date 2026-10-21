"use client"

import * as React from "react"

export type RealtimeConnectionStatus = "connected" | "connecting" | "disconnected"

export interface RealtimeEventHandlers {
  onStationChange?: (data: unknown) => void
  onEquipmentChange?: (data: unknown) => void
  onTicketChange?: (data: unknown) => void
  onRmaChange?: (data: unknown) => void
  onMetricsChange?: (data: unknown) => void
}

let globalEventSource: EventSource | null = null
let connectionRefCount = 0
let currentStatus: RealtimeConnectionStatus = "disconnected"
const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>()
let lastSyncTimestamp = new Date(Date.now() - 30000).toISOString()
let backgroundSyncTimer: NodeJS.Timeout | null = null
let reconnectTimeout: NodeJS.Timeout | null = null
let isSyncCheckActive = false

function broadcastStatus(status: RealtimeConnectionStatus) {
  if (currentStatus === status) return
  currentStatus = status
  statusListeners.forEach((fn) => fn(status))
}

/**
 * Lightweight delta sync check across all clients and IPs
 */
async function checkServerSync() {
  if (typeof window === "undefined") return
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return
  if (isSyncCheckActive) return
  isSyncCheckActive = true

  try {
    const res = await fetch(`/api/realtime/sync-check?since=${encodeURIComponent(lastSyncTimestamp)}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })
    if (!res.ok) return
    const data = await res.json()
    if (!data || !data.success) return

    if (data.latestTimestamp) {
      lastSyncTimestamp = data.latestTimestamp
    }

    if (data.hasUpdates && Array.isArray(data.updates) && data.updates.length > 0) {
      let hasTicketUpdates = false
      let hasRmaUpdates = false

      for (const update of data.updates) {
        if (update.targetType === "equipment") {
          window.dispatchEvent(
            new CustomEvent("caim:realtime:equipment", {
              detail: { action: update.action.includes("CREATE") ? "create" : update.action.includes("UPDATE") ? "update" : "delete", data: { serial: update.targetId } },
            })
          )
        } else if (update.targetType === "station") {
          window.dispatchEvent(
            new CustomEvent("caim:realtime:station", {
              detail: { action: update.action.includes("CREATE") ? "create" : update.action.includes("UPDATE") ? "update" : "delete", data: { id: update.targetId } },
            })
          )
        } else if (update.targetType === "ticket") {
          hasTicketUpdates = true
          window.dispatchEvent(
            new CustomEvent("caim:realtime:ticket", {
              detail: { action: "update", data: { id: update.targetId } },
            })
          )
        } else if (update.targetType === "rma") {
          hasRmaUpdates = true
          window.dispatchEvent(
            new CustomEvent("caim:realtime:rma", {
              detail: { action: "update", data: { id: update.targetId } },
            })
          )
        }
      }

      // Dispatch metrics invalidation at most once per sync check batch to avoid re-render storms
      if (hasTicketUpdates || hasRmaUpdates) {
        window.dispatchEvent(new CustomEvent("caim:realtime:metrics", { detail: {} }))
      }
    }
  } catch {
    // ignore background sync check transient errors
  } finally {
    isSyncCheckActive = false
  }
}

function startFallbackPolling() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return
  if (backgroundSyncTimer) return
  // Fallback poll every 15 seconds only when SSE is offline
  backgroundSyncTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      pauseSyncWhenHidden()
      return
    }
    checkServerSync()
  }, 15000)
}

function stopFallbackPolling() {
  if (backgroundSyncTimer) {
    clearInterval(backgroundSyncTimer)
    backgroundSyncTimer = null
  }
}

function pauseSyncWhenHidden() {
  if (globalEventSource) {
    globalEventSource.close()
    globalEventSource = null
  }
  stopFallbackPolling()
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  broadcastStatus("disconnected")
}

function initGlobalSSE() {
  if (typeof window === "undefined") return
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return
  if (globalEventSource) return

  broadcastStatus("connecting")

  try {
    globalEventSource = new EventSource("/api/realtime/stream")

    globalEventSource.addEventListener("open", () => {
      broadcastStatus("connected")
      stopFallbackPolling()
    })

    globalEventSource.addEventListener("station", (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload?.timestamp) lastSyncTimestamp = payload.timestamp
        window.dispatchEvent(new CustomEvent("caim:realtime:station", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("equipment", (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload?.timestamp) lastSyncTimestamp = payload.timestamp
        window.dispatchEvent(new CustomEvent("caim:realtime:equipment", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("ticket", (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload?.timestamp) lastSyncTimestamp = payload.timestamp
        window.dispatchEvent(new CustomEvent("caim:realtime:ticket", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("rma", (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload?.timestamp) lastSyncTimestamp = payload.timestamp
        window.dispatchEvent(new CustomEvent("caim:realtime:rma", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("metrics", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:metrics", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("error", () => {
      broadcastStatus("disconnected")
      if (globalEventSource) {
        globalEventSource.close()
        globalEventSource = null
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      // Reconnect after 3 seconds if active listeners and document is visible
      if (connectionRefCount > 0 && typeof document !== "undefined" && document.visibilityState === "visible") {
        reconnectTimeout = setTimeout(initGlobalSSE, 3000)
      } else {
        startFallbackPolling()
      }
    })
  } catch {
    broadcastStatus("disconnected")
    startFallbackPolling()
  }
}

function releaseGlobalSSE() {
  if (connectionRefCount <= 0) {
    if (globalEventSource) {
      globalEventSource.close()
      globalEventSource = null
    }
    stopFallbackPolling()
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    broadcastStatus("disconnected")
  }
}

/**
 * React hook to subscribe to centralized real-time changes across all clients and IPs
 */
export function useRealtimeSync(handlers?: RealtimeEventHandlers) {
  const [status, setStatus] = React.useState<RealtimeConnectionStatus>(currentStatus)
  const handlersRef = React.useRef(handlers)
  handlersRef.current = handlers

  React.useEffect(() => {
    if (typeof window === "undefined") return

    connectionRefCount++
    statusListeners.add(setStatus)
    initGlobalSSE()

    const handleStation = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onStationChange?.(custom.detail)
    }
    const handleEquipment = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onEquipmentChange?.(custom.detail)
    }
    const handleTicket = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onTicketChange?.(custom.detail)
    }
    const handleRma = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onRmaChange?.(custom.detail)
    }
    const handleMetrics = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onMetricsChange?.(custom.detail)
    }

    window.addEventListener("caim:realtime:station", handleStation)
    window.addEventListener("caim:realtime:equipment", handleEquipment)
    window.addEventListener("caim:realtime:ticket", handleTicket)
    window.addEventListener("caim:realtime:rma", handleRma)
    window.addEventListener("caim:realtime:metrics", handleMetrics)

    // Revalidate on tab focus and visibility change, pause while backgrounded to conserve Vercel memory
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!globalEventSource || globalEventSource.readyState === EventSource.CLOSED) {
          initGlobalSSE()
        }
        checkServerSync()
      } else {
        pauseSyncWhenHidden()
      }
    }
    window.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleVisibility)

    return () => {
      connectionRefCount--
      statusListeners.delete(setStatus)
      window.removeEventListener("caim:realtime:station", handleStation)
      window.removeEventListener("caim:realtime:equipment", handleEquipment)
      window.removeEventListener("caim:realtime:ticket", handleTicket)
      window.removeEventListener("caim:realtime:rma", handleRma)
      window.removeEventListener("caim:realtime:metrics", handleMetrics)
      window.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleVisibility)
      releaseGlobalSSE()
    }
  }, [])

  return {
    status,
    isConnected: status === "connected",
    triggerSyncCheck: checkServerSync,
  }
}
