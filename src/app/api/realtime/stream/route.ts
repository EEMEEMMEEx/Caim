import { NextRequest } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { TransactionLogDocument } from "@/types/database"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  async function getMetrics() {
    return getPrecomputedDashboardMetrics()
  }

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false

      const safeEnqueue = (str: string) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(str))
        } catch {
          isClosed = true
        }
      }

      // 1. Initial snapshot push
      try {
        const initialMetrics = await getMetrics()
        safeEnqueue(`event: metrics\ndata: ${JSON.stringify(initialMetrics)}\n\n`)
      } catch (err) {
        console.error("SSE initial data error:", err)
      }

      // 2. Local in-process event listeners for immediate zero-latency dispatch
      const onStationChanged = (payload: unknown) => {
        safeEnqueue(`event: station\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      const onEquipmentChanged = (payload: unknown) => {
        safeEnqueue(`event: equipment\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      const onTicketChanged = async (payload: unknown) => {
        safeEnqueue(`event: ticket\ndata: ${JSON.stringify(payload)}\n\n`)
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      const onRmaChanged = async (payload: unknown) => {
        safeEnqueue(`event: rma\ndata: ${JSON.stringify(payload)}\n\n`)
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      const onMetricsChanged = async () => {
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      realtimeEmitter.on(REALTIME_EVENTS.STATIONS_CHANGED, onStationChanged)
      realtimeEmitter.on(REALTIME_EVENTS.EQUIPMENTS_CHANGED, onEquipmentChanged)
      realtimeEmitter.on(REALTIME_EVENTS.TICKETS_CHANGED, onTicketChanged)
      realtimeEmitter.on(REALTIME_EVENTS.RMA_CHANGED, onRmaChanged)
      realtimeEmitter.on(REALTIME_EVENTS.METRICS_CHANGED, onMetricsChanged)

      // 3. Heartbeat keepalive ping every 10s to prevent Vercel / proxy timeout
      const pingInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(pingInterval)
          return
        }
        safeEnqueue(`: ping\n\n`)
      }, 10000)

      // 4. Cross-IP & Cross-Instance Database Poller:
      // Polls caim.transaction_logs so any mutation executed from another Vercel Serverless instance
      // or different client IP address is immediately broadcast to this connection!
      let lastCheckedTimestamp = new Date().toISOString()

      const crossClientSyncInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(crossClientSyncInterval)
          return
        }
        try {
          if (isMongoConfigured()) {
            const db = await getDb()
            if (db) {
              const logs = await db
                .collection<TransactionLogDocument>("transaction_logs")
                .find({ timestamp: { $gt: lastCheckedTimestamp } })
                .sort({ timestamp: 1 })
                .limit(20)
                .toArray()

              if (logs.length > 0) {
                let shouldRefreshMetrics = false

                for (const log of logs) {
                  lastCheckedTimestamp = log.timestamp

                  if (log.targetType === "equipment") {
                    safeEnqueue(
                      `event: equipment\ndata: ${JSON.stringify({
                        type: "equipment",
                        action: log.action.includes("CREATE")
                          ? "create"
                          : log.action.includes("UPDATE")
                          ? "update"
                          : "delete",
                        data: log.details || { serial: log.targetId },
                        timestamp: log.timestamp,
                      })}\n\n`
                    )
                  } else if (log.targetType === "station") {
                    safeEnqueue(
                      `event: station\ndata: ${JSON.stringify({
                        type: "station",
                        action: log.action.includes("CREATE")
                          ? "create"
                          : log.action.includes("UPDATE")
                          ? "update"
                          : "delete",
                        data: log.details || { id: log.targetId },
                        timestamp: log.timestamp,
                      })}\n\n`
                    )
                  } else if (log.targetType === "ticket") {
                    shouldRefreshMetrics = true
                    safeEnqueue(
                      `event: ticket\ndata: ${JSON.stringify({
                        type: "ticket",
                        action:
                          log.action.includes("OPEN") || log.action.includes("CREATE")
                            ? "create"
                            : log.action.includes("UPDATE")
                            ? "update"
                            : "delete",
                        data: log.details || { id: log.targetId },
                        timestamp: log.timestamp,
                      })}\n\n`
                    )
                  } else if (log.targetType === "rma") {
                    shouldRefreshMetrics = true
                    safeEnqueue(
                      `event: rma\ndata: ${JSON.stringify({
                        type: "rma",
                        action:
                          log.action.includes("DISPATCH") || log.action.includes("CREATE")
                            ? "create"
                            : log.action.includes("UPDATE")
                            ? "update"
                            : "delete",
                        data: log.details || { id: log.targetId },
                        timestamp: log.timestamp,
                      })}\n\n`
                    )
                  }
                }

                if (shouldRefreshMetrics) {
                  const freshMetrics = await getMetrics()
                  safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
                }
              }
            }
          }
        } catch {
          // ignore poller transient errors
        }
      }, 2500)

      // Cleanup on client abort
      req.signal.addEventListener("abort", () => {
        isClosed = true
        realtimeEmitter.off(REALTIME_EVENTS.STATIONS_CHANGED, onStationChanged)
        realtimeEmitter.off(REALTIME_EVENTS.EQUIPMENTS_CHANGED, onEquipmentChanged)
        realtimeEmitter.off(REALTIME_EVENTS.TICKETS_CHANGED, onTicketChanged)
        realtimeEmitter.off(REALTIME_EVENTS.RMA_CHANGED, onRmaChanged)
        realtimeEmitter.off(REALTIME_EVENTS.METRICS_CHANGED, onMetricsChanged)
        clearInterval(pingInterval)
        clearInterval(crossClientSyncInterval)
        try {
          controller.close()
        } catch {
          // ignore
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
