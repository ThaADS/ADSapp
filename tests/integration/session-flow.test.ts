/**
 * Integration Tests for Session Management Flows
 *
 * Test Coverage:
 * - Complete authentication and session creation flow
 * - Session validation and refresh flow
 * - Concurrent session management
 * - Session revocation flows
 * - Privilege change detection
 * - Session timeout and expiration
 *
 * @jest-environment node
 */

import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.UPSTASH_REDIS_REST_URL = 'http://test-redis.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
process.env.SESSION_TIMEOUT_MINUTES = '30';
process.env.MAX_CONCURRENT_SESSIONS = '5';

// Mock modules
jest.mock('@upstash/redis');
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'test-user-id',
                organization_id: 'test-org-id',
                role: 'admin',
                is_super_admin: false
              },
              error: null
            })
          )
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            }
          },
          error: null
        })
      )
    }
  }))
}));

describe('Session Management Integration Tests', () => {
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Redis
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

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
  });

  describe('Flow 1: User Login and Session Creation', () => {
    test('should create session on successful login', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const result = await manager.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userRole: 'admin',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1',
          platform: 'web'
        }
      });

      expect(result.session).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.session.userId).toBe('user-123');
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should create multiple sessions for same user', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      mockRedis.smembers.mockResolvedValue([]);

      // Create first session
      const session1 = await manager.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userRole: 'admin',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1',
          platform: 'web'
        }
      });

      // Create second session
      const session2 = await manager.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userRole: 'admin',
        deviceInfo: {
          userAgent: 'Chrome/100',
          ip: '192.168.1.2',
          platform: 'mobile'
        }
      });

      expect(session1.token).not.toBe(session2.token);
    });
  });

  describe('Flow 2: Session Validation and Refresh', () => {
    test('should validate and refresh active session', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const sessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        sessionToken: 'token-789',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1'
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      // Validate session
      const validation = await manager.validateSession('user-123', 'token-789');
      expect(validation.valid).toBe(true);

      // Refresh session
      const refresh = await manager.refreshSession('user-123', 'token-789');
      expect(refresh.success).toBe(true);
    });

    test('should reject invalid session token', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      mockRedis.get.mockResolvedValue(null);

      const validation = await manager.validateSession(
        'user-123',
        'invalid-token'
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('not found');
    });
  });

  describe('Flow 3: Concurrent Session Management', () => {
    test('should enforce 5 session limit', async () => {
      const { RedisSessionStore } = await import('@/lib/session/redis-store');
      const store = new RedisSessionStore({
        url: 'http://test-redis.com',
        token: 'test-token',
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 5
      });

      // Mock 5 existing sessions
      const existingSessions = Array(5)
        .fill(null)
        .map((_, i) => `token-${i}`);
      mockRedis.smembers.mockResolvedValue(existingSessions);

      // Mock oldest session
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('token-0')) {
          return Promise.resolve(
            JSON.stringify({
              userId: 'user-123',
              organizationId: 'org-456',
              sessionToken: 'token-0',
              deviceInfo: { userAgent: 'Old', ip: '0.0.0.0' },
              createdAt: new Date(Date.now() - 10000).toISOString(),
              lastActivity: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 1800000).toISOString(),
              isRevoked: false
            })
          );
        }
        return Promise.resolve(null);
      });

      // Create 6th session - should evict oldest
      await store.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        sessionToken: 'token-new',
        deviceInfo: { userAgent: 'New', ip: '1.1.1.1' }
      });

      expect(mockRedis.del).toHaveBeenCalled();
    });

    test('should list all active sessions', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const sessionTokens = ['token-1', 'token-2', 'token-3'];
      mockRedis.smembers.mockResolvedValue(sessionTokens);

      mockRedis.get.mockImplementation(() =>
        Promise.resolve(
          JSON.stringify({
            userId: 'user-123',
            organizationId: 'org-456',
            sessionToken: 'token-1',
            deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
            isRevoked: false
          })
        )
      );

      const sessions = await manager.getUserSessions('user-123');

      expect(sessions.length).toBe(3);
    });
  });

  describe('Flow 4: Session Revocation', () => {
    test('should revoke single session on logout', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const sessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        sessionToken: 'token-789',
        deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const revoked = await manager.revokeSession('user-123', 'token-789');

      expect(revoked).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should revoke all sessions on password change', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const sessionTokens = ['token-1', 'token-2', 'token-3'];
      mockRedis.smembers.mockResolvedValue(sessionTokens);

      mockRedis.get.mockImplementation(() =>
        Promise.resolve(
          JSON.stringify({
            userId: 'user-123',
            organizationId: 'org-456',
            sessionToken: 'token-1',
            deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
            isRevoked: false
          })
        )
      );

      const count = await manager.revokeAllUserSessions(
        'user-123',
        'password_changed'
      );

      expect(count).toBe(3);
    });
  });

  describe('Flow 5: Session Timeout and Expiration', () => {
    test('should expire session after 30 minutes of inactivity', async () => {
      const { SessionManager } = await import('@/lib/session/manager');
      const manager = new SessionManager();

      const expiredSession = {
        userId: 'user-123',
        organizationId: 'org-456',
        sessionToken: 'token-789',
        deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() - 1).toISOString(), // Expired
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredSession));

      const validation = await manager.validateSession('user-123', 'token-789');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });

    test('should extend session on activity', async () => {
      const { RedisSessionStore } = await import('@/lib/session/redis-store');
      const store = new RedisSessionStore({
        url: 'http://test-redis.com',
        token: 'test-token',
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 5
      });

      const oldActivity = new Date(Date.now() - 60000).toISOString();
      const sessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        sessionToken: 'token-789',
        deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
        createdAt: new Date().toISOString(),
        lastActivity: oldActivity,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const updated = await store.updateSessionActivity('user-123', 'token-789');

      expect(updated).not.toBeNull();
      expect(updated?.lastActivity).not.toBe(oldActivity);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        1800, // 30 minutes
        expect.any(String)
      );
    });
  });

  describe('Flow 6: API Route Integration', () => {
    test('should refresh session via API', async () => {
      const { POST } = await import(
        '@/app/api/auth/session/refresh/route'
      );

      const sessionData = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        sessionToken: 'token-789',
        deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isRevoked: false
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const request = new NextRequest('http://localhost/api/auth/session/refresh', {
        method: 'POST',
        headers: {
          cookie: 'adsapp_session=token-789'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should list sessions via API', async () => {
      const { GET } = await import('@/app/api/auth/session/list/route');

      const sessionTokens = ['token-1', 'token-2'];
      mockRedis.smembers.mockResolvedValue(sessionTokens);

      mockRedis.get.mockImplementation(() =>
        Promise.resolve(
          JSON.stringify({
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            sessionToken: 'token-1',
            deviceInfo: { userAgent: 'Test', ip: '1.1.1.1' },
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
            isRevoked: false
          })
        )
      );

      const request = new NextRequest('http://localhost/api/auth/session/list', {
        method: 'GET',
        headers: {
          cookie: 'adsapp_session=token-1'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toBeDefined();
      expect(data.sessions.length).toBe(2);
    });
  });

  describe('Flow 7: Error Handling', () => {
    test('should handle Redis connection failure gracefully', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const { RedisSessionStore } = await import('@/lib/session/redis-store');
      const store = new RedisSessionStore({
        url: 'http://test-redis.com',
        token: 'test-token',
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 5
      });

      const health = await store.getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });

    test('should handle malformed session data', async () => {
      const { RedisSessionStore } = await import('@/lib/session/redis-store');
      const store = new RedisSessionStore({
        url: 'http://test-redis.com',
        token: 'test-token',
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 5
      });

      mockRedis.get.mockResolvedValue('invalid-json');

      await expect(
        store.getSession('user-123', 'token-789')
      ).rejects.toThrow();
    });
  });
});
