// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 *
 * Functions for managing roles and role assignments
 */

import { createClient } from '@/lib/supabase/server'
import { Permission, SYSTEM_ROLES } from './permissions'
import { recordRbacEvent } from '@/lib/telemetry/metrics'

export interface Role {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  is_system_role: boolean
  permissions: Permission[]
  priority: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  user_id: string
  role_id: string
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  is_active: boolean
}

/**
 * Create a new role
 */
export async function createRole(
  organizationId: string,
  name: string,
  description: string,
  permissions: Permission[],
  priority: number,
  createdBy: string
): Promise<Role> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .insert({
      organization_id: organizationId,
      name,
      description,
      permissions,
      priority,
      created_by: createdBy,
      is_system_role: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create role: ${error.message}`)
  }

  recordRbacEvent('role_change', {
    organizationId,
    userId: createdBy,
    action: 'created',
  })

  return data as Role
}

/**
 * Update a role
 */
export async function updateRole(
  roleId: string,
  updates: {
    name?: string
    description?: string
    permissions?: Permission[]
    priority?: number
  }
): Promise<Role> {
  const supabase = await createClient()

  // Check if system role
  const { data: existingRole } = await supabase
    .from('roles')
    .select('is_system_role, organization_id')
    .eq('id', roleId)
    .single()

  if (existingRole?.is_system_role) {
    throw new Error('Cannot update system roles')
  }

  const { data, error } = await supabase
    .from('roles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`)
  }

  recordRbacEvent('role_change', {
    organizationId: existingRole?.organization_id,
    action: 'updated',
  })

  return data as Role
}

/**
 * Delete a role
 */
export async function deleteRole(roleId: string): Promise<void> {
  const supabase = await createClient()

  // Check if system role
  const { data: existingRole } = await supabase
    .from('roles')
    .select('is_system_role, organization_id')
    .eq('id', roleId)
    .single()

  if (existingRole?.is_system_role) {
    throw new Error('Cannot delete system roles')
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId)

  if (error) {
    throw new Error(`Failed to delete role: ${error.message}`)
  }

  recordRbacEvent('role_change', {
    organizationId: existingRole?.organization_id,
    action: 'deleted',
  })
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  roleId: string,
  grantedBy: string,
  expiresAt?: Date
): Promise<UserRole> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      granted_by: grantedBy,
      expires_at: expiresAt?.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`)
  }

  recordRbacEvent('role_change', {
    userId: grantedBy,
    targetUserId: userId,
    action: 'assigned',
  })

  return data as UserRole
}

/**
 * Revoke role from user
 */
export async function revokeRole(
  userId: string,
  roleId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) {
    throw new Error(`Failed to revoke role: ${error.message}`)
  }

  recordRbacEvent('role_change', {
    targetUserId: userId,
    action: 'revoked',
  })
}

/**
 * Get roles for a user
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (error) {
    throw new Error(`Failed to get user roles: ${error.message}`)
  }

  return (data || []).map(ur => ur.role).filter(Boolean) as Role[]
}

/**
 * Get all roles for an organization
 */
export async function getOrganizationRoles(organizationId: string): Promise<Role[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system_role.eq.true`)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to get organization roles: ${error.message}`)
  }

  return data as Role[]
}

/**
 * Get highest priority role for user
 */
export async function getUserHighestRole(userId: string): Promise<Role | null> {
  const roles = await getUserRoles(userId)

  if (roles.length === 0) {
    return null
  }

  return roles.sort((a, b) => b.priority - a.priority)[0]
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.some(role => role.name === roleName)
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, SYSTEM_ROLES.SUPER_ADMIN.name)
}

/**
 * Check if user is organization owner
 */
export async function isOrganizationOwner(userId: string): Promise<boolean> {
  return hasRole(userId, SYSTEM_ROLES.ORGANIZATION_OWNER.name)
}

/**
 * Check if user is organization admin
 */
export async function isOrganizationAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, SYSTEM_ROLES.ORGANIZATION_ADMIN.name)
}
