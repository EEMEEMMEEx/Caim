import { createHash, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

/**
 * API key guard for machine-to-machine access to POST /api/tickets
 * (Stock-Flow Integration Plan section 5.1).
 *
 * Contract: `Authorization: Bearer <CAIM_API_KEY>` where CAIM_API_KEY is a server-side
 * environment variable shared with the Stock-Flow Vercel project. Portal requests never
 * carry it — the browser uses POST /api/claims — because a shared secret must not reach
 * the client bundle.
 */
const BEARER_PREFIX = "Bearer "

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest()
}

/**
 * Constant-time comparison of two keys. Hashing first keeps the comparison independent of
 * both the candidate length and the expected length.
 */
function apiKeysMatch(candidate: string, expected: string): boolean {
  return timingSafeEqual(sha256(candidate), sha256(expected))
}

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")?.trim()
  if (!header || !header.startsWith(BEARER_PREFIX)) return null
  const token = header.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Returns the rejection response when the caller may not create tickets, or null when the
 * request passes. Fails closed: an unconfigured key rejects external calls (HTTP 503)
 * instead of silently letting anonymous clients through.
 */
export function requireCaimApiKey(request: NextRequest): NextResponse | null {
  const expectedKey = process.env.CAIM_API_KEY?.trim()

  if (!expectedKey) {
    console.error("[CAIM API Key] rejected POST /api/tickets: CAIM_API_KEY is not configured")
    return NextResponse.json(
      { success: false, error: "Service temporarily unavailable" },
      { status: 503, headers: NO_CACHE_HEADERS }
    )
  }

  const token = readBearerToken(request)
  if (!token || !apiKeysMatch(token, expectedKey)) {
    console.warn("[CAIM API Key] rejected POST /api/tickets: missing or invalid API key")
    return NextResponse.json(
      { success: false, error: "Unauthorized: a valid CAIM API key is required" },
      { status: 401, headers: NO_CACHE_HEADERS }
    )
  }

  return null
}
