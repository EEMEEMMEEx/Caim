export interface ReportKpis {
  totalClaims: number
  slaComplianceRate: number // e.g. 94.8 (%)
  mttrDays: number // e.g. 13.5 (days)
  overseasRmaCount: number // e.g. 18 (cases)
  inProgressCount?: number
  closedCount?: number
}

export interface RepairOutcomesDistribution {
  repaired: number
  repairedPct: number
  replacedNew: number
  replacedNewPct: number
  unrepairable: number
  unrepairablePct: number
}

export interface TopClaimModel {
  model: string
  vendor: string
  deviceType: string
  count: number
  percentage: number
}

export interface PipelineStageSummary {
  stageNumber: number
  name: string
  nameEn: string
  count: number
  color: string
}

export interface OverdueClaimItem {
  id: string
  equipment: string
  serialNo: string
  station: string
  province: string
  serviceCenter: string
  ageDays: number | string
  overdueDays: number | string
  assignee: string
}

export interface RmaPipelineItem {
  rmaNo: string
  claimId: string
  equipment: string
  serialNo: string
  vendor: string
  destination: string
  stageNumber: number
  stageName: string
  totalDays: number | string
  penaltyDays?: number | string
  penaltyStatus: string
  isPenalty: boolean
}

export interface PermitWatchlistItem {
  permitNo: string
  permitType: string
  serialNo: string
  authority: string
  issueDate: string
  expiryDate: string
  remainingDays: number
  status: "active" | "warning" | "expired"
  badgeText: string
}

export interface TopStationIncident {
  code: string
  name: string
  province: string
  zone: string
  claimCount: number
  activeCount: number
}

export interface StockSyncSummary {
  bufferReplacementIssued: number
  repairedRestocked: number
  pendingQcInspection: number
  bufferAvailabilityRate: number // e.g. 96.5 (%)
}

export interface SignOffSlot {
  name: string
  position: string
  department: string
  date?: string
}

export interface SignOffBlock {
  preparedBy: SignOffSlot
  inspectedBy: SignOffSlot
  approvedBy: SignOffSlot
}

export interface CaimMonthlyReportData {
  reportNumber: string // e.g. "CAIM-RPT-2026-10"
  reportMonth: string // e.g. "ตุลาคม 2569"
  reportYear: string // e.g. "2569"
  generatedDate: string // e.g. "20 ต.ค. 2569 เวลา 11:00 น."
  kpis: ReportKpis
  repairOutcomes: RepairOutcomesDistribution
  topModels: TopClaimModel[]
  pipelineStages: PipelineStageSummary[]
  overdueClaims: OverdueClaimItem[]
  rmaCases: RmaPipelineItem[]
  permits: PermitWatchlistItem[]
  topStations: TopStationIncident[]
  stockSummary: StockSyncSummary
  signOff: SignOffBlock
}
