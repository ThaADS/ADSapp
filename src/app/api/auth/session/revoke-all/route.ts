import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/manager';
import { clearSessionCookie } from '@/lib/middleware/session';
import { createClient } from '@/lib/supabase/server';

/**
 * Revoke All Sessions API Route
 *
 * DELETE /api/auth/session/revoke-all
 *
 * Revokes all sessions for the authenticated user.
 * Used for:
 * - Password changes
 * - Account security events
 * - Manual user action to logout from all devices
 * - Account compromise response
 *
 * Request Body:
 * ```json
 * {
 *   "reason": "password_changed" | "security_event" | "user_action" | "account_compromise"
 * }
 * ```
 *
 * Security:
 * - Requires user authentication
 * - Revokes all sessions including current
 * - Audit logs with reason
 * - Forces re-authentication
 *
 * @returns Revocation result with count
 */
export async function DELETE(request: NextRequest) {
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'user_action';

    // Validate reason
    const validReasons = [
      'password_changed',
      'security_event',
      'user_action',
      'account_compromise'
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        {
          error: 'Invalid reason provided',
          code: 'INVALID_REASON',
          validReasons
        },
        { status: 400 }
      );
    }

    // Revoke all sessions
    const sessionManager = getSessionManager();
    const count = await sessionManager.revokeAllUserSessions(user.id, reason);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: `Revoked ${count} session(s)`,
        count,
        reason
      },
      { status: 200 }
    );

    // Clear session cookie
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('[SessionRevokeAll] Error:', error);

    // Log error to monitoring
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            endpoint: 'session-revoke-all'
          }
        });
      } catch (sentryError) {
        console.error('[SessionRevokeAll] Failed to log error:', sentryError);
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
 * POST method (alternative to DELETE for client compatibility)
 */
export async function POST(request: NextRequest) {
  return DELETE(request);
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
