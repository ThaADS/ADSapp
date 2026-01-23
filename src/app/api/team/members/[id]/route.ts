import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateMemberSchema, MemberUpdatedResponse, MemberRemovedResponse } from '@/types/team'
import {
  canManageTeam,
  validateRoleChange,
  validateMemberRemoval,
  mergePermissions,
  validatePermissions,
} from '@/lib/team/roles'

/**
 * PUT /api/team/members/[id]
 * Update team member role and/or permissions
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id: memberId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 })
    }

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get actor's profile
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('organization_id, role, permissions')
      .eq('id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has team management permissions
    if (!canManageTeam(actorProfile.role, actorProfile.permissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to manage team members' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { role: newRole, permissions: customPermissions } = validation.data

    // Get target member's current profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify target member is in same organization
    if (targetProfile.organization_id !== actorProfile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify members from other organizations' },
        { status: 403 }
      )
    }

    // Check if trying to modify self
    const isSelf = memberId === user.id

    // If role is being changed, validate the change
    if (newRole && newRole !== targetProfile.role) {
      const roleValidationError = validateRoleChange(
        actorProfile.role,
        targetProfile.role,
        newRole,
        isSelf
      )

      if (roleValidationError) {
        return NextResponse.json({ error: roleValidationError }, { status: 403 })
      }
    }

    // Validate custom permissions if provided
    if (customPermissions) {
      const invalidPermissions = validatePermissions(customPermissions)
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid permissions',
            details: { invalid_permissions: invalidPermissions },
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (newRole) {
      updateData.role = newRole
      // If role is changing, merge permissions with new role defaults
      updateData.permissions = mergePermissions(newRole, customPermissions)
    } else if (customPermissions) {
      // Only updating permissions, merge with current role
      updateData.permissions = mergePermissions(targetProfile.role, customPermissions)
    }

    updateData.updated_at = new Date().toISOString()

    // Update the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    // Log audit event
    const auditMetadata: any = {
      target_member_id: memberId,
      target_member_email: targetProfile.email,
    }

    if (newRole) {
      auditMetadata.old_role = targetProfile.role
      auditMetadata.new_role = newRole
    }

    if (customPermissions) {
      auditMetadata.permissions_updated = true
    }

    await supabase.from('audit_logs').insert({
      organization_id: actorProfile.organization_id,
      user_id: user.id,
      action: newRole ? 'team.member.role_updated' : 'team.member.permissions_updated',
      resource_type: 'profile',
      resource_id: memberId,
      metadata: auditMetadata,
    })

    const response: MemberUpdatedResponse = {
      member: updatedMember,
      message: 'Team member updated successfully',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in PUT /api/team/members/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: memberId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 })
    }

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get actor's profile
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('organization_id, role, permissions')
      .eq('id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has team management permissions
    if (!canManageTeam(actorProfile.role, actorProfile.permissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to manage team members' },
        { status: 403 }
      )
    }

    // Get target member's profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify target member is in same organization
    if (targetProfile.organization_id !== actorProfile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot remove members from other organizations' },
        { status: 403 }
      )
    }

    // Check if trying to remove self
    const isSelf = memberId === user.id

    // If removing an owner, check if they're the last owner
    let isLastOwner = false
    if (targetProfile.role === 'owner') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', actorProfile.organization_id)
        .eq('role', 'owner')

      isLastOwner = (count || 0) <= 1
    }

    // Validate member removal
    const validationError = validateMemberRemoval(
      actorProfile.role,
      targetProfile.role,
      isSelf,
      isLastOwner
    )

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 422 })
    }

    // Delete the member
    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', memberId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      organization_id: actorProfile.organization_id,
      user_id: user.id,
      action: 'team.member.removed',
      resource_type: 'profile',
      resource_id: memberId,
      metadata: {
        removed_member_email: targetProfile.email,
        removed_member_role: targetProfile.role,
      },
    })

    const response: MemberRemovedResponse = {
      message: 'Team member removed successfully',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in DELETE /api/team/members/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
