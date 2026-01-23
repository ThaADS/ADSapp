import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/server'
import { RedisSessionStore, createRedisSessionStore, RedisSession, DeviceInfo } from './redis-store'

/**
 * Session Manager for Enterprise Session Management
 *
 * Provides high-level session management operations including:
 * - Session creation with concurrent limits
 * - Session validation and refresh
 * - Privilege change detection and session regeneration
 * - Multi-device session tracking
 * - Security event logging
 *
 * Security Features:
 * - Automatic session regeneration on privilege changes
 * - Concurrent session limits (max 5 per user)
 * - Session revocation on security events
 * - Device fingerprinting
 * - Audit logging for all session operations
 *
 * @module session-manager
 */

/**
 * Session creation parameters
 */
export interface CreateSessionParams {
  userId: string
  organizationId: string
  userRole: string
  deviceInfo: DeviceInfo
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean
  session?: RedisSession
  reason?: string
}

/**
 * Session refresh result
 */
export interface SessionRefreshResult {
  success: boolean
  session?: RedisSession
  newToken?: string
  error?: string
}

/**
 * Privilege change detection result
 */
export interface PrivilegeChangeResult {
  changed: boolean
  oldRole?: string
  newRole?: string
  requiresRegeneration: boolean
}

/**
 * Session event types for audit logging
 */
export enum SessionEventType {
  CREATED = 'session_created',
  VALIDATED = 'session_validated',
  REFRESHED = 'session_refreshed',
  REVOKED = 'session_revoked',
  EXPIRED = 'session_expired',
  PRIVILEGE_CHANGED = 'privilege_changed',
  CONCURRENT_LIMIT = 'concurrent_limit_reached',
  INVALID_TOKEN = 'invalid_token',
  SECURITY_EVENT = 'security_event',
}

/**
 * Session audit event
 */
export interface SessionAuditEvent {
  eventType: SessionEventType
  userId: string
  organizationId: string
  sessionToken?: string
  deviceInfo?: DeviceInfo
  metadata?: Record<string, unknown>
  timestamp: string
}

/**
 * Session Manager Class
 *
 * Manages enterprise-grade session operations with security features:
 * - Concurrent session management
 * - Privilege-based session regeneration
 * - Comprehensive audit logging
 * - Multi-device tracking
 *
 * @example
 * ```typescript
 * const manager = new SessionManager();
 *
 * // Create session
 * const { session, token } = await manager.createSession({
 *   userId: 'user123',
 *   organizationId: 'org456',
 *   userRole: 'admin',
 *   deviceInfo: { userAgent: '...', ip: '...' }
 * });
 *
 * // Validate session
 * const validation = await manager.validateSession('user123', token);
 * ```
 */
export class SessionManager {
  private store: RedisSessionStore | null
  private storeInitialized: boolean = false

  /**
   * Initialize Session Manager
   *
   * @param store - Optional custom Redis session store
   */
  constructor(store?: RedisSessionStore | null) {
    if (store !== undefined) {
      this.store = store
      this.storeInitialized = true
    } else {
      // Delay initialization to avoid circular dependency during module load
      this.store = null
      this.storeInitialized = false
    }
  }

  /**
   * Lazy initialize Redis store
   */
  private initializeStoreIfNeeded(): void {
    if (!this.storeInitialized) {
      try {
        this.store = createRedisSessionStore()
      } catch (error) {
        console.warn('[SessionManager] Failed to initialize Redis:', error)
        this.store = null
      }
      this.storeInitialized = true
    }
  }

  /**
   * Check if Redis store is available
   *
   * @returns True if Redis is configured and available
   */
  private hasStore(): boolean {
    this.initializeStoreIfNeeded()
    return this.store !== null
  }

  /**
   * Create a new session
   *
   * Process:
   * 1. Generate secure session token
   * 2. Check concurrent session limits
   * 3. Create session in Redis
   * 4. Log session creation to database
   * 5. Log audit event
   *
   * @param params - Session creation parameters
   * @returns Session object and token
   * @throws Error if session creation fails
   *
   * @example
   * ```typescript
   * const result = await manager.createSession({
   *   userId: 'user123',
   *   organizationId: 'org456',
   *   userRole: 'admin',
   *   deviceInfo: {
   *     userAgent: 'Mozilla/5.0...',
   *     ip: '192.168.1.1',
   *     platform: 'web'
   *   }
   * });
   * ```
   */
  async createSession(params: CreateSessionParams): Promise<{
    session: RedisSession
    token: string
  }> {
    const { userId, organizationId, userRole, deviceInfo } = params

    // Generate secure session token
    const sessionToken = this.generateSessionToken()

    // Check if Redis is available
    if (!this.hasStore()) {
      console.warn('[SessionManager] Redis not available - using database-only sessions')
      // Create minimal session for database-only mode
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      const session: RedisSession = {
        userId,
        organizationId,
        sessionToken,
        deviceInfo,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        isRevoked: false,
      }

      // Log session to database only
      await this.logSessionToDatabase(session, userRole)

      return {
        session,
        token: sessionToken,
      }
    }

    // Create session in Redis (handles concurrent limits automatically)
    const session = await this.store!.createSession({
      userId,
      organizationId,
      sessionToken,
      deviceInfo,
    })

    // Log session to database
    await this.logSessionToDatabase(session, userRole)

    // Log audit event
    await this.logAuditEvent({
      eventType: SessionEventType.CREATED,
      userId,
      organizationId,
      sessionToken,
      deviceInfo,
      metadata: { userRole },
      timestamp: new Date().toISOString(),
    })

    return {
      session,
      token: sessionToken,
    }
  }

  /**
   * Validate a session
   *
   * Checks:
   * 1. Session exists in Redis
   * 2. Not expired
   * 3. Not revoked
   * 4. User still exists in database
   * 5. Organization still active
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const validation = await manager.validateSession('user123', 'token789');
   * if (validation.valid) {
   *   // Session is valid
   * } else {
   *   // Session invalid: validation.reason
   * }
   * ```
   */
  async validateSession(userId: string, sessionToken: string): Promise<SessionValidationResult> {
    // Get session from Redis or database
    let session: RedisSession | null = null

    if (this.hasStore()) {
      session = await this.store!.getSession(userId, sessionToken)
    } else {
      // Fallback to database-only mode
      session = await this.getSessionFromDatabase(userId, sessionToken)
    }

    if (!session) {
      await this.logAuditEvent({
        eventType: SessionEventType.INVALID_TOKEN,
        userId,
        organizationId: '',
        sessionToken,
        timestamp: new Date().toISOString(),
      })

      return {
        valid: false,
        reason: 'Session not found or expired',
      }
    }

    // Check if session is revoked
    if (session.isRevoked) {
      return {
        valid: false,
        reason: 'Session has been revoked',
      }
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.logAuditEvent({
        eventType: SessionEventType.EXPIRED,
        userId,
        organizationId: session.organizationId,
        sessionToken,
        timestamp: new Date().toISOString(),
      })

      return {
        valid: false,
        reason: 'Session has expired',
      }
    }

    // Validate user still exists
    const userExists = await this.validateUserExists(userId)
    if (!userExists) {
      if (this.hasStore()) {
        await this.store!.revokeSession(userId, sessionToken)
      }
      return {
        valid: false,
        reason: 'User no longer exists',
      }
    }

    // Validate organization still active
    const orgActive = await this.validateOrganizationActive(session.organizationId)
    if (!orgActive) {
      if (this.hasStore()) {
        await this.store!.revokeSession(userId, sessionToken)
      }
      return {
        valid: false,
        reason: 'Organization is not active',
      }
    }

    // Log validation event
    await this.logAuditEvent({
      eventType: SessionEventType.VALIDATED,
      userId,
      organizationId: session.organizationId,
      sessionToken,
      timestamp: new Date().toISOString(),
    })

    return {
      valid: true,
      session,
    }
  }

  /**
   * Refresh session activity
   *
   * Updates last activity timestamp and extends TTL.
   * Called by middleware on each authenticated request.
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Updated session or null
   *
   * @example
   * ```typescript
   * // Called by session middleware
   * const session = await manager.refreshSession('user123', 'token789');
   * ```
   */
  async refreshSession(userId: string, sessionToken: string): Promise<SessionRefreshResult> {
    // Validate session first
    const validation = await this.validateSession(userId, sessionToken)

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
      }
    }

    // Update activity in Redis or database
    let updatedSession: RedisSession | null = null

    if (this.hasStore()) {
      updatedSession = await this.store!.updateSessionActivity(userId, sessionToken)
    } else {
      // Database-only mode: update database directly
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      updatedSession = {
        ...validation.session!,
        lastActivity: now,
        expiresAt,
      }

      await this.updateSessionInDatabase(updatedSession)
    }

    if (!updatedSession) {
      return {
        success: false,
        error: 'Failed to update session activity',
      }
    }

    // Update database record (if Redis was used)
    if (this.hasStore()) {
      await this.updateSessionInDatabase(updatedSession)
    }

    // Log refresh event
    await this.logAuditEvent({
      eventType: SessionEventType.REFRESHED,
      userId,
      organizationId: updatedSession.organizationId,
      sessionToken,
      timestamp: new Date().toISOString(),
    })

    return {
      success: true,
      session: updatedSession,
    }
  }

  /**
   * Revoke a specific session
   *
   * Used for:
   * - User logout from specific device
   * - Security events
   * - Administrative actions
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns True if revoked successfully
   *
   * @example
   * ```typescript
   * // User logs out from one device
   * await manager.revokeSession('user123', 'token789');
   * ```
   */
  async revokeSession(userId: string, sessionToken: string): Promise<boolean> {
    let session: RedisSession | null = null

    if (this.hasStore()) {
      session = await this.store!.getSession(userId, sessionToken)
    } else {
      session = await this.getSessionFromDatabase(userId, sessionToken)
    }

    if (!session) {
      return false
    }

    // Revoke in Redis or database
    let revoked = false

    if (this.hasStore()) {
      revoked = await this.store!.revokeSession(userId, sessionToken)
    } else {
      // Database-only mode: mark as revoked directly
      await this.markSessionRevokedInDatabase(sessionToken)
      revoked = true
    }

    if (revoked) {
      // Update database (if Redis was used)
      if (this.hasStore()) {
        await this.markSessionRevokedInDatabase(sessionToken)
      }

      // Log audit event
      await this.logAuditEvent({
        eventType: SessionEventType.REVOKED,
        userId,
        organizationId: session.organizationId,
        sessionToken,
        timestamp: new Date().toISOString(),
      })
    }

    return revoked
  }

  /**
   * Revoke all sessions for a user
   *
   * Used for:
   * - Password changes
   * - Account compromise
   * - Security policies
   * - Manual user action
   *
   * @param userId - User ID
   * @param reason - Reason for revocation
   * @returns Number of sessions revoked
   *
   * @example
   * ```typescript
   * // User changes password
   * const count = await manager.revokeAllUserSessions(
   *   'user123',
   *   'password_changed'
   * );
   * ```
   */
  async revokeAllUserSessions(userId: string, reason: string): Promise<number> {
    // Get user's organization
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    const organizationId = profile?.organization_id || ''

    // Revoke all sessions in Redis or database
    let count = 0

    if (this.hasStore()) {
      count = await this.store!.revokeAllUserSessions(userId)
    } else {
      // Database-only mode: revoke all sessions in database
      const { data: sessions } = await supabase
        .from('sessions')
        .select('session_token')
        .eq('user_id', userId)
        .eq('revoked', false)

      if (sessions) {
        for (const session of sessions) {
          await this.markSessionRevokedInDatabase(session.session_token)
        }
        count = sessions.length
      }
    }

    // Log audit event
    await this.logAuditEvent({
      eventType: SessionEventType.SECURITY_EVENT,
      userId,
      organizationId,
      metadata: {
        reason,
        sessionsRevoked: count,
      },
      timestamp: new Date().toISOString(),
    })

    return count
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User ID
   * @returns Array of active sessions
   *
   * @example
   * ```typescript
   * const sessions = await manager.getUserSessions('user123');
   * console.log(`User has ${sessions.length} active sessions`);
   * ```
   */
  async getUserSessions(userId: string): Promise<RedisSession[]> {
    if (this.hasStore()) {
      return this.store!.getUserSessions(userId)
    } else {
      // Database-only mode: get sessions from database
      try {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('revoked', false)
          .gte('expires_at', new Date().toISOString())

        if (error || !data) {
          return []
        }

        // Convert to RedisSession format
        return data.map(session => ({
          userId: session.user_id,
          organizationId: session.organization_id,
          sessionToken: session.session_token,
          deviceInfo: session.device_info,
          createdAt: session.created_at,
          lastActivity: session.last_activity,
          expiresAt: session.expires_at,
          isRevoked: session.revoked,
        }))
      } catch (error) {
        console.error('[SessionManager] Failed to get user sessions:', error)
        return []
      }
    }
  }

  /**
   * Check for privilege changes
   *
   * Compares session role with current user role in database.
   * Triggers session regeneration if privileges changed.
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Privilege change result
   *
   * @example
   * ```typescript
   * const result = await manager.checkPrivilegeChange('user123', 'token789');
   * if (result.requiresRegeneration) {
   *   await manager.regenerateSession('user123', 'token789');
   * }
   * ```
   */
  async checkPrivilegeChange(userId: string, sessionToken: string): Promise<PrivilegeChangeResult> {
    // Get current session
    let session: RedisSession | null = null

    if (this.hasStore()) {
      session = await this.store!.getSession(userId, sessionToken)
    } else {
      session = await this.getSessionFromDatabase(userId, sessionToken)
    }

    if (!session) {
      return {
        changed: false,
        requiresRegeneration: false,
      }
    }

    // Get current user role from database
    const currentRole = await this.getUserRoleFromDatabase(userId)

    if (!currentRole) {
      return {
        changed: false,
        requiresRegeneration: false,
      }
    }

    // Get session role from database
    const supabase = await createClient()
    const { data: sessionRecord } = await supabase
      .from('sessions')
      .select('user_role')
      .eq('session_token', sessionToken)
      .single()

    const sessionRole = sessionRecord?.user_role

    if (sessionRole && sessionRole !== currentRole) {
      // Privilege changed
      await this.logAuditEvent({
        eventType: SessionEventType.PRIVILEGE_CHANGED,
        userId,
        organizationId: session.organizationId,
        sessionToken,
        metadata: {
          oldRole: sessionRole,
          newRole: currentRole,
        },
        timestamp: new Date().toISOString(),
      })

      return {
        changed: true,
        oldRole: sessionRole,
        newRole: currentRole,
        requiresRegeneration: true,
      }
    }

    return {
      changed: false,
      requiresRegeneration: false,
    }
  }

  /**
   * Regenerate session after privilege change
   *
   * Creates new session token while maintaining session continuity.
   *
   * @param userId - User ID
   * @param oldSessionToken - Old session token
   * @returns New session and token
   *
   * @example
   * ```typescript
   * const { session, token } = await manager.regenerateSession(
   *   'user123',
   *   'old_token'
   * );
   * // Send new token to client
   * ```
   */
  async regenerateSession(
    userId: string,
    oldSessionToken: string
  ): Promise<{ session: RedisSession; token: string }> {
    // Get old session
    let oldSession: RedisSession | null = null

    if (this.hasStore()) {
      oldSession = await this.store!.getSession(userId, oldSessionToken)
    } else {
      oldSession = await this.getSessionFromDatabase(userId, oldSessionToken)
    }

    if (!oldSession) {
      throw new Error('Session not found')
    }

    // Get current user info
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const currentRole = profile?.role || 'agent'

    // Revoke old session
    await this.revokeSession(userId, oldSessionToken)

    // Create new session
    const result = await this.createSession({
      userId,
      organizationId: oldSession.organizationId,
      userRole: currentRole,
      deviceInfo: oldSession.deviceInfo,
    })

    return result
  }

  /**
   * Generate secure session token
   *
   * Creates cryptographically secure random token.
   *
   * @returns Session token
   */
  private generateSessionToken(): string {
    return `${uuidv4()}_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  /**
   * Log session to database
   *
   * Creates persistent record in sessions table.
   *
   * @param session - Redis session
   * @param userRole - User role
   */
  private async logSessionToDatabase(session: RedisSession, userRole: string): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('sessions').insert({
        user_id: session.userId,
        organization_id: session.organizationId,
        session_token: session.sessionToken,
        device_info: session.deviceInfo,
        user_role: userRole,
        created_at: session.createdAt,
        last_activity: session.lastActivity,
        expires_at: session.expiresAt,
        revoked: false,
      })
    } catch (error) {
      console.error('[SessionManager] Failed to log session to database:', error)
      // Don't throw - Redis is source of truth
    }
  }

  /**
   * Update session in database
   *
   * @param session - Updated session
   */
  private async updateSessionInDatabase(session: RedisSession): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase
        .from('sessions')
        .update({
          last_activity: session.lastActivity,
          expires_at: session.expiresAt,
        })
        .eq('session_token', session.sessionToken)
    } catch (error) {
      console.error('[SessionManager] Failed to update session in database:', error)
    }
  }

  /**
   * Mark session as revoked in database
   *
   * @param sessionToken - Session token
   */
  private async markSessionRevokedInDatabase(sessionToken: string): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase
        .from('sessions')
        .update({
          revoked: true,
        })
        .eq('session_token', sessionToken)
    } catch (error) {
      console.error('[SessionManager] Failed to mark session revoked:', error)
    }
  }

  /**
   * Validate user exists in database
   *
   * @param userId - User ID
   * @returns True if user exists
   */
  private async validateUserExists(userId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.from('profiles').select('id').eq('id', userId).single()

      return !error && !!data
    } catch (error) {
      console.error('[SessionManager] Failed to validate user:', error)
      return false
    }
  }

  /**
   * Validate organization is active
   *
   * @param organizationId - Organization ID
   * @returns True if organization active
   */
  private async validateOrganizationActive(organizationId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_status')
        .eq('id', organizationId)
        .single()

      if (error || !data) return false

      return data.subscription_status === 'active' || data.subscription_status === 'trial'
    } catch (error) {
      console.error('[SessionManager] Failed to validate organization:', error)
      return false
    }
  }

  /**
   * Get user role from database
   *
   * @param userId - User ID
   * @returns User role or null
   */
  private async getUserRoleFromDatabase(userId: string): Promise<string | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      return error || !data ? null : data.role
    } catch (error) {
      console.error('[SessionManager] Failed to get user role:', error)
      return null
    }
  }

  /**
   * Log audit event
   *
   * Records session events for security monitoring.
   *
   * @param event - Audit event
   */
  private async logAuditEvent(event: SessionAuditEvent): Promise<void> {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionManager] Audit Event:', event)
      }

      // In production, send to monitoring service (Sentry, custom analytics, etc.)
      if (process.env.NODE_ENV === 'production') {
        try {
          const Sentry = await import('@sentry/nextjs')
          Sentry.captureMessage('Session Audit Event', {
            level: 'info',
            extra: event as Record<string, unknown>,
          })
        } catch (error) {
          console.error('[SessionManager] Failed to log to Sentry:', error)
        }
      }
    } catch (error) {
      console.error('[SessionManager] Failed to log audit event:', error)
    }
  }

  /**
   * Get session from database (fallback when Redis unavailable)
   *
   * @param userId - User ID
   * @param sessionToken - Session token
   * @returns Session or null
   */
  private async getSessionFromDatabase(
    userId: string,
    sessionToken: string
  ): Promise<RedisSession | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_token', sessionToken)
        .eq('revoked', false)
        .single()

      if (error || !data) {
        return null
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        return null
      }

      // Convert database format to RedisSession format
      return {
        userId: data.user_id,
        organizationId: data.organization_id,
        sessionToken: data.session_token,
        deviceInfo: data.device_info,
        createdAt: data.created_at,
        lastActivity: data.last_activity,
        expiresAt: data.expires_at,
        isRevoked: data.revoked,
      }
    } catch (error) {
      console.error('[SessionManager] Failed to get session from database:', error)
      return null
    }
  }

  /**
   * Get store instance (for testing)
   *
   * @returns Redis session store or null
   */
  getStore(): RedisSessionStore | null {
    return this.store
  }
}

/**
 * Get or create session manager instance (lazy singleton)
 *
 * @returns SessionManager singleton
 *
 * @example
 * ```typescript
 * const manager = getSessionManager();
 * await manager.validateSession(userId, token);
 * ```
 */
export function getSessionManager(): SessionManager {
  // Use a module-scoped variable that's only initialized when this function is first called
  if (typeof (globalThis as any).__adsapp_session_manager === 'undefined') {
    ;(globalThis as any).__adsapp_session_manager = new SessionManager()
  }
  return (globalThis as any).__adsapp_session_manager
}

/**
 * Reset session manager instance (for testing)
 */
export function resetSessionManager(): void {
  delete (globalThis as any).__adsapp_session_manager
}
