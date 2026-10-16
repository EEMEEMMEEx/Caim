import { NextRequest, NextResponse } from "next/server"
import {
  GET as handleTicketsGet,
  PUT as handleTicketsPut,
  DELETE as handleTicketsDelete,
} from "@/app/api/tickets/route"
import { claimPayloadSchema } from "@/lib/validations/claimSchema"
import { createTicketRecord } from "@/lib/tickets/createTicketRecord"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

import { peekNextClaimNumber } from "@/lib/sequences/claimSequence"

/**
 * GET /api/claims
 * Returns list of claims, single claim by ?id=, or next auto-sequence preview with ?action=next-sequence
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (
    searchParams.get("action") === "next-sequence" ||
    searchParams.get("action") === "next-number" ||
    searchParams.get("peek") === "true"
  ) {
    const nextClaimNumber = await peekNextClaimNumber()
    return NextResponse.json(
      {
        success: true,
        nextClaimNumber,
        format: "CLM-{YYYY}-{SEQ}",
      },
      { headers: NO_CACHE_HEADERS }
    )
  }

  return handleTicketsGet(request)
}

/**
 * POST /api/claims
 * Accepts new claim registration payload including 'ผู้เกี่ยวข้อง' (reporterName, assigneeName, remarks)
 * Validates with Zod schema and persists into central database and real-time event pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.clone().json().catch(() => null)
    if (rawBody) {
      const validation = claimPayloadSchema.safeParse(rawBody)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: "ข้อมูลแจ้งเคลมไม่ถูกต้องตามแบบฟอร์ม",
            details: validation.error.format(),
          },
          { status: 400, headers: NO_CACHE_HEADERS }
        )
      }
    }
  } catch (err) {
    console.warn("[Claims API] Payload pre-validation notice:", err)
  }

  return createTicketRecord(request)
}

/**
 * PUT /api/claims
 * Updates claim details or status
 */
export async function PUT(request: NextRequest) {
  return handleTicketsPut(request)
}

/**
 * PATCH /api/claims
 * Partial update for claim details or status
 */
export const PATCH = PUT

/**
 * DELETE /api/claims
 * Deletes claim by ?id=
 */
export async function DELETE(request: NextRequest) {
  return handleTicketsDelete(request)
}

