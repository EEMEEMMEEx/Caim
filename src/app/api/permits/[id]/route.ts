import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { PATCH as handlePermitPatch } from "@/app/api/rma/permit/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

/**
 * Dedicated REST endpoint: PATCH /api/permits/:id
 * Routes to the canonical permit date update handler
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Enrich body with permit identifier from path parameter
    const enrichedBody = {
      ...body,
      permitNo: id || body.permitNo,
      id: id || body.id,
    }

    const modifiedRequest = new NextRequest(request.url, {
      method: "PATCH",
      headers: request.headers,
      body: JSON.stringify(enrichedBody),
    })

    return await handlePermitPatch(modifiedRequest)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to patch permit"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
