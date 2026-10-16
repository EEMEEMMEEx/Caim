import { NextRequest } from "next/server"
import {
  GET as handleTicketsGet,
  PUT as handleTicketsPut,
  DELETE as handleTicketsDelete,
} from "@/app/api/tickets/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/claims/:id
 * Fetches single claim record by ID from authoritative MongoDB / disk store
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const url = new URL(request.url)
  url.searchParams.set("id", id)
  const modifiedReq = new NextRequest(url.toString(), {
    headers: request.headers,
    method: "GET",
  })
  return handleTicketsGet(modifiedReq)
}

/**
 * PUT /api/claims/:id
 * Updates claim record by ID with all modified fields
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const rawBody = await request.json().catch(() => ({}))
  const body = { ...rawBody, id: id || rawBody.id }
  const url = new URL(request.url)
  url.searchParams.set("id", id)
  const modifiedReq = new NextRequest(url.toString(), {
    method: "PUT",
    headers: request.headers,
    body: JSON.stringify(body),
  })
  return handleTicketsPut(modifiedReq)
}

/**
 * PATCH /api/claims/:id
 * Partial update for claim record by ID
 */
export const PATCH = PUT

/**
 * DELETE /api/claims/:id
 * Deletes claim record by ID
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const url = new URL(request.url)
  url.searchParams.set("id", id)
  const modifiedReq = new NextRequest(url.toString(), {
    headers: request.headers,
    method: "DELETE",
  })
  return handleTicketsDelete(modifiedReq)
}
