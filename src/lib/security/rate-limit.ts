import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum number of requests per window
  message?: string // Custom error message
  keyGenerator?: (request: NextRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  skipFailedRequests?: boolean // Skip counting failed requests
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  async isRateLimited(key: string, options: RateLimitOptions): Promise<{
    limited: boolean
    remaining: number
    resetTime: number
  }> {
    const now = Date.now()
    const windowStart = now
    const windowEnd = windowStart + options.windowMs

    // Get or create entry
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: windowEnd
      }
    }

    const entry = this.store[key]

    // Check if limit exceeded
    if (entry.count >= options.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment counter
    entry.count++

    return {
      limited: false,
      remaining: options.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }
}

const rateLimiter = new RateLimiter()

export function createRateLimit(options: RateLimitOptions) {
  return async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
    const key = options.keyGenerator
      ? options.keyGenerator(request)
      : getDefaultKey(request)

    const result = await rateLimiter.isRateLimited(key, options)

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', options.maxRequests.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())

    if (result.limited) {
      return NextResponse.json(
        {
          error: options.message || 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers
        }
      )
    }

    return null // Not rate limited
  }
}

function getDefaultKey(request: NextRequest): string {
  // Use IP address as default key
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // Include user agent to prevent simple IP spoofing
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `${ip}:${userAgent.slice(0, 50)}`
}

// Predefined rate limiters for common use cases
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
})

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'API rate limit exceeded'
})

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Rate limit exceeded'
})

export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 attempts per hour
  message: 'Too many password reset attempts, please try again later'
})

// Advanced rate limiting with Redis (for production use)
export class RedisRateLimiter {
  private redis: any

  constructor(redisClient: any) {
    this.redis = redisClient
  }

  async isRateLimited(key: string, options: RateLimitOptions): Promise<{
    limited: boolean
    remaining: number
    resetTime: number
  }> {
    const now = Date.now()
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs
    const windowEnd = windowStart + options.windowMs
    const redisKey = `rate_limit:${key}:${windowStart}`

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline()
      pipeline.incr(redisKey)
      pipeline.expire(redisKey, Math.ceil(options.windowMs / 1000))

      const results = await pipeline.exec()
      const count = results[0][1]

      if (count > options.maxRequests) {
        return {
          limited: true,
          remaining: 0,
          resetTime: windowEnd
        }
      }

      return {
        limited: false,
        remaining: options.maxRequests - count,
        resetTime: windowEnd
      }
    } catch (error) {
      console.error('Redis rate limiting error:', error)
      // Fallback to allowing the request if Redis is down
      return {
        limited: false,
        remaining: options.maxRequests,
        resetTime: windowEnd
      }
    }
  }
}

// DDOS protection
export const ddosProtection = createRateLimit({
  windowMs: 1000, // 1 second
  maxRequests: 100, // 100 requests per second
  message: 'Request rate too high, possible DDoS attack detected'
})

// IP-based rate limiting
export function createIpRateLimit(options: RateLimitOptions) {
  return createRateLimit({
    ...options,
    keyGenerator: (request: NextRequest) => {
      const forwarded = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      return forwarded?.split(',')[0] || realIp || 'unknown'
    }
  })
}

// User-based rate limiting (requires authentication)
export function createUserRateLimit(options: RateLimitOptions) {
  return createRateLimit({
    ...options,
    keyGenerator: (request: NextRequest) => {
      // Extract user ID from JWT token or session
      const authorization = request.headers.get('authorization')
      if (authorization) {
        try {
          // Parse JWT token to get user ID
          const token = authorization.replace('Bearer ', '')
          const payload = JSON.parse(atob(token.split('.')[1]))
          return `user:${payload.sub || payload.user_id}`
        } catch {
          // Fallback to IP if token is invalid
          return getDefaultKey(request)
        }
      }
      return getDefaultKey(request)
    }
  })
}

// Export the main rate limiter instance for custom use
export { rateLimiter }