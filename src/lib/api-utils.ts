import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'

export interface ApiError {
  message: string
  code: string
  statusCode: number
}

export class ApiException extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiException'
  }
}

export function createErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  )
}

export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  )
}

export async function validateRequest(request: NextRequest, schema?: any): Promise<any> {
  const contentType = request.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    try {
      const body = await request.json()

      if (schema) {
        // Add validation logic here if needed
        // Could integrate with Zod or similar validation library
      }

      return body
    } catch (error) {
      throw new ApiException('Invalid JSON in request body', 400, 'INVALID_JSON')
    }
  }

  return null
}

export async function requireAuthenticatedUser() {
  const user = await getUser()

  if (!user) {
    throw new ApiException('Authentication required', 401, 'UNAUTHORIZED')
  }

  return user
}

export async function getUserOrganization(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, organization:organizations(*)')
    .eq('id', userId)
    .single()

  if (error || !profile?.organization_id) {
    throw new ApiException('No organization found', 404, 'NO_ORGANIZATION')
  }

  return profile
}

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
}

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(options: RateLimitOptions) {
  return async (request: NextRequest) => {
    const key = options.keyGenerator ? options.keyGenerator(request) : request.ip || 'anonymous'

    const now = Date.now()
    const windowStart = now - options.windowMs

    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }

    const current = rateLimitStore.get(key)

    if (!current || current.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      })
      return true
    }

    if (current.count >= options.max) {
      throw new ApiException('Too many requests', 429, 'RATE_LIMIT_EXCEEDED')
    }

    current.count++
    return true
  }
}

export function validatePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function validateSortOrder(request: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(request.url)

  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  if (!allowedFields.includes(sortBy)) {
    throw new ApiException(
      `Invalid sort field. Allowed: ${allowedFields.join(', ')}`,
      400,
      'INVALID_SORT_FIELD'
    )
  }

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new ApiException('Invalid sort order. Must be "asc" or "desc"', 400, 'INVALID_SORT_ORDER')
  }

  return { sortBy, sortOrder, ascending: sortOrder === 'asc' }
}

/**
 * Get tenant context from request headers (set by tenant validation middleware)
 *
 * @param request - NextRequest object with tenant context headers
 * @returns Object containing user and organization information
 *
 * @example
 * ```typescript
 * import { getTenantContextFromHeaders } from '@/lib/api-utils';
 *
 * export async function GET(request: NextRequest) {
 *   const { userId, organizationId } = getTenantContextFromHeaders(request);
 *
 *   // Use in database queries
 *   const { data } = await supabase
 *     .from('contacts')
 *     .select('*')
 *     .eq('organization_id', organizationId);
 * }
 * ```
 */
export function getTenantContextFromHeaders(request: NextRequest): {
  userId: string
  organizationId: string
  userRole: string
  userEmail: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    organizationId: request.headers.get('x-organization-id') || '',
    userRole: request.headers.get('x-user-role') || 'agent',
    userEmail: request.headers.get('x-user-email') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * Validate that a requested organization ID matches the user's organization
 * Provides double-check validation after middleware
 *
 * @param requestOrgId - Organization ID from request (query param, body, etc.)
 * @param userOrgId - User's organization ID from tenant context
 * @returns boolean indicating if access is allowed
 *
 * @example
 * ```typescript
 * import { validateOrganizationAccess, getTenantContextFromHeaders } from '@/lib/api-utils';
 *
 * export async function POST(request: NextRequest) {
 *   const { organizationId: userOrgId } = getTenantContextFromHeaders(request);
 *   const body = await request.json();
 *
 *   if (!validateOrganizationAccess(body.organization_id, userOrgId)) {
 *     return NextResponse.json({ error: 'Access denied' }, { status: 403 });
 *   }
 * }
 * ```
 */
export async function validateOrganizationAccess(
  requestOrgId: string | null | undefined,
  userOrgId: string
): Promise<boolean> {
  // If no specific organization requested, allow (will use user's org)
  if (!requestOrgId) return true

  // Check if requested organization matches user's organization
  return requestOrgId === userOrgId
}

/**
 * Create a Supabase query builder that automatically scopes to user's organization
 *
 * @param supabase - Supabase client instance
 * @param tableName - Name of the table to query
 * @param organizationId - Organization ID to scope the query to
 * @returns Supabase query builder with organization filter applied
 *
 * @example
 * ```typescript
 * import { createTenantScopedQuery, getTenantContextFromHeaders } from '@/lib/api-utils';
 *
 * export async function GET(request: NextRequest) {
 *   const supabase = await createClient();
 *   const { organizationId } = getTenantContextFromHeaders(request);
 *
 *   // Automatically filters by organization_id
 *   const { data } = await createTenantScopedQuery(supabase, 'contacts', organizationId)
 *     .select('*')
 *     .eq('is_blocked', false);
 * }
 * ```
 */
export function createTenantScopedQuery(supabase: any, tableName: string, organizationId: string) {
  return supabase.from(tableName).select('*').eq('organization_id', organizationId)
}

/**
 * Validate that a resource belongs to the user's organization
 * Use for additional security checks after fetching a resource
 *
 * @param resourceOrgId - Organization ID of the fetched resource
 * @param userOrgId - User's organization ID from tenant context
 * @param isSuperAdmin - Whether the user is a super admin (bypasses check)
 * @returns boolean indicating if access is allowed
 * @throws ApiException if access is denied
 *
 * @example
 * ```typescript
 * import { validateResourceOwnership, getTenantContextFromHeaders } from '@/lib/api-utils';
 *
 * export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
 *   const { organizationId, isSuperAdmin } = getTenantContextFromHeaders(request);
 *   const contact = await getContact(params.id);
 *
 *   validateResourceOwnership(contact.organization_id, organizationId, isSuperAdmin);
 *
 *   // Proceed with deletion
 * }
 * ```
 */
export function validateResourceOwnership(
  resourceOrgId: string,
  userOrgId: string,
  isSuperAdmin: boolean = false
): void {
  // Super admins can access all resources
  if (isSuperAdmin) return

  // Check if resource belongs to user's organization
  if (resourceOrgId !== userOrgId) {
    throw new ApiException(
      'Access denied: Resource does not belong to your organization',
      403,
      'FORBIDDEN'
    )
  }
}
