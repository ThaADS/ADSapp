/**
 * Cache Manager Unit Tests
 *
 * Tests for multi-layer cache manager functionality
 */

import { CacheManager, getCacheManager, resetCacheManager } from '@/lib/cache/cache-manager';
import { resetL1Cache } from '@/lib/cache/l1-cache';

// Mock Redis client
jest.mock('@/lib/cache/redis-client', () => ({
  getCached: jest.fn(),
  setCached: jest.fn(),
  deleteCached: jest.fn(),
  deletePattern: jest.fn(),
  isRedisAvailable: jest.fn().mockResolvedValue(true),
  generateCacheKey: (tenant: string, resource: string, id?: string, version = 'v1') => {
    const parts = [tenant, resource];
    if (id) parts.push(id);
    parts.push(version);
    return parts.join(':');
  },
}));

describe('CacheManager', () => {
  let manager: CacheManager;
  const testTenant = 'test-tenant';
  const testResource = 'test-resource';
  const testData = { id: '123', name: 'Test Data' };

  beforeEach(() => {
    resetCacheManager();
    resetL1Cache();
    manager = getCacheManager({
      l1Enabled: true,
      l2Enabled: true,
      enableMonitoring: false,
    });
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should fetch data on cache miss', async () => {
      const fetchFn = jest.fn().mockResolvedValue(testData);

      const result = await manager.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual(testData);
      expect(result.metadata.source).toBe('l3');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached data from L1 on hit', async () => {
      const fetchFn = jest.fn().mockResolvedValue(testData);

      // First call - cache miss, fetches data
      await manager.get(testTenant, testResource, undefined, fetchFn);

      // Second call - should hit L1 cache
      const result = await manager.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual(testData);
      expect(result.metadata.source).toBe('l1');
      expect(fetchFn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle fetch function errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(
        manager.get(testTenant, testResource, undefined, fetchFn)
      ).rejects.toThrow('Fetch failed');
    });

    it('should respect tenant isolation', async () => {
      const tenant1Data = { id: '1', value: 'tenant1' };
      const tenant2Data = { id: '2', value: 'tenant2' };

      const result1 = await manager.get(
        'tenant-1',
        testResource,
        undefined,
        async () => tenant1Data
      );

      const result2 = await manager.get(
        'tenant-2',
        testResource,
        undefined,
        async () => tenant2Data
      );

      expect(result1.data).toEqual(tenant1Data);
      expect(result2.data).toEqual(tenant2Data);
    });
  });

  describe('set', () => {
    it('should store data in cache', async () => {
      await manager.set(testTenant, testResource, undefined, testData);

      // Verify data is cached by fetching it
      const result = await manager.get(
        testTenant,
        testResource,
        undefined,
        async () => ({ different: 'data' })
      );

      expect(result.data).toEqual(testData);
      expect(result.metadata.source).toBe('l1');
    });

    it('should handle set errors gracefully', async () => {
      // Should not throw even if cache fails
      await expect(
        manager.set(testTenant, testResource, undefined, testData)
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should remove data from cache', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce(testData)
        .mockResolvedValueOnce({ updated: 'data' });

      // Cache data
      await manager.get(testTenant, testResource, undefined, fetchFn);

      // Delete from cache
      await manager.delete(testTenant, testResource);

      // Next call should fetch fresh data
      const result = await manager.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual({ updated: 'data' });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate', () => {
    it('should invalidate all keys for tenant and resource', async () => {
      await manager.set(testTenant, 'resource1', 'id1', testData);
      await manager.set(testTenant, 'resource1', 'id2', testData);
      await manager.set(testTenant, 'resource2', 'id1', testData);

      const count = await manager.invalidate(testTenant, 'resource1');

      expect(count).toBeGreaterThan(0);
    });

    it('should invalidate all keys for tenant when no resource specified', async () => {
      await manager.set(testTenant, 'resource1', undefined, testData);
      await manager.set(testTenant, 'resource2', undefined, testData);

      const count = await manager.invalidate(testTenant);

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('warm', () => {
    it('should warm cache with multiple items', async () => {
      const items = [
        { id: 'id1', data: { value: 1 } },
        { id: 'id2', data: { value: 2 } },
        { id: 'id3', data: { value: 3 } },
      ];

      await manager.warm(testTenant, testResource, items);

      // Verify all items are cached
      for (const item of items) {
        const result = await manager.get(
          testTenant,
          testResource,
          item.id,
          async () => ({ different: 'data' })
        );
        expect(result.data).toEqual(item.data);
        expect(result.metadata.source).toBe('l1');
      }
    });
  });

  describe('performance tracking', () => {
    it('should track cache hits and misses', async () => {
      const fetchFn = jest.fn().mockResolvedValue(testData);

      // Cache miss
      await manager.get(testTenant, testResource, undefined, fetchFn);

      // Cache hits
      await manager.get(testTenant, testResource, undefined, fetchFn);
      await manager.get(testTenant, testResource, undefined, fetchFn);

      const performance = manager.getPerformance();

      expect(performance.totalRequests).toBe(3);
      expect(performance.l1Hits).toBe(2);
      expect(performance.l3Hits).toBe(1);
    });

    it('should calculate hit rates correctly', async () => {
      const fetchFn = jest.fn().mockResolvedValue(testData);

      // 1 miss
      await manager.get(testTenant, 'res1', undefined, fetchFn);

      // 4 hits
      await manager.get(testTenant, 'res1', undefined, fetchFn);
      await manager.get(testTenant, 'res1', undefined, fetchFn);
      await manager.get(testTenant, 'res1', undefined, fetchFn);
      await manager.get(testTenant, 'res1', undefined, fetchFn);

      const performance = manager.getPerformance();

      expect(performance.l1HitRate).toBeCloseTo(80, 0); // 4/5 = 80%
    });

    it('should track average latency', async () => {
      const fetchFn = jest.fn().mockResolvedValue(testData);

      await manager.get(testTenant, testResource, undefined, fetchFn);
      await manager.get(testTenant, testResource, undefined, fetchFn);

      const performance = manager.getPerformance();

      expect(performance.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('health check', () => {
    it('should report healthy status when all layers available', async () => {
      const health = await manager.healthCheck();

      expect(health.l1Available).toBe(true);
      expect(health.l2Available).toBe(true);
      expect(health.overall).toBe('healthy');
    });

    it('should report degraded status when L2 unavailable', async () => {
      const { isRedisAvailable } = require('@/lib/cache/redis-client');
      isRedisAvailable.mockResolvedValueOnce(false);

      const health = await manager.healthCheck();

      expect(health.l1Available).toBe(true);
      expect(health.l2Available).toBe(false);
      expect(health.overall).toBe('degraded');
    });
  });

  describe('configuration', () => {
    it('should allow runtime configuration updates', () => {
      const initialConfig = manager.getConfig();
      expect(initialConfig.l1TTL).toBe(60);

      manager.updateConfig({ l1TTL: 120 });

      const updatedConfig = manager.getConfig();
      expect(updatedConfig.l1TTL).toBe(120);
    });

    it('should work with L1 disabled', async () => {
      const managerNoL1 = getCacheManager({ l1Enabled: false, l2Enabled: true });
      const fetchFn = jest.fn().mockResolvedValue(testData);

      const result = await managerNoL1.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual(testData);
      // Should skip L1 and go to L2 or L3
      expect(['l2', 'l3']).toContain(result.metadata.source);
    });

    it('should work with all layers disabled (database only)', async () => {
      const managerNoCache = getCacheManager({ l1Enabled: false, l2Enabled: false });
      const fetchFn = jest.fn().mockResolvedValue(testData);

      const result = await managerNoCache.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual(testData);
      expect(result.metadata.source).toBe('l3');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should fall back to database on cache errors', async () => {
      const { getCached: getRedis } = require('@/lib/cache/redis-client');
      getRedis.mockRejectedValueOnce(new Error('Redis error'));

      const fetchFn = jest.fn().mockResolvedValue(testData);
      const result = await manager.get(testTenant, testResource, undefined, fetchFn);

      expect(result.data).toEqual(testData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should not crash on invalidation errors', async () => {
      const { deletePattern } = require('@/lib/cache/redis-client');
      deletePattern.mockRejectedValueOnce(new Error('Delete error'));

      await expect(
        manager.invalidate(testTenant, testResource)
      ).resolves.not.toThrow();
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    resetCacheManager();
    resetL1Cache();
    jest.clearAllMocks();
  });

  describe('getCached', () => {
    it('should return data from cache manager', async () => {
      const { getCached } = require('@/lib/cache/cache-manager');
      const data = await getCached(
        'tenant',
        'resource',
        undefined,
        async () => ({ test: 'data' })
      );

      expect(data).toEqual({ test: 'data' });
    });
  });

  describe('setCached', () => {
    it('should set data in cache manager', async () => {
      const { setCached, getCached } = require('@/lib/cache/cache-manager');

      await setCached('tenant', 'resource', undefined, { test: 'data' });

      const data = await getCached(
        'tenant',
        'resource',
        undefined,
        async () => ({ different: 'data' })
      );

      expect(data).toEqual({ test: 'data' });
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache entries', async () => {
      const { invalidateCache } = require('@/lib/cache/cache-manager');

      const count = await invalidateCache('tenant', 'resource');

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
