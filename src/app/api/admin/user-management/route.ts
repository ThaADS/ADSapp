/**
 * Enhanced User Management API
 * Handles users, sessions, invitations, security, MFA, and SSO management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userInvitationManager } from '@/lib/user-invitations'
import { passwordPolicyManager } from '@/lib/password-policies'
import { sessionManager } from '@/lib/session-management'
import { mfaManager } from '@/lib/mfa-setup'
import { ssoService } from '@/lib/sso-integration'

// GET /api/admin/user-management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    switch (action) {
      case 'users':
        return getUsersData(organizationId, searchParams)

      case 'sessions':
        return getSessionsData(organizationId, searchParams)

      case 'invitations':
        return getInvitationsData(organizationId, searchParams)

      case 'security-events':
        return getSecurityEventsData(organizationId, searchParams)

      case 'user-details':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }
        return getUserDetailsData(userId, organizationId)

      case 'dashboard-stats':
        return getDashboardStats(organizationId)

      case 'sso-providers':
        return getSSOProvidersData(organizationId)

      case 'mfa-policy':
        return getMFAPolicyData(organizationId)

      case 'password-policy':
        return getPasswordPolicyData(organizationId)

      case 'session-config':
        return getSessionConfigData(organizationId)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('User management API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/user-management
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, organizationId } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    switch (action) {
      case 'invite-user':
        return inviteUser(body, user.id)

      case 'bulk-invite':
        return bulkInviteUsers(body, user.id)

      case 'resend-invitation':
        return resendInvitation(body, user.id)

      case 'cancel-invitation':
        return cancelInvitation(body, user.id)

      case 'terminate-session':
        return terminateSession(body, user.id)

      case 'terminate-all-sessions':
        return terminateAllUserSessions(body, user.id)

      case 'lock-account':
        return lockUserAccount(body, user.id)

      case 'unlock-account':
        return unlockUserAccount(body, user.id)

      case 'reset-password':
        return resetUserPassword(body, user.id)

      case 'disable-mfa':
        return disableUserMFA(body, user.id)

      case 'trust-device':
        return trustUserDevice(body, user.id)

      case 'remove-device':
        return removeUserDevice(body, user.id)

      case 'update-user-role':
        return updateUserRole(body, user.id)

      case 'deactivate-user':
        return deactivateUser(body, user.id)

      case 'reactivate-user':
        return reactivateUser(body, user.id)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('User management API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/user-management
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, organizationId } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    switch (action) {
      case 'update-mfa-policy':
        return updateMFAPolicy(body)

      case 'update-password-policy':
        return updatePasswordPolicy(body)

      case 'update-session-config':
        return updateSessionConfig(body)

      case 'update-invitation-settings':
        return updateInvitationSettings(body)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('User management API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions for GET requests
async function getUsersData(organizationId: string, searchParams: URLSearchParams) {
  const supabase = await createClient()
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const status = searchParams.get('status') || ''

  let query = supabase
    .from('profiles')
    .select(`
      *,
      mfa_methods!left(id, type, is_enabled),
      user_sessions!left(id, status, last_activity),
      account_lockouts!left(id, unlocked)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  if (role) {
    query = query.eq('role', role)
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data: users, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  // Process user data to include computed fields
  const processedUsers = users?.map(user => ({
    ...user,
    mfaEnabled: user.mfa_methods?.some(m => m.is_enabled) || false,
    ssoEnabled: false, // Would check SSO sessions
    lastSeen: user.user_sessions?.[0]?.last_activity,
    isLocked: user.account_lockouts?.some(l => !l.unlocked) || false,
    activeSessions: user.user_sessions?.filter(s => s.status === 'active').length || 0
  })) || []

  return NextResponse.json({
    users: processedUsers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  })
}

async function getSessionsData(organizationId: string, searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50')
  const includeExpired = searchParams.get('includeExpired') === 'true'

  const sessions = await sessionManager.getOrganizationSessions(organizationId, limit)

  return NextResponse.json({
    sessions: includeExpired ? sessions : sessions.filter(s => s.status === 'active')
  })
}

async function getInvitationsData(organizationId: string, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const status = searchParams.get('status') || ''
  const role = searchParams.get('role') || ''

  const { invitations, total } = await userInvitationManager.getInvitations(organizationId, {
    status: status || undefined,
    role: role || undefined,
    limit,
    offset: (page - 1) * limit
  })

  return NextResponse.json({
    invitations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  })
}

async function getSecurityEventsData(organizationId: string, searchParams: URLSearchParams) {
  const supabase = await createClient()
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const severity = searchParams.get('severity') || ''

  let query = supabase
    .from('security_events')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)

  if (severity) {
    query = query.eq('severity', severity)
  }

  const { data: events, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  return NextResponse.json({
    events: events || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  })
}

async function getUserDetailsData(userId: string, organizationId: string) {
  const supabase = await createClient()

  // Get user profile
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('organization_id', organizationId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get user sessions
  const sessions = await sessionManager.getUserSessions(userId, true)

  // Get user devices
  const devices = await sessionManager.getUserDevices(userId)

  // Get MFA methods
  const mfaMethods = await mfaManager.getUserMFAMethods(userId)

  // Get security events
  const { data: securityEvents } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    user: {
      ...user,
      mfaEnabled: mfaMethods.some(m => m.isEnabled),
      sessions,
      devices,
      mfaMethods,
      securityEvents: securityEvents || []
    }
  })
}

async function getDashboardStats(organizationId: string) {
  const supabase = await createClient()

  // Get user counts
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  // Get active sessions count
  const { count: activeSessions } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  // Get MFA enabled users count
  const { data: mfaUsers } = await supabase
    .from('profiles')
    .select(`
      id,
      mfa_methods!inner(is_enabled)
    `)
    .eq('organization_id', organizationId)
    .eq('mfa_methods.is_enabled', true)

  const mfaEnabledCount = new Set(mfaUsers?.map(u => u.id)).size

  // Get security alerts count
  const { count: securityAlerts } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('severity', ['error', 'critical'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get pending invitations count
  const { count: pendingInvitations } = await supabase
    .from('user_invitations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    activeSessions: activeSessions || 0,
    mfaEnabledPercent: totalUsers ? Math.round((mfaEnabledCount / (totalUsers || 1)) * 100) : 0,
    securityAlerts: securityAlerts || 0,
    pendingInvitations: pendingInvitations || 0
  })
}

async function getSSOProvidersData(organizationId: string) {
  const providers = await ssoService.getSSOProviders(organizationId)
  return NextResponse.json({ providers })
}

async function getMFAPolicyData(organizationId: string) {
  const policy = await mfaManager.getMFAPolicy(organizationId)
  return NextResponse.json({ policy })
}

async function getPasswordPolicyData(organizationId: string) {
  const policy = await passwordPolicyManager.getPasswordPolicy(organizationId)
  return NextResponse.json({ policy })
}

async function getSessionConfigData(organizationId: string) {
  const config = await sessionManager.getSessionConfiguration(organizationId)
  return NextResponse.json({ config })
}

// Helper functions for POST requests
async function inviteUser(body: any, invitedBy: string) {
  const { organizationId, email, role, customMessage, templateId } = body

  const invitation = await userInvitationManager.createInvitation(
    organizationId,
    email,
    role,
    invitedBy,
    {
      customMessage,
      templateId,
      sendImmediately: true
    }
  )

  return NextResponse.json({ invitation })
}

async function bulkInviteUsers(body: any, invitedBy: string) {
  const { organizationId, invitations, templateId, sendImmediately } = body

  const result = await userInvitationManager.createBulkInvitations({
    organizationId,
    invitations,
    templateId,
    sendImmediately
  })

  return NextResponse.json({ result })
}

async function resendInvitation(body: any, resentBy: string) {
  const { invitationId } = body

  await userInvitationManager.resendInvitation(invitationId, resentBy)

  return NextResponse.json({ success: true })
}

async function cancelInvitation(body: any, cancelledBy: string) {
  const { invitationId } = body

  await userInvitationManager.cancelInvitation(invitationId, cancelledBy)

  return NextResponse.json({ success: true })
}

async function terminateSession(body: any, terminatedBy: string) {
  const { sessionId, reason } = body

  await sessionManager.terminateSession(sessionId, reason || 'admin_action')

  return NextResponse.json({ success: true })
}

async function terminateAllUserSessions(body: any, terminatedBy: string) {
  const { userId, exceptCurrentSession } = body

  const terminatedCount = await sessionManager.terminateAllUserSessions(
    userId,
    exceptCurrentSession ? undefined : undefined
  )

  return NextResponse.json({ success: true, terminatedCount })
}

async function lockUserAccount(body: any, lockedBy: string) {
  const { userId, organizationId, reason } = body

  const lockout = await passwordPolicyManager.lockoutAccount(
    userId,
    organizationId,
    reason || 'manual',
    0,
    lockedBy
  )

  return NextResponse.json({ lockout })
}

async function unlockUserAccount(body: any, unlockedBy: string) {
  const { lockoutId } = body

  await passwordPolicyManager.unlockAccount(lockoutId, unlockedBy)

  return NextResponse.json({ success: true })
}

async function resetUserPassword(body: any, resetBy: string) {
  const { userId } = body
  const supabase = await createClient()

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-12)

  // Update user password
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: tempPassword
  })

  if (error) throw error

  // Reset login attempts
  await supabase
    .from('login_attempts')
    .update({ failure_count: 0 })
    .eq('user_id', userId)

  return NextResponse.json({ success: true, tempPassword })
}

async function disableUserMFA(body: any, disabledBy: string) {
  const { userId } = body

  const methods = await mfaManager.getUserMFAMethods(userId)

  for (const method of methods) {
    await mfaManager.disableMFAMethod(method.id)
  }

  return NextResponse.json({ success: true })
}

async function trustUserDevice(body: any, trustedBy: string) {
  const { userId, deviceId } = body

  await sessionManager.trustDevice(userId, deviceId)

  return NextResponse.json({ success: true })
}

async function removeUserDevice(body: any, removedBy: string) {
  const { userId, deviceId } = body

  await sessionManager.removeDevice(userId, deviceId)

  return NextResponse.json({ success: true })
}

async function updateUserRole(body: any, updatedBy: string) {
  const { userId, role } = body
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error

  return NextResponse.json({ success: true })
}

async function deactivateUser(body: any, deactivatedBy: string) {
  const { userId } = body
  const supabase = await createClient()

  // Deactivate user
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) throw error

  // Terminate all sessions
  await sessionManager.terminateAllUserSessions(userId)

  return NextResponse.json({ success: true })
}

async function reactivateUser(body: any, reactivatedBy: string) {
  const { userId } = body
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', userId)

  if (error) throw error

  return NextResponse.json({ success: true })
}

// Helper functions for PUT requests
async function updateMFAPolicy(body: any) {
  const { organizationId, policy } = body

  const updatedPolicy = await mfaManager.updateMFAPolicy(organizationId, policy)

  return NextResponse.json({ policy: updatedPolicy })
}

async function updatePasswordPolicy(body: any) {
  const { policyId, updates } = body

  const updatedPolicy = await passwordPolicyManager.updatePasswordPolicy(policyId, updates)

  return NextResponse.json({ policy: updatedPolicy })
}

async function updateSessionConfig(body: any) {
  const { organizationId, config } = body

  // Implementation would update session configuration
  return NextResponse.json({ success: true })
}

async function updateInvitationSettings(body: any) {
  const { organizationId, settings } = body

  const updatedSettings = await userInvitationManager.updateInvitationSettings(organizationId, settings)

  return NextResponse.json({ settings: updatedSettings })
}