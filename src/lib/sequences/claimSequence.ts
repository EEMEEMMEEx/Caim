import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { getPersistentTickets } from "@/lib/storage/serverTicketStorage"

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
 */
export function getMaxExistingSequenceForYear(year: number, tickets?: Array<{ id?: string; title?: string }>): number {
  const ticketList = tickets || getPersistentTickets()
  let maxSeq = 0

  for (const t of ticketList) {
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
 * Atomically generates the next sequential claim number: CLM-{YYYY}-{SEQ}
 * Concurrency-safe across simultaneous requests.
 * Resets counter to 001 when Gregorian year changes.
 */
export async function generateNextClaimNumber(options?: {
  date?: Date | string | number | null
}): Promise<string> {
  return withSequenceLock(async () => {
    const year = extractGregorianYear(options?.date)
    const counterId = `claim_seq_${year}`
    const nowIso = new Date().toISOString()
    let nextSeq = 1

    // 1. Try atomic MongoDB increment if configured
    if (isMongoConfigured()) {
      try {
        const db = await getDb()
        if (db) {
          const countersCol = db.collection<CounterDocument>("counters")

          // Inspect existing counter document
          const existingDoc = await countersCol.findOne({ _id: counterId })
          let baseSeq = existingDoc?.seq || 0

          // If counter is 0 or uninitialized, align with max existing ticket sequence in MongoDB
          if (baseSeq === 0) {
            const ticketsCol = db.collection("tickets")
            const allTickets = await ticketsCol.find({}, { projection: { id: 1, title: 1 } }).toArray()
            const maxMongoSeq = getMaxExistingSequenceForYear(year, allTickets as Array<{ id?: string; title?: string }>)
            const maxDiskSeq = getMaxExistingSequenceForYear(year)
            baseSeq = Math.max(maxMongoSeq, maxDiskSeq)
          }

          const updateResult = await countersCol.findOneAndUpdate(
            { _id: counterId },
            {
              $set: { updatedAt: nowIso },
              $inc: { seq: 1 },
              $setOnInsert: {
                type: "claim",
                year,
                createdAt: nowIso,
              },
            },
            {
              upsert: true,
              returnDocument: "after",
            }
          )

          if (updateResult && typeof updateResult.seq === "number") {
            // If the upsert created it starting at 1, but baseSeq was higher, calibrate forward
            if (updateResult.seq <= baseSeq) {
              const correctedSeq = baseSeq + 1
              await countersCol.updateOne(
                { _id: counterId },
                { $set: { seq: correctedSeq, updatedAt: nowIso } }
              )
              nextSeq = correctedSeq
            } else {
              nextSeq = updateResult.seq
            }

            // Sync to dual-layer local disk counters
            const diskData = readDiskCounters()
            diskData[counterId] = nextSeq
            writeDiskCounters(diskData)

            return formatClaimNumber(year, nextSeq)
          }
        }
      } catch (mongoErr) {
        console.warn("[ClaimSequence] MongoDB atomic counter failed, falling back to disk counter:", mongoErr)
      }
    }

    // 2. Persistent Local Disk Storage fallback (and dual-layer sync)
    const diskData = readDiskCounters()
    const currentDiskSeq = diskData[counterId] || 0
    const maxExisting = getMaxExistingSequenceForYear(year)
    const effectiveBase = Math.max(currentDiskSeq, maxExisting)

    nextSeq = effectiveBase + 1
    diskData[counterId] = nextSeq
    writeDiskCounters(diskData)

    return formatClaimNumber(year, nextSeq)
  })
}

/**
 * Preview the upcoming claim number without incrementing the counter.
 * Useful for read-only preview display in forms ('แจ้งเคลม') and modals.
 */
export async function peekNextClaimNumber(options?: {
  date?: Date | string | number | null
}): Promise<string> {
  const year = extractGregorianYear(options?.date)
  const counterId = `claim_seq_${year}`
  let currentSeq = 0

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const doc = await db.collection<CounterDocument>("counters").findOne({ _id: counterId })
        if (doc && typeof doc.seq === "number") {
          currentSeq = doc.seq
        } else {
          // Check mongo tickets directly
          const ticketsCol = db.collection("tickets")
          const allTickets = await ticketsCol.find({}, { projection: { id: 1, title: 1 } }).toArray()
          currentSeq = getMaxExistingSequenceForYear(year, allTickets as Array<{ id?: string; title?: string }>)
        }
      }
    } catch {
      // ignore, fall through to disk
    }
  }

  const diskData = readDiskCounters()
  const diskSeq = diskData[counterId] || 0
  const diskMaxTickets = getMaxExistingSequenceForYear(year)

  const effectiveCurrent = Math.max(currentSeq, diskSeq, diskMaxTickets)
  return formatClaimNumber(year, effectiveCurrent + 1)
}

/**
 * Directly calibrate or reset sequence counter for a specific year (e.g., during database migration).
 */
export async function setClaimSequence(year: number, nextSeq: number): Promise<void> {
  await withSequenceLock(async () => {
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
