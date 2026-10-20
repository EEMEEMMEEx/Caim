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

let fontRegisterPromise: Promise<void> | null = null

/**
 * Robust Thai font registration for @react-pdf/renderer.
 * Uses client-side fetch + base64 data URI loader to ensure TTF binary is
 * fully parsed in-memory without truncation, vowel shifting, or race conditions.
 * Declares all font weights (normal, bold, 400, 700) to guarantee stable bounding boxes.
 */
export async function registerPdfFonts(): Promise<void> {
  if (fontRegisterPromise) return fontRegisterPromise

  fontRegisterPromise = (async () => {
    try {
      if (typeof window !== "undefined") {
        const origin = window.location.origin || ""
        const [regRes, boldRes] = await Promise.all([
          fetch(`${origin}/fonts/THSarabunNew.ttf`),
          fetch(`${origin}/fonts/THSarabunNew-Bold.ttf`),
        ])

        if (regRes.ok && boldRes.ok) {
          const [regBuffer, boldBuffer] = await Promise.all([
            regRes.arrayBuffer(),
            boldRes.arrayBuffer(),
          ])

          const toBase64 = (buffer: ArrayBuffer) => {
            let binary = ""
            const bytes = new Uint8Array(buffer)
            const len = bytes.byteLength
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            return window.btoa(binary)
          }

          const regBase64 = `data:font/ttf;base64,${toBase64(regBuffer)}`
          const boldBase64 = `data:font/ttf;base64,${toBase64(boldBuffer)}`

          Font.register({
            family: "THSarabunNew",
            fonts: [
              {
                src: regBase64,
                fontWeight: "normal",
                fontStyle: "normal",
              },
              {
                src: regBase64,
                fontWeight: 400,
                fontStyle: "normal",
              },
              {
                src: boldBase64,
                fontWeight: "bold",
                fontStyle: "normal",
              },
              {
                src: boldBase64,
                fontWeight: 700,
                fontStyle: "normal",
              },
            ],
          })
          return
        }
      }

      // Fallback for Node environment or direct relative loader
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
            fontStyle: "normal",
          },
          {
            src: `${origin}/fonts/THSarabunNew.ttf`,
            fontWeight: 400,
            fontStyle: "normal",
          },
          {
            src: `${origin}/fonts/THSarabunNew-Bold.ttf`,
            fontWeight: "bold",
            fontStyle: "normal",
          },
          {
            src: `${origin}/fonts/THSarabunNew-Bold.ttf`,
            fontWeight: 700,
            fontStyle: "normal",
          },
        ],
      })
    } catch (err) {
      console.warn("[PDF Font Register] Registration fallback notice:", err)
    }
  })()

  return fontRegisterPromise
}

// Initial synchronous registration as immediate fallback
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
        fontStyle: "normal",
      },
      {
        src: `${origin}/fonts/THSarabunNew.ttf`,
        fontWeight: 400,
        fontStyle: "normal",
      },
      {
        src: `${origin}/fonts/THSarabunNew-Bold.ttf`,
        fontWeight: "bold",
        fontStyle: "normal",
      },
      {
        src: `${origin}/fonts/THSarabunNew-Bold.ttf`,
        fontWeight: 700,
        fontStyle: "normal",
      },
    ],
  })
} catch {
  // Ignore initial synchronous register errors
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "THSarabunNew",
    fontSize: 9,
    color: "#0f172a",
    paddingTop: 22,
    paddingBottom: 40,
    paddingHorizontal: 28,
    flexDirection: "column",
    backgroundColor: "#ffffff",
    lineHeight: 1.3,
  },

  // Top Accent Bar
  topAccentBar: {
    height: 3,
    backgroundColor: "#1d4ed8",
    marginBottom: 8,
    borderRadius: 1,
  },

  // Headers
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 6,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "column",
    width: "64%",
  },
  companyName: {
    fontSize: 10.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.5,
    lineHeight: 1.25,
    marginBottom: 1,
  },
  systemSubtitle: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.25,
    marginBottom: 2,
  },
  documentTitle: {
    fontSize: 13.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    lineHeight: 1.25,
    marginTop: 3,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "36%",
  },
  docBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    alignItems: "center",
    marginBottom: 2,
  },
  docNumberText: {
    fontSize: 9.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.2,
  },
  metaText: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.25,
    marginTop: 1,
    textAlign: "right",
  },
  statusApproved: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#059669",
    lineHeight: 1.25,
    marginTop: 2,
    textAlign: "right",
  },

  // Executive summary narrative
  narrativeBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 7,
    marginBottom: 10,
  },
  narrativeTitle: {
    fontSize: 9.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
    lineHeight: 1.25,
  },
  narrativeText: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.35,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 7,
    minHeight: 74,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  kpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#475569",
    lineHeight: 1.2,
    flexShrink: 1,
    marginRight: 4,
  },
  kpiBadgeContainer: {
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiBadge: {
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#334155",
    lineHeight: 1.15,
  },
  kpiValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginVertical: 4,
  },
  kpiNumber: {
    fontSize: 18,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.1,
  },
  kpiUnit: {
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    color: "#64748b",
    lineHeight: 1.1,
  },
  kpiSubtextContainer: {
    flexDirection: "column",
  },
  kpiSubtext: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.25,
  },

  // Two Column Sections
  twoColContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  colHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 9,
    backgroundColor: "#ffffff",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    lineHeight: 1.3,
  },

  // Progress item
  progressItem: {
    marginBottom: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 8,
    marginBottom: 2,
  },
  progressLabel: {
    color: "#334155",
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.25,
    fontSize: 8,
  },
  progressValue: {
    color: "#0f172a",
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.25,
    fontSize: 8,
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
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#ffffff",
    lineHeight: 1.25,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    alignItems: "center",
    minHeight: 25,
  },
  tableRowEven: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    color: "#334155",
    lineHeight: 1.25,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.25,
  },

  // Badges in table
  badgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    paddingVertical: 2,
    paddingHorizontal: 4.5,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.25,
    textAlign: "center",
    minHeight: 15,
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    paddingVertical: 2,
    paddingHorizontal: 4.5,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.25,
    textAlign: "center",
    minHeight: 15,
  },
  badgeSuccess: {
    backgroundColor: "#d1fae5",
    color: "#047857",
    paddingVertical: 2,
    paddingHorizontal: 4.5,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.25,
    textAlign: "center",
    minHeight: 15,
  },
  badgeNeutral: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    paddingVertical: 2,
    paddingHorizontal: 4.5,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "THSarabunNew",
    lineHeight: 1.25,
    textAlign: "center",
    minHeight: 15,
  },

  // Pipeline Counters on Page 2
  pipelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 10,
  },
  pipelineBox: {
    flex: 1,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 6,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    backgroundColor: "#f8fafc",
  },
  pipelineNumberBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 2,
    marginBottom: 2,
  },
  pipelineNumber: {
    fontSize: 15,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    lineHeight: 1.2,
  },
  pipelineUnit: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    color: "#64748b",
    lineHeight: 1.2,
  },
  pipelineLabelBlock: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 2,
  },
  pipelineStageTag: {
    fontSize: 7,
    fontFamily: "THSarabunNew",
    color: "#64748b",
    lineHeight: 1.2,
  },
  pipelineName: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.25,
    textAlign: "center",
  },
  pipelineSubBlock: {
    alignItems: "center",
  },
  pipelineSub: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.2,
    textAlign: "center",
  },

  // Notice boxes
  noticeBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 5,
    padding: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  noticeBoxBlue: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 5,
    padding: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 8,
    color: "#1e3a8a",
    lineHeight: 1.3,
  },

  // Sign-off Box on Page 4
  signOffContainer: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 6,
    padding: 9,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  signOffTitle: {
    fontSize: 10,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    lineHeight: 1.25,
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
    fontSize: 8.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 18,
    textAlign: "center",
    lineHeight: 1.25,
  },
  signatureDottedLine: {
    width: "85%",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    borderBottomStyle: "dashed",
    marginBottom: 4,
  },
  signOffName: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 1.25,
  },
  signOffPosition: {
    fontSize: 7.5,
    color: "#475569",
    textAlign: "center",
    marginTop: 1,
    lineHeight: 1.25,
  },
  signOffDate: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 5,
    textAlign: "center",
    lineHeight: 1.25,
  },

  // Stamp and legal notice
  stampNoticeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  stampText: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.3,
    maxWidth: "80%",
  },
  digitalBadge: {
    borderWidth: 1,
    borderColor: "#059669",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: "#ecfdf5",
  },
  digitalBadgeText: {
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#047857",
    lineHeight: 1.25,
  },

  // Footers
  footerContainer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
    height: 18,
  },
  footerText: {
    fontSize: 7.5,
    color: "#94a3b8",
    lineHeight: 1.25,
  },
  pageNumberText: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#64748b",
    lineHeight: 1.25,
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
              <Text style={styles.kpiLabel}>เคสเคลมสะสม</Text>
              <View style={styles.kpiBadgeContainer}>
                <Text style={styles.kpiBadge}>Total</Text>
              </View>
            </View>
            <View style={styles.kpiValueContainer}>
              <Text style={styles.kpiNumber}>{kpis.totalClaims}</Text>
              <Text style={styles.kpiUnit}>เคส</Text>
            </View>
            <View style={styles.kpiSubtextContainer}>
              <Text style={styles.kpiSubtext}>
                อยู่ระหว่างซ่อม {kpis.inProgressCount ?? 0} · ปิดแล้ว {kpis.closedCount ?? 0}
              </Text>
            </View>
          </View>

          {/* Card 2 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>อัตราผ่าน SLA</Text>
              <View
                style={[
                  styles.kpiBadgeContainer,
                  { backgroundColor: kpis.slaComplianceRate >= 90 ? "#d1fae5" : "#fee2e2" },
                ]}
              >
                <Text
                  style={[
                    styles.kpiBadge,
                    { color: kpis.slaComplianceRate >= 90 ? "#047857" : "#b91c1c" },
                  ]}
                >
                  เป้า ≥90%
                </Text>
              </View>
            </View>
            <View style={styles.kpiValueContainer}>
              <Text
                style={[
                  styles.kpiNumber,
                  { color: kpis.slaComplianceRate >= 90 ? "#059669" : "#dc2626" },
                ]}
              >
                {kpis.slaComplianceRate}
              </Text>
              <Text style={styles.kpiUnit}>%</Text>
            </View>
            <View style={styles.kpiSubtextContainer}>
              <Text style={styles.kpiSubtext}>
                {overdueClaims.length > 0 ? `เกินกำหนดสะสม ${overdueClaims.length} รายการ` : "ผ่านเกณฑ์ 100% ไม่มีเคสค้าง"}
              </Text>
            </View>
          </View>

          {/* Card 3 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>เวลาเฉลี่ย MTTR</Text>
              <View style={styles.kpiBadgeContainer}>
                <Text style={styles.kpiBadge}>เกณฑ์ ≤15วัน</Text>
              </View>
            </View>
            <View style={styles.kpiValueContainer}>
              <Text style={styles.kpiNumber}>{kpis.mttrDays}</Text>
              <Text style={styles.kpiUnit}>วัน</Text>
            </View>
            <View style={styles.kpiSubtextContainer}>
              <Text style={styles.kpiSubtext}>
                {kpis.mttrDays > 0 ? `รอบระยะเวลาเฉลี่ยตามจริง` : `ยังไม่มีเคสปิดในรอบนี้`}
              </Text>
            </View>
          </View>

          {/* Card 4 */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>ส่งซ่อม ตปท. RMA</Text>
              <View style={styles.kpiBadgeContainer}>
                <Text style={styles.kpiBadge}>8 Stages</Text>
              </View>
            </View>
            <View style={styles.kpiValueContainer}>
              <Text style={[styles.kpiNumber, { color: "#2563eb" }]}>{kpis.overseasRmaCount}</Text>
              <Text style={styles.kpiUnit}>เคส</Text>
            </View>
            <View style={styles.kpiSubtextContainer}>
              <Text style={styles.kpiSubtext}>
                {kpis.overseasRmaCount > 0 ? `ติดตามในระบบรวม ${kpis.overseasRmaCount} รายการ` : `ไม่มีงานส่งซ่อมต่างประเทศ`}
              </Text>
            </View>
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
            {topModels.length === 0 ? (
              <Text style={[styles.tableCell, { color: "#64748b", paddingVertical: 10 }]}>
                ยังไม่มีรายการบันทึกอุปกรณ์เคลมในระบบ
              </Text>
            ) : (
              topModels.map((item, idx) => (
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
                          backgroundColor:
                            idx === 0
                              ? "#1e40af"
                              : idx === 1
                              ? "#0284c7"
                              : idx === 2
                              ? "#6366f1"
                              : "#8b5cf6",
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                สถิติความถี่คำนวณจากประวัติการรับแจ้งเคลมจริงในระบบ เพื่อใช้เป็นข้อมูลวางแผนสต็อกอะไหล่ทดแทน
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
              <View style={styles.pipelineNumberBlock}>
                <Text style={styles.pipelineNumber}>{stg.count}</Text>
                <Text style={styles.pipelineUnit}>เคส</Text>
              </View>
              <View style={styles.pipelineLabelBlock}>
                <Text style={styles.pipelineStageTag}>ขั้นที่ {stg.stageNumber}</Text>
                <Text style={styles.pipelineName}>{stg.name}</Text>
              </View>
              <View style={styles.pipelineSubBlock}>
                <Text style={styles.pipelineSub}>{stg.nameEn}</Text>
              </View>
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
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>เลขที่เคลม</Text>
            <Text style={[styles.tableHeaderText, { width: "20%" }]}>อุปกรณ์ / หมายเลขซีเรียล</Text>
            <Text style={[styles.tableHeaderText, { width: "19%" }]}>สถานี / จังหวัด</Text>
            <Text style={[styles.tableHeaderText, { width: "16%" }]}>ศูนย์บริการที่ส่งซ่อม</Text>
            <Text style={[styles.tableHeaderText, { width: "9%", textAlign: "center" }]}>อายุเคส</Text>
            <Text style={[styles.tableHeaderText, { width: "11%", textAlign: "center" }]}>เกิน SLA</Text>
            <Text style={[styles.tableHeaderText, { width: "10%", textAlign: "right" }]}>ผู้รับผิดชอบ</Text>
          </View>

          {/* Rows */}
          {overdueClaims.length === 0 ? (
            <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 12, backgroundColor: "#f0fdf4" }]}>
              <Text style={[styles.tableCellBold, { color: "#059669", fontSize: 9 }]}>
                ✓ ไม่มีรายการเคลมที่เกินกำหนด SLA (การดำเนินงานเป็นไปตามเกณฑ์มาตรฐาน 100%)
              </Text>
            </View>
          ) : (
            overdueClaims.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              >
                <Text style={[styles.tableCellBold, { width: "15%" }]}>{item.id}</Text>
                <View style={{ width: "20%", flexDirection: "column" }}>
                  <Text style={styles.tableCellBold}>{item.equipment}</Text>
                  <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b", marginTop: 1.5 }]}>
                    S/N: {item.serialNo}
                  </Text>
                </View>
                <View style={{ width: "19%", flexDirection: "column" }}>
                  <Text style={styles.tableCell}>{item.station}</Text>
                  <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b", marginTop: 1.5 }]}>
                    {item.province}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { width: "16%" }]}>{item.serviceCenter}</Text>
                <Text style={[styles.tableCell, { width: "9%", textAlign: "center" }]}>
                  {item.ageDays}
                </Text>
                <View style={{ width: "11%", alignItems: "center", justifyContent: "center" }}>
                  <Text style={styles.badgeDanger}>{item.overdueDays}</Text>
                </View>
                <Text style={[styles.tableCell, { width: "10%", textAlign: "right" }]}>
                  {item.assignee}
                </Text>
              </View>
            ))
          )}
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
            <Text style={[styles.tableHeaderText, { width: "14%" }]}>เลขที่ RMA</Text>
            <Text style={[styles.tableHeaderText, { width: "14%" }]}>เลขอ้างอิงเคส</Text>
            <Text style={[styles.tableHeaderText, { width: "20%" }]}>อุปกรณ์ / ซีเรียล</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>ปลายทางส่งซ่อม</Text>
            <Text style={[styles.tableHeaderText, { width: "19%" }]}>ขั้นตอนปัจจุบัน (1-8)</Text>
            <Text style={[styles.tableHeaderText, { width: "7%", textAlign: "center" }]}>รวมวัน</Text>
            <Text style={[styles.tableHeaderText, { width: "11%", textAlign: "right" }]}>ค่าปรับผู้ขาย</Text>
          </View>

          {/* Rows */}
          {rmaCases.length === 0 ? (
            <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 12, backgroundColor: "#f8fafc" }]}>
              <Text style={[styles.tableCell, { color: "#64748b", fontSize: 8.5 }]}>
                ไม่มีรายการส่งซ่อมต่างประเทศ (Overseas RMA) ที่อยู่ระหว่างดำเนินการในรอบรายงานนี้
              </Text>
            </View>
          ) : (
            rmaCases.map((rma, idx) => (
              <View key={rma.rmaNo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCellBold, { width: "14%" }]}>{rma.rmaNo}</Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>{rma.claimId}</Text>
                <View style={{ width: "20%", flexDirection: "column" }}>
                  <Text style={styles.tableCellBold}>{rma.equipment}</Text>
                  <Text style={[styles.tableCell, { fontSize: 7.5, color: "#64748b", marginTop: 1.5 }]}>{rma.serialNo}</Text>
                </View>
                <Text style={[styles.tableCell, { width: "15%" }]}>{rma.destination}</Text>
                <View style={{ width: "19%", flexDirection: "column" }}>
                  <Text style={styles.tableCellBold}>ขั้นที่ {rma.stageNumber}/8</Text>
                  <Text style={[styles.tableCell, { fontSize: 7.5, marginTop: 1.5 }]}>{rma.stageName}</Text>
                </View>
                <Text style={[styles.tableCell, { width: "7%", textAlign: "center" }]}>{rma.totalDays}</Text>
                <View style={{ width: "11%", alignItems: "flex-end", justifyContent: "center" }}>
                  {rma.isPenalty ? (
                    <Text style={styles.badgeDanger}>{rma.penaltyStatus}</Text>
                  ) : (
                    <Text style={styles.badgeSuccess}>ปกติ (ในสัญญา)</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Table 2: Permits Watchlist */}
        <Text style={[styles.sectionTitle, { color: "#0891b2", marginTop: 4 }]}>
          รายการใบอนุญาตส่งออก/นำเข้า กสทช. และพิธีการศุลกากร (Permit Expiry Watchlist)
        </Text>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: "18%" }]}>เลขที่ใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "21%" }]}>ประเภทใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>อ้างอิงซีเรียล (S/N)</Text>
            <Text style={[styles.tableHeaderText, { width: "18%" }]}>หน่วยงานผู้ออกใบอนุญาต</Text>
            <Text style={[styles.tableHeaderText, { width: "12%", textAlign: "center" }]}>วันหมดอายุ</Text>
            <Text style={[styles.tableHeaderText, { width: "16%", textAlign: "right" }]}>สถานะการคุ้มครอง</Text>
          </View>

          {/* Rows */}
          {permits.length === 0 ? (
            <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 12, backgroundColor: "#f8fafc" }]}>
              <Text style={[styles.tableCell, { color: "#64748b", fontSize: 8.5 }]}>
                ไม่มีรายการใบอนุญาตส่งออก/นำเข้า กสทช. หรือศุลกากร ที่ต้องเฝ้าระวังในรอบรายงานนี้
              </Text>
            </View>
          ) : (
            permits.map((p, idx) => (
              <View key={p.permitNo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCellBold, { width: "18%" }]}>{p.permitNo}</Text>
                <Text style={[styles.tableCell, { width: "21%" }]}>{p.permitType}</Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>{p.serialNo}</Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{p.authority}</Text>
                <Text style={[styles.tableCell, { width: "12%", textAlign: "center" }]}>{p.expiryDate}</Text>
                <View style={{ width: "16%", alignItems: "flex-end", justifyContent: "center" }}>
                  <Text
                    style={
                      p.status === "warning"
                        ? styles.badgeWarning
                        : p.status === "expired"
                        ? styles.badgeDanger
                        : styles.badgeSuccess
                    }
                  >
                    {p.badgeText}
                  </Text>
                </View>
              </View>
            ))
          )}
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
            <Text style={styles.sectionTitle}>สถานีที่เกิดเหตุขัดข้องสูงสุด (Top Incident Stations)</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, { width: "22%" }]}>รหัสสถานี</Text>
                <Text style={[styles.tableHeaderText, { width: "44%" }]}>ชื่อสถานี / จังหวัด</Text>
                <Text style={[styles.tableHeaderText, { width: "17%", textAlign: "center" }]}>รวมเคลม</Text>
                <Text style={[styles.tableHeaderText, { width: "17%", textAlign: "right" }]}>ค้างซ่อม</Text>
              </View>
              {topStations.length === 0 ? (
                <View style={[styles.tableRow, { justifyContent: "center", paddingVertical: 10, backgroundColor: "#f8fafc" }]}>
                  <Text style={[styles.tableCell, { color: "#64748b", fontSize: 8 }]}>
                    ยังไม่มีข้อมูลสถิติสถานีที่มีการแจ้งเคลม
                  </Text>
                </View>
              ) : (
                topStations.map((stn, idx) => (
                  <View key={stn.code} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCellBold, { width: "22%", fontSize: 7.5 }]}>{stn.code}</Text>
                    <View style={{ width: "44%", flexDirection: "column" }}>
                      <Text style={[styles.tableCellBold, { fontSize: 8 }]}>{stn.name}</Text>
                      <Text style={[styles.tableCell, { fontSize: 7, color: "#64748b", marginTop: 1 }]}>{stn.province}</Text>
                    </View>
                    <Text style={[styles.tableCell, { width: "17%", textAlign: "center", fontSize: 7.5 }]}>
                      {stn.claimCount} เคส
                    </Text>
                    <View style={{ width: "17%", alignItems: "flex-end", justifyContent: "center" }}>
                      <Text style={stn.activeCount > 1 ? styles.badgeWarning : styles.badgeNeutral}>
                        {stn.activeCount} เคส
                      </Text>
                    </View>
                  </View>
                ))
              )}
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
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stockSummary.bufferReplacementIssued > 0 ? "65%" : "0%"}`,
                      backgroundColor: "#3b82f6",
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ซ่อมเสร็จรับคืนคลัง (Repaired Restocked)</Text>
                <Text style={styles.progressValue}>{stockSummary.repairedRestocked} รายการ</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stockSummary.repairedRestocked > 0 ? "55%" : "0%"}`,
                      backgroundColor: "#10b981",
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>รอตรวจสอบคุณภาพรับเข้า (Pending QC)</Text>
                <Text style={styles.progressValue}>{stockSummary.pendingQcInspection} รายการ</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stockSummary.pendingQcInspection > 0 ? "20%" : "0%"}`,
                      backgroundColor: "#f59e0b",
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.progressItem, { marginTop: 4 }]}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ความพร้อมอะไหล่สำรอง (Availability)</Text>
                <Text style={[styles.progressValue, { color: "#059669" }]}>
                  {stockSummary.bufferAvailabilityRate}%
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
