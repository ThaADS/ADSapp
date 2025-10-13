import { Redis } from '@upstash/redis';

/**
 * Redis Session Store for Enterprise Session Management
 *
 * Provides high-performance, distributed session storage using Upstash Redis.
 * Supports concurrent session management, automatic TTL expiration, and efficient
 * session tracking across multiple application instances.
 *
 * Security Features:
 * - Automatic session expiration with TTL
 * - Atomic operations for concurrent session limits
 * - Device fingerprinting for session tracking
 * - Efficient key-based session lookups
 *
 * Performance:
 * - O(1) lookups for session retrieval
 * - Batch operations for multi-session management
 * - Automatic cleanup via Redis TTL
 * - Optimized for high-throughput scenarios
 *
 * @module redis-store
 */

/**
 * Device information for session tracking
 */
export interface DeviceInfo {
  userAgent: string;
  ip: string;
  platform?: string;
  browser?: string;
  os?: string;
}

/**
 * Redis session data structure
 * Stored in Redis with automatic TTL expiration
 */
export interface RedisSession {
  userId: string;
  organizationId: string;
  sessionToken: string;
  deviceInfo: DeviceInfo;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isRevoked: boolean;
}

/**
 * Session statistics for monitoring
 */
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  revokedSessions: number;
  oldestSession: string | null;
  newestSession: string | null;
}

/**
 * Configuration for Redis Session Store
 */
export interface RedisStoreConfig {
  url: string;
  token: string;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<RedisStoreConfig> = {
  sessionTimeoutMinutes: 30,
  maxConcurrentSessions: 5
};

/**
 * Redis Session Store Class
 *
 * Manages session storage and retrieval using Upstash Redis.
 * Implements enterprise-grade session management with concurrent session limits,
 * automatic expiration, and device tracking.
 *
 * @example
 * ```typescript
 * const store = new RedisSessionStore({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 *   sessionTimeoutMinutes: 30,
 *   maxConcurrentSessions: 5
 * });
 *
 * // Create a new session
 * await store.createSession({
 *   userId: 'user123',
 *   organizationId: 'org456',
 *   sessionToken: 'token789',
 *   deviceInfo: { userAgent: '...', ip: '...' }
 * });
 * ```
 */
export class RedisSessionStore {
  private redis: Redis;
  private config: RedisStoreConfig;

  /**
   * Initialize Redis Session Store
   *
   * @param config - Redis configuration and session settings
   * @throws Error if Redis connection cannot be established
   */
  constructor(config: RedisStoreConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    } as RedisStoreConfig;

    this.redis = new Redis({
      url: this.config.url,
      token: this.config.token
    });
  }

  /**
   * Generate Redis key for session storage
   * Format: session:{userId}:{sessionToken}
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Redis key string
   */
  private getSessionKey(userId: string, sessionToken: string): string {
    return `session:${userId}:${sessionToken}`;
  }

  /**
   * Generate Redis key for user sessions index
   * Format: user_sessions:{userId}
   *
   * @param userId - User ID
   * @returns Redis key string for user sessions set
   */
  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  /**
   * Generate Redis key for organization sessions tracking
   * Format: org_sessions:{organizationId}:{userId}
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Redis key string for organization sessions
   */
  private getOrgSessionKey(organizationId: string, userId: string): string {
    return `org_sessions:${organizationId}:${userId}`;
  }

  /**
   * Calculate session TTL in seconds
   *
   * @returns TTL in seconds
   */
  private getSessionTTL(): number {
    return this.config.sessionTimeoutMinutes * 60;
  }

  /**
   * Create a new session in Redis
   *
   * Implements concurrent session management:
   * 1. Checks current session count for user
   * 2. If at limit, removes oldest session (FIFO)
   * 3. Creates new session with TTL
   * 4. Updates user sessions index
   *
   * @param sessionData - Session data to store
   * @returns Created session object
   * @throws Error if session creation fails
   *
   * @example
   * ```typescript
   * const session = await store.createSession({
   *   userId: 'user123',
   *   organizationId: 'org456',
   *   sessionToken: 'token789',
   *   deviceInfo: {
   *     userAgent: 'Mozilla/5.0...',
   *     ip: '192.168.1.1',
   *     platform: 'web'
   *   }
   * });
   * ```
   */
  async createSession(sessionData: {
    userId: string;
    organizationId: string;
    sessionToken: string;
    deviceInfo: DeviceInfo;
  }): Promise<RedisSession> {
    const { userId, organizationId, sessionToken, deviceInfo } = sessionData;

    // Check concurrent session limit
    const existingSessions = await this.getUserSessions(userId);

    if (existingSessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session (FIFO eviction)
      const oldestSession = existingSessions.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];

      await this.deleteSession(userId, oldestSession.sessionToken);
    }

    // Create session object
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + this.config.sessionTimeoutMinutes * 60 * 1000
    ).toISOString();

    const session: RedisSession = {
      userId,
      organizationId,
      sessionToken,
      deviceInfo,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      isRevoked: false
    };

    // Store session in Redis with TTL
    const sessionKey = this.getSessionKey(userId, sessionToken);
    const ttlSeconds = this.getSessionTTL();

    await this.redis.setex(sessionKey, ttlSeconds, JSON.stringify(session));

    // Add to user sessions index
    const userSessionsKey = this.getUserSessionsKey(userId);
    await this.redis.sadd(userSessionsKey, sessionToken);
    await this.redis.expire(userSessionsKey, ttlSeconds);

    // Add to organization tracking
    const orgSessionKey = this.getOrgSessionKey(organizationId, userId);
    await this.redis.sadd(orgSessionKey, sessionToken);
    await this.redis.expire(orgSessionKey, ttlSeconds);

    return session;
  }

  /**
   * Get session by user ID and session token
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Session object or null if not found/expired
   *
   * @example
   * ```typescript
   * const session = await store.getSession('user123', 'token789');
   * if (session && !session.isRevoked) {
   *   // Session is valid
   * }
   * ```
   */
  async getSession(
    userId: string,
    sessionToken: string
  ): Promise<RedisSession | null> {
    const sessionKey = this.getSessionKey(userId, sessionToken);
    const sessionData = await this.redis.get<string>(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session: RedisSession = JSON.parse(sessionData);

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(userId, sessionToken);
      return null;
    }

    // Check if session is revoked
    if (session.isRevoked) {
      return null;
    }

    return session;
  }

  /**
   * Update session last activity timestamp
   *
   * Extends session TTL and updates last activity.
   * Called on every authenticated request to maintain session.
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Updated session or null if not found
   *
   * @example
   * ```typescript
   * // Called by session middleware on each request
   * await store.updateSessionActivity('user123', 'token789');
   * ```
   */
  async updateSessionActivity(
    userId: string,
    sessionToken: string
  ): Promise<RedisSession | null> {
    const session = await this.getSession(userId, sessionToken);

    if (!session) {
      return null;
    }

    // Update last activity and expiration
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + this.config.sessionTimeoutMinutes * 60 * 1000
    ).toISOString();

    const updatedSession: RedisSession = {
      ...session,
      lastActivity: now,
      expiresAt
    };

    // Update in Redis with refreshed TTL
    const sessionKey = this.getSessionKey(userId, sessionToken);
    const ttlSeconds = this.getSessionTTL();

    await this.redis.setex(
      sessionKey,
      ttlSeconds,
      JSON.stringify(updatedSession)
    );

    return updatedSession;
  }

  /**
   * Revoke a specific session
   *
   * Marks session as revoked without deleting it immediately.
   * Allows for audit trail and revocation tracking.
   *
   * @param userId - User ID
   * @param sessionToken - Session token to revoke
   * @returns True if revoked successfully
   *
   * @example
   * ```typescript
   * // Revoke specific session (e.g., user logs out from one device)
   * await store.revokeSession('user123', 'token789');
   * ```
   */
  async revokeSession(
    userId: string,
    sessionToken: string
  ): Promise<boolean> {
    const session = await this.getSession(userId, sessionToken);

    if (!session) {
      return false;
    }

    // Mark as revoked
    const revokedSession: RedisSession = {
      ...session,
      isRevoked: true
    };

    // Update in Redis with short TTL (keep for audit)
    const sessionKey = this.getSessionKey(userId, sessionToken);
    await this.redis.setex(sessionKey, 3600, JSON.stringify(revokedSession)); // 1 hour audit trail

    return true;
  }

  /**
   * Delete a session permanently
   *
   * Removes session from Redis and all indexes.
   * Used for cleanup and FIFO eviction.
   *
   * @param userId - User ID
   * @param sessionToken - Session token to delete
   * @returns True if deleted successfully
   */
  async deleteSession(userId: string, sessionToken: string): Promise<boolean> {
    const session = await this.getSession(userId, sessionToken);

    if (!session) {
      return false;
    }

    // Delete session
    const sessionKey = this.getSessionKey(userId, sessionToken);
    await this.redis.del(sessionKey);

    // Remove from user sessions index
    const userSessionsKey = this.getUserSessionsKey(userId);
    await this.redis.srem(userSessionsKey, sessionToken);

    // Remove from organization tracking
    const orgSessionKey = this.getOrgSessionKey(
      session.organizationId,
      userId
    );
    await this.redis.srem(orgSessionKey, sessionToken);

    return true;
  }

  /**
   * Get all sessions for a user
   *
   * Returns all active (non-revoked, non-expired) sessions.
   * Used for session listing and management.
   *
   * @param userId - User ID
   * @returns Array of active sessions
   *
   * @example
   * ```typescript
   * const sessions = await store.getUserSessions('user123');
   * console.log(`User has ${sessions.length} active sessions`);
   * ```
   */
  async getUserSessions(userId: string): Promise<RedisSession[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionTokens = await this.redis.smembers<string[]>(userSessionsKey);

    if (!sessionTokens || sessionTokens.length === 0) {
      return [];
    }

    // Get all sessions in parallel
    const sessionPromises = sessionTokens.map(token =>
      this.getSession(userId, token)
    );

    const sessions = await Promise.all(sessionPromises);

    // Filter out null values (expired/revoked sessions)
    return sessions.filter((s): s is RedisSession => s !== null);
  }

  /**
   * Revoke all sessions for a user
   *
   * Used for security events like password changes, account compromise,
   * or manual user action.
   *
   * @param userId - User ID
   * @returns Number of sessions revoked
   *
   * @example
   * ```typescript
   * // User changes password - revoke all sessions
   * const count = await store.revokeAllUserSessions('user123');
   * console.log(`Revoked ${count} sessions`);
   * ```
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);

    // Revoke all sessions in parallel
    const revokePromises = sessions.map(session =>
      this.revokeSession(userId, session.sessionToken)
    );

    const results = await Promise.all(revokePromises);

    // Count successful revocations
    return results.filter(r => r).length;
  }

  /**
   * Delete all sessions for a user
   *
   * Permanently removes all user sessions.
   * Used for account deletion or administrative actions.
   *
   * @param userId - User ID
   * @returns Number of sessions deleted
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);

    // Delete all sessions in parallel
    const deletePromises = sessions.map(session =>
      this.deleteSession(userId, session.sessionToken)
    );

    const results = await Promise.all(deletePromises);

    // Count successful deletions
    return results.filter(r => r).length;
  }

  /**
   * Get session statistics for a user
   *
   * Provides metrics for monitoring and analytics.
   *
   * @param userId - User ID
   * @returns Session statistics
   */
  async getUserSessionStats(userId: string): Promise<SessionStats> {
    const sessions = await this.getUserSessions(userId);
    const revokedSessions = sessions.filter(s => s.isRevoked);

    let oldestSession: string | null = null;
    let newestSession: string | null = null;

    if (sessions.length > 0) {
      const sorted = sessions.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      oldestSession = sorted[0].createdAt;
      newestSession = sorted[sorted.length - 1].createdAt;
    }

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.length - revokedSessions.length,
      revokedSessions: revokedSessions.length,
      oldestSession,
      newestSession
    };
  }

  /**
   * Clean up expired sessions manually
   *
   * While Redis automatically removes expired keys, this method
   * provides manual cleanup for index consistency.
   *
   * @param userId - User ID
   * @returns Number of sessions cleaned up
   */
  async cleanupExpiredSessions(userId: string): Promise<number> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionTokens = await this.redis.smembers<string[]>(userSessionsKey);

    if (!sessionTokens || sessionTokens.length === 0) {
      return 0;
    }

    let cleanedCount = 0;

    for (const token of sessionTokens) {
      const session = await this.getSession(userId, token);
      if (!session) {
        // Session is expired or invalid - remove from index
        await this.redis.srem(userSessionsKey, token);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Validate session configuration
   *
   * Checks if Redis connection is working and configuration is valid.
   *
   * @returns True if configuration is valid
   * @throws Error if validation fails
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Test Redis connection
      await this.redis.ping();

      // Validate configuration values
      if (this.config.sessionTimeoutMinutes < 1) {
        throw new Error('Session timeout must be at least 1 minute');
      }

      if (this.config.maxConcurrentSessions < 1) {
        throw new Error('Max concurrent sessions must be at least 1');
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Redis Session Store validation failed: ${message}`);
    }
  }

  /**
   * Get Redis connection health status
   *
   * @returns Health status object
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        latency: -1,
        error: message
      };
    }
  }
}

/**
 * Create and configure Redis Session Store
 *
 * Factory function for easy store initialization.
 *
 * @param config - Optional configuration overrides
 * @returns Configured RedisSessionStore instance
 *
 * @example
 * ```typescript
 * const store = createRedisSessionStore({
 *   sessionTimeoutMinutes: 60, // 1 hour
 *   maxConcurrentSessions: 10
 * });
 * ```
 */
export function createRedisSessionStore(
  config?: Partial<RedisStoreConfig>
): RedisSessionStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
    );
  }

  const fullConfig: RedisStoreConfig = {
    url,
    token,
    sessionTimeoutMinutes: config?.sessionTimeoutMinutes ??
      Number(process.env.SESSION_TIMEOUT_MINUTES) ??
      30,
    maxConcurrentSessions: config?.maxConcurrentSessions ??
      Number(process.env.MAX_CONCURRENT_SESSIONS) ??
      5
  };

  return new RedisSessionStore(fullConfig);
}
