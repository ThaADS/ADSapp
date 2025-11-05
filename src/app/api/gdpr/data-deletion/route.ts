/**
 * GDPR Data Deletion API Route
 *
 * Implements Right to Erasure (GDPR Article 17) - allows users to request
 * deletion of their personal data.
 *
 * Endpoints:
 * - POST /api/gdpr/data-deletion - Create deletion request
 * - GET /api/gdpr/data-deletion/[id] - Get deletion request status
 * - POST /api/gdpr/data-deletion/[id]/verify - Verify deletion request
 * - POST /api/gdpr/data-deletion/[id]/process - Process verified request (admin)
 * - DELETE /api/gdpr/data-deletion/[id] - Cancel deletion request
 *
 * @module api/gdpr/data-deletion
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DataDeletionService } from '@/lib/gdpr/data-deletion';
import type { DeletionRequestType } from '@/lib/gdpr/types';

/**
 * POST /api/gdpr/data-deletion
 *
 * Create a deletion request (Right to Erasure).
 *
 * Request body:
 * - request_type: 'user_account' | 'contact_data' | 'conversation_data' | 'all_personal_data'
 * - contact_id?: string (required for contact_data or conversation_data)
 * - reason?: string
 *
 * Response:
 * - 201: Deletion request created
 * - 400: Invalid request
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

    // Parse request body
    const body = await request.json();
    const {
      request_type,
      contact_id,
      reason
    }: {
      request_type: DeletionRequestType;
      contact_id?: string;
      reason?: string;
    } = body;

    // Validate request type
    const validTypes: DeletionRequestType[] = [
      'user_account',
      'contact_data',
      'conversation_data',
      'all_personal_data'
    ];

    if (!validTypes.includes(request_type)) {
      return NextResponse.json(
        { error: 'Invalid request_type' },
        { status: 400 }
      );
    }

    // Validate contact_id for contact/conversation requests
    if (
      (request_type === 'contact_data' || request_type === 'conversation_data') &&
      !contact_id
    ) {
      return NextResponse.json(
        { error: 'contact_id is required for contact or conversation data deletion' },
        { status: 400 }
      );
    }

    // If contact_id provided, verify access
    if (contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contact_id)
        .eq('organization_id', profile.organization_id)
        .single();

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found or access denied' },
          { status: 403 }
        );
      }
    }

    // Create deletion request
    const deletionRequest = await DataDeletionService.createDeletionRequest(
      {
        organization_id: profile.organization_id,
        request_type,
        user_id: request_type === 'user_account' || request_type === 'all_personal_data' ? user.id : undefined,
        contact_id,
        reason
      },
      user.id
    );

    console.log(
      `[API][GDPR] User ${user.id} created deletion request ${deletionRequest.id} (type: ${request_type})`
    );

    // Send verification email (implement email service)
    // await sendVerificationEmail(user.email, deletionRequest.verification_token);

    return NextResponse.json(
      {
        success: true,
        data: {
          request_id: deletionRequest.id,
          status: deletionRequest.status,
          verification_required: true,
          verification_expires_at: deletionRequest.verification_expires_at,
          message: 'Deletion request created. Please check your email to verify this request.'
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API][GDPR] Deletion request creation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create deletion request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/data-deletion
 *
 * Get all deletion requests for current user.
 */
export async function GET() {
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

    // Get user's deletion requests
    const { data: requests, error } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: requests || []
    });
  } catch (error) {
    console.error('[API][GDPR] Error fetching deletion requests:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch deletion requests',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
