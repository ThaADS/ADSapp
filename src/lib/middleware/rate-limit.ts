import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limit Configuration Options
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests allowed in window
  keyGenerator?: (req: NextRequest) => string // Custom key generator for rate limiting
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

/**
 * Rate Limit Store Entry
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * In-Memory Rate Limit Store
 * NOTE: In production, replace with Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Cleanup expired entries every 5 minutes
 */
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  },
  5 * 60 * 1000
)

/**
 * Create a rate limiting middleware function
 *
 * @param config - Rate limit configuration
 * @returns Middleware function that returns NextResponse on limit exceeded, null otherwise
 *
 * @example
 * ```typescript
 * const rateLimit = createRateLimiter({
 *   windowMs: 60000, // 1 minute
 *   maxRequests: 100 // 100 requests per minute
 * });
 *
 * export async function GET(request: NextRequest) {
 *   const limitResponse = await rateLimit(request);
 *   if (limitResponse) return limitResponse;
 *
 *   // Continue with normal request handling
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    // Generate rate limit key
    const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)

    const now = Date.now()
    const record = rateLimitStore.get(key)

    // Create new record if doesn't exist or expired
    if (!record || record.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })

      // Add rate limit headers to response
      const response = NextResponse.next()
      addRateLimitHeaders(
        response,
        config.maxRequests,
        config.maxRequests - 1,
        now + config.windowMs
      )
      return null
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    // Increment counter
    record.count++
    rateLimitStore.set(key, record)

    // Add rate limit headers
    const response = NextResponse.next()
    addRateLimitHeaders(
      response,
      config.maxRequests,
      config.maxRequests - record.count,
      record.resetTime
    )

    return null
  }
}

/**
 * Generate default rate limit key from request
 * Uses IP address and user agent for uniqueness
 */
function getDefaultKey(request: NextRequest): string {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Combine IP and first 50 chars of user agent
  return `${ip}:${userAgent.slice(0, 50)}`
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const vercelIp = request.headers.get('x-vercel-forwarded-for')

  return cfConnectingIp || vercelIp || forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const rateLimitConfigs = {
  // Standard API rate limit - 100 requests per minute
  standard: {
    windowMs: 60000,
    maxRequests: 100,
    message: 'Too many requests, please try again later',
  } as RateLimitConfig,

  // Strict rate limit for sensitive operations - 30 requests per minute
  strict: {
    windowMs: 60000,
    maxRequests: 30,
    message: 'Rate limit exceeded for this operation',
  } as RateLimitConfig,

  // Relaxed rate limit for read operations - 300 requests per minute
  relaxed: {
    windowMs: 60000,
    maxRequests: 300,
    message: 'Too many requests',
  } as RateLimitConfig,

  // Authentication rate limit - 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60000,
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  } as RateLimitConfig,

  // Password reset rate limit - 3 attempts per hour
  passwordReset: {
    windowMs: 60 * 60000,
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later',
  } as RateLimitConfig,

  // DDoS protection - 100 requests per second
  ddos: {
    windowMs: 1000,
    maxRequests: 100,
    message: 'Request rate too high, possible DDoS attack detected',
  } as RateLimitConfig,
}

/**
 * Create IP-based rate limiter
 * Rate limits based on IP address only
 */
export function createIpRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return createRateLimiter({
    ...config,
    keyGenerator: (request: NextRequest) => getClientIp(request),
  })
}

/**
 * Create user-based rate limiter
 * Rate limits based on authenticated user ID
 */
export function createUserRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return createRateLimiter({
    ...config,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      if (userId) {
        return `user:${userId}`
      }
      // Fallback to IP if user not authenticated
      return getClientIp(request)
    },
  })
}

/**
 * Create organization-based rate limiter
 * Rate limits based on organization ID
 */
export function createOrgRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return createRateLimiter({
    ...config,
    keyGenerator: (request: NextRequest) => {
      const orgId = request.headers.get('x-organization-id')
      if (orgId) {
        return `org:${orgId}`
      }
      // Fallback to IP if organization not available
      return getClientIp(request)
    },
  })
}

/**
 * Redis Client Interface
 * Compatible with ioredis and node-redis
 */
interface RedisClient {
  pipeline(): {
    incr(key: string): unknown
    pexpire(key: string, milliseconds: number): unknown
    exec(): Promise<Array<[Error | null, unknown]>>
  }
}

/**
 * Redis-Ready Rate Limiter Class
 * Drop-in replacement for production use with Redis
 *
 * Usage with Redis:
 * ```typescript
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL);
 * const rateLimiter = new RedisRateLimiter(redis);
 * ```
 */
export class RedisRateLimiter {
  private redis: RedisClient

  constructor(redisClient: RedisClient) {
    this.redis = redisClient
  }

  /**
   * Check if request is rate limited
   * Uses Redis for distributed rate limiting
   */
  async isRateLimited(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    limited: boolean
    remaining: number
    resetTime: number
  }> {
    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    const windowEnd = windowStart + config.windowMs
    const redisKey = `rate_limit:${key}:${windowStart}`

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline()
      pipeline.incr(redisKey)
      pipeline.pexpire(redisKey, config.windowMs)

      const results = await pipeline.exec()
      const count = results[0][1] as number

      if (count > config.maxRequests) {
        return {
          limited: true,
          remaining: 0,
          resetTime: windowEnd,
        }
      }

      return {
        limited: false,
        remaining: config.maxRequests - count,
        resetTime: windowEnd,
      }
    } catch (error) {
      console.error('Redis rate limiting error:', error)

      // Fallback to allowing request if Redis is unavailable
      // Better to allow traffic than block legitimate users
      return {
        limited: false,
        remaining: config.maxRequests,
        resetTime: windowEnd,
      }
    }
  }

  /**
   * Create a rate limiter middleware using Redis backend
   */
  createMiddleware(config: RateLimitConfig) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)

      const result = await this.isRateLimited(key, config)

      if (result.limited) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

        return NextResponse.json(
          {
            error: config.message || 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        )
      }

      const response = NextResponse.next()
      addRateLimitHeaders(response, config.maxRequests, result.remaining, result.resetTime)

      return null
    }
  }
}

/**
 * Helper function to combine multiple rate limiters
 * Useful for applying different rate limits to the same endpoint
 *
 * @example
 * ```typescript
 * const combinedLimit = combineRateLimiters([
 *   createIpRateLimiter(rateLimitConfigs.standard),
 *   createUserRateLimiter(rateLimitConfigs.strict)
 * ]);
 * ```
 */
export function combineRateLimiters(
  limiters: Array<(req: NextRequest) => Promise<NextResponse | null>>
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const limiter of limiters) {
      const result = await limiter(request)
      if (result) return result // Return first rate limit error
    }
    return null // All checks passed
  }
}
