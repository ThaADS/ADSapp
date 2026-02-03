/**
 * Redis Client Unit Tests
 *
 * Tests for the Redis client wrapper with Upstash integration.
 * Covers: get, set, delete, key generation, and tenant isolation.
 *
 * @group unit
 * @group cache
 */

import {
  getCached,
  setCached,
  deleteCached,
  generateCacheKey,
  parseCacheKey,
  initializeRedis,
  getRedisClient,
  getCacheStats,
  resetCacheStats,
} from '@/lib/cache/redis-client';
import { Redis } from '@upstash/redis';

// Mock the Redis client
jest.mock('@upstash/redis');

describe('Redis Client', () => {
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetCacheStats();

    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      incrby: jest.fn(),
      decrby: jest.fn(),
      flushall: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    // Set test environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-123';

    // Initialize Redis client
    initializeRedis();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  // =========================================================================
  // TEST 1: Get operation with existing key returns cached value
  // =========================================================================
  describe('getCached', () => {
    it('should return cached value when key exists', async () => {
      // Arrange
      const testKey = 'org1:users:123:v1';
      const testValue = { id: '123', name: 'John Doe' };
      mockRedis.get.mockResolvedValue(testValue);

      // Act
      const result = await getCached<typeof testValue>(testKey);

      // Assert
      expect(result).toEqual(testValue);
      expect(mockRedis.get).toHaveBeenCalledWith(testKey);
      expect(mockRedis.get).toHaveBeenCalledTimes(1);

      // Verify cache stats
      const stats = getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    // =========================================================================
    // TEST 2: Get operation with non-existent key returns null
    // =========================================================================
    it('should return null when key does not exist', async () => {
      // Arrange
      const testKey = 'org1:users:999:v1';
      mockRedis.get.mockResolvedValue(null);

      // Act
      const result = await getCached(testKey);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(testKey);

      // Verify cache stats
      const stats = getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });
  });

  // =========================================================================
  // TEST 3: Set operation with TTL stores data correctly
  // =========================================================================
  describe('setCached', () => {
    it('should store value with TTL', async () => {
      // Arrange
      const testKey = 'org1:products:456:v1';
      const testValue = { id: '456', name: 'Product A', price: 99.99 };
      const ttl = 300; // 5 minutes
      mockRedis.set.mockResolvedValue('OK');

      // Act
      const result = await setCached(testKey, testValue, { ttl });

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        testKey,
        testValue,
        expect.objectContaining({ ex: ttl })
      );
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
    });

    it('should return false when Redis client is unavailable', async () => {
      // Arrange
      const testKey = 'org1:data:test';
      const testValue = { test: 'data' };

      // Simulate Redis client being null
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      // Re-initialize to get null client
      const client = initializeRedis();
      expect(client).toBeNull();

      // Act
      const result = await setCached(testKey, testValue);

      // Assert
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // TEST 4: Generate cache key with tenant isolation
  // =========================================================================
  describe('generateCacheKey', () => {
    it('should generate key with tenant, resource, id, and version', () => {
      // Arrange
      const tenant = 'org_abc_123';
      const resource = 'users';
      const id = 'user_456';
      const version = 'v1';

      // Act
      const key = generateCacheKey(tenant, resource, id, version);

      // Assert
      expect(key).toBe('org_abc_123:users:user_456:v1');
      expect(key.split(':').length).toBe(4);
      expect(key.startsWith(tenant)).toBe(true);
      expect(key.endsWith(version)).toBe(true);
    });

    it('should generate key without ID when not provided', () => {
      // Arrange
      const tenant = 'org_xyz_789';
      const resource = 'settings';
      const version = 'v2';

      // Act
      const key = generateCacheKey(tenant, resource, undefined, version);

      // Assert
      expect(key).toBe('org_xyz_789:settings:v2');
      expect(key.split(':').length).toBe(3);
    });

    it('should ensure tenant isolation by including tenant in key prefix', () => {
      // Arrange
      const tenant1 = 'tenant_a';
      const tenant2 = 'tenant_b';
      const resource = 'data';

      // Act
      const key1 = generateCacheKey(tenant1, resource);
      const key2 = generateCacheKey(tenant2, resource);

      // Assert
      expect(key1).not.toBe(key2);
      expect(key1.startsWith('tenant_a:')).toBe(true);
      expect(key2.startsWith('tenant_b:')).toBe(true);
    });
  });

  // =========================================================================
  // TEST 5: Delete operation removes key from cache
  // =========================================================================
  describe('deleteCached', () => {
    it('should delete key from cache', async () => {
      // Arrange
      const testKey = 'org1:sessions:abc123:v1';
      mockRedis.del.mockResolvedValue(1);

      // Act
      const result = await deleteCached(testKey);

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(testKey);
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion of non-existent key gracefully', async () => {
      // Arrange
      const testKey = 'org1:nonexistent:999:v1';
      mockRedis.del.mockResolvedValue(0);

      // Act
      const result = await deleteCached(testKey);

      // Assert
      expect(result).toBe(true); // Function still returns true even if key didn't exist
      expect(mockRedis.del).toHaveBeenCalledWith(testKey);
    });

    it('should return false when Redis client is unavailable', async () => {
      // Arrange
      const testKey = 'org1:data:test';

      // Simulate Redis client being null
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      // Re-initialize to get null client
      const client = initializeRedis();
      expect(client).toBeNull();

      // Act
      const result = await deleteCached(testKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // BONUS TEST: Parse cache key extracts components correctly
  // =========================================================================
  describe('parseCacheKey', () => {
    it('should parse cache key with all components', () => {
      // Arrange
      const key = 'org_123:users:user_456:v1';

      // Act
      const parsed = parseCacheKey(key);

      // Assert
      expect(parsed).toEqual({
        tenant: 'org_123',
        resource: 'users',
        id: 'user_456',
        version: 'v1',
      });
    });

    it('should parse cache key without ID', () => {
      // Arrange
      const key = 'org_789:settings:v2';

      // Act
      const parsed = parseCacheKey(key);

      // Assert
      expect(parsed).toEqual({
        tenant: 'org_789',
        resource: 'settings',
        id: undefined,
        version: 'v2',
      });
    });
  });
});
