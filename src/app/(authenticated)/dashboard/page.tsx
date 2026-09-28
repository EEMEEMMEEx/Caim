import type { Metadata } from "next"
import { DashboardView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/DashboardView"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"

export const metadata: Metadata = {
  title: "แดชบอร์ด · ระบบบริหารงานเคลมอุปกรณ์",
  description: "ภาพรวมงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร Forth Corporation",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  // Instant server-side hydration: pre-computed metrics rendered directly into initial HTML
  const initialMetrics = await getPrecomputedDashboardMetrics()

  return <DashboardView initialMetrics={initialMetrics} />
}
