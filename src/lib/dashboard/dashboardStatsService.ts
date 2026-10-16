import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
  TicketItem,
} from "./calculateMetrics"
import {
  getPersistentTickets,
  getPersistentDeletedTicketIds,
} from "@/lib/storage/serverTicketStorage"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"

const SUMMARY_FILE = path.join(process.cwd(), "src/data/dashboard_summary.json")
const CACHE_TTL_MS = 2000 // 2 seconds micro-cache window to deduplicate burst requests while ensuring real-time freshness

// Global In-Memory Fast Cache attached to globalThis across all route handler closures
declare global {
  var _dashboardInMemoryMetrics: DashboardMetrics | null | undefined
  var _dashboardInMemoryTimestamp: number | undefined
  var _dashboardIsCacheDirty: boolean | undefined
  var _dashboardActivePromise: Promise<DashboardMetrics> | null | undefined
}

let indexEnsured = false

/**
 * Ensure MongoDB has the optimal compound indexes to prevent slow ad-hoc COLLSCAN (table scans).
 * Index on { statusCode: 1, vendor: 1, createdAt: -1 } enables single-digit millisecond index scan.
 */
export async function ensureDashboardIndexes(): Promise<void> {
  if (indexEnsured || !isMongoConfigured()) return
  try {
    const db = await getDb()
    if (db) {
      const collection = db.collection("tickets")
      await collection.createIndex(
        { statusCode: 1, vendor: 1, createdAt: -1 },
        { name: "idx_tickets_dashboard_stats", background: true }
      )
      indexEnsured = true
    }
  } catch (err) {
    console.warn("[DashboardService] Failed to ensure compound index on tickets:", err)
  }
}

/**
 * Persist pre-aggregated summary to disk and MongoDB for zero-delay cold boots
 */
function persistSummary(metrics: DashboardMetrics): void {
  try {
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(metrics, null, 2), "utf-8")
  } catch (err) {
    console.warn("[DashboardService] Failed to write disk summary:", err)
  }

  if (isMongoConfigured()) {
    getDb()
      .then((db) => {
        if (db) {
          return db.collection("dashboard_summary").updateOne(
            { _id: "current" as unknown as import("mongodb").ObjectId },
            { $set: { metrics, updatedAt: new Date() } },
            { upsert: true }
          )
        }
      })
      .catch((err) => {
        console.warn("[DashboardService] Failed to save summary to MongoDB:", err)
      })
  }
}

/**
 * Compute fresh dashboard metrics with lean projections and pre-aggregated counters.
 */
async function computeMetrics(): Promise<DashboardMetrics> {
  let tickets: TicketItem[] = []

  if (isMongoConfigured()) {
    try {
      await ensureDashboardIndexes()
      const db = await getDb()
      if (db) {
        // Lean projection avoids transferring large fields (problem descriptions, logs, base64 images)
        const docs = await db
          .collection<TicketItem>("tickets")
          .find({}, {
            projection: {
              id: 1,
              title: 1,
              vendor: 1,
              model: 1,
              serialNo: 1,
              status: 1,
              statusCode: 1,
              date: 1,
              ageDays: 1,
              isOverdue: 1,
              overdueText: 1,
              station: 1,
              createdAt: 1,
            },
          })
          .sort({ createdAt: -1 })
          .toArray()

        if (Array.isArray(docs) && docs.length > 0) {
          tickets = docs
        }
      }
    } catch (err) {
      console.warn("[DashboardService] MongoDB fetch error, falling back to disk store:", err)
    }
  }

  // Fallback to local persistent ticket store if MongoDB is unconfigured or empty
  if (tickets.length === 0) {
    tickets = getPersistentTickets() as unknown as TicketItem[]
  }

  // Strictly filter out any permanently deleted tickets to avoid re-populating removed counters
  const persistentDeleted = new Set(getPersistentDeletedTicketIds())
  const activeTickets = tickets.filter((t) => !persistentDeleted.has(t.id))

  const freshMetrics = calculateDashboardMetrics(activeTickets)

  // Update in-memory cache and persistent stores
  global._dashboardInMemoryMetrics = freshMetrics
  global._dashboardInMemoryTimestamp = Date.now()
  global._dashboardIsCacheDirty = false

  persistSummary(freshMetrics)

  return freshMetrics
}

/**
 * Main High-Performance Accessor: Returns pre-aggregated dashboard metrics in single-digit ms.
 * Guarantees zero stale data latency by calculating fresh metrics on cold starts and mutations.
 */
export async function getPrecomputedDashboardMetrics(
  options: { forceRefresh?: boolean } = {}
): Promise<DashboardMetrics> {
  const now = Date.now()
  const cached = global._dashboardInMemoryMetrics
  const timestamp = global._dashboardInMemoryTimestamp || 0
  const isDirty = global._dashboardIsCacheDirty || false

  // 1. Fast Path: Return hot in-memory cache if within 2s micro-window and not marked dirty
  if (!options.forceRefresh && cached && !isDirty && now - timestamp < CACHE_TTL_MS) {
    return cached
  }

  // 2. Deduplicate simultaneous compute calls to protect CPU & database
  if (global._dashboardActivePromise) {
    return global._dashboardActivePromise
  }

  global._dashboardActivePromise = computeMetrics().finally(() => {
    global._dashboardActivePromise = null
  })

  return global._dashboardActivePromise
}

/**
 * Invalidate cached metrics and trigger instant re-aggregation & SSE broadcast.
 * Called automatically when tickets, permits, or RMA claims are added/modified/deleted.
 */
export async function invalidateDashboardMetrics(broadcast = true): Promise<DashboardMetrics> {
  global._dashboardIsCacheDirty = true
  const freshMetrics = await computeMetrics()

  if (broadcast) {
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      metrics: freshMetrics,
      summary: freshMetrics.summary,
      kpi: freshMetrics.kpi,
      workStatus: freshMetrics.workStatus,
      timestamp: new Date().toISOString(),
    })
  }

  return freshMetrics
}

// Subscribe to mutation events for automatic zero-delay cache synchronization
realtimeEmitter.on(REALTIME_EVENTS.TICKETS_CHANGED, () => {
  invalidateDashboardMetrics(true).catch((err) =>
    console.error("[DashboardService] Invalidation on tickets change failed:", err)
  )
})

realtimeEmitter.on(REALTIME_EVENTS.RMA_CHANGED, () => {
  invalidateDashboardMetrics(true).catch((err) =>
    console.error("[DashboardService] Invalidation on RMA change failed:", err)
  )
})
