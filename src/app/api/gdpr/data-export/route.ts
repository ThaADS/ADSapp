/**
 * GDPR Data Export API Route
 *
 * Implements Right to Access (GDPR Article 15) - allows users to export
 * all their personal data in machine-readable format.
 *
 * Endpoints:
 * - POST /api/gdpr/data-export - Request data export
 *
 * @module api/gdpr/data-export
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DataExportService } from '@/lib/gdpr/data-export';
import type { ExportFormat } from '@/lib/gdpr/types';

/**
 * POST /api/gdpr/data-export
 *
 * Export personal data for authenticated user or specified contact.
 *
 * Request body:
 * - format: 'json' | 'csv' | 'pdf'
 * - include_messages?: boolean
 * - include_contacts?: boolean
 * - include_conversations?: boolean
 * - contact_id?: string (optional - for contact data export)
 *
 * Response:
 * - 200: Export successful with download data
 * - 401: Unauthorized
 * - 403: Forbidden (not allowed to export this data)
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const organizationId = profile.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      format = 'json',
      contact_id
    }: {
      format?: ExportFormat;
      contact_id?: string;
    } = body;

    // Validate format
    if (!['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be json, csv, or pdf' },
        { status: 400 }
      );
    }

    let exportResult;

    // Export contact data if contact_id provided
    if (contact_id) {
      // Verify user has access to this contact
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contact_id)
        .eq('organization_id', organizationId)
        .single();

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found or access denied' },
          { status: 403 }
        );
      }

      exportResult = await DataExportService.exportContactData(
        contact_id,
        organizationId,
        format
      );
    } else {
      // Export user's own data
      exportResult = await DataExportService.exportUserData(
        user.id,
        organizationId,
        format
      );
    }

    console.log(
      `[API][GDPR] User ${user.id} exported data (format: ${format}, size: ${exportResult.size_bytes} bytes)`
    );

    return NextResponse.json(
      {
        success: true,
        data: exportResult
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Export-Size': exportResult.size_bytes.toString(),
          'X-Export-Format': format
        }
      }
    );
  } catch (error) {
    console.error('[API][GDPR] Data export error:', error);

    return NextResponse.json(
      {
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/data-export
 *
 * Get information about data export capabilities and requirements.
 */
export async function GET() {
  return NextResponse.json({
    supported_formats: ['json', 'csv', 'pdf'],
    max_file_size_bytes: 50 * 1024 * 1024, // 50 MB
    expiry_days: 7,
    export_includes: [
      'user_profile',
      'contacts',
      'conversations',
      'messages',
      'settings'
    ],
    legal_basis: 'GDPR Article 15 - Right to Access',
    response_time: '24 hours maximum'
  });
}
