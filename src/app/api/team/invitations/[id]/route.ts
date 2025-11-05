// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InvitationCancelledResponse } from '@/types/team';
import { canManageTeam } from '@/lib/team/roles';
import { cancelInvitation } from '@/lib/team/invitations';

/**
 * DELETE /api/team/invitations/[id]
 * Cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: invitationId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitationId)) {
      return NextResponse.json(
        { error: 'Invalid invitation ID format' },
        { status: 400 }
      );
    }

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

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify invitation belongs to user's organization
    if (invitation.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot cancel invitations from other organizations' },
        { status: 403 }
      );
    }

    // Verify user has permission to cancel invitation
    // Can cancel if: has team.manage permission OR is the one who sent the invitation
    const hasManagePermission = canManageTeam(profile.role, profile.permissions);
    const isInviter = invitation.invited_by === user.id;

    if (!hasManagePermission && !isInviter) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to cancel this invitation' },
        { status: 403 }
      );
    }

    // Check if invitation is already accepted or cancelled
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Cannot cancel an invitation that has already been accepted' },
        { status: 422 }
      );
    }

    if (invitation.cancelled_at) {
      return NextResponse.json(
        { error: 'Invitation is already cancelled' },
        { status: 422 }
      );
    }

    // Cancel the invitation
    await cancelInvitation(invitationId);

    // Log audit event
    await supabase.from('audit_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'team.member.invitation_cancelled',
      resource_type: 'team_invitation',
      resource_id: invitationId,
      metadata: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    const response: InvitationCancelledResponse = {
      message: 'Invitation cancelled successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/invitations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
