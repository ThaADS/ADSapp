/**
 * Standardized API Error Handler
 * Phase 31: Code Quality & Documentation
 *
 * Provides consistent error handling and response formatting
 * for all API routes. Replaces inconsistent error patterns
 * across the codebase.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '@/lib/security/logger'

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Standard API error codes
 */
export const ErrorCode = {
  // Authentication & Authorization (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NO_ORGANIZATION: 'NO_ORGANIZATION',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Business Logic
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_FAILED: 'OPERATION_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Base API Exception class
 */
export class ApiError extends Error {
  public readonly code: ErrorCodeType
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(
    message: string,
    code: ErrorCodeType = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Preserve stack trace
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * Convert to response JSON
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends ApiError {
  constructor(resource?: string) {
    super(resource ? `${resource} not found` : 'Resource not found', 'NOT_FOUND', 404)
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(message, 'CONFLICT', 409)
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter })
  }
}

export class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed') {
    super(message, 'DATABASE_ERROR', 500)
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export const Errors = {
  // Auth errors
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  noOrganization: () => new ApiError(
    'No organization context. Please complete onboarding.',
    'NO_ORGANIZATION',
    403
  ),
  insufficientRole: (required: string[]) => new ApiError(
    `Requires one of these roles: ${required.join(', ')}`,
    'INSUFFICIENT_ROLE',
    403
  ),
  sessionExpired: () => new ApiError('Session expired', 'SESSION_EXPIRED', 401),

  // Validation errors
  validation: (message: string, details?: unknown) => new ValidationError(message, details),
  invalidJson: () => new ValidationError('Invalid JSON in request body'),
  invalidUuid: (param = 'id') => new ValidationError(
    `Invalid ${param} format`,
    { field: param }
  ),
  missingParam: (param: string) => new ValidationError(
    `Missing required parameter: ${param}`,
    { field: param }
  ),

  // Not found errors
  notFound: (resource?: string) => new NotFoundError(resource),
  profileNotFound: () => new ApiError('User profile not found', 'PROFILE_NOT_FOUND', 404),
  organizationNotFound: () => new ApiError('Organization not found', 'ORGANIZATION_NOT_FOUND', 404),

  // Conflict errors
  conflict: (message?: string) => new ConflictError(message),
  duplicate: (field: string) => new ApiError(
    `${field} already exists`,
    'DUPLICATE_ENTRY',
    409,
    { field }
  ),

  // Rate limiting
  rateLimit: (retryAfter?: number) => new RateLimitError(retryAfter),

  // Server errors
  internal: (message?: string) => new ApiError(
    message || 'An unexpected error occurred',
    'INTERNAL_ERROR',
    500
  ),
  database: (message?: string) => new DatabaseError(message),
  externalService: (service: string) => new ApiError(
    `External service error: ${service}`,
    'EXTERNAL_SERVICE_ERROR',
    502
  ),
  configuration: (message: string) => new ApiError(
    message,
    'CONFIGURATION_ERROR',
    500
  ),

  // Business logic
  invalidState: (message: string) => new ApiError(message, 'INVALID_STATE', 400),
  operationFailed: (message: string) => new ApiError(message, 'OPERATION_FAILED', 400),
  quotaExceeded: (resource: string) => new ApiError(
    `${resource} quota exceeded`,
    'QUOTA_EXCEEDED',
    402
  ),
  featureDisabled: (feature: string) => new ApiError(
    `Feature not available: ${feature}`,
    'FEATURE_DISABLED',
    403
  ),
}

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string
  code: string
  details?: unknown
  requestId?: string
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): NextResponse<ErrorResponse> {
  // Handle known API errors
  if (error instanceof ApiError) {
    logger.error(`API Error: ${error.message}`, error, { requestId })

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const issues = error.issues.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    }))

    logger.warn('Validation error', { issues }, { requestId })

    return NextResponse.json(
      {
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: { issues },
        ...(requestId ? { requestId } : {}),
      },
      { status: 400 }
    )
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    logger.error('Database error', error, { requestId })

    // Don't expose internal database errors
    return NextResponse.json(
      {
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
        ...(requestId ? { requestId } : {}),
      },
      { status: 500 }
    )
  }

  // Handle standard errors
  if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`, error, { requestId })

    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
        ...(requestId ? { requestId } : {}),
      },
      { status: 500 }
    )
  }

  // Handle unknown errors
  logger.error('Unknown error type', { error }, { requestId })

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      ...(requestId ? { requestId } : {}),
    },
    { status: 500 }
  )
}

/**
 * Type guard for Supabase errors
 */
function isSupabaseError(error: unknown): error is { code: string; message: string; details?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

// ============================================================================
// TRY-CATCH WRAPPER
// ============================================================================

/**
 * Options for the route handler wrapper
 */
export interface HandlerOptions {
  /** Enable request ID tracking */
  trackRequests?: boolean
  /** Log all requests (not just errors) */
  logRequests?: boolean
}

/**
 * Wraps an API route handler with standardized error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   const user = await getUser()
 *   if (!user) throw Errors.unauthorized()
 *   return NextResponse.json({ user })
 * })
 * ```
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<NextResponse>,
  options: HandlerOptions = {}
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = options.trackRequests
      ? `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      : undefined

    try {
      const response = await handler(request, ...args)

      if (options.logRequests) {
        const duration = Date.now() - startTime
        logger.apiRequest(
          request.method,
          new URL(request.url).pathname,
          response.status,
          duration,
          { requestId }
        )
      }

      // Add request ID header if tracking
      if (requestId) {
        response.headers.set('X-Request-ID', requestId)
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      if (options.logRequests) {
        const statusCode = error instanceof ApiError ? error.statusCode : 500
        logger.apiRequest(
          request.method,
          new URL(request.url).pathname,
          statusCode,
          duration,
          { requestId }
        )
      }

      const response = createErrorResponse(error, requestId)

      if (requestId) {
        response.headers.set('X-Request-ID', requestId)
      }

      return response
    }
  }
}

// ============================================================================
// SUCCESS RESPONSE HELPERS
// ============================================================================

/**
 * Creates a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status })
}

/**
 * Creates a standardized paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  }
): NextResponse<{
  data: T[]
  pagination: { page: number; limit: number; total: number; pages: number }
}> {
  return NextResponse.json({
    data,
    pagination: {
      ...pagination,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
  })
}

/**
 * Creates a standardized empty/no-content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Creates a standardized created response
 */
export function createdResponse<T>(data: T): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status: 201 })
}
