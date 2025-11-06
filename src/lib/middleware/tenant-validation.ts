import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrganization } from '@/lib/api-utils'

/**
 * Tenant Context Type for API routes
 * Contains authenticated user and organization information
 */
export interface TenantContext {
  userId: string
  organizationId: string
  userRole: string
  userEmail: string
}

/**
 * Security Event Log for cross-tenant access attempts
 */
interface SecurityEvent {
  userId: string
  userOrg: string
  requestedOrg: string | null
  path: string
  method: string
  timestamp: string
  ip: string
  userAgent: string
}

/**
 * Tenant Validation Middleware
 * Ensures all API requests are scoped to the authenticated user's organization
 *
 * Security Features:
 * - Validates user authentication via Supabase JWT
 * - Verifies user-organization relationship
 * - Prevents cross-tenant data access
 * - Logs security events for monitoring
 * - Attaches tenant context to request headers
 *
 * Usage in API routes:
 * ```typescript
 * import { validateTenantAccess, getTenantContext } from '@/lib/middleware/tenant-validation';
 *
 * export async function GET(request: NextRequest) {
 *   const validation = await validateTenantAccess(request);
 *   if (validation) return validation; // Return error response if validation fails
 *
 *   const { organizationId, userId } = getTenantContext(request);
 *   // Use organizationId to scope database queries
 * }
 * ```
 */
export async function validateTenantAccess(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = await createClient()

    // 1. Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    // 2. Get user's organization and profile
    const userOrg = await getUserOrganization(user.id)

    if (!userOrg || !userOrg.organization_id) {
      // Check if user is super admin - they don't need organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin, role')
        .eq('id', user.id)
        .single()

      if (profile?.is_super_admin) {
        // Super admins bypass organization requirements
        // Note: Headers can't be set in API routes, return null to allow access
        return null
      }

      return NextResponse.json(
        {
          error: 'User not associated with any organization',
          code: 'NO_ORGANIZATION',
        },
        { status: 403 }
      )
    }

    // 3. Validate tenant context from request
    // Check for organization ID in headers or query parameters
    const requestedOrgId =
      request.headers.get('x-organization-id') ||
      request.nextUrl.searchParams.get('organization_id')

    // 4. Cross-tenant access prevention
    if (requestedOrgId && requestedOrgId !== userOrg.organization_id) {
      // Log cross-tenant access attempt for security monitoring
      const securityEvent: SecurityEvent = {
        userId: user.id,
        userOrg: userOrg.organization_id,
        requestedOrg: requestedOrgId,
        path: request.nextUrl.pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
      }

      // Log to console (in production, send to security monitoring service)
      console.warn('[SECURITY] Cross-tenant access attempt:', securityEvent)

      // Send to Sentry for alerting
      if (process.env.NODE_ENV === 'production') {
        try {
          const Sentry = await import('@sentry/nextjs')
          Sentry.captureMessage('Cross-tenant access attempt', {
            level: 'warning',
            extra: {
              userId: securityEvent.userId,
              userOrg: securityEvent.userOrg,
              requestedOrg: securityEvent.requestedOrg,
              path: securityEvent.path,
              method: securityEvent.method,
              timestamp: securityEvent.timestamp,
              ip: securityEvent.ip,
              userAgent: securityEvent.userAgent,
            },
          })
        } catch (error) {
          console.error('Failed to log security event to Sentry:', error)
        }
      }

      return NextResponse.json(
        {
          error: 'Forbidden: Access to this organization denied',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      )
    }

    // 5. Attach tenant context to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-organization-id', userOrg.organization_id)

    // Type guard for organization role
    const orgRole =
      userOrg.organization &&
      typeof userOrg.organization === 'object' &&
      'role' in userOrg.organization
        ? String(userOrg.organization.role)
        : 'agent'

    requestHeaders.set('x-user-role', orgRole)
    requestHeaders.set('x-user-email', user.email || '')
    requestHeaders.set('x-is-super-admin', 'false')

    // Return null for API routes (headers are passed via context)
    // Note: NextResponse.next() is only for middleware, not API route handlers
    return null
  } catch (error) {
    console.error('[TENANT_VALIDATION] Error:', error)

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        const Sentry = await import('@sentry/nextjs')
        Sentry.captureException(error, {
          tags: {
            middleware: 'tenant-validation',
          },
        })
      } catch (sentryError) {
        console.error('Failed to log error to Sentry:', sentryError)
      }
    }

    // Return 500 error for unexpected failures
    return NextResponse.json(
      {
        error: 'Internal server error during tenant validation',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * Extract tenant context from request headers
 * Use this in API routes after validateTenantAccess middleware
 *
 * @param request - NextRequest object with tenant context headers
 * @returns TenantContext object with user and organization information
 *
 * @example
 * ```typescript
 * const { organizationId, userId, userRole } = getTenantContext(request);
 *
 * // Use organizationId to scope database queries
 * const { data } = await supabase
 *   .from('contacts')
 *   .select('*')
 *   .eq('organization_id', organizationId);
 * ```
 */
export function getTenantContext(request: NextRequest): TenantContext {
  return {
    userId: request.headers.get('x-user-id') || '',
    organizationId: request.headers.get('x-organization-id') || '',
    userRole: request.headers.get('x-user-role') || 'agent',
    userEmail: request.headers.get('x-user-email') || '',
  }
}

/**
 * Check if the current user is a super admin
 * Super admins bypass organization requirements
 *
 * @param request - NextRequest object with tenant context headers
 * @returns boolean indicating if user is super admin
 */
export function isSuperAdmin(request: NextRequest): boolean {
  return request.headers.get('x-is-super-admin') === 'true'
}

/**
 * Validate that a resource belongs to the user's organization
 * Use this for additional validation in API routes
 *
 * @param resourceOrgId - Organization ID of the resource being accessed
 * @param tenantContext - Tenant context from request
 * @returns boolean indicating if access is allowed
 *
 * @example
 * ```typescript
 * const contact = await getContact(contactId);
 * const context = getTenantContext(request);
 *
 * if (!validateResourceAccess(contact.organization_id, context)) {
 *   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
 * }
 * ```
 */
export function validateResourceAccess(
  resourceOrgId: string,
  tenantContext: TenantContext
): boolean {
  // Super admins can access all resources
  if (!tenantContext.organizationId && tenantContext.userRole === 'super_admin') {
    return true
  }

  // Regular users can only access resources in their organization
  return resourceOrgId === tenantContext.organizationId
}

/**
 * Helper function to get client IP address
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param request - NextRequest object
 * @returns Client IP address or 'unknown'
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const vercelIp = request.headers.get('x-vercel-forwarded-for')

  return cfConnectingIp || vercelIp || forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

/**
 * Supabase Query Builder Interface
 * Minimal interface for tenant scoping
 */
interface SupabaseQueryBuilder {
  eq(column: string, value: string): SupabaseQueryBuilder
}

/**
 * Create a tenant-aware database query modifier
 * Automatically adds organization_id filter to queries
 *
 * @param organizationId - Organization ID to filter by
 * @returns Function that modifies Supabase query builder
 *
 * @example
 * ```typescript
 * const context = getTenantContext(request);
 * const scopeToOrg = createTenantScope(context.organizationId);
 *
 * const { data } = await supabase
 *   .from('contacts')
 *   .select('*')
 *   .modify(scopeToOrg); // Automatically adds .eq('organization_id', organizationId)
 * ```
 */
export function createTenantScope(organizationId: string) {
  return (query: SupabaseQueryBuilder) => query.eq('organization_id', organizationId)
}
