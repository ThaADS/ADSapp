import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/manager';
import { setSessionCookie } from '@/lib/middleware/session';
import { createClient } from '@/lib/supabase/server';

/**
 * Session Refresh API Route
 *
 * POST /api/auth/session/refresh
 *
 * Refreshes an existing session, extending the timeout and updating activity.
 * Used by client applications to keep sessions alive during user activity.
 *
 * Security:
 * - Validates existing session
 * - Extends session TTL
 * - Updates last activity timestamp
 * - Returns updated session information
 *
 * @returns Session refresh result
 */
export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie or request body
    const sessionToken = request.cookies.get('adsapp_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: 'No session token provided',
          code: 'NO_SESSION_TOKEN'
        },
        { status: 401 }
      );
    }

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

    // Refresh session
    const sessionManager = getSessionManager();
    const result = await sessionManager.refreshSession(user.id, sessionToken);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to refresh session',
          code: 'REFRESH_FAILED'
        },
        { status: 401 }
      );
    }

    const session = result.session!;

    // Create response with updated session
    const response = NextResponse.json(
      {
        success: true,
        session: {
          userId: session.userId,
          organizationId: session.organizationId,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt
        }
      },
      { status: 200 }
    );

    // Update session cookie
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    console.error('[SessionRefresh] Error:', error);

    // Log error to monitoring
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            endpoint: 'session-refresh'
          }
        });
      } catch (sentryError) {
        console.error('[SessionRefresh] Failed to log error:', sentryError);
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
 * GET method not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  );
}
