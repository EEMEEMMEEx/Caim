import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import {
  extractGregorianYear,
  formatClaimNumber,
  setClaimSequence,
} from "./claimSequence"
import { TicketDocument, RmaDocument, EquipmentDocument } from "@/types/database"
import { getPersistentDeletedTicketIds } from "@/lib/storage/serverTicketStorage"

const TICKETS_FILE = path.join(process.cwd(), "src/data/tickets.json")
const RMA_FILE = path.join(process.cwd(), "src/data/rma.json")
const ASSETS_FILE = path.join(process.cwd(), "src/data/assets.json")
const CUSTOM_EQUIPMENTS_FILE = path.join(process.cwd(), "src/data/custom_equipments.json")
const COUNTERS_FILE = path.join(process.cwd(), "src/data/counters.json")

const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
  "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
}

export function parseDateToTimestamp(raw?: string | null): number {
  if (!raw) return 0
  const str = String(raw).trim()

  // 1. Try direct ISO parse
  const parsed = new Date(str).getTime()
  if (!isNaN(parsed) && str.includes("-")) {
    return parsed
  }

  // 2. Parse Thai date format: "13 มิ.ย. 2569" or "9 ก.ย. 2569"
  const thaiMatch = str.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/)
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10)
    const monthStr = thaiMatch[2]
    let year = parseInt(thaiMatch[3], 10)
    if (year > 2400) year -= 543 // BE to CE

    const month = THAI_MONTHS[monthStr] ?? 0
    return new Date(Date.UTC(year, month, day, 8, 0, 0)).getTime()
  }

  return !isNaN(parsed) ? parsed : 0
}

export interface MigrationResult {
  success: boolean
  totalClaimsProcessed: number
  reindexedCount: number
  idMapping: Record<string, string>
  maxSequencePerYear: Record<number, number>
  nextClaimNumber: string
  cascadeUpdates: {
    equipmentsUpdated: number
    rmaRecordsUpdated: number
    transactionLogsUpdated: number
  }
  timestamp: string
  message: string
}

/**
 * Idempotent Data Migration Engine:
 * Re-indexes all existing claim records sequentially in the format CLM-YYYY-XXX
 * sorted chronologically by initial creation timestamp (createdAt / openedAt ascending).
 * Cascade-updates all foreign key relations across equipments, RMA records, attached permits,
 * and transaction logs. Calibrates sequence counters for subsequent atomic generation.
 */
export async function migrateClaimSequences(): Promise<MigrationResult> {
  const nowIso = new Date().toISOString()
  const idMapping: Record<string, string> = {}
  const caseTitleMapping: Record<string, string> = {}
  const maxSequencePerYear: Record<number, number> = {}

  let diskTickets: TicketDocument[] = []
  if (fs.existsSync(TICKETS_FILE)) {
    try {
      diskTickets = JSON.parse(fs.readFileSync(TICKETS_FILE, "utf-8") || "[]")
    } catch (e) {
      console.warn("Failed to read disk tickets during migration:", e)
    }
  }

  let mongoTickets: TicketDocument[] = []
  let db: Awaited<ReturnType<typeof getDb>> = null

  if (isMongoConfigured()) {
    try {
      db = await getDb()
      if (db) {
        mongoTickets = await db.collection<TicketDocument>("tickets").find({}).toArray()
      }
    } catch (err) {
      console.warn("Could not fetch mongo tickets during migration:", err)
    }
  }

  // Combine unique tickets by ID, prioritizing mongo records if present, excluding deleted tickets
  const deletedSet = new Set(getPersistentDeletedTicketIds())
  const ticketMap = new Map<string, TicketDocument>()
  for (const t of diskTickets) {
    if (t.id && !deletedSet.has(t.id)) ticketMap.set(t.id, t)
  }
  for (const t of mongoTickets) {
    if (t.id && !deletedSet.has(t.id)) ticketMap.set(t.id, t)
  }

  const allTickets = Array.from(ticketMap.values())

  // Sort all claims chronologically by initial creation timestamp ascending
  allTickets.sort((a, b) => {
    const timeA = parseDateToTimestamp(a.createdAt || a.date)
    const timeB = parseDateToTimestamp(b.createdAt || b.date)

    if (timeA !== timeB) {
      return timeA - timeB
    }

    // Stable tie-breaker: existing CLM- prefix first, then alphabetical ID
    const aIsClm = String(a.id).startsWith("CLM-")
    const bIsClm = String(b.id).startsWith("CLM-")
    if (aIsClm && !bIsClm) return -1
    if (!aIsClm && bIsClm) return 1

    return String(a.id).localeCompare(String(b.id))
  })

  // Group by Gregorian year to reassign CLM-{YYYY}-{SEQ} sequentially starting from 001
  const yearGroups = new Map<number, TicketDocument[]>()
  for (const ticket of allTickets) {
    const year = extractGregorianYear(ticket.createdAt || ticket.date)
    const group = yearGroups.get(year) || []
    group.push(ticket)
    yearGroups.set(year, group)
  }

  const updatedTickets: TicketDocument[] = []
  let reindexedCount = 0

  for (const [year, group] of yearGroups.entries()) {
    let currentSeq = 1

    for (const ticket of group) {
      const oldId = ticket.id
      const newId = formatClaimNumber(year, currentSeq)

      if (oldId !== newId) {
        reindexedCount++
      }

      idMapping[oldId] = newId
      if (ticket.title && ticket.title === oldId) {
        caseTitleMapping[ticket.title] = newId
      }

      // Preserve descriptive title, or harmonize if title was previously a raw legacy number
      const isRawNumberTitle = /^\d+$/.test(String(ticket.title).trim())
      const isOldIdTitle = ticket.title === oldId
      const newTitle = isRawNumberTitle || isOldIdTitle ? newId : ticket.title || newId

      const updatedTicket: TicketDocument = {
        ...ticket,
        id: newId,
        title: newTitle,
        updatedAt: nowIso,
      }

      updatedTickets.push(updatedTicket)
      currentSeq++
    }

    maxSequencePerYear[year] = currentSeq - 1
    // Calibrate sequence counter for this year
    await setClaimSequence(year, currentSeq - 1)
  }

  // Cascade updates metrics
  let equipmentsUpdated = 0
  let rmaRecordsUpdated = 0
  let transactionLogsUpdated = 0

  // 1. Update Persistent Local Disk Tickets
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(updatedTickets, null, 2), "utf-8")
  } catch (err) {
    console.error("Failed to write updated tickets to disk:", err)
  }

  // 2. Cascade update Persistent Local Disk RMA Records
  if (fs.existsSync(RMA_FILE)) {
    try {
      const diskRma: RmaDocument[] = JSON.parse(fs.readFileSync(RMA_FILE, "utf-8") || "[]")
      let modifiedRma = false

      for (const rma of diskRma) {
        let changed = false
        // Update ticketId reference
        if (rma.ticketId && idMapping[rma.ticketId]) {
          rma.ticketId = idMapping[rma.ticketId]
          changed = true
        }

        // Check if caseName matched an old ticket ID or ticket title
        if (rma.caseName && idMapping[rma.caseName]) {
          rma.caseName = idMapping[rma.caseName]
          changed = true
        } else if (rma.caseName && caseTitleMapping[rma.caseName]) {
          rma.caseName = caseTitleMapping[rma.caseName]
          changed = true
        }

        // Link with ticket by matching equipment serial if unlinked
        if (!rma.ticketId && rma.serialNo) {
          const matchingTicket = updatedTickets.find((t) => t.serialNo === rma.serialNo)
          if (matchingTicket) {
            rma.ticketId = matchingTicket.id
            if (!rma.caseName || rma.caseName === "ไม่ผูกเคส") {
              rma.caseName = matchingTicket.title
            }
            changed = true
          }
        }

        // Cascade attached permits if present
        if (rma.permitInfo && rma.permitInfo.rmaId && idMapping[rma.permitInfo.rmaId]) {
          rma.permitInfo.rmaId = idMapping[rma.permitInfo.rmaId]
          changed = true
        }
        if (Array.isArray(rma.permits)) {
          for (const p of rma.permits) {
            if (p.rmaId && idMapping[p.rmaId]) {
              p.rmaId = idMapping[p.rmaId]
              changed = true
            }
          }
        }

        if (changed) {
          rma.updatedAt = nowIso
          rmaRecordsUpdated++
          modifiedRma = true
        }
      }

      if (modifiedRma) {
        fs.writeFileSync(RMA_FILE, JSON.stringify(diskRma, null, 2), "utf-8")
      }
    } catch (err) {
      console.warn("Failed to cascade update disk RMA file:", err)
    }
  }

  // 3. Cascade update Persistent Local Disk Assets & Custom Equipments
  for (const assetFilePath of [ASSETS_FILE, CUSTOM_EQUIPMENTS_FILE]) {
    if (fs.existsSync(assetFilePath)) {
      try {
        const assets = JSON.parse(fs.readFileSync(assetFilePath, "utf-8") || "[]")
        if (Array.isArray(assets)) {
          let modified = false
          for (const a of assets) {
            if (a.currentClaimId && idMapping[a.currentClaimId]) {
              a.currentClaimId = idMapping[a.currentClaimId]
              a.updatedAt = nowIso
              equipmentsUpdated++
              modified = true
            }
          }
          if (modified) {
            fs.writeFileSync(assetFilePath, JSON.stringify(assets, null, 2), "utf-8")
          }
        }
      } catch (err) {
        console.warn(`Failed to cascade update ${assetFilePath}:`, err)
      }
    }
  }

  // 4. Update MongoDB (if configured and connected)
  if (db) {
    try {
      // 4a. Update Tickets Collection (drop old docs or replace with bulkWrite)
      for (const t of updatedTickets) {
        await db.collection("tickets").updateOne(
          { id: t.id },
          { $set: t },
          { upsert: true }
        )
      }

      // Delete any tickets with old IDs that were changed
      for (const [oldId, newId] of Object.entries(idMapping)) {
        if (oldId !== newId) {
          await db.collection("tickets").deleteOne({ id: oldId })
        }
      }

      // 4b. Cascade update Equipments Collection
      for (const [oldId, newId] of Object.entries(idMapping)) {
        const res = await db.collection<EquipmentDocument>("equipments").updateMany(
          { currentClaimId: oldId },
          { $set: { currentClaimId: newId, updatedAt: nowIso } }
        )
        equipmentsUpdated += res.modifiedCount
      }

      // 4c. Cascade update RMA Collection
      for (const [oldId, newId] of Object.entries(idMapping)) {
        const resTicket = await db.collection<RmaDocument>("rma").updateMany(
          { ticketId: oldId },
          { $set: { ticketId: newId, updatedAt: nowIso } }
        )
        const resCase = await db.collection<RmaDocument>("rma").updateMany(
          { caseName: oldId },
          { $set: { caseName: newId, updatedAt: nowIso } }
        )
        rmaRecordsUpdated += resTicket.modifiedCount + resCase.modifiedCount
      }

      // 4d. Cascade update Transaction Logs
      for (const [oldId, newId] of Object.entries(idMapping)) {
        const resLogs = await db.collection("transaction_logs").updateMany(
          { targetType: "ticket", targetId: oldId },
          { $set: { targetId: newId } }
        )
        const resDetails = await db.collection("transaction_logs").updateMany(
          { "details.currentClaimId": oldId },
          { $set: { "details.currentClaimId": newId } }
        )
        transactionLogsUpdated += resLogs.modifiedCount + resDetails.modifiedCount
      }

      // Record Migration Audit Log
      await db.collection("transaction_logs").insertOne({
        id: `TX-CLAIM-REINDEX-${Date.now()}`,
        action: "CLAIM_UPDATED",
        targetType: "ticket",
        targetId: "SYSTEM_REINDEX",
        details: {
          migration: "CLAIM_SEQUENCE_REINDEX",
          totalClaims: updatedTickets.length,
          reindexedCount,
          idMapping,
          maxSequencePerYear,
          timestamp: nowIso,
        },
        timestamp: nowIso,
      })
    } catch (mongoErr) {
      console.warn("MongoDB cascade update encountered partial notice:", mongoErr)
    }
  }

  const currentYear = new Date().getFullYear()
  const nextSeqNum = (maxSequencePerYear[currentYear] || 0) + 1
  const nextClaimNumber = formatClaimNumber(currentYear, nextSeqNum)

  return {
    success: true,
    totalClaimsProcessed: updatedTickets.length,
    reindexedCount,
    idMapping,
    maxSequencePerYear,
    nextClaimNumber,
    cascadeUpdates: {
      equipmentsUpdated,
      rmaRecordsUpdated,
      transactionLogsUpdated,
    },
    timestamp: nowIso,
    message: `Re-indexed ${updatedTickets.length} claim records sequentially. Next claim number is ${nextClaimNumber}.`,
  }
}
