import { EventEmitter } from "events"
import type { RealtimeSyncPayload } from "@/types/database"

class RealtimeEventEmitter extends EventEmitter {}

declare global {
  var _realtimeEventEmitter: RealtimeEventEmitter | undefined
}

export const realtimeEmitter: RealtimeEventEmitter =
  global._realtimeEventEmitter || new RealtimeEventEmitter()

// Unconditionally preserve singleton across all environments and Next.js route closures
global._realtimeEventEmitter = realtimeEmitter

export const REALTIME_EVENTS = {
  STATIONS_CHANGED: "stations_changed",
  EQUIPMENTS_CHANGED: "equipments_changed",
  TICKETS_CHANGED: "tickets_changed",
  RMA_CHANGED: "rma_changed",
  METRICS_CHANGED: "metrics_changed",
} as const

export function broadcastRealtimeChange(payload: RealtimeSyncPayload) {
  switch (payload.type) {
    case "station":
      realtimeEmitter.emit(REALTIME_EVENTS.STATIONS_CHANGED, payload)
      break
    case "equipment":
      realtimeEmitter.emit(REALTIME_EVENTS.EQUIPMENTS_CHANGED, payload)
      break
    case "ticket":
      realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, payload)
      break
    case "rma":
      realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, payload)
      break
    case "metrics":
      realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, payload)
      break
  }
}
