/**
 * MFA Enrollment API Endpoint
 *
 * POST /api/auth/mfa/enroll
 * Generate MFA secret and QR code for user enrollment
 *
 * Security: Requires authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMFAEnrollment } from '@/lib/auth/mfa';
import { standardApiMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // Apply standard API middleware (authentication, rate limiting)
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

    // Check if MFA is already enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', user.id)
      .single();

    if (profile?.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled. Disable first to re-enroll.' },
        { status: 400 }
      );
    }

    // Generate MFA enrollment data
    const enrollmentData = await generateMFAEnrollment(user.id);

    // TODO WEEK 5+: Create audit_logs table for security auditing
    // Log enrollment initiation
    // await supabase.from('audit_logs').insert({
    //   user_id: user.id,
    //   action: 'mfa_enrollment_initiated',
    //   timestamp: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      data: {
        qrCode: enrollmentData.qrCode,
        backupCodes: enrollmentData.backupCodes,
        message: 'Scan QR code with your authenticator app and save backup codes securely',
      },
    });
  } catch (error) {
    console.error('[MFA Enrollment Error]:', error);

    return NextResponse.json(
      { error: 'Failed to generate MFA enrollment data' },
      { status: 500 }
    );
  }
}
