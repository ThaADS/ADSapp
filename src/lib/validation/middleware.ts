/**
 * Validation Middleware for API Routes
 * Phase 30: Input Validation & Security
 *
 * Provides middleware functions for validating:
 * - UUID parameters in dynamic routes
 * - Request bodies with Zod schemas
 * - Query parameters
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError, ZodSchema } from 'zod'

// ============================================================================
// UUID VALIDATION
// ============================================================================

/**
 * UUID v4 regex pattern (strict validation)
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * General UUID regex pattern (accepts any version)
 */
const UUID_ANY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates a string is a valid UUID format
 */
export function isValidUUID(id: string, strict: boolean = false): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }
  return strict ? UUID_V4_REGEX.test(id) : UUID_ANY_REGEX.test(id)
}

/**
 * Validates UUID parameter and returns error response if invalid
 * @param id - The ID to validate
 * @param paramName - Name of the parameter (for error message)
 * @returns null if valid, NextResponse with error if invalid
 */
export function validateUUIDParam(
  id: string | undefined,
  paramName: string = 'id'
): NextResponse | null {
  if (!id) {
    return NextResponse.json(
      {
        error: `Missing ${paramName} parameter`,
        code: 'MISSING_PARAMETER',
      },
      { status: 400 }
    )
  }

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: `Invalid ${paramName} format`,
        code: 'INVALID_UUID',
        details: `${paramName} must be a valid UUID`,
      },
      { status: 400 }
    )
  }

  return null
}

/**
 * Validates multiple UUID parameters
 * @param params - Object with parameter names as keys and values to validate
 * @returns null if all valid, NextResponse with error if any invalid
 */
export function validateUUIDParams(
  params: Record<string, string | undefined>
): NextResponse | null {
  for (const [name, value] of Object.entries(params)) {
    const error = validateUUIDParam(value, name)
    if (error) {
      return error
    }
  }
  return null
}

// ============================================================================
// ZOD SCHEMA VALIDATION
// ============================================================================

/**
 * Result type for schema validation
 */
export type ValidationResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: NextResponse
    }

/**
 * Validates request body against a Zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or error response
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    // Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Invalid JSON in request body',
            code: 'INVALID_JSON',
          },
          { status: 400 }
        ),
      }
    }

    // Validate against schema
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error('Body validation error:', error)
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Failed to validate request body',
          code: 'VALIDATION_ERROR',
        },
        { status: 500 }
      ),
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or error response
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url)
    const queryObject: Record<string, string | string[]> = {}

    // Convert search params to object, handling arrays
    searchParams.forEach((value, key) => {
      const existing = queryObject[key]
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value)
        } else {
          queryObject[key] = [existing, value]
        }
      } else {
        queryObject[key] = value
      }
    })

    const result = schema.safeParse(queryObject)

    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error, 'query'),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error('Query validation error:', error)
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Failed to validate query parameters',
          code: 'VALIDATION_ERROR',
        },
        { status: 500 }
      ),
    }
  }
}

/**
 * Formats Zod validation errors into a user-friendly response
 */
export function formatZodError(
  error: ZodError,
  context: 'body' | 'query' | 'params' = 'body'
): NextResponse {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }))

  return NextResponse.json(
    {
      error: `Invalid ${context}`,
      code: 'VALIDATION_ERROR',
      details: {
        issues,
        message: issues.length === 1
          ? issues[0].message
          : `${issues.length} validation errors`,
      },
    },
    { status: 400 }
  )
}

// ============================================================================
// COMBINED VALIDATION HELPER
// ============================================================================

/**
 * Options for route validation
 */
export interface RouteValidationOptions<TBody = unknown, TQuery = unknown> {
  /** UUID parameters from the route (e.g., { id: params.id }) */
  params?: Record<string, string | undefined>
  /** Zod schema for request body validation */
  bodySchema?: ZodSchema<TBody>
  /** Zod schema for query parameter validation */
  querySchema?: ZodSchema<TQuery>
}

/**
 * Result type for route validation
 */
export type RouteValidationResult<TBody, TQuery> =
  | {
      success: true
      body: TBody
      query: TQuery
    }
  | {
      success: false
      error: NextResponse
    }

/**
 * Validates an entire API route request
 * @param request - Next.js request object
 * @param options - Validation options
 * @returns Combined validation result
 */
export async function validateRoute<TBody = unknown, TQuery = unknown>(
  request: NextRequest,
  options: RouteValidationOptions<TBody, TQuery>
): Promise<RouteValidationResult<TBody, TQuery>> {
  // Validate UUID parameters
  if (options.params) {
    const paramsError = validateUUIDParams(options.params)
    if (paramsError) {
      return { success: false, error: paramsError }
    }
  }

  // Validate query parameters
  let query: TQuery = {} as TQuery
  if (options.querySchema) {
    const queryResult = validateQuery(request, options.querySchema)
    if (!queryResult.success) {
      return { success: false, error: queryResult.error }
    }
    query = queryResult.data
  }

  // Validate request body (only for POST, PUT, PATCH)
  let body: TBody = {} as TBody
  if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodyResult = await validateBody(request, options.bodySchema)
    if (!bodyResult.success) {
      return { success: false, error: bodyResult.error }
    }
    body = bodyResult.data
  }

  return {
    success: true,
    body,
    query,
  }
}

// ============================================================================
// VALIDATION WRAPPER FOR ROUTES
// ============================================================================

/**
 * Handler type for validated routes
 */
type ValidatedHandler<TBody, TQuery> = (
  request: NextRequest,
  context: { body: TBody; query: TQuery; params?: Record<string, string> }
) => Promise<NextResponse>

/**
 * Creates a validated route handler
 * Automatically validates UUID params, body, and query before calling handler
 *
 * @example
 * ```typescript
 * export const POST = withValidation(
 *   {
 *     bodySchema: createContactSchema,
 *     querySchema: paginationSchema,
 *   },
 *   async (request, { body, query }) => {
 *     // body and query are typed and validated
 *     const contact = await createContact(body)
 *     return NextResponse.json({ data: contact })
 *   }
 * )
 * ```
 */
export function withValidation<TBody = unknown, TQuery = unknown>(
  options: Omit<RouteValidationOptions<TBody, TQuery>, 'params'>,
  handler: ValidatedHandler<TBody, TQuery>
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    // Build params object from route context
    const params: Record<string, string | undefined> = {}
    if (routeContext?.params) {
      for (const [key, value] of Object.entries(routeContext.params)) {
        // Auto-detect and validate UUID-like params
        if (key === 'id' || key.endsWith('Id') || key.endsWith('_id')) {
          params[key] = value
        }
      }
    }

    // Validate route
    const validation = await validateRoute(request, {
      ...options,
      params: Object.keys(params).length > 0 ? params : undefined,
    })

    if (!validation.success) {
      return validation.error
    }

    // Call handler with validated data
    return handler(request, {
      body: validation.body,
      query: validation.query,
      params: routeContext?.params,
    })
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { z, ZodError, type ZodSchema }
