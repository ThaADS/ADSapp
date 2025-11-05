// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  InviteMemberSchema,
  ListInvitationsQuerySchema,
  InvitationCreatedResponse,
  ListInvitationsResponse,
} from '@/types/team';
import { canManageTeam, canAssignRole, mergePermissions } from '@/lib/team/roles';
import { createInvitation } from '@/lib/team/invitations';
import { sendTeamInvitationEmail } from '@/lib/email/team-invitations';

/**
 * POST /api/team/invitations
 * Create a new team member invitation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, organization:organizations(name)')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Verify user has team management permissions
    if (!canManageTeam(profile.role, profile.permissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to invite team members' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = InviteMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, role, permissions } = validation.data;

    // Verify user can assign this role
    if (!canAssignRole(profile.role, role)) {
      return NextResponse.json(
        { error: `Forbidden: Cannot assign ${role} role (requires ${role} or higher)` },
        { status: 403 }
      );
    }

    // Merge default permissions with custom permissions
    const finalPermissions = mergePermissions(role, permissions);

    // Create invitation
    try {
      const invitation = await createInvitation(
        profile.organization_id,
        email.toLowerCase(),
        role,
        finalPermissions,
        user.id
      );

      // Send invitation email
      try {
        await sendTeamInvitationEmail({
          invitation,
          organizationName: profile.organization?.name || 'Your Organization',
          inviterName: profile.full_name || profile.email,
          inviterEmail: profile.email,
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue even if email fails - invitation is created
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: 'team.member.invited',
        resource_type: 'team_invitation',
        resource_id: invitation.id,
        metadata: {
          email,
          role,
          permissions: finalPermissions,
        },
      });

      const response: InvitationCreatedResponse = {
        invitation,
        message: `Invitation sent to ${email}`,
      };

      return NextResponse.json(response, { status: 201 });

    } catch (createError: any) {
      if (createError.message.includes('already a member')) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
      }
      if (createError.message.includes('already pending')) {
        return NextResponse.json(
          { error: 'An invitation is already pending for this email' },
          { status: 409 }
        );
      }
      throw createError;
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/team/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/team/invitations
 * List pending team invitations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role, permissions')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Verify user has team management permissions
    if (!canManageTeam(profile.role, profile.permissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view invitations' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = ListInvitationsQuerySchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { organization_id, status, limit, offset } = validation.data;

    // Use user's organization if not specified
    const targetOrgId = organization_id || profile.organization_id;

    // Verify user has access to the organization
    if (targetOrgId !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access other organizations' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('team_invitations')
      .select(`
        *,
        invited_by_profile:profiles!team_invitations_invited_by_fkey(
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('organization_id', targetOrgId);

    // Apply status filters
    const now = new Date().toISOString();
    if (status === 'pending') {
      query = query.is('accepted_at', null).is('cancelled_at', null).gt('expires_at', now);
    } else if (status === 'expired') {
      query = query.is('accepted_at', null).is('cancelled_at', null).lt('expires_at', now);
    } else if (status === 'accepted') {
      query = query.not('accepted_at', 'is', null);
    } else if (status === 'cancelled') {
      query = query.not('cancelled_at', 'is', null);
    } else {
      // Default: show only pending and expired (not accepted or cancelled)
      query = query.is('accepted_at', null).is('cancelled_at', null);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rawInvitations, error, count } = await query;

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    // Transform data to include inviter details
    const invitations = (rawInvitations || []).map((inv: any) => ({
      ...inv,
      invited_by_name: inv.invited_by_profile?.full_name,
      invited_by_email: inv.invited_by_profile?.email,
    }));

    const response: ListInvitationsResponse = {
      invitations,
      total: count || 0,
      limit,
      offset,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/team/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
