/**
 * Enhanced Super Admin Core Library
 *
 * Comprehensive utilities for managing the multi-tenant WhatsApp Business Inbox SaaS platform.
 * Includes permission management, cross-tenant data access, audit logging, organization management,
 * support ticket system, billing oversight, system configuration, and platform-wide analytics.
 *
 * Features:
 * - Role-based access control (RBAC)
 * - Cross-tenant data access with security
 * - Comprehensive audit logging
 * - Organization lifecycle management
 * - Support ticket management
 * - System metrics and analytics
 * - Billing and revenue tracking
 * - Real-time platform monitoring
 */

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// Types for the super admin system
export interface Organization {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup'
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  created_at: string
  suspended_at?: string
  suspension_reason?: string
  trial_ends_at?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

export interface Profile {
  id: string
  organization_id: string
  email: string
  full_name?: string
  role: 'owner' | 'admin' | 'agent'
  is_super_admin: boolean
  is_active: boolean
  last_seen_at?: string
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id?: string
  actor_email?: string
  action: string
  resource_type: string
  resource_id?: string
  organization_id?: string
  old_values?: any
  new_values?: any
  metadata?: any
  ip_address?: string
  user_agent?: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

export interface SystemAuditLog {
  id: string
  actor_id?: string
  actor_email: string
  action: string
  target_organization_id?: string
  target_user_id?: string
  details: any
  ip_address?: string
  user_agent?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  created_at: string
}

export interface SupportTicket {
  id: string
  ticket_number: string
  organization_id: string
  created_by?: string
  assigned_to?: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'general' | 'billing' | 'technical' | 'feature_request' | 'bug_report'
  created_at: string
  updated_at: string
}

export interface PlatformMetrics {
  metric_date: string
  total_organizations: number
  active_organizations: number
  new_organizations: number
  suspended_organizations: number
  total_users: number
  active_users: number
  total_messages: number
  total_conversations: number
  revenue_cents: number
  currency: string
}

export interface SystemSetting {
  id: string
  key: string
  value: any
  description?: string
  category: string
  is_public: boolean
  updated_by?: string
  updated_at: string
}

// Legacy interfaces for backward compatibility
export interface SuperAdminProfile {
  id: string
  email: string
  full_name: string | null
  is_super_admin: boolean
  super_admin_permissions: string[]
  organization_id: string | null
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_type: 'organization' | 'profile' | 'system' | 'billing'
  target_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup'
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  trial_ends_at: string | null
  created_at: string
  user_count: number
  message_count: number
  last_activity: string | null
}

export interface BillingMetrics {
  monthly_revenue: number
  active_subscriptions: number
  trial_organizations: number
  churned_this_month: number
  average_revenue_per_user: number
}

// Permission management functions
export class SuperAdminPermissions {
  private supabase

  constructor() {
    // This will be initialized in init()
  }

  private async init() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Check if the current user is a super admin
   */
  async isSuperAdmin(userId?: string): Promise<boolean> {
    try {
      const supabase = await this.init()
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', userId || (await supabase.auth.getUser()).data.user?.id)
        .single()

      return profile?.is_super_admin || false
    } catch (error) {
      console.error('Error checking super admin status:', error)
      return false
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string, resource?: string): Promise<boolean> {
    try {
      const supabase = await this.init()
      const user = await supabase.auth.getUser()
      if (!user.data.user) return false

      // Check if user is super admin first
      if (await this.isSuperAdmin(user.data.user.id)) {
        return true
      }

      // Check specific permissions through system roles
      const { data: permissions } = await supabase
        .from('profile_system_roles')
        .select(
          `
          system_roles (
            permissions
          )
        `
        )
        .eq('profile_id', user.data.user.id)
        .is('expires_at', null)

      if (!permissions || permissions.length === 0) return false

      // Check if any role has the required permission
      return permissions.some(p => {
        const rolePermissions = p.system_roles?.permissions as any
        if (!rolePermissions) return false

        if (resource) {
          return rolePermissions[resource]?.includes(permission)
        }

        // Check across all resources
        return Object.values(rolePermissions).some(
          (perms: any) => Array.isArray(perms) && perms.includes(permission)
        )
      })
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Get user's system roles
   */
  async getUserSystemRoles(userId: string) {
    const supabase = await this.init()
    const { data, error } = await supabase
      .from('profile_system_roles')
      .select(
        `
        *,
        system_roles (*)
      `
      )
      .eq('profile_id', userId)
      .is('expires_at', null)

    if (error) throw error
    return data
  }

  /**
   * Assign system role to user
   */
  async assignSystemRole(userId: string, roleId: string, assignedBy: string, expiresAt?: string) {
    const supabase = await this.init()
    const { data, error } = await supabase.from('profile_system_roles').insert({
      profile_id: userId,
      system_role_id: roleId,
      assigned_by: assignedBy,
      expires_at: expiresAt,
    })

    if (error) throw error

    // Log the action
    await this.logSystemAuditEvent(
      'assign_system_role',
      null,
      userId,
      { role_id: roleId, expires_at: expiresAt },
      'info'
    )

    return data
  }

  /**
   * Revoke system role from user
   */
  async revokeSystemRole(userId: string, roleId: string) {
    const supabase = await this.init()
    const { data, error } = await supabase
      .from('profile_system_roles')
      .delete()
      .eq('profile_id', userId)
      .eq('system_role_id', roleId)

    if (error) throw error

    // Log the action
    await this.logSystemAuditEvent('revoke_system_role', null, userId, { role_id: roleId }, 'info')

    return data
  }

  /**
   * Log system audit event (for super admin actions)
   */
  async logSystemAuditEvent(
    action: string,
    targetOrganizationId?: string,
    targetUserId?: string,
    details: any = {},
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ) {
    const supabase = await this.init()
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.data.user.id)
      .single()

    const { data, error } = await supabase.from('system_audit_logs').insert({
      actor_id: user.data.user.id,
      actor_email: profile?.email || user.data.user.email,
      action,
      target_organization_id: targetOrganizationId,
      target_user_id: targetUserId,
      details,
      severity,
    })

    if (error) throw error
    return data
  }
}

// Legacy function for backward compatibility
export async function requireSuperAdmin(): Promise<SuperAdminProfile> {
  const profile = await getUserProfile()

  if (!profile?.is_super_admin) {
    redirect('/dashboard')
  }

  return profile as SuperAdminProfile
}

export async function checkSuperAdminPermission(permission: string): Promise<boolean> {
  const profile = await getUserProfile()

  if (!profile?.is_super_admin) {
    return false
  }

  // If no specific permissions are set, super admin has all permissions
  if (!profile.super_admin_permissions || profile.super_admin_permissions.length === 0) {
    return true
  }

  return (
    profile.super_admin_permissions.includes(permission) ||
    profile.super_admin_permissions.includes('*')
  )
}

export async function logSuperAdminAction(
  action: string,
  targetType: 'organization' | 'profile' | 'system' | 'billing',
  targetId?: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    const supabase = await createClient()
    const profile = await getUserProfile()

    if (!profile?.is_super_admin) {
      throw new Error('Not authorized to perform super admin actions')
    }

    const { data, error } = await supabase.rpc('log_super_admin_action', {
      admin_user_id: profile.id,
      action_name: action,
      target_type: targetType,
      target_id: targetId || null,
      action_details: details,
      ip_addr: ipAddress || null,
      user_agent: userAgent || null,
    })

    if (error) {
      console.error('Failed to log super admin action:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error logging super admin action:', error)
    return null
  }
}

export async function getPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const supabase = await createClient()

    // Verify super admin access
    await requireSuperAdmin()

    const [
      { count: totalOrgs },
      { count: activeOrgs },
      { count: totalUsers },
      { data: todayMessages },
      { data: monthMessages },
      { data: storageData },
      { data: apiCalls },
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte(
          'created_at',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
      supabase
        .from('organization_metrics')
        .select('storage_used_mb')
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('webhook_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ])

    return {
      total_organizations: totalOrgs || 0,
      active_organizations: activeOrgs || 0,
      total_users: totalUsers || 0,
      messages_today: todayMessages?.length || 0,
      messages_this_month: monthMessages?.length || 0,
      storage_used_gb: Math.round(((storageData?.[0]?.storage_used_mb || 0) / 1024) * 100) / 100,
      api_calls_today: apiCalls || 0,
    }
  } catch (error) {
    console.error('Error fetching platform metrics:', error)
    return null
  }
}

export async function getOrganizationsList(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string
): Promise<{ organizations: OrganizationSummary[]; total: number } | null> {
  try {
    const supabase = await createClient()

    // Verify super admin access
    await requireSuperAdmin()

    let query = supabase.from('organizations').select(`
        *,
        user_count:profiles(count),
        message_count:conversations(count)
      `)

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return null
    }

    const organizations: OrganizationSummary[] =
      data?.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subscription_status: org.subscription_status,
        subscription_tier: org.subscription_tier,
        trial_ends_at: org.trial_ends_at,
        created_at: org.created_at,
        user_count: Array.isArray(org.user_count) ? org.user_count.length : 0,
        message_count: Array.isArray(org.message_count) ? org.message_count.length : 0,
        last_activity: org.updated_at,
      })) || []

    return {
      organizations,
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching organizations list:', error)
    return null
  }
}

export async function suspendOrganization(
  organizationId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const admin = await requireSuperAdmin()

    const { error } = await supabase.rpc('suspend_organization', {
      org_id: organizationId,
      reason: reason,
      suspended_by_id: admin.id,
    })

    if (error) {
      console.error('Error suspending organization:', error)
      return false
    }

    // Log the action
    await logSuperAdminAction(
      'suspend_organization',
      'organization',
      organizationId,
      { reason },
      ipAddress,
      userAgent
    )

    return true
  } catch (error) {
    console.error('Error suspending organization:', error)
    return false
  }
}

export async function reactivateOrganization(
  organizationId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const admin = await requireSuperAdmin()

    const { error } = await supabase.rpc('reactivate_organization', {
      org_id: organizationId,
      reactivated_by_id: admin.id,
    })

    if (error) {
      console.error('Error reactivating organization:', error)
      return false
    }

    // Log the action
    await logSuperAdminAction(
      'reactivate_organization',
      'organization',
      organizationId,
      {},
      ipAddress,
      userAgent
    )

    return true
  } catch (error) {
    console.error('Error reactivating organization:', error)
    return false
  }
}

export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  adminId?: string,
  action?: string,
  targetType?: string
): Promise<{ logs: AdminAuditLog[]; total: number } | null> {
  try {
    // Verify super admin access
    await requireSuperAdmin()

    const supabase = await createClient()

    let query = supabase
      .from('super_admin_audit_logs')
      .select('*', { count: 'exact' })

    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    if (action) {
      query = query.eq('action', action)
    }

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching audit logs:', error)
      return null
    }

    return {
      logs: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return null
  }
}

export async function updateSystemSetting(
  key: string,
  value: any,
  description?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const admin = await requireSuperAdmin()

    const { error } = await supabase.from('system_settings').upsert({
      key,
      value: JSON.stringify(value),
      description,
      updated_by: admin.id,
    })

    if (error) {
      console.error('Error updating system setting:', error)
      return false
    }

    // Log the action
    await logSuperAdminAction('update_system_setting', 'system', undefined, {
      key,
      value,
      description,
    })

    return true
  } catch (error) {
    console.error('Error updating system setting:', error)
    return false
  }
}

export async function getSystemSettings(): Promise<Record<string, any> | null> {
  try {
    const supabase = await createClient()

    // Verify super admin access
    await requireSuperAdmin()

    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching system settings:', error)
      return null
    }

    const settings: Record<string, any> = {}
    data?.forEach(setting => {
      try {
        settings[setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.key] = setting.value
      }
    })

    return settings
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return null
  }
}
