/**
 * OAuth Authentication Middleware
 *
 * Validates Bearer tokens and enforces scope requirements for Zapier API endpoints.
 */

import type { OAuthJWTPayload, OAuthScope } from '@/types/oauth'
import { verifyAccessToken, hashToken, isTokenRevoked } from './token-manager'

// =====================================================
// Types
// =====================================================

export interface AuthResult {
  valid: boolean
  payload?: OAuthJWTPayload
  userId?: string
  organizationId?: string
  scopes?: OAuthScope[]
  error?: string
}

// =====================================================
// Token Validation
// =====================================================

/**
 * Validate Bearer token from Authorization header
 *
 * Checks:
 * 1. Authorization header is present and well-formed
 * 2. Token is a valid JWT with correct signature
 * 3. Token is not expired
 * 4. Token has not been revoked
 *
 * @param request - Incoming request
 * @returns Auth result with user context or error
 */
export async function validateBearerToken(
  request: Request
): Promise<AuthResult> {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return {
      valid: false,
      error: 'missing_authorization_header',
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      valid: false,
      error: 'invalid_authorization_header',
    }
  }

  const token = parts[1]
  if (!token) {
    return {
      valid: false,
      error: 'missing_token',
    }
  }

  // Verify JWT signature and decode payload
  const payload = await verifyAccessToken(token)
  if (!payload) {
    return {
      valid: false,
      error: 'invalid_token',
    }
  }

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    return {
      valid: false,
      error: 'token_expired',
    }
  }

  // Check if token has been revoked
  const tokenHash = hashToken(token)
  const revoked = await isTokenRevoked(tokenHash)
  if (revoked) {
    return {
      valid: false,
      error: 'token_revoked',
    }
  }

  // Parse scopes from space-separated string
  const scopes = payload.scope.split(' ') as OAuthScope[]

  return {
    valid: true,
    payload,
    userId: payload.sub,
    organizationId: payload.org,
    scopes,
  }
}

// =====================================================
// Scope Validation
// =====================================================

/**
 * Check if granted scopes include all required scopes
 *
 * @param requiredScopes - Scopes required for the operation
 * @param grantedScopes - Scopes granted in the token
 * @returns True if all required scopes are granted
 */
export function requireScopes(
  requiredScopes: OAuthScope[],
  grantedScopes: OAuthScope[]
): boolean {
  return requiredScopes.every((scope) => grantedScopes.includes(scope))
}

// =====================================================
// Response Helpers
// =====================================================

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthorizedResponse(error: string): Response {
  const errorMessages: Record<string, string> = {
    missing_authorization_header: 'Authorization header is required',
    invalid_authorization_header: 'Authorization header must be in format: Bearer <token>',
    missing_token: 'Bearer token is required',
    invalid_token: 'Invalid or malformed token',
    token_expired: 'Token has expired',
    token_revoked: 'Token has been revoked',
  }

  return Response.json(
    {
      error: 'unauthorized',
      message: errorMessages[error] || 'Authentication failed',
      error_code: error,
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="ADSapp API", error="' + error + '"',
      },
    }
  )
}

/**
 * Create a 403 Forbidden response for insufficient scopes
 */
export function createForbiddenResponse(
  requiredScopes: OAuthScope[],
  grantedScopes: OAuthScope[]
): Response {
  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopes.includes(scope)
  )

  return Response.json(
    {
      error: 'insufficient_scope',
      message: 'Token does not have required scopes',
      required_scopes: requiredScopes,
      granted_scopes: grantedScopes,
      missing_scopes: missingScopes,
    },
    {
      status: 403,
      headers: {
        'WWW-Authenticate': `Bearer realm="ADSapp API", error="insufficient_scope", scope="${requiredScopes.join(' ')}"`,
      },
    }
  )
}
