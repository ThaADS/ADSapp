/**
 * MFA Verification API Endpoint (Enrollment Completion)
 *
 * POST /api/auth/mfa/verify
 * Verify TOTP token and complete MFA enrollment
 *
 * Security: Requires authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAndEnableMFA } from '@/lib/auth/mfa'
import { standardApiMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Apply standard API middleware
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format. Must be 6 digits.' },
        { status: 400 }
      )
    }

    // Verify token and enable MFA
    const result = await verifyAndEnableMFA(user.id, token)

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      )
    }

    // TODO WEEK 5+: Create audit_logs table for security auditing
    // Log successful MFA enablement
    // await supabase.from('audit_logs').insert({
    //   user_id: user.id,
    //   action: 'mfa_enabled',
    //   timestamp: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully enabled for your account',
    })
  } catch (error) {
    console.error('[MFA Verification Error]:', error)

    return NextResponse.json({ error: 'Failed to verify MFA token' }, { status: 500 })
  }
}
