/**
 * GDPR Data Portability API Route
 *
 * Implements Right to Data Portability (GDPR Article 20) - provides
 * personal data in structured, commonly used, machine-readable format.
 *
 * Endpoints:
 * - POST /api/gdpr/data-portability - Request portable data package
 *
 * @module api/gdpr/data-portability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DataExportService } from '@/lib/gdpr/data-export';

/**
 * POST /api/gdpr/data-portability
 *
 * Request complete portable data package (GDPR Article 20).
 * Returns data in JSON format suitable for transfer to another service.
 *
 * Request body:
 * - include_all?: boolean (default: true)
 *
 * Response:
 * - 200: Portable data package
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Export user data in JSON format (machine-readable)
    const exportResult = await DataExportService.exportUserData(
      user.id,
      profile.organization_id,
      'json'
    );

    console.log(
      `[API][GDPR] User ${user.id} requested portable data package (size: ${exportResult.size_bytes} bytes)`
    );

    // Parse JSON data for response
    const portableData = typeof exportResult.data === 'string'
      ? JSON.parse(exportResult.data)
      : exportResult.data;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...portableData,
          gdpr_compliance: {
            article: 'Article 20 - Right to Data Portability',
            format: 'JSON (machine-readable)',
            generated_at: exportResult.generated_at,
            expires_at: exportResult.expires_at,
            legal_notice: 'This data is provided in accordance with GDPR Article 20. You may transfer this data to another service provider.'
          }
        }
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-GDPR-Article': '20',
          'X-Data-Format': 'portable-json',
          'X-Export-Size': exportResult.size_bytes.toString()
        }
      }
    );
  } catch (error) {
    console.error('[API][GDPR] Data portability error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate portable data package',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/data-portability
 *
 * Get information about data portability capabilities.
 */
export async function GET() {
  return NextResponse.json({
    gdpr_article: 'Article 20 - Right to Data Portability',
    description: 'Receive your personal data in a structured, commonly used, and machine-readable format',
    format: 'JSON',
    included_data: [
      'user_profile',
      'account_settings',
      'contacts',
      'conversations',
      'messages',
      'preferences'
    ],
    excluded_data: [
      'billing_information (retained for legal compliance)',
      'audit_logs (system security)',
      'data_from_other_users'
    ],
    usage: 'This data can be transferred to another service provider',
    expiry: '7 days',
    legal_basis: 'GDPR Article 20',
    response_time: 'Immediate'
  });
}
