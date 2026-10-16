import { NextRequest, NextResponse } from "next/server"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

/**
 * GET /api/claims/overview
 * Real-time aggregated equipment claim metrics and KPI summary counters.
 * Guarantees zero caching latency with force-dynamic and NO_CACHE_HEADERS.
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh =
      searchParams.get("refresh") === "true" || searchParams.get("force") === "true"

    const metrics = await getPrecomputedDashboardMetrics({ forceRefresh })
    const responseTimeMs = Math.round((performance.now() - startTime) * 100) / 100

    return NextResponse.json(
      {
        success: true,
        metrics,
        summary: metrics.summary,
        kpi: metrics.kpi,
        workStatus: metrics.workStatus,
        serviceCenters: metrics.serviceCenters,
        bottlenecks: metrics.bottlenecks,
        weekly: metrics.weekly,
        ticketsCount: metrics.summary.total,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          ...NO_CACHE_HEADERS,
          "X-Response-Time": `${responseTimeMs}ms`,
        },
      }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to compute claims overview"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
