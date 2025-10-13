/**
 * Cache Library - Central Export
 *
 * Production-ready caching system with Upstash Redis
 * - Multi-layer caching (L1/L2/L3)
 * - Automatic invalidation
 * - Performance monitoring
 * - Rate limiting
 */

// Core cache functionality
export {
  CacheManager,
  getCacheManager,
  getCached,
  setCached,
  deleteCached,
  invalidateCache,
  resetCacheManager,
  type CacheManagerConfig,
  type CacheEntry,
  type CachePerformance,
} from './cache-manager';

// L1 in-memory cache
export {
  L1Cache,
  getL1Cache,
  resetL1Cache,
  type L1CacheEntry,
  type L1CacheConfig,
  type L1CacheStats,
} from './l1-cache';

// Redis client
export {
  initializeRedis,
  getRedisClient,
  isRedisAvailable,
  getCached as getRedisCached,
  setCached as setRedisCached,
  deleteCached as deleteRedisCached,
  deletePattern,
  existsCached,
  expire,
  ttl,
  increment,
  decrement,
  mset,
  mget,
  flushAll,
  getCacheStats,
  resetCacheStats,
  getCacheHitRate,
  closeRedis,
  generateCacheKey,
  parseCacheKey,
  type CacheOptions,
  type CacheStats,
  type RedisConfig,
  type Redis,
} from './redis-client';

// Cache invalidation
export {
  CacheInvalidation,
  getInvalidationManager,
  invalidateAfterCreate,
  invalidateAfterUpdate,
  invalidateAfterDelete,
  invalidateMultiple,
  invalidateTenant,
  TagBasedInvalidation,
  getTagInvalidation,
  CacheWarmer,
  getCacheWarmer,
  warmDashboardStats,
  type InvalidationRule,
  type InvalidationEvent,
} from './invalidation';

// Cache analytics
export {
  CacheAnalytics,
  getCacheAnalytics,
  startMetricsCollection,
  getCachePerformanceSummary,
  checkCacheHealth,
  exportMetrics,
  type CacheMetrics,
  type CacheHealthStatus,
  type CacheCostAnalysis,
} from './analytics';
