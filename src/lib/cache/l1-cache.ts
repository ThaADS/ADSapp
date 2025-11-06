/**
 * L1 In-Memory Cache Implementation
 *
 * Fast, local cache layer with automatic TTL management
 * Features:
 * - LRU eviction policy
 * - Automatic TTL cleanup
 * - Memory size management
 * - Hot data optimization
 * - Thread-safe operations
 */

export interface L1CacheEntry<T> {
  value: T
  expires: number
  size: number // Approximate size in bytes
  lastAccessed: number
}

export interface L1CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default TTL in seconds
  cleanupInterval: number // Cleanup interval in milliseconds
  enableStats: boolean // Enable statistics tracking
}

export interface L1CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  entries: number
  hitRate: number
}

/**
 * L1 Cache Implementation with LRU eviction
 */
export class L1Cache {
  private cache: Map<string, L1CacheEntry<any>>
  private config: L1CacheConfig
  private stats: L1CacheStats
  private cleanupTimer: NodeJS.Timeout | null = null
  private currentSize: number = 0

  constructor(config?: Partial<L1CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize || 10 * 1024 * 1024, // 10 MB default
      maxEntries: config?.maxEntries || 1000,
      defaultTTL: config?.defaultTTL || 60, // 1 minute default
      cleanupInterval: config?.cleanupInterval || 30000, // 30 seconds
      enableStats: config?.enableStats ?? true,
    }

    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
    }

    // Start automatic cleanup
    this.startCleanup()
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    // Cache miss
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++
        this.updateHitRate()
      }
      return null
    }

    // Check if expired
    if (entry.expires < Date.now()) {
      this.delete(key)
      if (this.config.enableStats) {
        this.stats.misses++
        this.updateHitRate()
      }
      return null
    }

    // Cache hit - update last accessed time (LRU)
    entry.lastAccessed = Date.now()
    if (this.config.enableStats) {
      this.stats.hits++
      this.updateHitRate()
    }

    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds || this.config.defaultTTL
    const size = this.estimateSize(value)

    // Check if we need to evict entries
    this.ensureCapacity(size)

    // Delete old entry if exists to update size
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!
      this.currentSize -= oldEntry.size
    }

    // Create new entry
    const entry: L1CacheEntry<T> = {
      value,
      expires: Date.now() + ttl * 1000,
      size,
      lastAccessed: Date.now(),
    }

    this.cache.set(key, entry)
    this.currentSize += size

    // Update stats
    if (this.config.enableStats) {
      this.stats.size = this.currentSize
      this.stats.entries = this.cache.size
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= entry.size
      this.cache.delete(key)

      if (this.config.enableStats) {
        this.stats.size = this.currentSize
        this.stats.entries = this.cache.size
      }
      return true
    }
    return false
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (entry.expires < Date.now()) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0

    if (this.config.enableStats) {
      this.stats.size = 0
      this.stats.entries = 0
    }
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    // Filter out expired keys
    const now = Date.now()
    const validKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires >= now) {
        validKeys.push(key)
      }
    }

    return validKeys
  }

  /**
   * Get cache statistics
   */
  getStats(): L1CacheStats {
    return { ...this.stats }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.currentSize,
      entries: this.cache.size,
      hitRate: 0,
    }
  }

  /**
   * Get cache configuration
   */
  getConfig(): L1CacheConfig {
    return { ...this.config }
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<L1CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
    }

    if (keysToDelete.length > 0 && this.config.enableStats) {
      console.log(`[L1 Cache] Cleaned up ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Ensure cache has capacity for new entry
   * Evict LRU entries if necessary
   */
  private ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU()
    }

    // Check size limit
    while (this.currentSize + newEntrySize > this.config.maxSize) {
      this.evictLRU()
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
      if (this.config.enableStats) {
        this.stats.evictions++
      }
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    try {
      // Rough estimation using JSON serialization
      const json = JSON.stringify(value)
      return json.length * 2 // UTF-16 encoding
    } catch {
      // Fallback for non-serializable values
      return 1024 // 1 KB default
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    if (total > 0) {
      this.stats.hitRate = (this.stats.hits / total) * 100
    }
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    this.stopCleanup()
    this.clear()
  }
}

// Global L1 cache instance
let globalL1Cache: L1Cache | null = null

/**
 * Get global L1 cache instance
 */
export function getL1Cache(config?: Partial<L1CacheConfig>): L1Cache {
  if (!globalL1Cache) {
    globalL1Cache = new L1Cache(config)
  }
  return globalL1Cache
}

/**
 * Reset global L1 cache instance
 */
export function resetL1Cache(): void {
  if (globalL1Cache) {
    globalL1Cache.destroy()
    globalL1Cache = null
  }
}

// Export default instance
export default getL1Cache()
