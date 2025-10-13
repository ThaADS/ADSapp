/**
 * Redis Client with Upstash Integration
 *
 * Production-ready Redis client using Upstash REST API
 * Features:
 * - Automatic connection pooling
 * - Comprehensive error handling
 * - Typed cache operations
 * - TTL management
 * - Monitoring hooks
 * - Graceful degradation
 */

import { Redis } from '@upstash/redis';

// Types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  nx?: boolean; // Only set if not exists
  xx?: boolean; // Only set if exists
  exat?: number; // Expire at Unix timestamp (seconds)
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
}

export interface RedisConfig {
  url: string;
  token: string;
  enableMonitoring?: boolean;
  enableFallback?: boolean;
  timeout?: number;
}

// Redis client singleton
let redisClient: Redis | null = null;
let clientConfig: RedisConfig | null = null;
let cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Initialize Redis client with Upstash
 */
export function initializeRedis(config?: Partial<RedisConfig>): Redis | null {
  try {
    // Return existing client if already initialized
    if (redisClient && clientConfig) {
      return redisClient;
    }

    // Get configuration from environment or provided config
    const url = config?.url || process.env.UPSTASH_REDIS_REST_URL;
    const token = config?.token || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[Redis] Upstash credentials not configured - cache disabled');
      return null;
    }

    clientConfig = {
      url,
      token,
      enableMonitoring: config?.enableMonitoring ?? true,
      enableFallback: config?.enableFallback ?? true,
      timeout: config?.timeout ?? 5000,
    };

    redisClient = new Redis({
      url: clientConfig.url,
      token: clientConfig.token,
      automaticDeserialization: true,
    });

    console.log('[Redis] Client initialized successfully');
    return redisClient;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    cacheStats.errors++;
    cacheStats.lastError = error instanceof Error ? error.message : 'Unknown error';
    cacheStats.lastErrorTime = Date.now();
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.ping();
    return true;
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

/**
 * Get value from Redis cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) {
      cacheStats.misses++;
      return null;
    }

    const value = await client.get<T>(key);

    if (value !== null) {
      cacheStats.hits++;
      if (clientConfig?.enableMonitoring) {
        console.log(`[Redis] Cache HIT: ${key}`);
      }
    } else {
      cacheStats.misses++;
      if (clientConfig?.enableMonitoring) {
        console.log(`[Redis] Cache MISS: ${key}`);
      }
    }

    return value;
  } catch (error) {
    console.error(`[Redis] Get error for key ${key}:`, error);
    cacheStats.errors++;
    cacheStats.lastError = error instanceof Error ? error.message : 'Unknown error';
    cacheStats.lastErrorTime = Date.now();
    return null;
  }
}

/**
 * Set value in Redis cache
 */
export async function setCached<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const setOptions: Record<string, any> = {};

    if (options?.ttl) {
      setOptions.ex = options.ttl; // Expire in seconds
    }
    if (options?.exat) {
      setOptions.exat = options.exat; // Expire at timestamp
    }
    if (options?.nx) {
      setOptions.nx = true; // Only set if not exists
    }
    if (options?.xx) {
      setOptions.xx = true; // Only set if exists
    }

    await client.set(key, value, setOptions);

    if (clientConfig?.enableMonitoring) {
      console.log(`[Redis] Cache SET: ${key} (TTL: ${options?.ttl || 'none'})`);
    }

    return true;
  } catch (error) {
    console.error(`[Redis] Set error for key ${key}:`, error);
    cacheStats.errors++;
    cacheStats.lastError = error instanceof Error ? error.message : 'Unknown error';
    cacheStats.lastErrorTime = Date.now();
    return false;
  }
}

/**
 * Delete value from Redis cache
 */
export async function deleteCached(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);

    if (clientConfig?.enableMonitoring) {
      console.log(`[Redis] Cache DELETE: ${key}`);
    }

    return true;
  } catch (error) {
    console.error(`[Redis] Delete error for key ${key}:`, error);
    cacheStats.errors++;
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deletePattern(pattern: string): Promise<number> {
  try {
    const client = getRedisClient();
    if (!client) return 0;

    // Get all keys matching pattern
    const keys = await client.keys(pattern);

    if (keys.length === 0) return 0;

    // Delete all matching keys
    await client.del(...keys);

    if (clientConfig?.enableMonitoring) {
      console.log(`[Redis] Cache DELETE PATTERN: ${pattern} (${keys.length} keys)`);
    }

    return keys.length;
  } catch (error) {
    console.error(`[Redis] Delete pattern error for ${pattern}:`, error);
    cacheStats.errors++;
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function existsCached(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`[Redis] Exists error for key ${key}:`, error);
    cacheStats.errors++;
    return false;
  }
}

/**
 * Set expiration time on a key
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.expire(key, seconds);
    return true;
  } catch (error) {
    console.error(`[Redis] Expire error for key ${key}:`, error);
    cacheStats.errors++;
    return false;
  }
}

/**
 * Get time to live for a key
 */
export async function ttl(key: string): Promise<number> {
  try {
    const client = getRedisClient();
    if (!client) return -1;

    const ttlSeconds = await client.ttl(key);
    return ttlSeconds;
  } catch (error) {
    console.error(`[Redis] TTL error for key ${key}:`, error);
    cacheStats.errors++;
    return -1;
  }
}

/**
 * Increment value (atomic operation)
 */
export async function increment(key: string, amount: number = 1): Promise<number> {
  try {
    const client = getRedisClient();
    if (!client) return 0;

    const newValue = await client.incrby(key, amount);
    return newValue;
  } catch (error) {
    console.error(`[Redis] Increment error for key ${key}:`, error);
    cacheStats.errors++;
    return 0;
  }
}

/**
 * Decrement value (atomic operation)
 */
export async function decrement(key: string, amount: number = 1): Promise<number> {
  try {
    const client = getRedisClient();
    if (!client) return 0;

    const newValue = await client.decrby(key, amount);
    return newValue;
  } catch (error) {
    console.error(`[Redis] Decrement error for key ${key}:`, error);
    cacheStats.errors++;
    return 0;
  }
}

/**
 * Set multiple key-value pairs
 */
export async function mset(data: Record<string, any>): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.mset(data);
    return true;
  } catch (error) {
    console.error('[Redis] MSET error:', error);
    cacheStats.errors++;
    return false;
  }
}

/**
 * Get multiple values
 */
export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    const client = getRedisClient();
    if (!client) return keys.map(() => null);

    const values = await client.mget<T[]>(...keys);
    return values;
  } catch (error) {
    console.error('[Redis] MGET error:', error);
    cacheStats.errors++;
    return keys.map(() => null);
  }
}

/**
 * Flush all cache (DANGER: use with caution)
 */
export async function flushAll(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.flushall();
    console.warn('[Redis] All cache flushed - this affects all data!');
    return true;
  } catch (error) {
    console.error('[Redis] Flush all error:', error);
    cacheStats.errors++;
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return { ...cacheStats };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
  };
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const total = cacheStats.hits + cacheStats.misses;
  if (total === 0) return 0;
  return (cacheStats.hits / total) * 100;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    // Upstash REST API doesn't require explicit connection closure
    redisClient = null;
    clientConfig = null;
    console.log('[Redis] Client closed');
  } catch (error) {
    console.error('[Redis] Close error:', error);
  }
}

/**
 * Generate cache key with tenant isolation
 */
export function generateCacheKey(
  tenant: string,
  resource: string,
  id?: string,
  version: string = 'v1'
): string {
  const parts = [tenant, resource];
  if (id) parts.push(id);
  parts.push(version);
  return parts.join(':');
}

/**
 * Parse cache key into components
 */
export function parseCacheKey(key: string): {
  tenant: string;
  resource: string;
  id?: string;
  version: string;
} {
  const parts = key.split(':');
  return {
    tenant: parts[0],
    resource: parts[1],
    id: parts[2] !== 'v1' && parts[2] !== 'v2' ? parts[2] : undefined,
    version: parts[parts.length - 1],
  };
}

// Export types
export type { Redis };
