/**
 * MFA Backup Codes Regeneration API Endpoint
 *
 * POST /api/auth/mfa/regenerate-codes
 * Regenerate backup codes for authenticated user (requires password)
 *
 * Security: Requires authenticated user + password verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { regenerateBackupCodes } from '@/lib/auth/mfa';
import { standardApiMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // Apply standard API middleware
  const middlewareResponse = await standardApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required to regenerate backup codes' },
        { status: 400 }
      );
    }

    // Check if MFA is enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Regenerate backup codes (includes password verification)
    const newBackupCodes = await regenerateBackupCodes(user.id, password);

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: newBackupCodes,
        message: 'New backup codes generated. Save them securely - they will not be shown again.',
      },
    });
  } catch (error) {
    console.error('[MFA Regenerate Codes Error]:', error);

    // Handle specific error cases
    if (error instanceof Error && error.message === 'Password verification failed') {
      return NextResponse.json(
        { error: 'Invalid password. Please try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
