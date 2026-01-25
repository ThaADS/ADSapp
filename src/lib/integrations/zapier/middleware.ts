/**
 * Zapier API Middleware
 *
 * Combined middleware wrapper that applies rate limiting, authentication,
 * and scope validation to Zapier API endpoints.
 */

import type { OAuthScope } from '@/types/oauth'
import {
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitType,
} from './rate-limiter'
import {
  validateBearerToken,
  requireScopes,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from './auth-middleware'
import { hashToken } from './token-manager'

// =====================================================
// Types
// =====================================================

/**
 * Context passed to handler after successful middleware checks
 */
export interface ZapierContext {
  userId: string
  organizationId: string
  scopes: OAuthScope[]
}

/**
 * Options for middleware configuration
 */
export interface ZapierMiddlewareOptions {
  /**
   * Rate limit type to apply
   * - oauth: 20 req/min per IP
   * - actions: 100 req/min per token
   * - subscribe: 10 req/min per token
   * - webhooks: 20,000 req/5min per user
   */
  rateLimitType: RateLimitType

  /**
   * Required OAuth scopes for this endpoint
   */
  requiredScopes?: OAuthScope[]

  /**
   * Skip authentication (for public endpoints like OAuth)
   * @default false
   */
  skipAuth?: boolean
}

/**
 * Handler function type that receives validated context
 */
export type ZapierHandler = (
  request: Request,
  context: ZapierContext
) => Promise<Response>

// =====================================================
// Middleware Wrapper
// =====================================================

/**
 * Wrap a Zapier API endpoint with authentication and rate limiting
 *
 * Flow:
 * 1. Apply rate limiting (by token hash or IP)
 * 2. Validate Bearer token (unless skipAuth)
 * 3. Check required scopes
 * 4. Call handler with context
 * 5. Add rate limit headers to response
 *
 * @param handler - Handler function to wrap
 * @param options - Middleware configuration
 * @returns Wrapped handler with middleware applied
 */
export function withZapierMiddleware(
  handler: ZapierHandler,
  options: ZapierMiddlewareOptions
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      // Step 1: Determine rate limit identifier
      let rateLimitIdentifier: string

      if (options.skipAuth) {
        // For OAuth endpoints, rate limit by IP
        rateLimitIdentifier = getClientIP(request)
      } else {
        // For authenticated endpoints, extract token for rate limiting
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return createUnauthorizedResponse('missing_authorization_header')
        }
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        rateLimitIdentifier = hashToken(token)
      }

      // Step 2: Apply rate limiting
      const rateLimitResult = checkRateLimit(
        rateLimitIdentifier,
        options.rateLimitType
      )

      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult)
      }

      // Step 3: Validate authentication (unless skipped)
      let context: ZapierContext | null = null

      if (!options.skipAuth) {
        const authResult = await validateBearerToken(request)

        if (!authResult.valid) {
          const response = createUnauthorizedResponse(authResult.error || 'unknown_error')
          // Add rate limit headers even to error responses
          Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
            ([key, value]) => {
              response.headers.set(key, value)
            }
          )
          return response
        }

        // Step 4: Check required scopes
        if (options.requiredScopes && options.requiredScopes.length > 0) {
          const hasScopes = requireScopes(
            options.requiredScopes,
            authResult.scopes!
          )

          if (!hasScopes) {
            const response = createForbiddenResponse(
              options.requiredScopes,
              authResult.scopes!
            )
            // Add rate limit headers even to error responses
            Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
              ([key, value]) => {
                response.headers.set(key, value)
              }
            )
            return response
          }
        }

        // Build context
        context = {
          userId: authResult.userId!,
          organizationId: authResult.organizationId!,
          scopes: authResult.scopes!,
        }
      } else {
        // For skipAuth endpoints, create minimal context
        // Handler must not rely on these values
        context = {
          userId: '',
          organizationId: '',
          scopes: [],
        }
      }

      // Step 5: Call handler
      const response = await handler(request, context)

      // Step 6: Add rate limit headers to successful response
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
        ([key, value]) => {
          response.headers.set(key, value)
        }
      )

      return response
    } catch (error) {
      console.error('Middleware error:', error)
      return createErrorResponse(
        'internal_error',
        'An internal error occurred',
        500
      )
    }
  }
}

// =====================================================
// Response Helpers
// =====================================================

/**
 * Create a successful JSON response
 */
export function createSuccessResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

/**
 * Create an error JSON response
 */
export function createErrorResponse(
  error: string,
  message: string,
  status = 400
): Response {
  return Response.json(
    {
      error,
      message,
    },
    { status }
  )
}

// =====================================================
// Utilities
// =====================================================

/**
 * Extract client IP address from request
 * Checks X-Forwarded-For, X-Real-IP, and connection
 */
export function getClientIP(request: Request): string {
  // Check X-Forwarded-For header (most proxies)
  const forwardedFor = request.headers.get('X-Forwarded-For')
  if (forwardedFor) {
    // Take the first IP if multiple are present
    return forwardedFor.split(',')[0].trim()
  }

  // Check X-Real-IP header (nginx)
  const realIP = request.headers.get('X-Real-IP')
  if (realIP) {
    return realIP
  }

  // Fallback to 'unknown' if no IP can be determined
  // In production, this should be properly configured with reverse proxy
  return 'unknown'
}
