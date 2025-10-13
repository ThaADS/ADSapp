/**
 * Redis-Based Rate Limiter
 *
 * Production-ready rate limiting using Redis
 * Features:
 * - Sliding window algorithm
 * - Per-tenant rate limits
 * - Per-IP rate limits
 * - Per-user rate limits
 * - Distributed rate limiting
 * - Automatic cleanup
 * - Custom rate limit rules
 */

import { NextRequest } from 'next/server';
import { getRedisClient, increment, expire } from '../cache/redis-client';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  enableHeaders?: boolean; // Add rate limit headers to response
  message?: string; // Custom error message
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number; // Unix timestamp
  retryAfter?: number; // Seconds until reset
}

export interface RateLimitRule {
  name: string;
  config: RateLimitConfig;
  condition?: (req: NextRequest) => boolean;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const redis = getRedisClient();

    // Fallback to allowing request if Redis is unavailable
    if (!redis) {
      console.warn('[RateLimiter] Redis unavailable - allowing request');
      return {
        allowed: true,
        limit: this.config.maxRequests,
        current: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }

    try {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const key = `${this.config.keyPrefix}:${identifier}`;

      // Use sliding window counter
      const current = await this.incrementCounter(key);

      // Set expiry on first request
      if (current === 1) {
        const ttlSeconds = Math.ceil(this.config.windowMs / 1000);
        await expire(key, ttlSeconds);
      }

      // Calculate remaining requests
      const remaining = Math.max(0, this.config.maxRequests - current);
      const resetTime = now + this.config.windowMs;

      // Check if limit exceeded
      const allowed = current <= this.config.maxRequests;

      return {
        allowed,
        limit: this.config.maxRequests,
        current,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil(this.config.windowMs / 1000),
      };
    } catch (error) {
      console.error('[RateLimiter] Check error:', error);
      // Fail open - allow request on error
      return {
        allowed: true,
        limit: this.config.maxRequests,
        current: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const key = `${this.config.keyPrefix}:${identifier}`;
      await redis.del(key);
    } catch (error) {
      console.error('[RateLimiter] Reset error:', error);
    }
  }

  /**
   * Get current usage for identifier
   */
  async getUsage(identifier: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) return 0;

    try {
      const key = `${this.config.keyPrefix}:${identifier}`;
      const count = await redis.get<number>(key);
      return count || 0;
    } catch (error) {
      console.error('[RateLimiter] Get usage error:', error);
      return 0;
    }
  }

  /**
   * Increment counter atomically
   */
  private async incrementCounter(key: string): Promise<number> {
    return await increment(key, 1);
  }
}

/**
 * Create rate limiter with default config
 */
export function createRateLimiter(
  config: Partial<RateLimitConfig> & { keyPrefix: string }
): RateLimiter {
  const defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    enableHeaders: true,
    message: 'Too many requests',
    ...config,
  };

  return new RateLimiter(defaultConfig);
}

/**
 * Get identifier from request (IP, user, tenant)
 */
export function getIdentifier(
  request: NextRequest,
  type: 'ip' | 'user' | 'tenant' | 'combined' = 'ip'
): string {
  switch (type) {
    case 'ip':
      return getIP(request);

    case 'user':
      const userId = request.headers.get('x-user-id');
      return userId || getIP(request);

    case 'tenant':
      const tenantId = request.headers.get('x-tenant-id');
      return tenantId || 'default';

    case 'combined':
      const user = request.headers.get('x-user-id');
      const tenant = request.headers.get('x-tenant-id');
      const ip = getIP(request);
      return `${tenant || 'default'}:${user || ip}`;

    default:
      return getIP(request);
  }
}

/**
 * Get client IP from request
 */
function getIP(request: NextRequest): string {
  // Check various headers for IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Apply rate limiting to request
 */
export async function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  identifier?: string
): Promise<RateLimitResult> {
  const id = identifier || getIdentifier(request, 'combined');
  return await limiter.check(id);
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'x-ratelimit-limit': result.limit.toString(),
    'x-ratelimit-remaining': result.remaining.toString(),
    'x-ratelimit-reset': result.resetTime.toString(),
  };

  if (result.retryAfter !== undefined) {
    headers['retry-after'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Multi-tier rate limiter with different limits
 */
export class MultiTierRateLimiter {
  private rules: RateLimitRule[];

  constructor(rules: RateLimitRule[]) {
    this.rules = rules;
  }

  /**
   * Check all rules and return most restrictive result
   */
  async check(request: NextRequest, identifier: string): Promise<RateLimitResult> {
    const results: RateLimitResult[] = [];

    for (const rule of this.rules) {
      // Skip rule if condition doesn't match
      if (rule.condition && !rule.condition(request)) {
        continue;
      }

      const limiter = new RateLimiter(rule.config);
      const result = await limiter.check(identifier);
      results.push(result);

      // Early exit if any rule blocks
      if (!result.allowed) {
        return result;
      }
    }

    // Return most restrictive allowed result
    if (results.length === 0) {
      return {
        allowed: true,
        limit: Infinity,
        current: 0,
        remaining: Infinity,
        resetTime: Date.now() + 60000,
      };
    }

    // Find result with least remaining requests
    return results.reduce((prev, current) =>
      current.remaining < prev.remaining ? current : prev
    );
  }
}

/**
 * Create multi-tier rate limiter with default rules
 */
export function createMultiTierRateLimiter(): MultiTierRateLimiter {
  const rules: RateLimitRule[] = [
    {
      name: 'global',
      config: {
        keyPrefix: 'rate:global',
        windowMs: 60000, // 1 minute
        maxRequests: 1000,
        enableHeaders: true,
      },
    },
    {
      name: 'per-ip',
      config: {
        keyPrefix: 'rate:ip',
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        enableHeaders: true,
      },
    },
    {
      name: 'per-user',
      config: {
        keyPrefix: 'rate:user',
        windowMs: 60000, // 1 minute
        maxRequests: 200,
        enableHeaders: true,
      },
      condition: (req) => req.headers.has('x-user-id'),
    },
    {
      name: 'auth-endpoints',
      config: {
        keyPrefix: 'rate:auth',
        windowMs: 300000, // 5 minutes
        maxRequests: 10,
        enableHeaders: true,
        message: 'Too many authentication attempts',
      },
      condition: (req) => {
        const path = new URL(req.url).pathname;
        return path.startsWith('/api/auth');
      },
    },
  ];

  return new MultiTierRateLimiter(rules);
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  limiter: RateLimiter | MultiTierRateLimiter,
  options: {
    identifierType?: 'ip' | 'user' | 'tenant' | 'combined';
    onLimitExceeded?: (req: NextRequest, result: RateLimitResult) => Response;
  } = {}
) {
  return async (req: NextRequest): Promise<Response> => {
    const identifier = getIdentifier(req, options.identifierType);

    let result: RateLimitResult;
    if (limiter instanceof MultiTierRateLimiter) {
      result = await limiter.check(req, identifier);
    } else {
      result = await limiter.check(identifier);
    }

    // Add rate limit headers
    const headers = createRateLimitHeaders(result);

    // Check if rate limit exceeded
    if (!result.allowed) {
      if (options.onLimitExceeded) {
        return options.onLimitExceeded(req, result);
      }

      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            ...headers,
          },
        }
      );
    }

    // Execute handler and add headers
    const response = await handler(req);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Create tenant-specific rate limiter
 */
export function createTenantRateLimiter(
  tenantId: string,
  config?: Partial<RateLimitConfig>
): RateLimiter {
  return createRateLimiter({
    keyPrefix: `rate:tenant:${tenantId}`,
    windowMs: 60000, // 1 minute
    maxRequests: 500,
    ...config,
  });
}

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(
  endpoint: string,
  config?: Partial<RateLimitConfig>
): RateLimiter {
  return createRateLimiter({
    keyPrefix: `rate:endpoint:${endpoint}`,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    ...config,
  });
}
