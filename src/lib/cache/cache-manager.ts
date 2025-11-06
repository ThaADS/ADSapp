/**
 * Multi-Layer Cache Manager
 *
 * Implements 3-layer caching strategy:
 * - L1: In-memory cache (1 minute TTL) - Hot data
 * - L2: Redis cache (15 minutes TTL) - Shared data
 * - L3: Database (Source of truth) - Persistent data
 *
 * Features:
 * - Automatic cache warming
 * - Smart invalidation
 * - Cache-aside pattern
 * - Write-through option
 * - Tenant isolation
 * - Performance monitoring
 */

import { L1Cache, getL1Cache } from './l1-cache'
import {
  getCached as getRedis,
  setCached as setRedis,
  deleteCached as deleteRedis,
  deletePattern,
  generateCacheKey,
  isRedisAvailable,
} from './redis-client'

export interface CacheManagerConfig {
  l1Enabled: boolean
  l2Enabled: boolean
  l1TTL: number // seconds
  l2TTL: number // seconds
  enableMonitoring: boolean
  writeThrough: boolean // Update cache on write
  warmOnMiss: boolean // Warm cache on read miss
}

export interface CacheEntry<T> {
  data: T
  metadata: {
    tenant: string
    resource: string
    cachedAt: number
    source: 'l1' | 'l2' | 'l3'
  }
}

export interface CachePerformance {
  l1HitRate: number
  l2HitRate: number
  averageLatency: number
  totalRequests: number
  l1Hits: number
  l2Hits: number
  l3Hits: number
}

/**
 * Cache Manager implementing multi-layer strategy
 */
export class CacheManager {
  private l1Cache: L1Cache
  private config: CacheManagerConfig
  private performance: CachePerformance

  constructor(config?: Partial<CacheManagerConfig>) {
    this.config = {
      l1Enabled: config?.l1Enabled ?? true,
      l2Enabled: config?.l2Enabled ?? true,
      l1TTL: config?.l1TTL || 60, // 1 minute
      l2TTL: config?.l2TTL || 900, // 15 minutes
      enableMonitoring: config?.enableMonitoring ?? true,
      writeThrough: config?.writeThrough ?? true,
      warmOnMiss: config?.warmOnMiss ?? true,
    }

    this.l1Cache = getL1Cache()
    this.performance = {
      l1HitRate: 0,
      l2HitRate: 0,
      averageLatency: 0,
      totalRequests: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
    }
  }

  /**
   * Get cached data with multi-layer fallback
   */
  async get<T>(
    tenant: string,
    resource: string,
    id: string | undefined,
    fetchFn: () => Promise<T>
  ): Promise<CacheEntry<T>> {
    const startTime = Date.now()
    const cacheKey = generateCacheKey(tenant, resource, id)

    try {
      // L1: Check in-memory cache
      if (this.config.l1Enabled) {
        const l1Data = this.l1Cache.get<T>(cacheKey)
        if (l1Data !== null) {
          this.recordHit('l1', startTime)
          return this.wrapEntry(l1Data, tenant, resource, 'l1')
        }
      }

      // L2: Check Redis cache
      if (this.config.l2Enabled) {
        const l2Data = await getRedis<T>(cacheKey)
        if (l2Data !== null) {
          // Warm L1 cache
          if (this.config.l1Enabled && this.config.warmOnMiss) {
            this.l1Cache.set(cacheKey, l2Data, this.config.l1TTL)
          }

          this.recordHit('l2', startTime)
          return this.wrapEntry(l2Data, tenant, resource, 'l2')
        }
      }

      // L3: Fetch from database
      const l3Data = await fetchFn()

      // Store in all cache layers (write-through)
      if (this.config.writeThrough) {
        await this.set(tenant, resource, id, l3Data)
      }

      this.recordHit('l3', startTime)
      return this.wrapEntry(l3Data, tenant, resource, 'l3')
    } catch (error) {
      console.error('[CacheManager] Get error:', error)
      // Fallback to database on cache failure
      const data = await fetchFn()
      this.recordHit('l3', startTime)
      return this.wrapEntry(data, tenant, resource, 'l3')
    }
  }

  /**
   * Set data in cache layers
   */
  async set<T>(tenant: string, resource: string, id: string | undefined, data: T): Promise<void> {
    const cacheKey = generateCacheKey(tenant, resource, id)

    try {
      // L1: Store in memory
      if (this.config.l1Enabled) {
        this.l1Cache.set(cacheKey, data, this.config.l1TTL)
      }

      // L2: Store in Redis
      if (this.config.l2Enabled) {
        await setRedis(cacheKey, data, { ttl: this.config.l2TTL })
      }

      if (this.config.enableMonitoring) {
        console.log(`[CacheManager] SET: ${cacheKey}`)
      }
    } catch (error) {
      console.error('[CacheManager] Set error:', error)
      // Non-critical error - cache set failure shouldn't break the app
    }
  }

  /**
   * Delete data from all cache layers
   */
  async delete(tenant: string, resource: string, id?: string): Promise<void> {
    const cacheKey = generateCacheKey(tenant, resource, id)

    try {
      // L1: Delete from memory
      if (this.config.l1Enabled) {
        this.l1Cache.delete(cacheKey)
      }

      // L2: Delete from Redis
      if (this.config.l2Enabled) {
        await deleteRedis(cacheKey)
      }

      if (this.config.enableMonitoring) {
        console.log(`[CacheManager] DELETE: ${cacheKey}`)
      }
    } catch (error) {
      console.error('[CacheManager] Delete error:', error)
    }
  }

  /**
   * Invalidate all cache entries for a tenant and resource
   */
  async invalidate(tenant: string, resource?: string): Promise<number> {
    try {
      const pattern = resource ? `${tenant}:${resource}:*` : `${tenant}:*`

      let count = 0

      // L1: Clear matching keys
      if (this.config.l1Enabled) {
        const keys = this.l1Cache.keys()
        for (const key of keys) {
          if (this.matchesPattern(key, pattern)) {
            this.l1Cache.delete(key)
            count++
          }
        }
      }

      // L2: Clear matching keys in Redis
      if (this.config.l2Enabled) {
        const redisCount = await deletePattern(pattern)
        count += redisCount
      }

      if (this.config.enableMonitoring) {
        console.log(`[CacheManager] INVALIDATE: ${pattern} (${count} keys)`)
      }

      return count
    } catch (error) {
      console.error('[CacheManager] Invalidate error:', error)
      return 0
    }
  }

  /**
   * Warm cache with data
   */
  async warm<T>(
    tenant: string,
    resource: string,
    items: Array<{ id?: string; data: T }>
  ): Promise<void> {
    try {
      for (const item of items) {
        await this.set(tenant, resource, item.id, item.data)
      }

      if (this.config.enableMonitoring) {
        console.log(`[CacheManager] WARM: ${tenant}:${resource} (${items.length} items)`)
      }
    } catch (error) {
      console.error('[CacheManager] Warm error:', error)
    }
  }

  /**
   * Get cache performance metrics
   */
  getPerformance(): CachePerformance {
    this.updateHitRates()
    return { ...this.performance }
  }

  /**
   * Reset performance metrics
   */
  resetPerformance(): void {
    this.performance = {
      l1HitRate: 0,
      l2HitRate: 0,
      averageLatency: 0,
      totalRequests: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
    }
  }

  /**
   * Check cache health
   */
  async healthCheck(): Promise<{
    l1Available: boolean
    l2Available: boolean
    overall: 'healthy' | 'degraded' | 'down'
  }> {
    const l1Available = true // L1 is always available (in-memory)
    const l2Available = await isRedisAvailable()

    let overall: 'healthy' | 'degraded' | 'down'
    if (l1Available && l2Available) {
      overall = 'healthy'
    } else if (l1Available || l2Available) {
      overall = 'degraded'
    } else {
      overall = 'down'
    }

    return { l1Available, l2Available, overall }
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheManagerConfig {
    return { ...this.config }
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Wrap data in cache entry format
   */
  private wrapEntry<T>(
    data: T,
    tenant: string,
    resource: string,
    source: 'l1' | 'l2' | 'l3'
  ): CacheEntry<T> {
    return {
      data,
      metadata: {
        tenant,
        resource,
        cachedAt: Date.now(),
        source,
      },
    }
  }

  /**
   * Record cache hit and update metrics
   */
  private recordHit(layer: 'l1' | 'l2' | 'l3', startTime: number): void {
    this.performance.totalRequests++

    if (layer === 'l1') {
      this.performance.l1Hits++
    } else if (layer === 'l2') {
      this.performance.l2Hits++
    } else {
      this.performance.l3Hits++
    }

    // Update average latency
    const latency = Date.now() - startTime
    const total = this.performance.totalRequests
    const currentAvg = this.performance.averageLatency
    this.performance.averageLatency = (currentAvg * (total - 1) + latency) / total
  }

  /**
   * Update hit rate calculations
   */
  private updateHitRates(): void {
    const total = this.performance.totalRequests
    if (total > 0) {
      this.performance.l1HitRate = (this.performance.l1Hits / total) * 100
      this.performance.l2HitRate =
        ((this.performance.l1Hits + this.performance.l2Hits) / total) * 100
    }
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(key)
  }
}

// Global cache manager instance
let globalCacheManager: CacheManager | null = null

/**
 * Get global cache manager instance
 */
export function getCacheManager(config?: Partial<CacheManagerConfig>): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager(config)
  }
  return globalCacheManager
}

/**
 * Reset global cache manager instance
 */
export function resetCacheManager(): void {
  globalCacheManager = null
}

/**
 * Helper function for simple cached get
 */
export async function getCached<T>(
  tenant: string,
  resource: string,
  id: string | undefined,
  fetchFn: () => Promise<T>
): Promise<T> {
  const manager = getCacheManager()
  const result = await manager.get(tenant, resource, id, fetchFn)
  return result.data
}

/**
 * Helper function for simple cached set
 */
export async function setCached<T>(
  tenant: string,
  resource: string,
  id: string | undefined,
  data: T
): Promise<void> {
  const manager = getCacheManager()
  await manager.set(tenant, resource, id, data)
}

/**
 * Helper function for simple cached delete
 */
export async function deleteCached(tenant: string, resource: string, id?: string): Promise<void> {
  const manager = getCacheManager()
  await manager.delete(tenant, resource, id)
}

/**
 * Helper function for cache invalidation
 */
export async function invalidateCache(tenant: string, resource?: string): Promise<number> {
  const manager = getCacheManager()
  return await manager.invalidate(tenant, resource)
}

// Export default instance
export default getCacheManager()
