import { NextRequest, NextResponse } from "next/server"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"
import { NO_CACHE_HEADERS, METRICS_MICROCACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 3
export const maxDuration = 10

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh =
      searchParams.get("refresh") === "true" || searchParams.get("force") === "true"

    const metrics = await getPrecomputedDashboardMetrics({ forceRefresh })
    const responseTimeMs = Math.round((performance.now() - startTime) * 100) / 100

    const cacheHeaders = forceRefresh ? NO_CACHE_HEADERS : METRICS_MICROCACHE_HEADERS

    return NextResponse.json(
      {
        success: true,
        metrics,
        ticketsCount: metrics.summary.total,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          ...cacheHeaders,
          "X-Response-Time": `${responseTimeMs}ms`,
        },
      }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to compute dashboard metrics"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

