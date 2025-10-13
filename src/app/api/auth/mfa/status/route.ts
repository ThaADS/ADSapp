/**
 * MFA Status API Endpoint
 *
 * GET /api/auth/mfa/status
 * Get current MFA status for authenticated user
 *
 * Security: Requires authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMFAStatus } from '@/lib/auth/mfa';
import { standardApiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest) {
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

    // Get MFA status
    const status = await getMFAStatus(user.id);

    return NextResponse.json({
      success: true,
      data: {
        enabled: status.enabled,
        enrolledAt: status.enrolledAt,
        backupCodesRemaining: status.backupCodesRemaining,
        requiresSetup: !status.enabled,
      },
    });
  } catch (error) {
    console.error('[MFA Status Error]:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve MFA status' },
      { status: 500 }
    );
  }
}
