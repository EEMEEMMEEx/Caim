import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { getPersistentTickets, getPersistentDeletedTicketIds } from "@/lib/storage/serverTicketStorage"

const COUNTERS_FILE = path.join(process.cwd(), "src/data/counters.json")

export interface CounterDocument {
  _id: string // e.g. "claim_seq_2026"
  type: string // "claim"
  year: number // 2026
  seq: number // Current incremental sequence number
  createdAt?: string
  updatedAt?: string
}

/**
 * Extracts a 4-digit Gregorian calendar year from various inputs (Date, ISO string, Thai date).
 * Gracefully converts Thai Buddhist Era year (>= 2400) to Gregorian (e.g. 2569 -> 2026).
 */
export function extractGregorianYear(dateInput?: Date | string | number | null): number {
  if (!dateInput) {
    return new Date().getFullYear()
  }

  if (dateInput instanceof Date) {
    let year = dateInput.getFullYear()
    if (year > 2400) year -= 543
    return year
  }

  const str = String(dateInput).trim()
  if (!str) {
    return new Date().getFullYear()
  }

  // Check for 4-digit year pattern (e.g., 2026 or 2569)
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

/**
 * Format standardized claim number: CLM-{YYYY}-{SEQ}
 * Example: year 2026, seq 1 -> CLM-2026-001
 * Zero-padded to 3 digits minimum, expands if seq >= 1000
 */
export function formatClaimNumber(year: number, seq: number): string {
  const paddedSeq = String(seq).padStart(3, "0")
  return `CLM-${year}-${paddedSeq}`
}

/**
 * Parses a claim number into year and sequence number.
 * Returns null if the format doesn't match CLM-YYYY-XXX.
 */
export function parseClaimNumber(claimId: string): { year: number; seq: number } | null {
  if (!claimId) return null
  const match = String(claimId).trim().match(/^CLM-(\d{4})-(\d+)$/i)
  if (!match) return null
  return {
    year: parseInt(match[1], 10),
    seq: parseInt(match[2], 10),
  }
}

// In-process async mutex to serialize sequence generation and prevent race conditions locally
let sequenceLockQueue = Promise.resolve()

function withSequenceLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = sequenceLockQueue.then(fn, fn)
  sequenceLockQueue = next.then(() => {}, () => {})
  return next
}

/**
 * Read persistent counters map from disk
 */
function readDiskCounters(): Record<string, number> {
  try {
    if (fs.existsSync(COUNTERS_FILE)) {
      const content = fs.readFileSync(COUNTERS_FILE, "utf-8")
      return JSON.parse(content || "{}")
    }
  } catch (err) {
    console.warn("[ClaimSequence] Failed to read disk counters:", err)
  }
  return {}
}

/**
 * Write persistent counters map to disk safely using atomic rename
 */
function writeDiskCounters(data: Record<string, number>): void {
  try {
    const dir = path.dirname(COUNTERS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const tempFile = `${COUNTERS_FILE}.${Date.now()}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8")
    fs.renameSync(tempFile, COUNTERS_FILE)
  } catch (err) {
    console.error("[ClaimSequence] Failed to write disk counters:", err)
  }
}

/**
 * Determine the maximum sequence currently existing for a specific year from tickets.
 * Excludes soft-deleted and permanently deleted claims.
 */
export function getMaxExistingSequenceForYear(
  year: number,
  tickets?: Array<{ id?: string; title?: string }>
): number {
  const ticketList = tickets || getPersistentTickets()
  const deletedSet = new Set(getPersistentDeletedTicketIds())
  let maxSeq = 0

  for (const t of ticketList) {
    if (!t || (t.id && deletedSet.has(t.id))) {
      continue
    }

    const parsedId = parseClaimNumber(t.id || "")
    if (parsedId && parsedId.year === year && parsedId.seq > maxSeq) {
      maxSeq = parsedId.seq
    }
    const parsedTitle = parseClaimNumber(t.title || "")
    if (parsedTitle && parsedTitle.year === year && parsedTitle.seq > maxSeq) {
      maxSeq = parsedTitle.seq
    }
  }

  return maxSeq
}

/**
 * Queries the active claim repository (MongoDB tickets collection and local persistent storage)
 * for the highest existing sequential ID matching CLM-{YYYY}-{SEQ}.
 * Extracts numeric sequence suffixes and filters out deleted records.
 */
export async function getResolvedMaxSequenceForYear(year: number): Promise<number> {
  let mongoMax = 0

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const deletedIds = getPersistentDeletedTicketIds()
        const query: Record<string, unknown> = {
          $or: [
            { id: { $regex: `^CLM-${year}-\\d+$`, $options: "i" } },
            { title: { $regex: `^CLM-${year}-\\d+$`, $options: "i" } },
          ],
        }
        if (deletedIds.length > 0) {
          query.id = { $nin: deletedIds }
        }

        const mongoTickets = await db
          .collection("tickets")
          .find(query, { projection: { id: 1, title: 1 } })
          .toArray()
        mongoMax = getMaxExistingSequenceForYear(
          year,
          mongoTickets as Array<{ id?: string; title?: string }>
        )
      }
    } catch (err) {
      console.warn("[ClaimSequence] Failed to query mongo tickets for max sequence:", err)
    }
  }

  const diskMax = getMaxExistingSequenceForYear(year)
  return Math.max(mongoMax, diskMax)
}

// Tracks active sequential allocations across concurrent requests within the process
const inFlightAllocatedSeqByYear: Record<number, number> = {}

/**
 * Atomically generates and locks the next sequential claim number: CLM-{YYYY}-{SEQ}.
 * Concurrency-safe across simultaneous requests.
 * Queries the existing claim repository for the highest existing sequence number matching
 * the current year pattern (CLM-{YYYY}-%), extracts numeric suffix, computes
 * nextSequence = maxExistingSeq + 1, updates counter, and returns CLM-{YYYY}-{SEQ}.
 */
export async function generateNextClaimNumber(options?: {
  date?: Date | string | number | null
}): Promise<string> {
  return withSequenceLock(async () => {
    const year = extractGregorianYear(options?.date)
    const counterId = `claim_seq_${year}`
    const nowIso = new Date().toISOString()

    // 1. Query highest existing sequence number from actual active non-deleted records
    const maxExistingSeq = await getResolvedMaxSequenceForYear(year)

    // 2. Determine base sequence grounded on actual records, accounting for in-flight allocations
    const inFlightSeq = inFlightAllocatedSeqByYear[year] || 0
    const baseSeq = inFlightSeq > maxExistingSeq ? inFlightSeq : maxExistingSeq

    const nextSeq = baseSeq + 1
    inFlightAllocatedSeqByYear[year] = nextSeq

    // 3. Synchronize MongoDB counter atomically
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const countersCol = db.collection<CounterDocument>("counters")
          await countersCol.updateOne(
            { _id: counterId },
            {
              $set: { seq: nextSeq, updatedAt: nowIso },
              $setOnInsert: {
                type: "claim",
                year,
                createdAt: nowIso,
              },
            },
            { upsert: true }
          )
        }
      } catch (mongoErr) {
        console.warn("[ClaimSequence] MongoDB atomic counter sync notice:", mongoErr)
      }
    }

    // 4. Synchronize dual-layer persistent disk counters
    const diskData = readDiskCounters()
    diskData[counterId] = nextSeq
    writeDiskCounters(diskData)

    return formatClaimNumber(year, nextSeq)
  })
}

/**
 * Preview the upcoming claim number without incrementing the counter.
 * Queries the existing claim repository for the highest existing sequence number
 * matching the current year pattern (CLM-{YYYY}-%), extracts the numeric suffix,
 * computes nextSequence = maxExistingSeq + 1, and formats as zero-padded CLM-{YYYY}-{SEQ}.
 * Purges and synchronizes any detached sequence counters to match actual records.
 */
export async function peekNextClaimNumber(options?: {
  date?: Date | string | number | null
}): Promise<string> {
  const year = extractGregorianYear(options?.date)
  const counterId = `claim_seq_${year}`

  // 1. Query highest existing sequence from actual non-deleted persisted records
  const maxExistingSeq = await getResolvedMaxSequenceForYear(year)

  // 2. Compute nextSequence = maxExistingSeq + 1 (e.g., 3 + 1 = 4 -> CLM-2026-004)
  const inFlightSeq = inFlightAllocatedSeqByYear[year] || 0
  const effectiveBase = inFlightSeq > maxExistingSeq ? inFlightSeq : maxExistingSeq
  const nextSeq = effectiveBase + 1

  // 3. Purge or synchronize detached sequence counters if they drift from actual records
  try {
    const diskData = readDiskCounters()
    if (diskData[counterId] !== effectiveBase) {
      diskData[counterId] = effectiveBase
      writeDiskCounters(diskData)
    }

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection<CounterDocument>("counters").updateOne(
          { _id: counterId },
          {
            $set: { seq: effectiveBase, updatedAt: new Date().toISOString() },
            $setOnInsert: {
              type: "claim",
              year,
              createdAt: new Date().toISOString(),
            },
          },
          { upsert: true }
        )
      }
    }
  } catch (err) {
    console.warn("[ClaimSequence] Counter sync notice in peek:", err)
  }

  return formatClaimNumber(year, nextSeq)
}

/**
 * Directly calibrate or reset sequence counter for a specific year (e.g., during database migration).
 */
export async function setClaimSequence(year: number, nextSeq: number): Promise<void> {
  await withSequenceLock(async () => {
    inFlightAllocatedSeqByYear[year] = nextSeq
    const counterId = `claim_seq_${year}`
    const nowIso = new Date().toISOString()

    // Update MongoDB
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          await db.collection<CounterDocument>("counters").updateOne(
            { _id: counterId },
            {
              $set: {
                seq: nextSeq,
                updatedAt: nowIso,
              },
              $setOnInsert: {
                type: "claim",
                year,
                createdAt: nowIso,
              },
            },
            { upsert: true }
          )
        }
      } catch (err) {
        console.warn("[ClaimSequence] Failed to update MongoDB counter during setClaimSequence:", err)
      }
    }

    // Update Disk Store
    const diskData = readDiskCounters()
    diskData[counterId] = nextSeq
    writeDiskCounters(diskData)
  })
}
