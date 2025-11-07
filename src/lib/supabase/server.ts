import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireEnvVar } from '@/lib/build-safe-init'
import type { Database } from '@/types/database'
import { secureRpc, type SecureRpcOptions, type SecureRpcResult } from '@/lib/security/secure-rpc'
import { InputValidator, type ValidationResult } from '@/lib/security/input-validation'

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
