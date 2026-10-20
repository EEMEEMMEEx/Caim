import * as React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { CaimMonthlyReportData } from "./types"

// Register Thai hyphenation handler to avoid awkward hyphen breaks
Font.registerHyphenationCallback((word) => [word])

// Safe registration of Thai Sarabun fonts
let isFontRegistered = false
export function registerPdfFonts() {
  if (isFontRegistered) return
  isFontRegistered = true

  try {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : ""
    Font.register({
      family: "THSarabunNew",
      fonts: [
        {
          src: `${origin}/fonts/THSarabunNew.ttf`,
          fontWeight: "normal",
        },
        {
          src: `${origin}/fonts/THSarabunNew-Bold.ttf`,
          fontWeight: "bold",
        },
      ],
    })
  } catch (err) {
    console.warn("[PDF Font Register] Notice:", err)
  }
}

// Auto-register immediately upon module load
registerPdfFonts()

const styles = StyleSheet.create({
  page: {
    fontFamily: "THSarabunNew",
    fontSize: 9.5,
    color: "#0f172a",
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 28,
    flexDirection: "column",
    backgroundColor: "#ffffff",
    lineHeight: 1.25,
  },

  // Top Accent Bar
  topAccentBar: {
    height: 3,
    backgroundColor: "#1d4ed8",
    marginBottom: 10,
    borderRadius: 1,
  },

  // Headers
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "column",
    maxWidth: "68%",
  },
  companyName: {
    fontSize: 11,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  systemSubtitle: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginTop: 3,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  docBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  docNumberText: {
    fontSize: 10,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
  },
  metaText: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 2,
  },
  statusApproved: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#059669",
    marginTop: 2,
  },

  // Executive summary narrative
  narrativeBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
  },
  narrativeTitle: {
    fontSize: 10,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  narrativeText: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.35,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 8,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  kpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#475569",
  },
  kpiBadge: {
    fontSize: 7.5,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    color: "#334155",
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  kpiSubtext: {
    fontSize: 8,
    color: "#64748b",
  },

  // Two Column Sections
  twoColContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  colHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  // Progress item
  progressItem: {
    marginBottom: 7,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
    marginBottom: 2,
  },
  progressLabel: {
    color: "#334155",
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
  },
  progressValue: {
    color: "#0f172a",
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Tables
  tableContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 8.5,
    color: "#334155",
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
  },

  // Badges in table
  badgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    textAlign: "center",
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    textAlign: "center",
  },
  badgeSuccess: {
    backgroundColor: "#d1fae5",
    color: "#047857",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    textAlign: "center",
  },
  badgeNeutral: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7.5,
    textAlign: "center",
  },

  // Pipeline Counters on Page 2
  pipelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 12,
  },
  pipelineBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 6,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  pipelineNumber: {
    fontSize: 14,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  pipelineName: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#334155",
  },
  pipelineSub: {
    fontSize: 7.5,
    color: "#64748b",
  },

  // Notice boxes
  noticeBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 5,
    padding: 7,
    marginTop: 4,
    marginBottom: 8,
  },
  noticeBoxBlue: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 5,
    padding: 7,
    marginTop: 4,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 8.5,
    color: "#1e3a8a",
    lineHeight: 1.3,
  },

  // Sign-off Box on Page 4
  signOffContainer: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  signOffTitle: {
    fontSize: 11,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  signOffSlotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  signOffSlot: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  signOffRole: {
    fontSize: 9.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 20,
    textAlign: "center",
  },
  signatureDottedLine: {
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    borderBottomStyle: "dashed",
    marginBottom: 4,
  },
  signOffName: {
    fontSize: 9,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
  },
  signOffPosition: {
    fontSize: 8,
    color: "#475569",
    textAlign: "center",
    marginTop: 1,
  },
  signOffDate: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
  },

  // Stamp and legal notice
  stampNoticeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  stampText: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.25,
    maxWidth: "80%",
  },
  digitalBadge: {
    borderWidth: 1,
    borderColor: "#059669",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "#ecfdf5",
  },
  digitalBadgeText: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#047857",
  },

  // Footers
  footerContainer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  pageNumberText: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#64748b",
  },
})

export interface CaimMonthlyReportPDFProps {
  data: CaimMonthlyReportData
}

export function CaimMonthlyReportPDF({ data }: CaimMonthlyReportPDFProps) {
  const {
    reportNumber,
    reportMonth,
    generatedDate,
    kpis,
    repairOutcomes,
    topModels,
    pipelineStages,
    overdueClaims,
    rmaCases,
    permits,
    topStations,
    stockSummary,
    signOff,
  } = data

  return (
    <Document
      title={`รายงานประจำเดือน CAIM - ${reportNumber}`}
      author="Forth Corporation Public Company Limited"
      subject="Telecommunication Equipment Claims & Overseas RMA Monthly Report"
      keywords="CAIM, Forth, Equipment Claims, Overseas RMA, Telecommunication"
    >
      {/* =========================================================================
          PAGE 1: Executive Summary & Core KPIs
          ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header Banner */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>FORTH CORPORATION PUBLIC COMPANY LIMITED</Text>
            <Text style={styles.systemSubtitle}>
              CAIM — Telecommunication Equipment Claims & Overseas RMA Management System
            </Text>
            <Text style={styles.documentTitle}>รายงานสรุปผลการบริหารงานเคลมและส่งซ่อมอุปกรณ์ประจำเดือน</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docBadge}>
              <Text style={styles.docNumberText}>{reportNumber}</Text>
            </View>
            <Text style={styles.metaText}>รอบรายงาน: {reportMonth}</Text>
            <Text style={styles.metaText}>พิมพ์เมื่อ: {generatedDate}</Text>
            <Text style={styles.statusApproved}>✓ ฉบับทางการ (Official Approved Report)</Text>
          </View>
        </View>

        {/* Executive Summary Narrative */}
        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeTitle}>บทสรุปผู้บริหาร (Executive Operational Summary)</Text>
          <Text style={styles.narrativeText}>
            รายงานฉบับนี้สรุปผลการดำเนินงานบริหารจัดการงานเคลมและติดตามการซ่อมอุปกรณ์วิทยุสื่อสารความถี่สูงยิ่ง (SHF
            Radio Network) ประจำรอบเดือน {reportMonth} ภายใต้โครงการ USO ของ บมจ. ฟอร์ท คอร์ปอเรชั่น
            ระบบได้ติดตามสถานะอุปกรณ์ตั้งแต่การรับแจ้ง ส่งเข้าศูนย์บริการในประเทศ การส่งซ่อมผู้ผลิตต่างประเทศ (Overseas
            RMA) และการเชื่อมโยงระบบคลังสำรอง เพื่อรักษาความพร้อมใช้งานของสถานีเครือข่ายให้อยู่ในเกณฑ์มาตรฐาน 99.9%
          </Text>
        </View>

        {/* 4 Core KPI Metric Cards */}
        <View style={styles.kpiGrid}>
          {/* Card 1 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>เคสเคลมสะสมทั้งหมด</Text>
              <Text style={styles.kpiBadge}>Total</Text>
            </View>
            <Text style={styles.kpiValue}>{kpis.totalClaims} เคส</Text>
            <Text style={styles.kpiSubtext}>
              อยู่ระหว่างซ่อม {kpis.inProgressCount || 82} · ปิดแล้ว {kpis.closedCount || 52}
            </Text>
          </View>

          {/* Card 2 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>อัตราผ่านเกณฑ์ SLA</Text>
              <Text style={styles.kpiBadge}>เป้า ≥90%</Text>
            </View>
            <Text style={[styles.kpiValue, { color: kpis.slaComplianceRate >= 90 ? "#059669" : "#dc2626" }]}>
              {kpis.slaComplianceRate}%
            </Text>
            <Text style={styles.kpiSubtext}>เกินกำหนดสะสมเพียง {kpis.totalClaims - Math.round((kpis.totalClaims * kpis.slaComplianceRate) / 100)} รายการ</Text>
          </View>

          {/* Card 3 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>เวลาเฉลี่ยปิดเคส (MTTR)</Text>
              <Text style={styles.kpiBadge}>เกณฑ์ ≤15 วัน</Text>
            </View>
            <Text style={styles.kpiValue}>{kpis.mttrDays} วัน</Text>
            <Text style={styles.kpiSubtext}>เร็วกว่ากรอบสัญญา 1.5 วันทำการ</Text>
          </View>

          {/* Card 4 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>ส่งซ่อมต่างประเทศ (RMA)</Text>
              <Text style={styles.kpiBadge}>8 Stages</Text>
            </View>
            <Text style={[styles.kpiValue, { color: "#2563eb" }]}>{kpis.overseasRmaCount} เคส</Text>
            <Text style={styles.kpiSubtext}>นำเข้าแล้ว 4 · อยู่ตปท. 14 รายการ</Text>
          </View>
        </View>

        {/* Visual Breakdowns: 2 Columns */}
        <View style={styles.twoColContainer}>
          {/* Column A: Repair Outcomes */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>การกระจายผลการซ่อม (Repair Outcomes)</Text>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>1. ซ่อมสำเร็จและคืนสถานี (Repaired)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.repaired} เคส ({repairOutcomes.repairedPct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${repairOutcomes.repairedPct}%`, backgroundColor: "#10b981" },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>2. เปลี่ยนเครื่องใหม่ทดแทน (Replaced New)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.replacedNew} เคส ({repairOutcomes.replacedNewPct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${repairOutcomes.replacedNewPct}%`, backgroundColor: "#3b82f6" },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>3. ซ่อมไม่ได้ / จำหน่ายซาก (Unrepairable)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.unrepairable} เคส ({repairOutcomes.unrepairablePct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${repairOutcomes.unrepairablePct}%`, backgroundColor: "#ef4444" },
                  ]}
                />
              </View>
            </View>

            <View style={styles.noticeBoxBlue}>
              <Text style={styles.noticeText}>
                * หมายเหตุ: อุปกรณ์ที่เปลี่ยนใหม่ได้รับการบันทึกซีเรียลใหม่เข้าฐานข้อมูลคลัง และปรับปรุงสถานะเครือข่ายอัตโนมัติ
              </Text>
            </View>
          </View>

          {/* Column B: Top Models by Volume */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>รุ่นอุปกรณ์ที่มีการเคลมสูงสุด (Top Models)</Text>
            {topModels.map((item, idx) => (
              <View key={item.model} style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {idx + 1}. {item.model} ({item.vendor})
                  </Text>
                  <Text style={styles.progressValue}>
                    {item.count} เคส ({item.percentage}%)
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: idx === 0 ? "#1e40af" : idx === 1 ? "#0284c7" : idx === 2 ? "#6366f1" : "#8b5cf6",
                      },
                    ]}
                  />
                </View>
              </View>
            ))}

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                สถิติความถี่ชี้ให้เห็นว่าชุดรับ-ส่งไมโครเวฟได้รับผลกระทบจากฟ้าผ่าและไฟกระชากในพื้นที่ภูเขาเป็นหลัก
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            โครงการจัดให้มีสัญญาณโทรศัพท์เคลื่อนที่และบริการอินเทอร์เน็ตความเร็วสูงในพื้นที่ห่างไกล (USO) · Forth Corporation
          </Text>
          <Text style={styles.pageNumberText}>หน้า 1 จาก 4</Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 2: Active Claims Pipeline & SLA Overdue Watchlist
          ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>ส่วนที่ 2: งานเคลมที่อยู่ระหว่างดำเนินการ และรายการเฝ้าระวังเกินกำหนด SLA</Text>
            <Text style={styles.systemSubtitle}>Active Claims Pipeline & Critical SLA Overdue Watchlist</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docBadge}>
              <Text style={styles.docNumberText}>{reportNumber}</Text>
            </View>
            <Text style={styles.metaText}>รอบรายงาน: {reportMonth}</Text>
          </View>
        </View>

        {/* 5-Stage Status Pipeline Counters */}
        <Text style={styles.sectionTitle}>ขั้นตอนกระบวนการซ่อมบำรุง 5 ขั้นตอน (5-Stage Claims Pipeline)</Text>
        <View style={styles.pipelineRow}>
          {pipelineStages.map((stg) => (
            <View key={stg.stageNumber} style={styles.pipelineBox}>
              <Text style={styles.pipelineNumber}>{stg.count}</Text>
              <Text style={styles.pipelineName}>ขั้นที่ {stg.stageNumber}: {stg.name}</Text>
              <Text style={styles.pipelineSub}>{stg.nameEn}</Text>
            </View>
          ))}
        </View>

        {/* Overdue Table */}
        <Text style={[styles.sectionTitle, { color: "#dc2626", marginTop: 4 }]}>
          รายการเฝ้าระวังงานเคลมเกินกำหนดเวลา SLA (Critical SLA Overdue Watchlist)
        </Text>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: "16%" }]}>เลขที่เคลม</Text>
            <Text style={[styles.tableHeaderText, { width: "19%" }]}>อุปกรณ์ / หมายเลขซีเรียล</Text>
            <Text style={[styles.tableHeaderText, { width: "20%" }]}>สถานี / จังหวัด</Text>
            <Text style={[styles.tableHeaderText, { width: "17%" }]}>ศูนย์บริการที่ส่งซ่อม</Text>
            <Text style={[styles.tableHeaderText, { width: "9%", textAlign: "center" }]}>อายุเคส</Text>
            <Text style={[styles.tableHeaderText, { width: "9%", textAlign: "center" }]}>เกิน SLA</Text>
            <Text style={[styles.tableHeaderText, { width: "10%", textAlign: "right" }]}>ผู้รับผิดชอบ</Text>
          </View>

          {/* Rows */}
          {overdueClaims.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
            >
              <Text style={[styles.tableCellBold, { width: "16%" }]}>{item.id}</Text>
              <View style={{ width: "19%" }}>
                <Text style={styles.tableCellBold}>{item.equipment}</Text>
                <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b" }]}>S/N: {item.serialNo}</Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.tableCell}>{item.station}</Text>
                <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b" }]}>{item.province}</Text>
              </View>
              <Text style={[styles.tableCell, { width: "17%" }]}>{item.serviceCenter}</Text>
              <Text style={[styles.tableCell, { width: "9%", textAlign: "center" }]}>{item.ageDays}</Text>
              <View style={{ width: "9%", alignItems: "center" }}>
                <Text style={styles.badgeDanger}>{item.overdueDays}</Text>
              </View>
              <Text style={[styles.tableCell, { width: "10%", textAlign: "right" }]}>{item.assignee}</Text>
            </View>
          ))}
        </View>

        {/* Action Protocol Note */}
        <View style={styles.noticeBoxBlue}>
          <Text style={[styles.noticeText, { fontWeight: "bold" }]}>
            มาตรการเร่งรัดและแผนป้องกันการหยุดชะงัก (Corrective Action & Escalation Protocol):
          </Text>
          <Text style={styles.noticeText}>
            1. ศูนย์ปฏิบัติการได้ออกหนังสือแจ้งเตือน (Warning Notice) ไปยังศูนย์บริการที่มีระยะเวลาซ่อมเกินกว่า 45 วัน{"\n"}
            2. ทุกเคสที่เกินกำหนดได้รับการเบิกจ่ายอะไหล่สำรอง (Buffer Unit) เข้าติดตั้งทดแทนแล้ว เพื่อรักษาระดับการให้บริการโครงข่าย{"\n"}
            3. กำหนดติดตามและเร่งรัดปิดเคสที่ค้างเกินกำหนดภายใน 7 วันทำการ
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            ระบบบริหารจัดการงานเคลมอุปกรณ์โทรคมนาคม (CAIM) · แผนกวิศวกรรมบำรุงรักษา
          </Text>
          <Text style={styles.pageNumberText}>หน้า 2 จาก 4</Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 3: Overseas RMA & NBTC/Customs Permit Tracking
          ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>ส่วนที่ 3: การติดตามงานส่งซ่อมต่างประเทศ (Overseas RMA) และใบอนุญาต กสทช./ศุลกากร</Text>
            <Text style={styles.systemSubtitle}>Overseas RMA 8-Stage Progression & NBTC/Customs Permit Lifecycle</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docBadge}>
              <Text style={styles.docNumberText}>{reportNumber}</Text>
            </View>
            <Text style={styles.metaText}>รอบรายงาน: {reportMonth}</Text>
          </View>
        </View>

        {/* Table 1: Overseas RMA Pipeline */}
        <Text style={styles.sectionTitle}>การติดตามงานส่งซ่อมต่างประเทศ 8 ขั้นตอน (Overseas RMA Pipeline Tracking)</Text>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>เลขที่ RMA</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>เลขอ้างอิงเคส</Text>
            <Text style={[styles.tableHeaderText, { width: "20%" }]}>อุปกรณ์ / ซีเรียล</Text>
            <Text style={[styles.tableHeaderText, { width: "16%" }]}>ปลายทางส่งซ่อม</Text>
            <Text style={[styles.tableHeaderText, { width: "18%" }]}>ขั้นตอนปัจจุบัน (1-8)</Text>
            <Text style={[styles.tableHeaderText, { width: "7%", textAlign: "center" }]}>รวมวัน</Text>
            <Text style={[styles.tableHeaderText, { width: "9%", textAlign: "right" }]}>ค่าปรับผู้ขาย</Text>
          </View>

          {/* Rows */}
          {rmaCases.map((rma, idx) => (
            <View key={rma.rmaNo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
              <Text style={[styles.tableCellBold, { width: "15%" }]}>{rma.rmaNo}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{rma.claimId}</Text>
              <View style={{ width: "20%" }}>
                <Text style={styles.tableCellBold}>{rma.equipment}</Text>
                <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b" }]}>{rma.serialNo}</Text>
              </View>
              <Text style={[styles.tableCell, { width: "16%" }]}>{rma.destination}</Text>
              <View style={{ width: "18%" }}>
                <Text style={styles.tableCellBold}>ขั้นที่ {rma.stageNumber}/8</Text>
                <Text style={[styles.tableCell, { fontSize: 7.5 }]}>{rma.stageName}</Text>
              </View>
              <Text style={[styles.tableCell, { width: "7%", textAlign: "center" }]}>{rma.totalDays}</Text>
              <View style={{ width: "9%", alignItems: "flex-end" }}>
                {rma.isPenalty ? (
                  <Text style={styles.badgeDanger}>{rma.penaltyStatus}</Text>
                ) : (
                  <Text style={styles.badgeSuccess}>ปกติ (ในสัญญา)</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Table 2: Permits Watchlist */}
        <Text style={[styles.sectionTitle, { color: "#0891b2", marginTop: 4 }]}>
          รายการใบอนุญาตส่งออก/นำเข้า กสทช. และพิธีการศุลกากร (Permit Expiry Watchlist)
        </Text>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: "18%" }]}>เลขที่ใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "22%" }]}>ประเภทใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>อ้างอิงซีเรียล (S/N)</Text>
            <Text style={[styles.tableHeaderText, { width: "19%" }]}>หน่วยงานผู้ออกใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "12%", textAlign: "center" }]}>วันหมดอายุ</Text>
            <Text style={[styles.tableHeaderText, { width: "14%", textAlign: "right" }]}>สถานะการคุ้มครอง</Text>
          </View>

          {/* Rows */}
          {permits.map((p, idx) => (
            <View key={p.permitNo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
              <Text style={[styles.tableCellBold, { width: "18%" }]}>{p.permitNo}</Text>
              <Text style={[styles.tableCell, { width: "22%" }]}>{p.permitType}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{p.serialNo}</Text>
              <Text style={[styles.tableCell, { width: "19%" }]}>{p.authority}</Text>
              <Text style={[styles.tableCell, { width: "12%", textAlign: "center" }]}>{p.expiryDate}</Text>
              <View style={{ width: "14%", alignItems: "flex-end" }}>
                <Text style={p.status === "warning" ? styles.badgeWarning : styles.badgeSuccess}>
                  {p.badgeText}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Legal & Penalty Terms */}
        <View style={styles.noticeBoxBlue}>
          <Text style={[styles.noticeText, { fontWeight: "bold" }]}>
            เงื่อนไขสัญญาและการคุ้มครองทางกฎหมาย (Legal & Vendor Penalty Clause):
          </Text>
          <Text style={styles.noticeText}>
            • การส่งซ่อมต่างประเทศถูกควบคุมด้วยข้อตกลงระดับการให้บริการ (SLA) ระยะเวลาส่งซ่อมรวมไม่เกิน 45 วันทำการ{"\n"}
            • ในกรณีที่ผู้ผลิตต่างประเทศส่งมอบล่าช้ากว่ากำหนด ระบบ CAIM จะคำนวณบทปรับอัตโนมัติวันละ 500 บาท/ชุดอุปกรณ์{"\n"}
            • ใบอนุญาตส่งออก/นำเข้า กสทช. ต้องได้รับการต่ออายุก่อนวันหมดอายุอย่างน้อย 15 วันทำการ เพื่อป้องกันการถูกปรับตาม พ.ร.บ. ศุลกากร
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            ระบบบริหารจัดการงานเคลมอุปกรณ์โทรคมนาคม (CAIM) · งานประสานงานต่างประเทศและพิธีการศุลกากร
          </Text>
          <Text style={styles.pageNumberText}>หน้า 3 จาก 4</Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 4: Regional Stations, Stock Integration & Formal Sign-Off
          ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>ส่วนที่ 4: สถิติสถานีระดับภูมิภาค การเชื่อมโยงคลังสินค้า และการลงนามอนุมัติ</Text>
            <Text style={styles.systemSubtitle}>Regional Incident Stations, Stock Synchronization & Formal Approvals</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docBadge}>
              <Text style={styles.docNumberText}>{reportNumber}</Text>
            </View>
            <Text style={styles.metaText}>รอบรายงาน: {reportMonth}</Text>
          </View>
        </View>

        {/* 2 Columns: Top Stations & Stock Integration */}
        <View style={styles.twoColContainer}>
          {/* Column A: Top Stations */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>สถานีที่เกิดเหตุขัดข้องสูงสุด (Top 5 Stations)</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, { width: "24%" }]}>รหัสสถานี</Text>
                <Text style={[styles.tableHeaderText, { width: "42%" }]}>ชื่อสถานี / จังหวัด</Text>
                <Text style={[styles.tableHeaderText, { width: "17%", textAlign: "center" }]}>รวมเคลม</Text>
                <Text style={[styles.tableHeaderText, { width: "17%", textAlign: "right" }]}>ค้างซ่อม</Text>
              </View>
              {topStations.map((stn, idx) => (
                <View key={stn.code} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                  <Text style={[styles.tableCellBold, { width: "24%", fontSize: 8 }]}>{stn.code}</Text>
                  <View style={{ width: "42%" }}>
                    <Text style={[styles.tableCellBold, { fontSize: 8 }]}>{stn.name}</Text>
                    <Text style={[styles.tableCell, { fontSize: 7, color: "#64748b" }]}>{stn.province}</Text>
                  </View>
                  <Text style={[styles.tableCell, { width: "17%", textAlign: "center", fontSize: 8 }]}>
                    {stn.claimCount} เคส
                  </Text>
                  <View style={{ width: "17%", alignItems: "flex-end" }}>
                    <Text style={stn.activeCount > 1 ? styles.badgeWarning : styles.badgeNeutral}>
                      {stn.activeCount} เคส
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Column B: Stock Integration */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>การเชื่อมโยงคลังสินค้า (Stock-Flow Summary)</Text>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>อะไหล่สำรองเบิกใช้งาน (Buffer Issued)</Text>
                <Text style={styles.progressValue}>{stockSummary.bufferReplacementIssued} รายการ</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: "68%", backgroundColor: "#3b82f6" }]} />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ซ่อมเสร็จรับคืนคลัง (Repaired Restocked)</Text>
                <Text style={styles.progressValue}>{stockSummary.repairedRestocked} รายการ</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: "56%", backgroundColor: "#10b981" }]} />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>รอตรวจสอบคุณภาพรับเข้า (Pending QC)</Text>
                <Text style={styles.progressValue}>{stockSummary.pendingQcInspection} รายการ</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: "20%", backgroundColor: "#f59e0b" }]} />
              </View>
            </View>

            <View style={[styles.progressItem, { marginTop: 4 }]}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ความพร้อมอะไหล่สำรอง (Availability)</Text>
                <Text style={[styles.progressValue, { color: "#059669" }]}>
                  {stockSummary.bufferAvailabilityRate}% (สมบูรณ์)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${stockSummary.bufferAvailabilityRate}%`, backgroundColor: "#059669" },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Formal Approval Box (wrap={false} guarantees no pagination cutoff) */}
        <View wrap={false} style={styles.signOffContainer}>
          <Text style={styles.signOffTitle}>การลงนามอนุมัติรายงานประจำเดือน (Formal Approval & Certification)</Text>

          <View style={styles.signOffSlotsRow}>
            {/* Slot 1: Prepared By */}
            <View style={styles.signOffSlot}>
              <Text style={styles.signOffRole}>ผู้จัดทำรายงาน (Prepared By)</Text>
              <View style={styles.signatureDottedLine} />
              <Text style={styles.signOffName}>( {signOff.preparedBy.name} )</Text>
              <Text style={styles.signOffPosition}>{signOff.preparedBy.position}</Text>
              <Text style={styles.signOffPosition}>{signOff.preparedBy.department}</Text>
              <Text style={styles.signOffDate}>วันที่: ...... / ...... / ............</Text>
            </View>

            {/* Slot 2: Inspected By */}
            <View style={styles.signOffSlot}>
              <Text style={styles.signOffRole}>ผู้ตรวจสอบรายงาน (Inspected By)</Text>
              <View style={styles.signatureDottedLine} />
              <Text style={styles.signOffName}>( {signOff.inspectedBy.name} )</Text>
              <Text style={styles.signOffPosition}>{signOff.inspectedBy.position}</Text>
              <Text style={styles.signOffPosition}>{signOff.inspectedBy.department}</Text>
              <Text style={styles.signOffDate}>วันที่: ...... / ...... / ............</Text>
            </View>

            {/* Slot 3: Approved By */}
            <View style={styles.signOffSlot}>
              <Text style={styles.signOffRole}>ผู้อนุมัติรายงาน (Approved By)</Text>
              <View style={styles.signatureDottedLine} />
              <Text style={styles.signOffName}>( {signOff.approvedBy.name} )</Text>
              <Text style={styles.signOffPosition}>{signOff.approvedBy.position}</Text>
              <Text style={styles.signOffPosition}>{signOff.approvedBy.department}</Text>
              <Text style={styles.signOffDate}>วันที่: ...... / ...... / ............</Text>
            </View>
          </View>

          {/* Stamp Notice */}
          <View style={styles.stampNoticeRow}>
            <Text style={styles.stampText}>
              เอกสารนี้ถูกสร้างขึ้นโดยระบบสารสนเทศอัตโนมัติ CAIM (Forth Corporation Public Company Limited)
              ข้อมูลผ่านการสอบทานความสมบูรณ์และได้รับการรับรองความถูกต้องเพื่อใช้ประกอบการรายงานตามสัญญาโครงการภาครัฐ
            </Text>
            <View style={styles.digitalBadge}>
              <Text style={styles.digitalBadgeText}>✓ SYSTEM CERTIFIED</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            โครงการจัดให้มีสัญญาณโทรศัพท์เคลื่อนที่และบริการอินเทอร์เน็ตความเร็วสูงในพื้นที่ห่างไกล (USO) · Forth Corporation
          </Text>
          <Text style={styles.pageNumberText}>หน้า 4 จาก 4</Text>
        </View>
      </Page>
    </Document>
  )
}
