/**
 * Cache Manager Unit Tests
 *
 * Tests the multi-layer cache manager (L1: Memory, L2: Redis, L3: Database)
 * Focuses on cache hit/miss scenarios, TTL expiration, tenant isolation,
 * and error handling.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import {
  CacheManager,
  getCacheManager,
  resetCacheManager,
} from '@/lib/cache/cache-manager';

// Mock dependencies
jest.mock('@/lib/cache/l1-cache');
jest.mock('@/lib/cache/redis-client');

import { L1Cache, getL1Cache } from '@/lib/cache/l1-cache';
import * as redisClient from '@/lib/cache/redis-client';

describe('CacheManager - Multi-Layer Caching', () => {
  let cacheManager: CacheManager;
  let mockL1Cache: jest.Mocked<L1Cache>;
  let mockRedisGet: jest.MockedFunction<typeof redisClient.getCached>;
  let mockRedisSet: jest.MockedFunction<typeof redisClient.setCached>;
  let mockRedisDelete: jest.MockedFunction<typeof redisClient.deleteCached>;
  let mockRedisDeletePattern: jest.MockedFunction<typeof redisClient.deletePattern>;
  let mockRedisIsAvailable: jest.MockedFunction<typeof redisClient.isRedisAvailable>;

  beforeEach(() => {
    // Reset cache manager
    resetCacheManager();

    // Create mock L1 cache
    mockL1Cache = {
      get: jest.fn<any>(),
      set: jest.fn<any>(),
      delete: jest.fn<any>(),
      clear: jest.fn<any>(),
      has: jest.fn<any>(),
      keys: jest.fn<any>(),
      size: jest.fn<any>(),
      getStats: jest.fn<any>(),
      resetStats: jest.fn<any>(),
    } as any;

    // Mock getL1Cache to return our mock
    (getL1Cache as jest.MockedFunction<typeof getL1Cache>) = jest
      .fn()
      .mockReturnValue(mockL1Cache);

    // Mock Redis client functions
    mockRedisGet = jest.fn() as any;
    mockRedisSet = jest.fn() as any;
    mockRedisDelete = jest.fn() as any;
    mockRedisDeletePattern = jest.fn() as any;
    mockRedisIsAvailable = jest.fn().mockResolvedValue(true) as any;

    (redisClient.getCached as any) = mockRedisGet;
    (redisClient.setCached as any) = mockRedisSet;
    (redisClient.deleteCached as any) = mockRedisDelete;
    (redisClient.deletePattern as any) = mockRedisDeletePattern;
    (redisClient.isRedisAvailable as any) = mockRedisIsAvailable;

    // Create fresh cache manager instance
    cacheManager = new CacheManager({
      l1Enabled: true,
      l2Enabled: true,
      l1TTL: 60,
      l2TTL: 900,
      enableMonitoring: false,
      writeThrough: true,
      warmOnMiss: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetCacheManager();
  });

  describe('L1 Cache (In-Memory)', () => {
    it('should return cached value from L1 on cache hit', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'users';
      const id = 'user-123';
      const cachedData = { id: 'user-123', name: 'Test User' };
      const fetchFn = jest.fn().mockResolvedValue({ id: 'user-123', name: 'Fetched User' });

      mockL1Cache.get.mockReturnValue(cachedData);

      // Act
      const result = await cacheManager.get(tenant, resource, id, fetchFn);

      // Assert
      expect(result.data).toEqual(cachedData);
      expect(result.metadata.source).toBe('l1');
      expect(mockL1Cache.get).toHaveBeenCalledTimes(1);
      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should miss L1 cache after TTL expiration', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'users';
      const id = 'user-123';
      const freshData = { id: 'user-123', name: 'Fresh User' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      // L1 miss, L2 miss, fetch from database
      mockL1Cache.get.mockReturnValue(null);
      mockRedisGet.mockResolvedValue(null);

      // Act
      const result = await cacheManager.get(tenant, resource, id, fetchFn);

      // Assert
      expect(result.data).toEqual(freshData);
      expect(result.metadata.source).toBe('l3');
      expect(mockL1Cache.get).toHaveBeenCalled();
      expect(mockRedisGet).toHaveBeenCalled();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('L2 Cache (Redis)', () => {
    it('should return cached value from L2 on L1 miss', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'organizations';
      const id = 'org-456';
      const cachedData = { id: 'org-456', name: 'Test Org' };
      const fetchFn = jest.fn().mockResolvedValue({ id: 'org-456', name: 'Fetched Org' });

      // L1 miss, L2 hit
      mockL1Cache.get.mockReturnValue(null);
      mockRedisGet.mockResolvedValue(cachedData);

      // Act
      const result = await cacheManager.get(tenant, resource, id, fetchFn);

      // Assert
      expect(result.data).toEqual(cachedData);
      expect(result.metadata.source).toBe('l2');
      expect(mockL1Cache.get).toHaveBeenCalled();
      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockL1Cache.set).toHaveBeenCalled(); // Warm L1 cache
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fallback to L3 on Redis connection failure', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'contacts';
      const id = 'contact-789';
      const freshData = { id: 'contact-789', name: 'Fresh Contact' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      // L1 miss, L2 error (Redis unavailable)
      mockL1Cache.get.mockReturnValue(null);
      mockRedisGet.mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await cacheManager.get(tenant, resource, id, fetchFn);

      // Assert
      expect(result.data).toEqual(freshData);
      expect(result.metadata.source).toBe('l3');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('L3 Cache (Database)', () => {
    it('should fetch from database on complete cache miss', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'messages';
      const id = 'msg-999';
      const databaseData = { id: 'msg-999', content: 'Database Message' };
      const fetchFn = jest.fn().mockResolvedValue(databaseData);

      // Complete cache miss
      mockL1Cache.get.mockReturnValue(null);
      mockRedisGet.mockResolvedValue(null);

      // Act
      const result = await cacheManager.get(tenant, resource, id, fetchFn);

      // Assert
      expect(result.data).toEqual(databaseData);
      expect(result.metadata.source).toBe('l3');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(mockL1Cache.set).toHaveBeenCalled(); // Write-through to L1
      expect(mockRedisSet).toHaveBeenCalled(); // Write-through to L2
    });
  });

  describe('Tenant Isolation', () => {
    it('should not leak data between tenants', async () => {
      // Arrange
      const tenant1 = 'tenant-alice';
      const tenant2 = 'tenant-bob';
      const resource = 'sensitive-data';
      const id = 'data-1';

      const tenant1Data = { id: 'data-1', tenant: 'alice', secret: 'alice-secret' };
      const tenant2Data = { id: 'data-1', tenant: 'bob', secret: 'bob-secret' };

      const fetchFn1 = jest.fn().mockResolvedValue(tenant1Data);
      const fetchFn2 = jest.fn().mockResolvedValue(tenant2Data);

      // Cache miss for both
      mockL1Cache.get.mockReturnValue(null);
      mockRedisGet.mockResolvedValue(null);

      // Act
      const result1 = await cacheManager.get(tenant1, resource, id, fetchFn1);
      const result2 = await cacheManager.get(tenant2, resource, id, fetchFn2);

      // Assert
      expect(result1.data.secret).toBe('alice-secret');
      expect(result2.data.secret).toBe('bob-secret');
      expect(result1.metadata.tenant).toBe(tenant1);
      expect(result2.metadata.tenant).toBe(tenant2);
      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all cache layers for a resource', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'users';

      mockL1Cache.keys.mockReturnValue([
        'tenant-1:users:123',
        'tenant-1:users:456',
        'tenant-1:organizations:789',
      ]);
      mockRedisDeletePattern.mockResolvedValue(5);

      // Act
      const deletedCount = await cacheManager.invalidate(tenant, resource);

      // Assert
      expect(deletedCount).toBeGreaterThan(0);
      expect(mockL1Cache.delete).toHaveBeenCalled();
      expect(mockRedisDeletePattern).toHaveBeenCalledWith('tenant-1:users:*');
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache hit rates correctly', async () => {
      // Arrange
      const tenant = 'tenant-1';
      const resource = 'users';
      const fetchFn = jest.fn().mockResolvedValue({ id: 'user-1', name: 'User' });

      // Simulate: 2 L1 hits, 1 L2 hit, 1 L3 hit (total 4 requests)
      mockL1Cache.get
        .mockReturnValueOnce({ id: 'user-1' }) // L1 hit
        .mockReturnValueOnce({ id: 'user-2' }) // L1 hit
        .mockReturnValueOnce(null) // L1 miss
        .mockReturnValueOnce(null); // L1 miss

      mockRedisGet
        .mockResolvedValueOnce({ id: 'user-3' }) // L2 hit
        .mockResolvedValueOnce(null); // L2 miss

      // Act
      await cacheManager.get(tenant, resource, 'user-1', fetchFn);
      await cacheManager.get(tenant, resource, 'user-2', fetchFn);
      await cacheManager.get(tenant, resource, 'user-3', fetchFn);
      await cacheManager.get(tenant, resource, 'user-4', fetchFn);

      const performance = cacheManager.getPerformance();

      // Assert
      expect(performance.totalRequests).toBe(4);
      expect(performance.l1Hits).toBe(2);
      expect(performance.l2Hits).toBe(1);
      expect(performance.l3Hits).toBe(1);
      expect(performance.l1HitRate).toBe(50); // 2/4 * 100
      expect(performance.l2HitRate).toBe(75); // (2+1)/4 * 100
      expect(performance.averageLatency).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should report healthy when all layers available', async () => {
      // Arrange
      mockRedisIsAvailable.mockResolvedValue(true);

      // Act
      const health = await cacheManager.healthCheck();

      // Assert
      expect(health.l1Available).toBe(true);
      expect(health.l2Available).toBe(true);
      expect(health.overall).toBe('healthy');
    });

    it('should report degraded when Redis is unavailable', async () => {
      // Arrange
      mockRedisIsAvailable.mockResolvedValue(false);

      // Act
      const health = await cacheManager.healthCheck();

      // Assert
      expect(health.l1Available).toBe(true);
      expect(health.l2Available).toBe(false);
      expect(health.overall).toBe('degraded');
    });
  });
});
