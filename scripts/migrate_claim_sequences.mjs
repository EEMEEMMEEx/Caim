/**
 * Database Migration Script: Re-sequence and update all existing claim records
 * Usage: node scripts/migrate_claim_sequences.mjs
 */

import fs from "fs"
import path from "path"
import { MongoClient } from "mongodb"

const TICKETS_FILE = path.join(process.cwd(), "src/data/tickets.json")
const RMA_FILE = path.join(process.cwd(), "src/data/rma.json")
const ASSETS_FILE = path.join(process.cwd(), "src/data/assets.json")
const CUSTOM_EQUIPMENTS_FILE = path.join(process.cwd(), "src/data/custom_equipments.json")
const COUNTERS_FILE = path.join(process.cwd(), "src/data/counters.json")

let uri = process.env.MONGODB_URI
if (!uri && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8")
  const match = envContent.match(/MONGODB_URI=(.*)/)
  if (match) uri = match[1].trim()
}

const THAI_MONTHS = {
  "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
  "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
}

function extractGregorianYear(dateInput) {
  if (!dateInput) return new Date().getFullYear()
  if (dateInput instanceof Date) {
    let year = dateInput.getFullYear()
    if (year > 2400) year -= 543
    return year
  }
  const str = String(dateInput).trim()
  const match = str.match(/\b(19\d{2}|20\d{2}|25\d{2})\b/)
  if (match) {
    let y = parseInt(match[1], 10)
    if (y > 2400) y -= 543
    return y
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    let y = parsed.getFullYear()
    if (y > 2400) y -= 543
    return y
  }
  return new Date().getFullYear()
}

function parseDateToTimestamp(raw) {
  if (!raw) return 0
  const str = String(raw).trim()
  const parsed = new Date(str).getTime()
  if (!isNaN(parsed) && str.includes("-")) {
    return parsed
  }
  const thaiMatch = str.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/)
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10)
    const monthStr = thaiMatch[2]
    let year = parseInt(thaiMatch[3], 10)
    if (year > 2400) year -= 543
    const month = THAI_MONTHS[monthStr] ?? 0
    return new Date(Date.UTC(year, month, day, 8, 0, 0)).getTime()
  }
  return !isNaN(parsed) ? parsed : 0
}

function formatClaimNumber(year, seq) {
  const padded = String(seq).padStart(3, "0")
  return `CLM-${year}-${padded}`
}

async function runClaimSequenceMigration() {
  console.log("==========================================================================")
  console.log(" CAIM Automated Claim Number Sequence Generator & Migration Engine")
  console.log(" Pattern: CLM-{YYYY}-{SEQ} (e.g. CLM-2026-001, CLM-2026-002)")
  console.log("==========================================================================")

  const nowIso = new Date().toISOString()
  const idMapping = {}
  const caseTitleMapping = {}
  const maxSequencePerYear = {}

  let diskTickets = []
  if (fs.existsSync(TICKETS_FILE)) {
    try {
      diskTickets = JSON.parse(fs.readFileSync(TICKETS_FILE, "utf-8") || "[]")
      console.log(`[Disk Storage] Loaded ${diskTickets.length} tickets from ${TICKETS_FILE}`)
    } catch (err) {
      console.warn("Failed to read disk tickets:", err)
    }
  }

  let mongoClient = null
  let db = null
  let mongoTickets = []

  if (uri && !uri.includes("<USERNAME>")) {
    try {
      console.log("[MongoDB Atlas] Connecting to database...")
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
      await mongoClient.connect()
      db = mongoClient.db("caim")
      console.log(" Connected to MongoDB Atlas successfully.")
      mongoTickets = await db.collection("tickets").find({}).toArray()
      console.log(`[MongoDB Atlas] Retrieved ${mongoTickets.length} tickets from collection.`)
    } catch (err) {
      console.warn("MongoDB connection notice (will run on local persistence store):", err.message)
    }
  }

  // Combine unique tickets
  const ticketMap = new Map()
  for (const t of diskTickets) {
    if (t.id) ticketMap.set(t.id, t)
  }
  for (const t of mongoTickets) {
    if (t.id) ticketMap.set(t.id, t)
  }

  const allTickets = Array.from(ticketMap.values())
  console.log(`\n[Chronological Indexing] Processing ${allTickets.length} total distinct claim records...`)

  // Sort ascending by initial creation timestamp
  allTickets.sort((a, b) => {
    const timeA = parseDateToTimestamp(a.createdAt || a.date)
    const timeB = parseDateToTimestamp(b.createdAt || b.date)
    if (timeA !== timeB) return timeA - timeB

    const aIsClm = String(a.id).startsWith("CLM-")
    const bIsClm = String(b.id).startsWith("CLM-")
    if (aIsClm && !bIsClm) return -1
    if (!aIsClm && bIsClm) return 1
    return String(a.id).localeCompare(String(b.id))
  })

  // Group by Gregorian year
  const yearGroups = new Map()
  for (const ticket of allTickets) {
    const year = extractGregorianYear(ticket.createdAt || ticket.date)
    const group = yearGroups.get(year) || []
    group.push(ticket)
    yearGroups.set(year, group)
  }

  const updatedTickets = []
  let reindexedCount = 0

  console.log("\n[Sequence Assignment]")
  console.log("--------------------------------------------------------------------------")
  console.log("Old Claim ID  ->  New Sequenced Claim ID  |  Creation Date  | Title")
  console.log("--------------------------------------------------------------------------")

  for (const [year, group] of yearGroups.entries()) {
    let currentSeq = 1

    for (const ticket of group) {
      const oldId = ticket.id
      const newId = formatClaimNumber(year, currentSeq)

      if (oldId !== newId) {
        reindexedCount++
      }

      idMapping[oldId] = newId
      if (ticket.title === oldId) {
        caseTitleMapping[ticket.title] = newId
      }

      const isRawNum = /^\d+$/.test(String(ticket.title || "").trim())
      const isOldIdTitle = ticket.title === oldId
      const newTitle = isRawNum || isOldIdTitle ? newId : ticket.title || newId

      const updatedDoc = {
        ...ticket,
        id: newId,
        title: newTitle,
        updatedAt: nowIso,
      }
      updatedTickets.push(updatedDoc)

      console.log(
        `${String(oldId).padEnd(14)} ->  ${newId.padEnd(26)} |  ${(ticket.date || ticket.createdAt || "-").padEnd(14)} | ${newTitle}`
      )

      currentSeq++
    }

    maxSequencePerYear[year] = currentSeq - 1
  }

  console.log("--------------------------------------------------------------------------")

  // Update Persistent Disk Store
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(updatedTickets, null, 2), "utf-8")
  console.log(`\n Saved ${updatedTickets.length} re-sequenced tickets to ${TICKETS_FILE}`)

  // Calibrate Disk Counters
  let diskCounters = {}
  if (fs.existsSync(COUNTERS_FILE)) {
    try {
      diskCounters = JSON.parse(fs.readFileSync(COUNTERS_FILE, "utf-8") || "{}")
    } catch {}
  }
  for (const [year, maxSeq] of Object.entries(maxSequencePerYear)) {
    diskCounters[`claim_seq_${year}`] = maxSeq
  }
  fs.writeFileSync(COUNTERS_FILE, JSON.stringify(diskCounters, null, 2), "utf-8")
  console.log(` Calibrated disk counters:`, diskCounters)

  // Cascade RMA
  let rmaUpdatedCount = 0
  if (fs.existsSync(RMA_FILE)) {
    try {
      const rmaList = JSON.parse(fs.readFileSync(RMA_FILE, "utf-8") || "[]")
      let modified = false
      for (const r of rmaList) {
        let changed = false
        if (r.ticketId && idMapping[r.ticketId]) {
          r.ticketId = idMapping[r.ticketId]
          changed = true
        }
        if (r.caseName && idMapping[r.caseName]) {
          r.caseName = idMapping[r.caseName]
          changed = true
        } else if (r.caseName && caseTitleMapping[r.caseName]) {
          r.caseName = caseTitleMapping[r.caseName]
          changed = true
        }
        if (!r.ticketId && r.serialNo) {
          const matchTicket = updatedTickets.find((t) => t.serialNo === r.serialNo)
          if (matchTicket) {
            r.ticketId = matchTicket.id
            if (!r.caseName || r.caseName === "ไม่ผูกเคส") {
              r.caseName = matchTicket.title
            }
            changed = true
          }
        }
        if (changed) {
          r.updatedAt = nowIso
          rmaUpdatedCount++
          modified = true
        }
      }
      if (modified) {
        fs.writeFileSync(RMA_FILE, JSON.stringify(rmaList, null, 2), "utf-8")
        console.log(` Cascade-updated ${rmaUpdatedCount} RMA records in ${RMA_FILE}`)
      }
    } catch (err) {
      console.warn("RMA cascade notice:", err)
    }
  }

  // Cascade Assets & Equipments
  for (const assetFile of [ASSETS_FILE, CUSTOM_EQUIPMENTS_FILE]) {
    if (fs.existsSync(assetFile)) {
      try {
        const assets = JSON.parse(fs.readFileSync(assetFile, "utf-8") || "[]")
        let modified = false
        for (const a of assets) {
          if (a.currentClaimId && idMapping[a.currentClaimId]) {
            a.currentClaimId = idMapping[a.currentClaimId]
            a.updatedAt = nowIso
            modified = true
          }
        }
        if (modified) {
          fs.writeFileSync(assetFile, JSON.stringify(assets, null, 2), "utf-8")
          console.log(` Cascade-updated equipments in ${assetFile}`)
        }
      } catch {}
    }
  }

  // MongoDB Operations
  if (db) {
    console.log("\n[MongoDB Atlas Sync]")
    // 1. Bulk Upsert Tickets
    for (const t of updatedTickets) {
      await db.collection("tickets").updateOne({ id: t.id }, { $set: t }, { upsert: true })
    }
    // Delete changed old IDs
    for (const [oldId, newId] of Object.entries(idMapping)) {
      if (oldId !== newId) {
        await db.collection("tickets").deleteOne({ id: oldId })
      }
    }
    console.log(` Upserted ${updatedTickets.length} tickets in MongoDB.`)

    // 2. Cascade Equipments
    for (const [oldId, newId] of Object.entries(idMapping)) {
      await db.collection("equipments").updateMany(
        { currentClaimId: oldId },
        { $set: { currentClaimId: newId, updatedAt: nowIso } }
      )
    }

    // 3. Cascade RMA
    for (const [oldId, newId] of Object.entries(idMapping)) {
      await db.collection("rma").updateMany(
        { ticketId: oldId },
        { $set: { ticketId: newId, updatedAt: nowIso } }
      )
      await db.collection("rma").updateMany(
        { caseName: oldId },
        { $set: { caseName: newId, updatedAt: nowIso } }
      )
    }

    // 4. Cascade Transaction Logs
    for (const [oldId, newId] of Object.entries(idMapping)) {
      await db.collection("transaction_logs").updateMany(
        { targetType: "ticket", targetId: oldId },
        { $set: { targetId: newId } }
      )
      await db.collection("transaction_logs").updateMany(
        { "details.currentClaimId": oldId },
        { $set: { "details.currentClaimId": newId } }
      )
    }

    // 5. Update MongoDB Sequence Counters
    for (const [year, maxSeq] of Object.entries(maxSequencePerYear)) {
      const counterId = `claim_seq_${year}`
      await db.collection("counters").updateOne(
        { _id: counterId },
        {
          $set: { seq: maxSeq, updatedAt: nowIso },
          $setOnInsert: { type: "claim", year: Number(year), createdAt: nowIso },
        },
        { upsert: true }
      )
    }

    // 6. Record Migration Audit Log
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
    console.log(" Recorded migration audit transaction log in MongoDB.")

    await mongoClient.close()
    console.log(" MongoDB connection closed cleanly.")
  }

  const currentYear = new Date().getFullYear()
  const nextSeq = (maxSequencePerYear[currentYear] || 0) + 1
  const nextClaimNumber = formatClaimNumber(currentYear, nextSeq)

  console.log("\n==========================================================================")
  console.log(" MIGRATION COMPLETED SUCCESSFULLY!")
  console.log(` Total Claims Processed: ${updatedTickets.length}`)
  console.log(` Re-indexed IDs:         ${reindexedCount}`)
  console.log(` Next Sequence Preview:  ${nextClaimNumber}`)
  console.log("==========================================================================")
}

runClaimSequenceMigration().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
