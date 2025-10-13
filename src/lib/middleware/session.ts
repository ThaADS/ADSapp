import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager, SessionManager } from '@/lib/session/manager';
import { createClient } from '@/lib/supabase/server';

/**
 * Session Middleware for Enterprise Session Management
 *
 * Validates and manages sessions on every authenticated request:
 * - Validates session token from cookies
 * - Enforces 30-minute inactivity timeout
 * - Updates last activity timestamp
 * - Checks for privilege changes
 * - Handles expired sessions gracefully
 * - Integrates with tenant validation
 *
 * Security Features:
 * - Automatic session expiration
 * - Privilege change detection
 * - Session revocation on security events
 * - Device tracking
 * - Audit logging
 *
 * @module session-middleware
 */

/**
 * Session context attached to request
 */
export interface SessionContext {
  userId: string;
  organizationId: string;
  sessionToken: string;
  userRole: string;
  lastActivity: string;
  expiresAt: string;
  deviceFingerprint: string;
}

/**
 * Session middleware configuration
 */
export interface SessionMiddlewareConfig {
  /**
   * Cookie name for session token
   */
  cookieName?: string;

  /**
   * Paths to exclude from session validation
   */
  excludePaths?: string[];

  /**
   * Enable privilege change detection
   */
  detectPrivilegeChanges?: boolean;

  /**
   * Session manager instance (for testing)
   */
  sessionManager?: SessionManager;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<SessionMiddlewareConfig> = {
  cookieName: 'adsapp_session',
  excludePaths: [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/health',
    '/api/webhooks'
  ],
  detectPrivilegeChanges: true,
  sessionManager: getSessionManager()
};

/**
 * Validate and refresh session
 *
 * Main session middleware function that:
 * 1. Checks if path requires session validation
 * 2. Extracts session token from cookies
 * 3. Validates session
 * 4. Checks for privilege changes
 * 5. Refreshes session activity
 * 6. Attaches session context to request
 *
 * @param request - NextRequest object
 * @param config - Optional configuration
 * @returns NextResponse or null if validation succeeds
 *
 * @example
 * ```typescript
 * // In API route
 * export async function GET(request: NextRequest) {
 *   const sessionValidation = await validateSession(request);
 *   if (sessionValidation) return sessionValidation;
 *
 *   const context = getSessionContext(request);
 *   // Use context for business logic
 * }
 * ```
 */
export async function validateSession(
  request: NextRequest,
  config: SessionMiddlewareConfig = {}
): Promise<NextResponse | null> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const pathname = request.nextUrl.pathname;

  // Check if path is excluded from session validation
  if (isPathExcluded(pathname, fullConfig.excludePaths)) {
    return null;
  }

  try {
    // Extract session token from cookies
    const sessionToken = extractSessionToken(request, fullConfig.cookieName);

    if (!sessionToken) {
      return createUnauthorizedResponse('No session token provided');
    }

    // Extract user ID from Supabase auth
    const userId = await extractUserId(request);

    if (!userId) {
      return createUnauthorizedResponse('User not authenticated');
    }

    // Validate session
    const sessionManager = fullConfig.sessionManager;
    const validation = await sessionManager.validateSession(userId, sessionToken);

    if (!validation.valid) {
      // Session invalid - clear cookie and return error
      const response = createUnauthorizedResponse(
        validation.reason || 'Invalid session'
      );
      response.cookies.delete(fullConfig.cookieName);
      return response;
    }

    const session = validation.session!;

    // Check for privilege changes
    if (fullConfig.detectPrivilegeChanges) {
      const privilegeCheck = await sessionManager.checkPrivilegeChange(
        userId,
        sessionToken
      );

      if (privilegeCheck.requiresRegeneration) {
        // Privilege changed - regenerate session
        const { token: newToken } = await sessionManager.regenerateSession(
          userId,
          sessionToken
        );

        // Return response with new session token
        const response = NextResponse.json(
          {
            error: 'Session regenerated due to privilege change',
            code: 'SESSION_REGENERATED',
            newToken
          },
          { status: 401 }
        );

        // Set new session cookie
        response.cookies.set(fullConfig.cookieName, newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60 // 30 minutes
        });

        return response;
      }
    }

    // Refresh session activity
    const refreshResult = await sessionManager.refreshSession(
      userId,
      sessionToken
    );

    if (!refreshResult.success) {
      return createUnauthorizedResponse(
        refreshResult.error || 'Failed to refresh session'
      );
    }

    // Attach session context to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-user-id', session.userId);
    requestHeaders.set('x-session-org-id', session.organizationId);
    requestHeaders.set('x-session-token', sessionToken);
    requestHeaders.set('x-session-last-activity', session.lastActivity);
    requestHeaders.set('x-session-expires-at', session.expiresAt);

    // Continue request with session context
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  } catch (error) {
    console.error('[SessionMiddleware] Validation error:', error);

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            middleware: 'session-validation'
          }
        });
      } catch (sentryError) {
        console.error('[SessionMiddleware] Failed to log error:', sentryError);
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error during session validation',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract session context from request headers
 *
 * Use this after session middleware validation to get session info.
 *
 * @param request - NextRequest with session headers
 * @returns Session context
 *
 * @example
 * ```typescript
 * const context = getSessionContext(request);
 * console.log(`User ${context.userId} in org ${context.organizationId}`);
 * ```
 */
export function getSessionContext(request: NextRequest): SessionContext {
  return {
    userId: request.headers.get('x-session-user-id') || '',
    organizationId: request.headers.get('x-session-org-id') || '',
    sessionToken: request.headers.get('x-session-token') || '',
    userRole: request.headers.get('x-user-role') || 'agent',
    lastActivity: request.headers.get('x-session-last-activity') || '',
    expiresAt: request.headers.get('x-session-expires-at') || '',
    deviceFingerprint: generateDeviceFingerprint(request)
  };
}

/**
 * Check if session is about to expire
 *
 * Useful for showing warnings to user before session expires.
 *
 * @param request - NextRequest with session headers
 * @param warningMinutes - Minutes before expiration to warn (default: 5)
 * @returns True if session expires soon
 *
 * @example
 * ```typescript
 * if (isSessionExpiringSoon(request, 5)) {
 *   // Show warning to user
 * }
 * ```
 */
export function isSessionExpiringSoon(
  request: NextRequest,
  warningMinutes: number = 5
): boolean {
  const expiresAt = request.headers.get('x-session-expires-at');

  if (!expiresAt) {
    return false;
  }

  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  const warningTime = warningMinutes * 60 * 1000;

  return expirationTime - currentTime <= warningTime;
}

/**
 * Create session cookie
 *
 * Helper function to set session cookie with secure defaults.
 *
 * @param response - NextResponse object
 * @param sessionToken - Session token
 * @param cookieName - Cookie name (default: 'adsapp_session')
 * @param maxAge - Cookie max age in seconds (default: 30 minutes)
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ success: true });
 * setSessionCookie(response, 'token123');
 * ```
 */
export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  cookieName: string = 'adsapp_session',
  maxAge: number = 30 * 60
): void {
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
}

/**
 * Clear session cookie
 *
 * Helper function to remove session cookie.
 *
 * @param response - NextResponse object
 * @param cookieName - Cookie name (default: 'adsapp_session')
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ message: 'Logged out' });
 * clearSessionCookie(response);
 * ```
 */
export function clearSessionCookie(
  response: NextResponse,
  cookieName: string = 'adsapp_session'
): void {
  response.cookies.delete(cookieName);
}

/**
 * Extract session token from request cookies
 *
 * @param request - NextRequest object
 * @param cookieName - Cookie name
 * @returns Session token or null
 */
function extractSessionToken(
  request: NextRequest,
  cookieName: string
): string | null {
  return request.cookies.get(cookieName)?.value || null;
}

/**
 * Extract user ID from Supabase auth
 *
 * @param request - NextRequest object
 * @returns User ID or null
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('[SessionMiddleware] Failed to extract user ID:', error);
    return null;
  }
}

/**
 * Check if path is excluded from session validation
 *
 * @param pathname - Request pathname
 * @param excludePaths - List of excluded paths
 * @returns True if path is excluded
 */
function isPathExcluded(pathname: string, excludePaths: string[]): boolean {
  return excludePaths.some(path => {
    if (path.endsWith('*')) {
      // Wildcard matching
      const prefix = path.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === path;
  });
}

/**
 * Generate device fingerprint from request
 *
 * Creates unique identifier for device/browser combination.
 *
 * @param request - NextRequest object
 * @returns Device fingerprint
 */
function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown';

  // Create hash-like fingerprint (in production, use actual hashing)
  const fingerprint = Buffer.from(
    `${userAgent}:${acceptLanguage}:${acceptEncoding}`
  ).toString('base64');

  return fingerprint.slice(0, 32);
}

/**
 * Create unauthorized response
 *
 * @param message - Error message
 * @returns NextResponse with 401 status
 */
function createUnauthorizedResponse(message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED'
    },
    { status: 401 }
  );
}

/**
 * Session timeout warning middleware
 *
 * Adds session timeout information to response headers.
 *
 * @param request - NextRequest object
 * @param response - NextResponse object
 * @param warningMinutes - Minutes before expiration to warn
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ data: '...' });
 * addSessionTimeoutWarning(request, response, 5);
 * ```
 */
export function addSessionTimeoutWarning(
  request: NextRequest,
  response: NextResponse,
  warningMinutes: number = 5
): void {
  if (isSessionExpiringSoon(request, warningMinutes)) {
    const expiresAt = request.headers.get('x-session-expires-at') || '';
    const expiresIn = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    );

    response.headers.set('X-Session-Expires-Soon', 'true');
    response.headers.set('X-Session-Expires-In', expiresIn.toString());
  }
}

/**
 * Combine session validation with tenant validation
 *
 * Utility function to apply both middlewares in sequence.
 *
 * @param request - NextRequest object
 * @returns NextResponse or null if all validations pass
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const validation = await validateSessionAndTenant(request);
 *   if (validation) return validation;
 *
 *   // Both session and tenant validated
 * }
 * ```
 */
export async function validateSessionAndTenant(
  request: NextRequest
): Promise<NextResponse | null> {
  // First validate session
  const sessionValidation = await validateSession(request);
  if (sessionValidation) return sessionValidation;

  // Then validate tenant (if implemented)
  const { validateTenantAccess } = await import('./tenant-validation');
  const tenantValidation = await validateTenantAccess(request);
  if (tenantValidation) return tenantValidation;

  return null;
}

/**
 * Session health check
 *
 * Verifies session system is operational.
 *
 * @returns Health status
 *
 * @example
 * ```typescript
 * const health = await checkSessionHealth();
 * if (!health.healthy) {
 *   console.error('Session system unhealthy:', health.error);
 * }
 * ```
 */
export async function checkSessionHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  try {
    const manager = getSessionManager();
    const store = manager.getStore();
    return await store.getHealthStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      healthy: false,
      latency: -1,
      error: message
    };
  }
}
