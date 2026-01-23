import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireEnvVar } from '@/lib/build-safe-init'
import type { Database } from '@/types/database'
import { secureRpc, type SecureRpcOptions, type SecureRpcResult } from '@/lib/security/secure-rpc'
import { InputValidator, type ValidationResult } from '@/lib/security/input-validation'
import { logger } from '@/lib/security/logger'
import { logAuditEvent } from '@/lib/security/audit-service'

/**
 * Creates a Supabase server client with cookie handling for Next.js 15 App Router.
 * This function MUST be awaited in server components and API routes.
 *
 * @example
 * ```typescript
 * // In API routes or server components:
 * const supabase = await createClient()
 * const { data } = await supabase.from('table').select()
 * ```
 */
export async function createClient() {
  // Dynamic import to avoid issues with bundling
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient<Database>(
    requireEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase server client with service role key that bypasses RLS.
 * Use this ONLY for administrative operations like organization creation.
 * NEVER expose this client to the frontend or use for regular user operations.
 *
 * @example
 * ```typescript
 * // In API routes for admin operations:
 * const serviceSupabase = createServiceRoleClient()
 * const { data } = await serviceSupabase.from('organizations').insert({...})
 * ```
 */
export function createServiceRoleClient() {
  const url = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  // 🔒 SECURITY: Service role key logging removed
  // Previously logged service role key prefix - security risk in production
  // Service role client creation should be minimal and secure

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Type-safe helper for server-side Supabase client.
 * Use this type when passing the client as a parameter.
 */
export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Type-safe helper for service role Supabase client.
 * Use this type when passing the service role client as a parameter.
 */
export type ServiceRoleSupabaseClient = ReturnType<typeof createServiceRoleClient>

// ============================================================================
// SECURE ADMIN CLIENT (Phase 1.2)
// ============================================================================

/**
 * ApiException for throwing typed errors
 */
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

/**
 * Creates a guarded admin client that verifies super admin status before creation.
 * This should be used instead of createServiceRoleClient() in admin routes.
 *
 * @param userId - The user ID to verify super admin status for
 * @param purpose - Description of why admin access is needed (for audit logging)
 * @throws ApiException if user is not a super admin
 *
 * @example
 * ```typescript
 * // In /api/admin/* routes:
 * const user = await requireAuthenticatedUser()
 * const adminClient = await createAdminClient(user.id, 'organization_management')
 * const { data } = await adminClient.from('organizations').select()
 * ```
 */
export async function createAdminClient(
  userId: string,
  purpose: string = 'admin_operation'
): Promise<ServiceRoleSupabaseClient> {
  // First, verify super admin status using regular client
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_super_admin, role, organization_id')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    logger.security('ADMIN_ACCESS_DENIED', {
      userId,
      purpose,
      reason: 'profile_not_found',
    })

    await logAuditEvent({
      eventType: 'ACCESS_DENIED',
      eventCategory: 'authorization',
      action: 'create_admin_client',
      userId,
      actionResult: 'denied',
      metadata: { purpose, reason: 'profile_not_found' },
    })

    throw new ApiException('Forbidden: User profile not found', 403, 'FORBIDDEN')
  }

  if (!profile.is_super_admin) {
    logger.security('ADMIN_ACCESS_DENIED', {
      userId,
      purpose,
      reason: 'not_super_admin',
      userRole: profile.role,
    })

    await logAuditEvent({
      eventType: 'ACCESS_DENIED',
      eventCategory: 'authorization',
      action: 'create_admin_client',
      userId,
      organizationId: profile.organization_id,
      actionResult: 'denied',
      metadata: { purpose, reason: 'not_super_admin', userRole: profile.role },
    })

    throw new ApiException('Forbidden: Super admin access required', 403, 'FORBIDDEN')
  }

  // Log successful admin client creation
  logger.security('ADMIN_CLIENT_CREATED', {
    userId,
    purpose,
  })

  await logAuditEvent({
    eventType: 'CREDENTIAL_ACCESS',
    eventCategory: 'credential_access',
    action: 'create_admin_client',
    userId,
    actionResult: 'success',
    metadata: { purpose },
  })

  return createServiceRoleClient()
}

/**
 * Verifies that a user has super admin privileges without creating a client.
 * Useful for checking admin status before performing sensitive operations.
 *
 * @param userId - The user ID to verify
 * @returns true if user is super admin, false otherwise
 */
export async function verifySuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.is_super_admin === true
}

// ============================================================================
// ORGANIZATION CONTEXT HELPERS (Phase 2.2)
// ============================================================================

export interface OrganizationContext {
  organizationId: string
  role: 'owner' | 'admin' | 'agent' | 'viewer'
  isSuperAdmin: boolean
}

/**
 * Requires and returns organization context for the authenticated user.
 * Throws if user doesn't have an organization (unless super admin).
 *
 * @param userId - The authenticated user's ID
 * @throws ApiException if no organization context is available
 *
 * @example
 * ```typescript
 * const user = await requireAuthenticatedUser()
 * const { organizationId, role } = await requireOrganizationContext(user.id)
 *
 * // Now safe to query with organization context
 * const { data } = await supabase
 *   .from('contacts')
 *   .select()
 *   .eq('organization_id', organizationId)
 * ```
 */
export async function requireOrganizationContext(
  userId: string
): Promise<OrganizationContext> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, role, is_super_admin')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    logger.warn('Organization context check failed: profile not found', { userId })
    throw new ApiException('User profile not found', 401, 'NO_PROFILE')
  }

  // Super admins may not have an organization but can still access system
  if (profile.is_super_admin && !profile.organization_id) {
    return {
      organizationId: '', // Empty for super admin without org
      role: 'owner', // Effective role for super admin
      isSuperAdmin: true,
    }
  }

  if (!profile.organization_id) {
    logger.warn('Organization context check failed: no organization', { userId })
    throw new ApiException(
      'No organization context. Please complete onboarding.',
      403,
      'NO_ORG_CONTEXT'
    )
  }

  return {
    organizationId: profile.organization_id,
    role: (profile.role || 'viewer') as OrganizationContext['role'],
    isSuperAdmin: profile.is_super_admin === true,
  }
}

/**
 * Gets organization context without throwing if not available.
 * Useful for optional organization checks.
 *
 * @param userId - The authenticated user's ID
 * @returns OrganizationContext or null if not available
 */
export async function getOrganizationContext(
  userId: string
): Promise<OrganizationContext | null> {
  try {
    return await requireOrganizationContext(userId)
  } catch {
    return null
  }
}

/**
 * Requires specific roles for an operation.
 * Throws if user doesn't have one of the required roles.
 *
 * @param userId - The authenticated user's ID
 * @param requiredRoles - Array of roles that are allowed
 * @throws ApiException if user doesn't have required role
 */
export async function requireRole(
  userId: string,
  requiredRoles: Array<'owner' | 'admin' | 'agent' | 'viewer'>
): Promise<OrganizationContext> {
  const context = await requireOrganizationContext(userId)

  // Super admins can perform any action
  if (context.isSuperAdmin) {
    return context
  }

  if (!requiredRoles.includes(context.role)) {
    logger.security('ROLE_CHECK_FAILED', {
      userId,
      userRole: context.role,
      requiredRoles,
    })

    await logAuditEvent({
      eventType: 'ACCESS_DENIED',
      eventCategory: 'authorization',
      action: 'role_check',
      userId,
      organizationId: context.organizationId,
      actionResult: 'denied',
      metadata: { userRole: context.role, requiredRoles },
    })

    throw new ApiException(
      `Forbidden: Requires one of these roles: ${requiredRoles.join(', ')}`,
      403,
      'INSUFFICIENT_ROLE'
    )
  }

  return context
}

// ============================================================================
// SECURE RPC WRAPPER FUNCTIONS
// ============================================================================

/**
 * Secure wrapper for RPC function calls with automatic validation
 *
 * @example
 * ```typescript
 * const supabase = await createClient();
 * const result = await callSecureRpc(supabase, 'get_organization_metrics_summary', {
 *   org_id: organizationId,
 *   days: 30
 * });
 *
 * if (result.error) {
 *   return Response.json({ error: result.error.message }, { status: 400 });
 * }
 *
 * return Response.json({ data: result.data });
 * ```
 */
export async function callSecureRpc<T = any>(
  supabase: ServerSupabaseClient,
  functionName: string,
  params: Record<string, any> = {},
  options?: SecureRpcOptions
): Promise<SecureRpcResult<T>> {
  return secureRpc<T>(supabase, functionName, params, options)
}

/**
 * Validates query filter parameters before executing a query
 * Prevents SQL injection through filter parameters
 *
 * @example
 * ```typescript
 * const filters = validateQueryFilters({
 *   organization_id: orgId,
 *   status: status,
 *   limit: limit
 * }, {
 *   organization_id: InputValidator.validateUUID,
 *   status: (v) => InputValidator.validateEnum(v, ['active', 'suspended']),
 *   limit: InputValidator.validateInteger
 * });
 *
 * if (!filters.isValid) {
 *   throw new Error('Invalid filter parameters');
 * }
 *
 * const { data } = await supabase
 *   .from('organizations')
 *   .select()
 *   .eq('id', filters.sanitizedParams.organization_id)
 *   .eq('status', filters.sanitizedParams.status)
 *   .limit(filters.sanitizedParams.limit);
 * ```
 */
export function validateQueryFilters(
  params: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): {
  isValid: boolean
  sanitizedParams: Record<string, any>
  errors: Record<string, string>
} {
  return InputValidator.validateParameters(params, validators)
}

/**
 * Validates and sanitizes search queries for full-text search
 *
 * @example
 * ```typescript
 * const query = validateSearchQuery(userInput);
 * const { data } = await supabase
 *   .from('contacts')
 *   .select()
 *   .textSearch('name', query);
 * ```
 */
export function validateSearchQuery(query: string, maxLength?: number): string {
  return InputValidator.sanitizeSearchQuery(query, maxLength)
}

/**
 * Detects known SQL injection patterns in user input
 * Use this as an additional safety check before database operations
 *
 * @example
 * ```typescript
 * if (detectSQLInjection(userInput)) {
 *   return Response.json({ error: 'Invalid input detected' }, { status: 400 });
 * }
 * ```
 */
export function detectSQLInjection(value: string): boolean {
  return InputValidator.containsSQLInjection(value)
}

/**
 * Detects XSS attack patterns in user input
 *
 * @example
 * ```typescript
 * if (detectXSS(userInput)) {
 *   return Response.json({ error: 'Invalid input detected' }, { status: 400 });
 * }
 * ```
 */
export function detectXSS(value: string): boolean {
  return InputValidator.containsXSS(value)
}

// ============================================================================
// QUERY PARAMETER VALIDATION HELPERS
// ============================================================================

/**
 * Common validators for query parameters
 * Use these when validating filter parameters for database queries
 */
export const QueryValidators = {
  /**
   * Validates UUID parameter (e.g., organization_id, user_id)
   */
  uuid: (value: any): ValidationResult => InputValidator.validateUUID(value),

  /**
   * Validates integer parameter with range (e.g., limit, offset, page)
   */
  integer: (value: any, min?: number, max?: number): ValidationResult =>
    InputValidator.validateInteger(value, { minLength: min, maxLength: max }),

  /**
   * Validates text parameter (e.g., name, description)
   */
  text: (value: any, maxLength: number = 255): ValidationResult =>
    InputValidator.validateText(value, { maxLength }),

  /**
   * Validates email parameter
   */
  email: (value: any): ValidationResult => InputValidator.validateEmail(value),

  /**
   * Validates date parameter (ISO 8601)
   */
  date: (value: any): ValidationResult => InputValidator.validateDate(value),

  /**
   * Validates enum parameter with allowed values
   */
  enum: <T extends string>(value: any, allowedValues: T[]): ValidationResult =>
    InputValidator.validateEnum(value, allowedValues),

  /**
   * Validates boolean parameter
   */
  boolean: (value: any): ValidationResult => {
    if (value === null || value === undefined) {
      return {
        isValid: false,
        error: 'Boolean value cannot be null',
        errorCode: 'NULL_NOT_ALLOWED',
      }
    }

    if (typeof value === 'boolean') {
      return { isValid: true, sanitizedValue: value }
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1') {
        return { isValid: true, sanitizedValue: true }
      }
      if (lower === 'false' || lower === '0') {
        return { isValid: true, sanitizedValue: false }
      }
    }

    return {
      isValid: false,
      error: 'Invalid boolean value',
      errorCode: 'INVALID_TYPE',
    }
  },
}
