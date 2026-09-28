import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
  TicketItem,
} from "./calculateMetrics"
import { getPersistentTickets } from "@/lib/storage/serverTicketStorage"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"

const SUMMARY_FILE = path.join(process.cwd(), "src/data/dashboard_summary.json")
const CACHE_TTL_MS = 30000 // 30 seconds TTL for background freshness

// In-Memory Fast Cache
let inMemoryMetrics: DashboardMetrics | null = null
let inMemoryTimestamp = 0
let isCacheDirty = false
let indexEnsured = false
let activeRecomputePromise: Promise<DashboardMetrics> | null = null

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
 * Load cached pre-computed summary from disk for instantaneous server cold-starts
 */
function loadDiskSummary(): DashboardMetrics | null {
  try {
    if (fs.existsSync(SUMMARY_FILE)) {
      const content = fs.readFileSync(SUMMARY_FILE, "utf-8")
      if (content) {
        const parsed = JSON.parse(content)
        if (parsed && parsed.summary && parsed.kpi) {
          return parsed as DashboardMetrics
        }
      }
    }
  } catch (err) {
    console.warn("[DashboardService] Failed to read disk summary:", err)
  }
  return null
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

  const freshMetrics = calculateDashboardMetrics(tickets)

  // Update in-memory cache and persistent stores
  inMemoryMetrics = freshMetrics
  inMemoryTimestamp = Date.now()
  isCacheDirty = false

  persistSummary(freshMetrics)

  return freshMetrics
}

/**
 * Main High-Performance Accessor: Returns pre-aggregated dashboard metrics in single-digit ms.
 * Handles instant memory cache hits, disk cache fallbacks, and non-blocking revalidation.
 */
export async function getPrecomputedDashboardMetrics(
  options: { forceRefresh?: boolean } = {}
): Promise<DashboardMetrics> {
  const now = Date.now()

  // 1. Fast Path: Return hot in-memory cache if fresh (< 30s) and not marked dirty
  if (!options.forceRefresh && inMemoryMetrics && !isCacheDirty && now - inMemoryTimestamp < CACHE_TTL_MS) {
    return inMemoryMetrics
  }

  // 2. Cold-start fallback: Load pre-aggregated summary from disk immediately if in-memory is empty
  if (!inMemoryMetrics && !options.forceRefresh) {
    const diskSummary = loadDiskSummary()
    if (diskSummary) {
      inMemoryMetrics = diskSummary
      inMemoryTimestamp = now
      // Recompute in background to refresh if needed
      computeMetrics().catch((err) => console.error("[DashboardService] BG compute error:", err))
      return diskSummary
    }
  }

  // 3. Deduplicate simultaneous compute calls
  if (activeRecomputePromise) {
    return activeRecomputePromise
  }

  activeRecomputePromise = computeMetrics().finally(() => {
    activeRecomputePromise = null
  })

  return activeRecomputePromise
}

/**
 * Invalidate cached metrics and trigger background re-aggregation & SSE broadcast.
 * Called automatically when tickets or RMA claims are added/modified/deleted.
 */
export async function invalidateDashboardMetrics(broadcast = true): Promise<DashboardMetrics> {
  isCacheDirty = true
  const freshMetrics = await computeMetrics()

  if (broadcast) {
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      metrics: freshMetrics,
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
