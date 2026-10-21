import { GET as realtimeGet } from "../../realtime/stream/route"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const maxDuration = 15

export async function GET(req: NextRequest) {
  return realtimeGet(req)
}
