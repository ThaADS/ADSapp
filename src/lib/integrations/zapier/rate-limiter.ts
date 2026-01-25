/**
 * Rate Limiter for Zapier API Endpoints
 *
 * Implements sliding window rate limiting with in-memory storage.
 * Protects APIs from abuse while meeting Zapier's rate limit requirements.
 */

// =====================================================
// Rate Limit Configuration
// =====================================================

export const RATE_LIMITS = {
  oauth: {
    window: 60, // 1 minute
    max: 20, // 20 requests per minute per IP
  },
  actions: {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute per token
  },
  subscribe: {
    window: 60, // 1 minute
    max: 10, // 10 requests per minute per token
  },
  webhooks: {
    window: 300, // 5 minutes
    max: 20000, // 20,000 requests per 5 minutes per user
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

// =====================================================
// Types
// =====================================================

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp (seconds)
  retryAfter?: number // Seconds until next allowed request (only if !allowed)
}

interface RateLimitEntry {
  requests: number[]
  resetAt: number
}

// =====================================================
// In-Memory Storage
// =====================================================

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

// =====================================================
// Rate Limit Check
// =====================================================

/**
 * Check if a request is allowed under rate limits
 * Uses sliding window algorithm with in-memory storage
 *
 * @param identifier - Unique identifier (token hash or IP address)
 * @param type - Type of rate limit to apply
 * @returns Rate limit result with headers
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType
): RateLimitResult {
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const windowStart = now - config.window * 1000
  const resetAt = now + config.window * 1000

  // Get or create entry
  let entry = rateLimitStore.get(identifier)
  if (!entry || entry.resetAt < now) {
    entry = {
      requests: [],
      resetAt,
    }
    rateLimitStore.set(identifier, entry)
  }

  // Remove requests outside the sliding window
  entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart)

  // Check if limit exceeded
  const allowed = entry.requests.length < config.max
  const remaining = Math.max(0, config.max - entry.requests.length)

  // Record this request if allowed
  if (allowed) {
    entry.requests.push(now)
  }

  // Calculate retry after (seconds until oldest request expires)
  const retryAfter = !allowed && entry.requests.length > 0
    ? Math.ceil((entry.requests[0] + config.window * 1000 - now) / 1000)
    : undefined

  return {
    allowed,
    limit: config.max,
    remaining: allowed ? remaining - 1 : 0, // Subtract 1 for current request
    reset: Math.floor(resetAt / 1000), // Unix timestamp in seconds
    retryAfter,
  }
}

// =====================================================
// Response Helpers
// =====================================================

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

/**
 * Create a 429 Too Many Requests response with rate limit headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: 'rate_limit_exceeded',
      message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      limit: result.limit,
      reset: result.reset,
    },
    {
      status: 429,
      headers: getRateLimitHeaders(result),
    }
  )
}
