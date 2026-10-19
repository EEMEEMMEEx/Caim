import { NextResponse } from "next/server"
import { migrateClaimSequences } from "@/lib/sequences/migrateClaimSequences"
import { peekNextClaimNumber } from "@/lib/sequences/claimSequence"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

/**
 * GET /api/migrate/claim-sequence
 * Previews migration status and current next sequential claim number
 */
export async function GET() {
  try {
    const nextClaimNumber = await peekNextClaimNumber()
    return NextResponse.json(
      {
        success: true,
        status: "ready",
        nextClaimNumber,
        format: "CLM-{YYYY}-{SEQ}",
        message: "Migration endpoint ready. Send POST to execute re-indexing and relational cascade update.",
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to query migration status"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/migrate/claim-sequence
 * Executes the idempotent migration:
 * 1. Sorts all existing claims chronologically
 * 2. Re-indexes sequentially as CLM-YYYY-XXX
 * 3. Cascade updates equipments, RMA records, attached permits, and transaction logs
 * 4. Calibrates sequence counters in MongoDB and persistent disk storage
 */
export async function POST() {
  try {
    const result = await migrateClaimSequences()
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Migration failed"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
