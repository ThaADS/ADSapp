/**
 * MFA Login Verification API Endpoint
 *
 * POST /api/auth/mfa/login-verify
 * Verify MFA token during login flow
 *
 * Security: Used during authentication process (before full session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyMFAToken, isValidMFATokenFormat } from '@/lib/auth/mfa';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const { userId, token } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Validate token format
    if (!isValidMFATokenFormat(token)) {
      return NextResponse.json(
        { error: 'Invalid token format. Must be 6 digits or XXXX-XXXX backup code.' },
        { status: 400 }
      );
    }

    // Verify MFA token
    const result = await verifyMFAToken(userId, token);

    if (!result.valid) {
      // Log failed attempt
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'mfa_login_failed',
        details: { error: result.error },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Log successful MFA verification
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'mfa_login_verified',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'MFA verification successful',
    });
  } catch (error) {
    console.error('[MFA Login Verification Error]:', error);

    return NextResponse.json(
      { error: 'Failed to verify MFA token' },
      { status: 500 }
    );
  }
}
