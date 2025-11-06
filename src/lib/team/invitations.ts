// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { randomBytes } from 'crypto'
import { TeamInvitation, UserRole } from '@/types/team'
import { createClient } from '@/lib/supabase/server'

/**
 * Generate a secure random token for invitation
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Get invitation expiration date (7 days from now)
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}

/**
 * Check if invitation is expired
 */
export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Check if invitation is valid (not expired, not accepted, not cancelled)
 */
export function isInvitationValid(invitation: TeamInvitation): boolean {
  return (
    !invitation.accepted_at &&
    !invitation.cancelled_at &&
    !isInvitationExpired(invitation.expires_at)
  )
}

/**
 * Create a new team invitation
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: UserRole,
  permissions: Record<string, boolean>,
  invitedBy: string
): Promise<TeamInvitation> {
  const supabase = await createClient()

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .single()

  if (existingMember) {
    throw new Error('User is already a member of this organization')
  }

  // Check if there's a pending invitation
  const { data: existingInvitation } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .single()

  if (existingInvitation) {
    throw new Error('An invitation is already pending for this email')
  }

  // Create invitation
  const token = generateInvitationToken()
  const expiresAt = getInvitationExpiry()

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      permissions,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`)
  }

  return invitation as TeamInvitation
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const supabase = await createClient()

  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .single()

  return invitation as TeamInvitation | null
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('team_invitations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (error) {
    throw new Error(`Failed to cancel invitation: ${error.message}`)
  }
}

/**
 * Accept an invitation and create user profile
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  fullName: string
): Promise<void> {
  const supabase = await createClient()

  // Get invitation
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    throw new Error('Invitation not found')
  }

  // Validate invitation
  if (!isInvitationValid(invitation)) {
    throw new Error('Invitation is no longer valid')
  }

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    organization_id: invitation.organization_id,
    email: invitation.email,
    full_name: fullName,
    role: invitation.role,
    permissions: invitation.permissions,
  })

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (updateError) {
    throw new Error(`Failed to mark invitation as accepted: ${updateError.message}`)
  }
}

/**
 * Get pending invitations for an organization
 */
export async function getPendingInvitations(organizationId: string): Promise<TeamInvitation[]> {
  const supabase = await createClient()

  const { data: invitations } = await supabase
    .from('team_invitations')
    .select(
      `
      *,
      invited_by_profile:profiles!team_invitations_invited_by_fkey(
        full_name,
        email
      )
    `
    )
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .order('created_at', { ascending: false })

  return (invitations || []) as TeamInvitation[]
}

/**
 * Clean up expired invitations
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_invitations')
    .delete()
    .lt('expires_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .is('accepted_at', null)
    .select('id')

  if (error) {
    throw new Error(`Failed to clean up invitations: ${error.message}`)
  }

  return data?.length || 0
}
