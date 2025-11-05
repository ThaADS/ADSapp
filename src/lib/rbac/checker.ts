// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 *
 * Core logic for checking user permissions against resources
 */

import { createClient } from '@/lib/supabase/server'
import { Permission, Resource, Action, PermissionConditions, permissionMatches } from './permissions'
import { recordRbacEvent } from '@/lib/telemetry/metrics'

export interface PermissionCheckContext {
  userId: string
  organizationId?: string
  resource: Resource
  action: Action
  resourceId?: string
  resourceData?: any
}

/**
 * Check if user has permission for a resource/action
 */
export async function hasPermission(
  context: PermissionCheckContext
): Promise<boolean> {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Record permission check metric
    recordRbacEvent('permission_check', {
      userId: context.userId,
      organizationId: context.organizationId,
      resource: context.resource,
      action: context.action,
    })

    // Check permission overrides first
    const override = await checkPermissionOverride(context)
    if (override !== null) {
      if (!override) {
        recordRbacEvent('permission_denied', {
          userId: context.userId,
          resource: context.resource,
          action: context.action,
          reason: 'permission_override',
        })
      }
      return override
    }

    // Get user's roles and permissions
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role:roles(*)')
      .eq('user_id', context.userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return false
    }

    if (!userRoles || userRoles.length === 0) {
      recordRbacEvent('permission_denied', {
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        reason: 'no_roles',
      })
      return false
    }

    // Check permissions from roles (sorted by priority)
    const sortedRoles = userRoles
      .map(ur => ur.role)
      .filter(r => r !== null)
      .sort((a, b) => (b?.priority || 0) - (a?.priority || 0))

    for (const role of sortedRoles) {
      if (!role) continue

      const permissions = role.permissions as Permission[]

      for (const permission of permissions) {
        if (permissionMatches(permission, context.resource, context.action)) {
          // Check conditions
          const conditionsMet = await checkConditions(
            permission.conditions,
            context
          )

          if (conditionsMet) {
            return true
          }
        }
      }
    }

    // No matching permission found
    recordRbacEvent('permission_denied', {
      userId: context.userId,
      organizationId: context.organizationId,
      resource: context.resource,
      action: context.action,
      reason: 'no_matching_permission',
    })

    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Check permission override
 * Returns: true (allowed), false (denied), null (no override)
 */
async function checkPermissionOverride(
  context: PermissionCheckContext
): Promise<boolean | null> {
  const supabase = await createClient()

  const { data: override } = await supabase
    .from('permission_overrides')
    .select('allowed')
    .eq('user_id', context.userId)
    .eq('resource', context.resource)
    .eq('action', context.action)
    .or('resource_id.is.null,resource_id.eq.' + (context.resourceId || 'null'))
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('resource_id', { nulls: 'last' })
    .limit(1)
    .single()

  return override ? override.allowed : null
}

/**
 * Check permission conditions
 */
async function checkConditions(
  conditions: PermissionConditions | undefined,
  context: PermissionCheckContext
): Promise<boolean> {
  if (!conditions) {
    return true
  }

  const supabase = await createClient()

  // Check ownership condition
  if (conditions.own && context.resourceId && context.resourceData) {
    const ownerId = context.resourceData.user_id || context.resourceData.created_by || context.resourceData.assigned_to
    if (ownerId !== context.userId) {
      return false
    }
  }

  // Check team condition
  if (conditions.team) {
    // Get user's team
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', context.userId)
      .single()

    if (!userProfile?.team_id) {
      return false
    }

    // Check if resource belongs to same team
    if (context.resourceData) {
      const resourceTeamId = context.resourceData.team_id
      if (resourceTeamId !== userProfile.team_id) {
        return false
      }
    }
  }

  // Check organization condition
  if (conditions.organization && context.organizationId) {
    if (context.resourceData) {
      const resourceOrgId = context.resourceData.organization_id
      if (resourceOrgId !== context.organizationId) {
        return false
      }
    }
  }

  // Check tags condition
  if (conditions.tags && conditions.tags.length > 0) {
    const resourceTags = context.resourceData?.tags || []
    const hasMatchingTag = conditions.tags.some(tag => resourceTags.includes(tag))
    if (!hasMatchingTag) {
      return false
    }
  }

  // Check status condition
  if (conditions.status && conditions.status.length > 0) {
    const resourceStatus = context.resourceData?.status
    if (!conditions.status.includes(resourceStatus)) {
      return false
    }
  }

  return true
}

/**
 * Get all effective permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:roles(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (!userRoles || userRoles.length === 0) {
    return []
  }

  const allPermissions: Permission[] = []

  userRoles.forEach(ur => {
    const role = ur.role
    if (role && role.permissions) {
      allPermissions.push(...(role.permissions as Permission[]))
    }
  })

  return allPermissions
}

/**
 * Check multiple permissions at once
 */
export async function hasAnyPermission(
  userId: string,
  checks: Array<{ resource: Resource; action: Action }>
): Promise<boolean> {
  for (const check of checks) {
    const has = await hasPermission({
      userId,
      resource: check.resource,
      action: check.action,
    })

    if (has) {
      return true
    }
  }

  return false
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  checks: Array<{ resource: Resource; action: Action }>
): Promise<boolean> {
  for (const check of checks) {
    const has = await hasPermission({
      userId,
      resource: check.resource,
      action: check.action,
    })

    if (!has) {
      return false
    }
  }

  return true
}

/**
 * Require permission (throws if not allowed)
 */
export async function requirePermission(
  context: PermissionCheckContext
): Promise<void> {
  const allowed = await hasPermission(context)

  if (!allowed) {
    throw new Error(
      `Permission denied: ${context.action} on ${context.resource}`
    )
  }
}
