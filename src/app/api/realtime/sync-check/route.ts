import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { TransactionLogDocument } from "@/types/database"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const maxDuration = 10

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get("since")
  const nowIso = new Date().toISOString()

  let hasUpdates = false
  let latestTimestamp = nowIso
  let updates: Array<{
    id: string
    action: string
    targetType: string
    targetId: string
    timestamp: string
  }> = []

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const query: Record<string, unknown> = {}
        if (since) {
          query.timestamp = { $gt: since }
        }

        const logs = await db
          .collection<TransactionLogDocument>("transaction_logs")
          .find(query)
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray()

        if (logs.length > 0) {
          hasUpdates = true
          latestTimestamp = logs[0].timestamp
          updates = logs.map((log) => ({
            id: log.id,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            timestamp: log.timestamp,
          }))
        }
      }
    } catch (err) {
      console.warn("[sync-check] MongoDB log check failed:", err)
    }
  }

  return NextResponse.json(
    {
      success: true,
      serverTime: nowIso,
      hasUpdates,
      latestTimestamp,
      updates,
    },
    { headers: NO_CACHE_HEADERS }
  )
}
