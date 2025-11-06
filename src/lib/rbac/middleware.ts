/**
 * RBAC Middleware for API Routes
 *
 * Protects API routes with permission checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, PermissionCheckContext } from './checker'
import { Resource, Action } from './permissions'
import { createErrorResponse } from '@/lib/api-utils'

export interface RbacOptions {
  resource: Resource
  action: Action
  getResourceId?: (request: NextRequest, context?: any) => Promise<string | undefined>
  getResourceData?: (request: NextRequest, context?: any, resourceId?: string) => Promise<any>
}

/**
 * Wrap API route handler with RBAC permission check
 */
export function withRbac(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: RbacOptions
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // User and profile should be set by auth middleware
    const { user, profile } = context || {}

    if (!user || !profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    try {
      // Get resource ID if function provided
      const resourceId = options.getResourceId
        ? await options.getResourceId(request, context)
        : undefined

      // Get resource data if function provided
      const resourceData = options.getResourceData
        ? await options.getResourceData(request, context, resourceId)
        : undefined

      // Check permission
      const permissionContext: PermissionCheckContext = {
        userId: user.id,
        organizationId: profile.organization_id,
        resource: options.resource,
        action: options.action,
        resourceId,
        resourceData,
      }

      const allowed = await hasPermission(permissionContext)

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Permission denied',
            code: 'RBAC_PERMISSION_DENIED',
            details: {
              resource: options.resource,
              action: options.action,
            },
          },
          { status: 403 }
        )
      }

      // Execute handler
      return handler(request, context)
    } catch (error) {
      console.error('RBAC middleware error:', error)
      return createErrorResponse(error)
    }
  }
}

/**
 * Require specific permission (for use inside handlers)
 */
export async function requirePermission(
  userId: string,
  organizationId: string,
  resource: Resource,
  action: Action,
  resourceId?: string,
  resourceData?: any
): Promise<void> {
  const allowed = await hasPermission({
    userId,
    organizationId,
    resource,
    action,
    resourceId,
    resourceData,
  })

  if (!allowed) {
    throw new Error(
      JSON.stringify({
        code: 'RBAC_PERMISSION_DENIED',
        message: `Permission denied: ${action} on ${resource}`,
        resource,
        action,
      })
    )
  }
}

/**
 * Pre-configured RBAC middleware for common scenarios
 */

// Conversations
export const withConversationRead = (handler: any) =>
  withRbac(handler, {
    resource: 'conversations',
    action: 'read',
  })

export const withConversationWrite = (handler: any) =>
  withRbac(handler, {
    resource: 'conversations',
    action: 'update',
    getResourceId: async request => {
      const url = new URL(request.url)
      return url.pathname.split('/').pop()
    },
  })

// Contacts
export const withContactRead = (handler: any) =>
  withRbac(handler, {
    resource: 'contacts',
    action: 'read',
  })

export const withContactWrite = (handler: any) =>
  withRbac(handler, {
    resource: 'contacts',
    action: 'update',
    getResourceId: async request => {
      const url = new URL(request.url)
      return url.pathname.split('/').pop()
    },
  })

// Templates
export const withTemplateRead = (handler: any) =>
  withRbac(handler, {
    resource: 'templates',
    action: 'read',
  })

export const withTemplateWrite = (handler: any) =>
  withRbac(handler, {
    resource: 'templates',
    action: 'update',
  })

// Analytics
export const withAnalyticsRead = (handler: any) =>
  withRbac(handler, {
    resource: 'analytics',
    action: 'read',
  })

// Admin
export const withAdminAccess = (handler: any) =>
  withRbac(handler, {
    resource: 'organizations',
    action: 'update',
  })

// Billing
export const withBillingAccess = (handler: any) =>
  withRbac(handler, {
    resource: 'billing',
    action: 'read',
  })
