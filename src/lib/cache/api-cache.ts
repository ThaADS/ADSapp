/**
 * API Response Caching Helper
 *
 * Provides high-level caching utilities for API routes
 * Features:
 * - Automatic cache key generation
 * - Query parameter normalization
 * - Cache invalidation
 * - TTL management
 * - Performance tracking
 */

import { getCached, setCached, deleteCached, deletePattern, generateCacheKey } from './redis-client'
import { NextRequest } from 'next/server'

export interface CacheConfig {
  ttl: number // Time to live in seconds
  tags?: string[] // Tags for cache invalidation
  keyPrefix?: string // Optional custom prefix
  skipCache?: boolean // Skip cache for this request
  cacheOnlySuccess?: boolean // Only cache successful responses
}

export interface CachedResponse<T> {
  data: T
  cached: boolean
  cacheAge?: number // Age in seconds
  ttl?: number
}

/**
 * Generate cache key from API request
 */
export function generateApiCacheKey(
  organizationId: string,
  resource: string,
  request?: NextRequest,
  additionalParams?: Record<string, any>
): string {
  const parts = [organizationId, resource]

  // Add query parameters if request provided
  if (request) {
    const { searchParams } = new URL(request.url)
    const params: Record<string, string> = {}

    // Sort params for consistent cache keys
    const sortedParams = Array.from(searchParams.keys()).sort()
    sortedParams.forEach(key => {
      params[key] = searchParams.get(key) || ''
    })

    if (Object.keys(params).length > 0) {
      const paramsString = JSON.stringify(params)
      parts.push(Buffer.from(paramsString).toString('base64url'))
    }
  }

  // Add additional params
  if (additionalParams && Object.keys(additionalParams).length > 0) {
    const additionalString = JSON.stringify(additionalParams)
    parts.push(Buffer.from(additionalString).toString('base64url'))
  }

  return parts.join(':')
}

/**
 * Cache an API response
 */
export async function cacheApiResponse<T>(
  key: string,
  data: T,
  config: CacheConfig
): Promise<boolean> {
  if (config.skipCache) return false

  const cachedData = {
    data,
    cachedAt: Date.now(),
    ttl: config.ttl,
    tags: config.tags || [],
  }

  return await setCached(key, cachedData, { ttl: config.ttl })
}

/**
 * Get cached API response
 */
export async function getCachedApiResponse<T>(
  key: string,
  config: Partial<CacheConfig> = {}
): Promise<CachedResponse<T> | null> {
  if (config.skipCache) return null

  const cached = await getCached<{
    data: T
    cachedAt: number
    ttl: number
    tags?: string[]
  }>(key)

  if (!cached) return null

  const cacheAge = Math.floor((Date.now() - cached.cachedAt) / 1000)

  return {
    data: cached.data,
    cached: true,
    cacheAge,
    ttl: cached.ttl,
  }
}

/**
 * Wrap API handler with caching
 */
export function withCache<T>(
  handler: (request: NextRequest) => Promise<T>,
  config: CacheConfig
) {
  return async (request: NextRequest): Promise<CachedResponse<T>> => {
    // Check if caching should be skipped
    if (config.skipCache || request.method !== 'GET') {
      const data = await handler(request)
      return { data, cached: false }
    }

    // Generate cache key (would need organization context)
    // This is a simplified example
    const cacheKey = config.keyPrefix || 'api'

    // Try to get from cache
    const cached = await getCachedApiResponse<T>(cacheKey, config)
    if (cached) {
      return cached
    }

    // Execute handler
    const data = await handler(request)

    // Cache the response
    if (!config.cacheOnlySuccess || isSuccessResponse(data)) {
      await cacheApiResponse(cacheKey, data, config)
    }

    return { data, cached: false }
  }
}

/**
 * Invalidate cache for an organization
 */
export async function invalidateOrganizationCache(
  organizationId: string,
  resource?: string
): Promise<number> {
  const pattern = resource
    ? `${organizationId}:${resource}:*`
    : `${organizationId}:*`

  return await deletePattern(pattern)
}

/**
 * Invalidate cache by tag
 */
export async function invalidateCacheByTag(tag: string): Promise<number> {
  // This requires storing tag->key mappings
  // For now, we'll use a pattern match
  return await deletePattern(`*:${tag}:*`)
}

/**
 * Check if response is successful
 */
function isSuccessResponse(response: any): boolean {
  if (typeof response === 'object' && response !== null) {
    // Next.js Response object
    if (response.status) {
      return response.status >= 200 && response.status < 300
    }
    // Custom response object
    if ('error' in response) {
      return !response.error
    }
  }
  return true
}

/**
 * Standard cache configurations for different resource types
 */
export const CacheConfigs = {
  // Frequently changing data
  conversations: {
    ttl: 30, // 30 seconds
    tags: ['conversations'],
  },
  // Semi-static data
  contacts: {
    ttl: 300, // 5 minutes
    tags: ['contacts'],
  },
  // Static-ish data
  templates: {
    ttl: 1800, // 30 minutes
    tags: ['templates'],
  },
  // Analytics data
  analytics: {
    ttl: 600, // 10 minutes
    tags: ['analytics'],
  },
  // Campaign data
  campaigns: {
    ttl: 300, // 5 minutes
    tags: ['campaigns'],
  },
  // Organization settings
  organization: {
    ttl: 900, // 15 minutes
    tags: ['organization'],
  },
  // User profiles
  profiles: {
    ttl: 600, // 10 minutes
    tags: ['profiles'],
  },
} as const

/**
 * Cache invalidation helpers
 */
export const invalidateCache = {
  contacts: (orgId: string) => invalidateOrganizationCache(orgId, 'contacts'),
  conversations: (orgId: string) => invalidateOrganizationCache(orgId, 'conversations'),
  templates: (orgId: string) => invalidateOrganizationCache(orgId, 'templates'),
  campaigns: (orgId: string) => invalidateOrganizationCache(orgId, 'campaigns'),
  analytics: (orgId: string) => invalidateOrganizationCache(orgId, 'analytics'),
  organization: (orgId: string) => invalidateOrganizationCache(orgId, 'organization'),
  all: (orgId: string) => invalidateOrganizationCache(orgId),
}

/**
 * Cache headers for HTTP responses
 */
export function getCacheHeaders(ttl: number): Record<string, string> {
  return {
    'Cache-Control': `private, max-age=${ttl}, must-revalidate`,
    'CDN-Cache-Control': `max-age=${ttl}`,
    'Vercel-CDN-Cache-Control': `max-age=${ttl}`,
  }
}

/**
 * Add cache hit header to response
 */
export function addCacheHitHeader(headers: Headers, hit: boolean, age?: number): void {
  headers.set('X-Cache', hit ? 'HIT' : 'MISS')
  if (hit && age !== undefined) {
    headers.set('X-Cache-Age', age.toString())
  }
}
