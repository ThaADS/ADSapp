import { NextRequest, NextResponse } from 'next/server'
import { getSessionManager } from '@/lib/session/manager'
import { clearSessionCookie } from '@/lib/middleware/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Session Revocation API Route
 *
 * DELETE /api/auth/session/revoke
 *
 * Revokes a specific session by token.
 * Used for:
 * - User logout from current device
 * - Revoking session from another device
 * - Security events requiring specific session termination
 *
 * Request Body:
 * ```json
 * {
 *   "sessionToken": "token_to_revoke" // Optional, defaults to current session
 * }
 * ```
 *
 * Security:
 * - Validates user authentication
 * - Only allows users to revoke their own sessions
 * - Audit logs revocation event
 *
 * @returns Revocation result
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get user ID from Supabase auth
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const sessionTokenToRevoke = body.sessionToken || request.cookies.get('adsapp_session')?.value

    if (!sessionTokenToRevoke) {
      return NextResponse.json(
        {
          error: 'No session token provided',
          code: 'NO_SESSION_TOKEN',
        },
        { status: 400 }
      )
    }

    // Revoke session
    const sessionManager = getSessionManager()
    const revoked = await sessionManager.revokeSession(user.id, sessionTokenToRevoke)

    if (!revoked) {
      return NextResponse.json(
        {
          error: 'Session not found or already revoked',
          code: 'SESSION_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Session revoked successfully',
      },
      { status: 200 }
    )

    // Clear session cookie if revoking current session
    const currentSessionToken = request.cookies.get('adsapp_session')?.value
    if (sessionTokenToRevoke === currentSessionToken) {
      clearSessionCookie(response)
    }

    return response
  } catch (error) {
    console.error('[SessionRevoke] Error:', error)

    // Log error to monitoring
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs')
        Sentry.captureException(error, {
          tags: {
            endpoint: 'session-revoke',
          },
        })
      } catch (sentryError) {
        console.error('[SessionRevoke] Failed to log error:', sentryError)
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * POST method (alternative to DELETE for client compatibility)
 */
export async function POST(request: NextRequest) {
  return DELETE(request)
}

/**
 * GET method not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  )
}
