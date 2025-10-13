import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/manager';
import { createClient } from '@/lib/supabase/server';

/**
 * List Active Sessions API Route
 *
 * GET /api/auth/session/list
 *
 * Returns all active sessions for the authenticated user.
 * Provides session management interface showing:
 * - Current session (marked)
 * - Other active sessions with device info
 * - Session creation and last activity times
 * - Ability to identify and revoke specific sessions
 *
 * Response:
 * ```json
 * {
 *   "sessions": [
 *     {
 *       "sessionToken": "token123",
 *       "deviceInfo": {
 *         "userAgent": "Mozilla/5.0...",
 *         "ip": "192.168.1.1",
 *         "platform": "web"
 *       },
 *       "createdAt": "2025-10-14T10:00:00Z",
 *       "lastActivity": "2025-10-14T10:30:00Z",
 *       "expiresAt": "2025-10-14T11:00:00Z",
 *       "isCurrent": true
 *     }
 *   ],
 *   "totalSessions": 3,
 *   "maxSessions": 5
 * }
 * ```
 *
 * Security:
 * - Requires user authentication
 * - Only shows user's own sessions
 * - Masks sensitive device information
 * - Identifies current session
 *
 * @returns List of active sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Get current session token
    const currentSessionToken = request.cookies.get('adsapp_session')?.value;

    // Get all user sessions
    const sessionManager = getSessionManager();
    const sessions = await sessionManager.getUserSessions(user.id);

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      sessionToken: session.sessionToken,
      deviceInfo: {
        // Mask full user agent, show only browser/platform
        userAgent: maskUserAgent(session.deviceInfo.userAgent),
        // Mask IP address (show only first two octets)
        ip: maskIpAddress(session.deviceInfo.ip),
        platform: session.deviceInfo.platform || 'unknown'
      },
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isCurrent: session.sessionToken === currentSessionToken
    }));

    // Sort sessions by last activity (most recent first)
    formattedSessions.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    // Get max concurrent sessions from config
    const maxSessions = Number(process.env.MAX_CONCURRENT_SESSIONS) || 5;

    return NextResponse.json(
      {
        success: true,
        sessions: formattedSessions,
        totalSessions: sessions.length,
        maxSessions
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SessionList] Error:', error);

    // Log error to monitoring
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            endpoint: 'session-list'
          }
        });
      } catch (sentryError) {
        console.error('[SessionList] Failed to log error:', sentryError);
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST/PUT/DELETE methods not allowed
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  );
}

export async function PUT() {
  return POST();
}

export async function DELETE() {
  return POST();
}

/**
 * Mask user agent to show only essential information
 *
 * @param userAgent - Full user agent string
 * @returns Masked user agent
 */
function maskUserAgent(userAgent: string): string {
  // Extract browser and OS info
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = userAgent.match(/(Windows|Mac OS|Linux|Android|iOS)[\s\w.]*/);

  const browser = browserMatch ? browserMatch[0] : 'Unknown Browser';
  const os = osMatch ? osMatch[0] : 'Unknown OS';

  return `${browser} on ${os}`;
}

/**
 * Mask IP address to show only network prefix
 *
 * @param ip - Full IP address
 * @returns Masked IP address
 */
function maskIpAddress(ip: string): string {
  if (ip === 'unknown') {
    return 'unknown';
  }

  // For IPv4, show only first two octets
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.*.*`;
  }

  // For IPv6, show only first segment
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:****`;
  }

  return 'unknown';
}
