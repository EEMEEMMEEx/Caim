import { calculateCaseDuration } from "@/lib/utils/caseDuration"

export interface TicketItem {
  id: string
  title: string
  problemDesc?: string
  vendor?: string
  model?: string
  serialNo?: string
  status?: string
  statusCode?: number
  date?: string
  ageDays?: string
  isOverdue?: boolean
  overdueText?: string
  station?: string
  province?: string
  district?: string
  subdistrict?: string
  createdAt?: string
}

export interface ServiceCenterStat {
  vendor: string
  totalCases: number
  atCenterNow: number
  avgDaysText: string
  maxDaysText: string
  overdueCount: number
}

export interface StageBottleneck {
  code: number
  name: string
  color: string
  completedText: string
  completedDays: number
  pendingCount: number
  pendingDays: number
  maxDays: number
}

export interface DashboardMetrics {
  summary: {
    total: number
    inProgress: number
    inProgressPct: number
    closed: number
    closedPct: number
    rejected: number
    rejectedPct: number
  }
  kpi: {
    pendingMedianDays: number
    pendingCount: number
    overdueCount: number
    overduePct: number
    closedOnTimeText: string
    closedMedianDays: number
    closedCount: number
  }
  workStatus: Array<{
    code: number
    name: string
    color: string
    count: number
    pct: number
    isClosedGroup?: boolean
  }>
  weekly: {
    thisWeekCount: number
    lastWeekCount: number
    trendPct: number
    isPositiveTrend: boolean
    daysBreakdown: Array<{ day: string; count: number }>
    boxReceived: number
    boxRepaired: number
    boxClosed: number
  }
  bottlenecks: StageBottleneck[]
  serviceCenters: ServiceCenterStat[]
  lastCalculated: string
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) {
    return sorted[mid]
  }
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

export function calculateDashboardMetrics(tickets: TicketItem[]): DashboardMetrics {
  const total = tickets.length

  // Filter groups
  const inProgressTickets = tickets.filter(
    (t) => (t.statusCode ?? 1) >= 1 && (t.statusCode ?? 1) <= 4
  )
  const closedTickets = tickets.filter((t) => t.statusCode === 5)
  const rejectedTickets = tickets.filter((t) => t.statusCode === 6)

  const inProgress = inProgressTickets.length
  const closed = closedTickets.length
  const rejected = rejectedTickets.length

  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0
  const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0
  const rejectedPct = total > 0 ? Math.round((rejected / total) * 100) : 0

  // 2. Performance KPIs
  const pendingAges = inProgressTickets.map((t) => calculateCaseDuration(t).days)
  const pendingMedianDays = median(pendingAges)

  const overdueTickets = inProgressTickets.filter((t) => calculateCaseDuration(t).isOverdue)
  const overdueCount = overdueTickets.length
  const overduePct = inProgress > 0 ? Math.round((overdueCount / inProgress) * 100) : 0

  const closedAges = closedTickets.map((t) => calculateCaseDuration(t).days)
  const closedMedianDays = median(closedAges)
  const closedOnTimeCount = closedTickets.filter((t) => !calculateCaseDuration(t).isOverdue).length

  // 3. Work Status Breakdown
  const statusCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const t of tickets) {
    const code = t.statusCode ?? 1
    if (statusCounts[code] !== undefined) {
      statusCounts[code]++
    }
  }

  const workStatus = [
    {
      code: 1,
      name: "รับแจ้ง/รอตรวจสภาพ",
      color: "#0d9488",
      count: statusCounts[1],
      pct: total > 0 ? Math.round((statusCounts[1] / total) * 100) : 0,
    },
    {
      code: 2,
      name: "ส่งศูนย์บริการแล้ว",
      color: "#7c3aed",
      count: statusCounts[2],
      pct: total > 0 ? Math.round((statusCounts[2] / total) * 100) : 0,
    },
    {
      code: 3,
      name: "รออะไหล่/กำลังซ่อม",
      color: "#d97706",
      count: statusCounts[3],
      pct: total > 0 ? Math.round((statusCounts[3] / total) * 100) : 0,
    },
    {
      code: 4,
      name: "ซ่อมเสร็จ/รอส่งมอบ",
      color: "#2563eb",
      count: statusCounts[4],
      pct: total > 0 ? Math.round((statusCounts[4] / total) * 100) : 0,
    },
    {
      code: 5,
      name: "ปิดเคส (รับคืนเรียบร้อย)",
      color: "#16a34a",
      count: statusCounts[5],
      pct: total > 0 ? Math.round((statusCounts[5] / total) * 100) : 0,
      isClosedGroup: true,
    },
    {
      code: 6,
      name: "ปฏิเสธเคลม (นอกเงื่อนไข)",
      color: "#db2777",
      count: statusCounts[6],
      pct: total > 0 ? Math.round((statusCounts[6] / total) * 100) : 0,
      isClosedGroup: true,
    },
  ]

  // 4. Weekly Overview (Last 7 days vs previous 7 days)
  let thisWeekCount = 0
  let lastWeekCount = 0
  let boxReceived = 0
  let boxRepaired = 0
  let boxClosed = 0

  for (const t of tickets) {
    const age = calculateCaseDuration(t).days
    if (age <= 7) {
      thisWeekCount++
      if (t.statusCode === 1) boxReceived++
      if (t.statusCode === 4) boxRepaired++
      if (t.statusCode === 5) boxClosed++
    } else if (age <= 14) {
      lastWeekCount++
    }
  }

  const trendDiff = thisWeekCount - lastWeekCount
  const trendPct = lastWeekCount > 0 ? Math.round((trendDiff / lastWeekCount) * 100) : thisWeekCount > 0 ? 100 : 0
  const isPositiveTrend = trendDiff >= 0

  const thaiDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
  const todayIdx = new Date().getDay()
  const daysBreakdown = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (todayIdx - 6 + i + 7) % 7
    return {
      day: thaiDays[dayIdx],
      count: Math.max(0, Math.floor(thisWeekCount / 7)),
    }
  })

  // 5. Bottlenecks (Stages 1-4)
  const bottlenecks: StageBottleneck[] = [
    {
      code: 1,
      name: "รับแจ้ง/รอตรวจสภาพ",
      color: "#0d9488",
      completedText: `1 วัน n=${tickets.filter((t) => (t.statusCode ?? 1) > 1).length}`,
      completedDays: 1,
      pendingCount: statusCounts[1],
      pendingDays: statusCounts[1] > 0 ? median(tickets.filter((t) => t.statusCode === 1).map((t) => calculateCaseDuration(t).days)) : 0,
      maxDays: statusCounts[1] > 0 ? Math.max(...tickets.filter((t) => t.statusCode === 1).map((t) => calculateCaseDuration(t).days), 0) : 0,
    },
    {
      code: 2,
      name: "ส่งศูนย์บริการแล้ว",
      color: "#7c3aed",
      completedText: `1 วัน n=${tickets.filter((t) => (t.statusCode ?? 1) > 2).length}`,
      completedDays: 1,
      pendingCount: statusCounts[2],
      pendingDays: statusCounts[2] > 0 ? median(tickets.filter((t) => t.statusCode === 2).map((t) => calculateCaseDuration(t).days)) : 0,
      maxDays: statusCounts[2] > 0 ? Math.max(...tickets.filter((t) => t.statusCode === 2).map((t) => calculateCaseDuration(t).days), 0) : 0,
    },
    {
      code: 3,
      name: "รออะไหล่/กำลังซ่อม",
      color: "#d97706",
      completedText: `0 วัน n=${tickets.filter((t) => (t.statusCode ?? 1) > 3).length}`,
      completedDays: 0,
      pendingCount: statusCounts[3],
      pendingDays: statusCounts[3] > 0 ? median(tickets.filter((t) => t.statusCode === 3).map((t) => calculateCaseDuration(t).days)) : 0,
      maxDays: statusCounts[3] > 0 ? Math.max(...tickets.filter((t) => t.statusCode === 3).map((t) => calculateCaseDuration(t).days), 0) : 0,
    },
    {
      code: 4,
      name: "ซ่อมเสร็จ/รอส่งมอบ",
      color: "#2563eb",
      completedText: `0 วัน n=${tickets.filter((t) => (t.statusCode ?? 1) > 4).length}`,
      completedDays: 0,
      pendingCount: statusCounts[4],
      pendingDays: statusCounts[4] > 0 ? median(tickets.filter((t) => t.statusCode === 4).map((t) => calculateCaseDuration(t).days)) : 0,
      maxDays: statusCounts[4] > 0 ? Math.max(...tickets.filter((t) => t.statusCode === 4).map((t) => calculateCaseDuration(t).days), 0) : 0,
    },
  ]

  // 6. Service Centers Statistics
  const vendorsMap: Record<string, TicketItem[]> = {}
  for (const t of tickets) {
    const v = t.vendor?.trim() || "ยังไม่ระบุศูนย์"
    if (!vendorsMap[v]) vendorsMap[v] = []
    vendorsMap[v].push(t)
  }

  const serviceCenters: ServiceCenterStat[] = Object.entries(vendorsMap).map(([vendor, list]) => {
    const atCenter = list.filter((t) => t.statusCode === 2 || t.statusCode === 3)
    const atCenterAges = atCenter.map((t) => calculateCaseDuration(t).days)
    const maxDay = atCenterAges.length > 0 ? Math.max(...atCenterAges) : 0
    const overdues = atCenter.filter((t) => calculateCaseDuration(t).isOverdue).length
    const medianDay = median(atCenterAges)

    return {
      vendor,
      totalCases: list.length,
      atCenterNow: atCenter.length,
      avgDaysText: atCenter.length > 0 ? `${medianDay} วัน n=${atCenter.length}` : "— ยังไม่เคยเข้าขั้นส่งศูนย์",
      maxDaysText: atCenter.length > 0 ? `${maxDay} วัน` : "—",
      overdueCount: overdues,
    }
  })

  // Ensure known vendors exist even if 0
  if (!serviceCenters.some((s) => s.vendor.toLowerCase() === "huawei")) {
    serviceCenters.unshift({
      vendor: "Huawei",
      totalCases: 0,
      atCenterNow: 0,
      avgDaysText: "— ยังไม่เคยเข้าขั้นส่งศูนย์",
      maxDaysText: "—",
      overdueCount: 0,
    })
  }

  return {
    summary: {
      total,
      inProgress,
      inProgressPct,
      closed,
      closedPct,
      rejected,
      rejectedPct,
    },
    kpi: {
      pendingMedianDays,
      pendingCount: inProgress,
      overdueCount,
      overduePct,
      closedOnTimeText: closed > 0 ? `${closedOnTimeCount} เคส` : "ยังไม่มีเคสในประเทศที่ปิดแล้ว",
      closedMedianDays,
      closedCount: closed,
    },
    workStatus,
    weekly: {
      thisWeekCount,
      lastWeekCount,
      trendPct,
      isPositiveTrend,
      daysBreakdown,
      boxReceived,
      boxRepaired,
      boxClosed,
    },
    bottlenecks,
    serviceCenters,
    lastCalculated: new Date().toISOString(),
  }
}
