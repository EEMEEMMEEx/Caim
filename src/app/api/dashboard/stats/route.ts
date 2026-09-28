import { NextRequest, NextResponse } from "next/server"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    const metrics = await getPrecomputedDashboardMetrics({ forceRefresh })
    const responseTimeMs = Math.round((performance.now() - startTime) * 100) / 100

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
          "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
          "CDN-Cache-Control": "max-age=5, stale-while-revalidate=30",
          "Vercel-CDN-Cache-Control": "max-age=5, stale-while-revalidate=30",
          "X-Response-Time": `${responseTimeMs}ms`,
        },
      }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to compute dashboard metrics"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

