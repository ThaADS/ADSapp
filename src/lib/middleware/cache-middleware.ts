/**
 * Cache Middleware for API Routes
 *
 * Automatic caching middleware for Next.js API routes
 * Features:
 * - Automatic cache-control headers
 * - Tenant-aware cache keys
 * - Query parameter normalization
 * - Cache invalidation on mutations
 * - Conditional caching based on method
 * - ETag support
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheManager } from '../cache/cache-manager'
import { createHash } from 'crypto'

export interface CacheMiddlewareConfig {
  enabled: boolean
  defaultTTL: number // seconds
  methods: string[] // HTTP methods to cache
  excludePaths: string[] // Paths to exclude from caching
  includePaths?: string[] // Only cache these paths
  cachePrivate: boolean // Cache private data (tenant-specific)
  useETag: boolean // Enable ETag support
  varyHeaders: string[] // Headers to include in cache key
}

export interface CachedResponse {
  status: number
  headers: Record<string, string>
  body: any
  etag?: string
}

const defaultConfig: CacheMiddlewareConfig = {
  enabled: true,
  defaultTTL: 300, // 5 minutes
  methods: ['GET', 'HEAD'],
  excludePaths: ['/api/webhooks', '/api/auth'],
  cachePrivate: true,
  useETag: true,
  varyHeaders: ['authorization', 'x-tenant-id'],
}

/**
 * Create cache middleware with configuration
 */
export function createCacheMiddleware(config: Partial<CacheMiddlewareConfig> = {}) {
  const mergedConfig = { ...defaultConfig, ...config }

  return async function cacheMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip if caching is disabled
    if (!mergedConfig.enabled) {
      return await handler(request)
    }

    // Skip if method is not cacheable
    if (!mergedConfig.methods.includes(request.method)) {
      return await handler(request)
    }

    // Skip if path is excluded
    const path = new URL(request.url).pathname
    if (shouldSkipCache(path, mergedConfig)) {
      return await handler(request)
    }

    // Generate cache key
    const cacheKey = generateCacheKey(request, mergedConfig)

    // Check for cached response
    const cachedResponse = await getCachedResponse(cacheKey)
    if (cachedResponse) {
      // Check ETag if enabled
      if (mergedConfig.useETag && cachedResponse.etag) {
        const ifNoneMatch = request.headers.get('if-none-match')
        if (ifNoneMatch === cachedResponse.etag) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              'cache-control': `private, max-age=${mergedConfig.defaultTTL}`,
              etag: cachedResponse.etag,
            },
          })
        }
      }

      // Return cached response
      return createResponseFromCache(cachedResponse, mergedConfig)
    }

    // Execute handler
    const response = await handler(request)

    // Cache successful responses
    if (response.status >= 200 && response.status < 300) {
      await cacheResponse(cacheKey, response, mergedConfig)
    }

    return response
  }
}

/**
 * Check if path should skip cache
 */
function shouldSkipCache(path: string, config: CacheMiddlewareConfig): boolean {
  // Check exclude paths
  for (const excludePath of config.excludePaths) {
    if (path.startsWith(excludePath)) {
      return true
    }
  }

  // Check include paths (if specified)
  if (config.includePaths && config.includePaths.length > 0) {
    let shouldInclude = false
    for (const includePath of config.includePaths) {
      if (path.startsWith(includePath)) {
        shouldInclude = true
        break
      }
    }
    return !shouldInclude
  }

  return false
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request: NextRequest, config: CacheMiddlewareConfig): string {
  const url = new URL(request.url)
  const path = url.pathname

  // Get tenant ID from headers or query
  const tenantId = request.headers.get('x-tenant-id') || url.searchParams.get('tenant') || 'default'

  // Normalize query parameters (sort alphabetically)
  const sortedParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  // Include relevant headers in cache key
  const headerParts: string[] = []
  for (const header of config.varyHeaders) {
    const value = request.headers.get(header)
    if (value) {
      headerParts.push(`${header}:${value}`)
    }
  }

  // Combine all parts
  const keyParts = [tenantId, 'api-cache', path, sortedParams, ...headerParts].filter(Boolean)

  return keyParts.join(':')
}

/**
 * Get cached response
 */
async function getCachedResponse(cacheKey: string): Promise<CachedResponse | null> {
  try {
    const manager = getCacheManager()
    const [tenant, ...rest] = cacheKey.split(':')

    const result = await manager.get<CachedResponse>(
      tenant,
      'api-cache',
      rest.join(':'),
      async () => {
        return null as any // Return null to indicate cache miss
      }
    )

    return result.data
  } catch (error) {
    console.error('[CacheMiddleware] Get cache error:', error)
    return null
  }
}

/**
 * Cache response
 */
async function cacheResponse(
  cacheKey: string,
  response: NextResponse,
  config: CacheMiddlewareConfig
): Promise<void> {
  try {
    const manager = getCacheManager()
    const [tenant, ...rest] = cacheKey.split(':')

    // Clone response to read body
    const clonedResponse = response.clone()
    const body = await clonedResponse.json().catch(() => null)

    if (!body) return // Skip caching if body can't be parsed

    // Generate ETag if enabled
    let etag: string | undefined
    if (config.useETag) {
      etag = generateETag(body)
    }

    // Extract headers
    const headers: Record<string, string> = {}
    clonedResponse.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Create cached response
    const cachedResponse: CachedResponse = {
      status: response.status,
      headers,
      body,
      etag,
    }

    // Store in cache
    await manager.set(tenant, 'api-cache', rest.join(':'), cachedResponse)
  } catch (error) {
    console.error('[CacheMiddleware] Cache response error:', error)
  }
}

/**
 * Create response from cached data
 */
function createResponseFromCache(
  cached: CachedResponse,
  config: CacheMiddlewareConfig
): NextResponse {
  const headers: Record<string, string> = {
    ...cached.headers,
    'x-cache': 'HIT',
    'cache-control': config.cachePrivate
      ? `private, max-age=${config.defaultTTL}`
      : `public, max-age=${config.defaultTTL}`,
  }

  if (cached.etag) {
    headers['etag'] = cached.etag
  }

  return NextResponse.json(cached.body, {
    status: cached.status,
    headers,
  })
}

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
  const content = JSON.stringify(body)
  const hash = createHash('md5').update(content).digest('hex')
  return `"${hash}"`
}

/**
 * Invalidate cache for specific path pattern
 */
export async function invalidateApiCache(tenant: string, pathPattern: string): Promise<number> {
  try {
    const manager = getCacheManager()
    const pattern = `${tenant}:api-cache:${pathPattern}*`

    // This would need to be implemented in cache-manager
    // For now, invalidate entire api-cache for tenant
    return await manager.invalidate(tenant, 'api-cache')
  } catch (error) {
    console.error('[CacheMiddleware] Invalidate error:', error)
    return 0
  }
}

/**
 * Helper to add cache headers to response
 */
export function addCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number
    sMaxAge?: number
    private?: boolean
    noStore?: boolean
    mustRevalidate?: boolean
  } = {}
): NextResponse {
  const {
    maxAge = 300,
    sMaxAge,
    private: isPrivate = false,
    noStore = false,
    mustRevalidate = false,
  } = options

  const directives: string[] = []

  if (noStore) {
    directives.push('no-store')
  } else {
    if (isPrivate) {
      directives.push('private')
    } else {
      directives.push('public')
    }

    directives.push(`max-age=${maxAge}`)

    if (sMaxAge !== undefined) {
      directives.push(`s-maxage=${sMaxAge}`)
    }

    if (mustRevalidate) {
      directives.push('must-revalidate')
    }
  }

  response.headers.set('cache-control', directives.join(', '))
  return response
}

/**
 * Helper to prevent caching
 */
export function preventCache(response: NextResponse): NextResponse {
  return addCacheHeaders(response, {
    noStore: true,
  })
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CacheMiddlewareConfig>
) {
  const middleware = createCacheMiddleware(config)
  return async (req: NextRequest) => {
    return middleware(req, handler)
  }
}

/**
 * Cache invalidation middleware for mutations
 */
export function withCacheInvalidation(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    resourceType: string
    getTenantId: (req: NextRequest) => string | null
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Execute handler
    const response = await handler(req)

    // Invalidate cache on successful mutations
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      response.status >= 200 &&
      response.status < 300
    ) {
      const tenantId = options.getTenantId(req)
      if (tenantId) {
        await invalidateApiCache(tenantId, options.resourceType)
        console.log(`[CacheMiddleware] Invalidated cache for ${tenantId}:${options.resourceType}`)
      }
    }

    return response
  }
}
