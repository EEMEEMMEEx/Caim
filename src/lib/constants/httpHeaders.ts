/**
 * Standard HTTP Cache-Control headers to completely eliminate edge, CDN, and browser caching
 * for dynamic API routes deployed on Vercel or running locally.
 */
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
  "X-Accel-Buffering": "no",
} as const

/**
 * Edge CDN cache headers for static reference and master catalog data (e.g., Stations, Equipments)
 * Absorbs read invocations at Vercel Edge without triggering Serverless Function execution.
 */
export const STATIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const

/**
 * Micro-cache headers for high-frequency aggregated dashboard metrics
 * Deduplicates burst requests across concurrent tabs at the Edge CDN.
 */
export const METRICS_MICROCACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10",
} as const

