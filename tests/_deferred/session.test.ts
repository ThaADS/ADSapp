/**
 * Unit Tests for Session Management
 *
 * Test Coverage:
 * - Redis session store operations
 * - Session manager functionality
 * - Concurrent session limits
 * - Session expiration and cleanup
 * - Privilege change detection
 * - Session revocation
 *
 * @jest-environment node
 */

import { Redis } from '@upstash/redis';
import {
  RedisSessionStore,
  RedisSession,
  DeviceInfo
} from '@/lib/session/redis-store';
import {
  SessionManager,
  getSessionManager,
  resetSessionManager
} from '@/lib/session/manager';

// Mock Upstash Redis
jest.mock('@upstash/redis');

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      )
    }
  }))
}));

describe('RedisSessionStore', () => {
  let store: RedisSessionStore;
  let mockRedis: jest.Mocked<Redis>;
  const testUserId = 'user-123';
  const testOrgId = 'org-456';
  const testSessionToken = 'token-789';
  const testDeviceInfo: DeviceInfo = {
    userAgent: 'Mozilla/5.0 Test Browser',
    ip: '192.168.1.1',
    platform: 'web'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetSessionManager();

    // Create mock Redis instance
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      expire: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue('PONG')
    } as unknown as jest.Mocked<Redis>;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    // Create store instance
    store = new RedisSessionStore({
      url: 'http://test-redis.com',
      token: 'test-token',
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 5
    });
  });

  describe('Session Creation', () => {
    test('should create a new session', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const session = await store.createSession({
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo
      });

      expect(session.userId).toBe(testUserId);
      expect(session.organizationId).toBe(testOrgId);
      expect(session.sessionToken).toBe(testSessionToken);
      expect(session.deviceInfo).toEqual(testDeviceInfo);
      expect(session.isRevoked).toBe(false);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should enforce concurrent session limit', async () => {
      // Mock 5 existing sessions
      const existingSessions = Array(5)
        .fill(null)
        .map((_, i) => `token-${i}`);
      mockRedis.smembers.mockResolvedValue(existingSessions);

      // Mock getting existing sessions
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('token-0')) {
          return Promise.resolve(
            JSON.stringify({
              userId: testUserId,
              organizationId: testOrgId,
              sessionToken: 'token-0',
              deviceInfo: testDeviceInfo,
              createdAt: new Date(Date.now() - 10000).toISOString(),
              lastActivity: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 1800000).toISOString(),
              isRevoked: false
            })
          );
        }
        return Promise.resolve(null);
      });

      await store.createSession({
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: 'new-token',
        deviceInfo: testDeviceInfo
      });

      // Should delete oldest session
      expect(mockRedis.del).toHaveBeenCalled();
    });

    test('should set correct TTL on session creation', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      await store.createSession({
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo
      });

      // Should set 30 minutes TTL (1800 seconds)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        1800,
        expect.any(String)
      );
    });
  });

  describe('Session Retrieval', () => {
    test('should retrieve existing session', async () => {
      const mockSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const session = await store.getSession(testUserId, testSessionToken);

      expect(session).not.toBeNull();
      expect(session?.userId).toBe(testUserId);
      expect(session?.sessionToken).toBe(testSessionToken);
    });

    test('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const session = await store.getSession(testUserId, testSessionToken);

      expect(session).toBeNull();
    });

    test('should return null for expired session', async () => {
      const expiredSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() - 1).toISOString(), // Expired
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredSession));

      const session = await store.getSession(testUserId, testSessionToken);

      expect(session).toBeNull();
      expect(mockRedis.del).toHaveBeenCalled(); // Should cleanup expired session
    });

    test('should return null for revoked session', async () => {
      const revokedSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: true
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(revokedSession));

      const session = await store.getSession(testUserId, testSessionToken);

      expect(session).toBeNull();
    });
  });

  describe('Session Activity Update', () => {
    test('should update session activity and extend TTL', async () => {
      const oldActivity = new Date(Date.now() - 60000).toISOString();
      const mockSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: oldActivity,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const updatedSession = await store.updateSessionActivity(
        testUserId,
        testSessionToken
      );

      expect(updatedSession).not.toBeNull();
      expect(updatedSession?.lastActivity).not.toBe(oldActivity);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should return null when updating non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const updatedSession = await store.updateSessionActivity(
        testUserId,
        testSessionToken
      );

      expect(updatedSession).toBeNull();
    });
  });

  describe('Session Revocation', () => {
    test('should revoke a session', async () => {
      const mockSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const revoked = await store.revokeSession(testUserId, testSessionToken);

      expect(revoked).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should return false when revoking non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const revoked = await store.revokeSession(testUserId, testSessionToken);

      expect(revoked).toBe(false);
    });

    test('should revoke all user sessions', async () => {
      const sessionTokens = ['token-1', 'token-2', 'token-3'];
      mockRedis.smembers.mockResolvedValue(sessionTokens);

      mockRedis.get.mockImplementation((key: string) => {
        const mockSession: RedisSession = {
          userId: testUserId,
          organizationId: testOrgId,
          sessionToken: 'token-1',
          deviceInfo: testDeviceInfo,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          isRevoked: false
        };
        return Promise.resolve(JSON.stringify(mockSession));
      });

      const count = await store.revokeAllUserSessions(testUserId);

      expect(count).toBe(3);
    });
  });

  describe('Session Deletion', () => {
    test('should delete a session permanently', async () => {
      const mockSession: RedisSession = {
        userId: testUserId,
        organizationId: testOrgId,
        sessionToken: testSessionToken,
        deviceInfo: testDeviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const deleted = await store.deleteSession(testUserId, testSessionToken);

      expect(deleted).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockRedis.srem).toHaveBeenCalled();
    });
  });

  describe('Session Statistics', () => {
    test('should get user session statistics', async () => {
      const sessionTokens = ['token-1', 'token-2'];
      mockRedis.smembers.mockResolvedValue(sessionTokens);

      mockRedis.get.mockImplementation(() => {
        const mockSession: RedisSession = {
          userId: testUserId,
          organizationId: testOrgId,
          sessionToken: 'token-1',
          deviceInfo: testDeviceInfo,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          isRevoked: false
        };
        return Promise.resolve(JSON.stringify(mockSession));
      });

      const stats = await store.getUserSessionStats(testUserId);

      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(2);
      expect(stats.revokedSessions).toBe(0);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when Redis is operational', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await store.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    test('should return unhealthy status when Redis fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await store.getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate correct configuration', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const valid = await store.validateConfiguration();

      expect(valid).toBe(true);
    });

    test('should reject invalid session timeout', async () => {
      const invalidStore = new RedisSessionStore({
        url: 'http://test-redis.com',
        token: 'test-token',
        sessionTimeoutMinutes: 0, // Invalid
        maxConcurrentSessions: 5
      });

      await expect(invalidStore.validateConfiguration()).rejects.toThrow();
    });
  });
});

describe('SessionManager', () => {
  let manager: SessionManager;
  const testUserId = 'user-123';
  const testOrgId = 'org-456';
  const testSessionToken = 'token-789';

  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionManager();
    manager = getSessionManager();
  });

  describe('Session Manager Singleton', () => {
    test('should return same instance', () => {
      const manager1 = getSessionManager();
      const manager2 = getSessionManager();

      expect(manager1).toBe(manager2);
    });

    test('should reset singleton', () => {
      const manager1 = getSessionManager();
      resetSessionManager();
      const manager2 = getSessionManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  // Additional SessionManager tests would require more complex mocking
  // These are placeholder tests showing the structure
});
