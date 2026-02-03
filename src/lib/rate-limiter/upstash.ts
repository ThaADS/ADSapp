/**
 * Upstash Redis Rate Limiter
 * Phase 30: Input Validation & Security
 *
 * Serverless-compatible rate limiting using Upstash Redis
 * Works across multiple serverless instances (unlike in-memory rate limiting)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// REDIS CLIENT
// ============================================================================

/**
 * Singleton Redis client
 * Uses environment variables for configuration
 */
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN

  if (!url || !token) {
    console.warn('[RateLimiter] Upstash Redis credentials not configured, rate limiting disabled')
    return null
  }

  try {
    redis = new Redis({ url, token })
    return redis
  } catch (error) {
    console.error('[RateLimiter] Failed to initialize Redis client:', error)
    return null
  }
}

// ============================================================================
// RATE LIMITER CONFIGURATIONS
// ============================================================================

/**
 * Rate limiter presets for different use cases
 */
export const RateLimitPresets = {
  /** Standard API endpoint: 100 requests per minute */
  STANDARD: { requests: 100, window: '60 s' as const },

  /** Auth endpoints: 10 requests per minute (prevent brute force) */
  AUTH: { requests: 10, window: '60 s' as const },

  /** Strict: 5 requests per minute (sensitive operations) */
  STRICT: { requests: 5, window: '60 s' as const },

  /** Bulk operations: 10 requests per 10 minutes */
  BULK: { requests: 10, window: '10 m' as const },

  /** Webhooks: 1000 requests per minute (high throughput) */
  WEBHOOK: { requests: 1000, window: '60 s' as const },

  /** Public endpoints: 30 requests per minute */
  PUBLIC: { requests: 30, window: '60 s' as const },

  /** AI endpoints: 20 requests per minute (costly operations) */
  AI: { requests: 20, window: '60 s' as const },

  /** File upload: 10 requests per minute */
  UPLOAD: { requests: 10, window: '60 s' as const },

  /** Search: 60 requests per minute */
  SEARCH: { requests: 60, window: '60 s' as const },

  /** Export: 5 requests per hour */
  EXPORT: { requests: 5, window: '1 h' as const },
} as const

export type RateLimitPreset = keyof typeof RateLimitPresets

// ============================================================================
// RATE LIMITER CACHE
// ============================================================================

/**
 * Cache for rate limiter instances
 */
const rateLimiterCache = new Map<string, Ratelimit>()

/**
 * Creates or retrieves a cached rate limiter
 */
function getRateLimiter(
  prefix: string,
  requests: number,
  window: string
): Ratelimit | null {
  const client = getRedisClient()
  if (!client) return null

  const cacheKey = `${prefix}:${requests}:${window}`

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!
  }

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  })

  rateLimiterCache.set(cacheKey, limiter)
  return limiter
}

// ============================================================================
// IDENTIFIER EXTRACTION
// ============================================================================

/**
 * Extracts a unique identifier from the request for rate limiting
 */
export function getIdentifier(request: NextRequest, context?: { userId?: string; orgId?: string }): string {
  // Priority: User ID > Org ID > IP
  if (context?.userId) {
    return `user:${context.userId}`
  }

  if (context?.orgId) {
    return `org:${context.orgId}`
  }

  // Fall back to IP address
  const ip = getClientIP(request)
  return `ip:${ip}`
}

/**
 * Extracts client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }

  // Vercel edge
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }

  return 'unknown'
}

// ============================================================================
// RATE LIMITING FUNCTIONS
// ============================================================================

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp when the limit resets */
  reset: number
  /** Total limit for the window */
  limit: number
}

/**
 * Checks rate limit for a given identifier
 *
 * @param identifier - Unique identifier for the client
 * @param preset - Rate limit preset to use
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  preset: RateLimitPreset = 'STANDARD'
): Promise<RateLimitResult> {
  const config = RateLimitPresets[preset]
  const limiter = getRateLimiter(preset.toLowerCase(), config.requests, config.window)

  if (!limiter) {
    // If Redis not configured, allow request but log warning
    return {
      success: true,
      remaining: config.requests,
      reset: Date.now() + 60000,
      limit: config.requests,
    }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    }
  } catch (error) {
    console.error('[RateLimiter] Error checking rate limit:', error)
    // On error, allow request to prevent blocking legitimate users
    return {
      success: true,
      remaining: config.requests,
      reset: Date.now() + 60000,
      limit: config.requests,
    }
  }
}

/**
 * Checks rate limit with custom configuration
 */
export async function checkRateLimitCustom(
  identifier: string,
  requests: number,
  window: string,
  prefix: string = 'custom'
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(prefix, requests, window)

  if (!limiter) {
    return {
      success: true,
      remaining: requests,
      reset: Date.now() + 60000,
      limit: requests,
    }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    }
  } catch (error) {
    console.error('[RateLimiter] Error checking custom rate limit:', error)
    return {
      success: true,
      remaining: requests,
      reset: Date.now() + 60000,
      limit: requests,
    }
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Creates a rate limit error response
 */
export function rateLimitErrorResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

  return new NextResponse(
    JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        retryAfter,
        remaining: result.remaining,
        limit: result.limit,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(retryAfter),
      },
    }
  )
}

/**
 * Adds rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.reset))
  return response
}

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

/**
 * Options for rate limit middleware
 */
export interface RateLimitOptions {
  /** Rate limit preset to use */
  preset?: RateLimitPreset
  /** Custom identifier function */
  getIdentifier?: (request: NextRequest) => string | Promise<string>
  /** Custom requests per window */
  requests?: number
  /** Custom window (e.g., '60 s', '1 m', '1 h') */
  window?: string
  /** Whether to skip rate limiting in development */
  skipInDev?: boolean
}

/**
 * Rate limit middleware for API routes
 *
 * @example
 * ```typescript
 * export const POST = rateLimit({
 *   preset: 'AUTH',
 * })(async (request) => {
 *   // Handle request
 * })
 * ```
 */
export function rateLimit(options: RateLimitOptions = {}) {
  return function (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      // Skip in development if configured
      if (options.skipInDev && process.env.NODE_ENV === 'development') {
        return handler(request, context)
      }

      // Get identifier
      let identifier: string
      if (options.getIdentifier) {
        identifier = await options.getIdentifier(request)
      } else {
        identifier = getIdentifier(request)
      }

      // Check rate limit
      let result: RateLimitResult
      if (options.requests && options.window) {
        result = await checkRateLimitCustom(
          identifier,
          options.requests,
          options.window
        )
      } else {
        result = await checkRateLimit(identifier, options.preset || 'STANDARD')
      }

      // If rate limited, return error
      if (!result.success) {
        return rateLimitErrorResponse(result)
      }

      // Execute handler and add rate limit headers
      const response = await handler(request, context)
      return addRateLimitHeaders(response, result)
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Standard rate limit middleware (100 req/min)
 */
export const standardRateLimit = rateLimit({ preset: 'STANDARD' })

/**
 * Auth rate limit middleware (10 req/min)
 */
export const authRateLimit = rateLimit({ preset: 'AUTH' })

/**
 * Strict rate limit middleware (5 req/min)
 */
export const strictRateLimit = rateLimit({ preset: 'STRICT' })

/**
 * Webhook rate limit middleware (1000 req/min)
 */
export const webhookRateLimit = rateLimit({ preset: 'WEBHOOK' })

/**
 * Public endpoint rate limit middleware (30 req/min)
 */
export const publicRateLimit = rateLimit({ preset: 'PUBLIC' })

/**
 * AI endpoint rate limit middleware (20 req/min)
 */
export const aiRateLimit = rateLimit({ preset: 'AI' })

/**
 * Bulk operation rate limit middleware (10 req/10min)
 */
export const bulkRateLimit = rateLimit({ preset: 'BULK' })

/**
 * File upload rate limit middleware (10 req/min)
 */
export const uploadRateLimit = rateLimit({ preset: 'UPLOAD' })

/**
 * Export rate limit middleware (5 req/hour)
 */
export const exportRateLimit = rateLimit({ preset: 'EXPORT' })
