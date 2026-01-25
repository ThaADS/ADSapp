/**
 * OAuth 2.0 Token Manager
 *
 * Handles JWT generation/validation and token hashing for OAuth flows.
 * Uses jose for JWT operations and crypto for secure hashing.
 */

import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import type { OAuthJWTPayload, OAuthScope } from '@/types/oauth'
import { requireEnvVar } from '@/lib/build-safe-init'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// Token Generation Utilities
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}

/**
 * Hash a token using SHA256 for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ============================================================================
// JWT Access Tokens (1 hour lifespan)
// ============================================================================

/**
 * Generate a JWT access token with 1-hour expiration
 */
export async function generateAccessToken(
  userId: string,
  organizationId: string,
  scopes: OAuthScope[],
  clientName: string,
  tokenId: string
): Promise<string> {
  const secret = new TextEncoder().encode(requireEnvVar('OAUTH_JWT_SECRET'))
  const issuer = requireEnvVar('OAUTH_TOKEN_ISSUER', 'adsapp')

  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 3600 // 1 hour in seconds

  const jwt = await new SignJWT({
    sub: userId,
    org: organizationId,
    scope: scopes.join(' '),
    jti: tokenId,
  } as Omit<OAuthJWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(issuer)
    .setAudience(clientName)
    .sign(secret)

  return jwt
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(token: string): Promise<OAuthJWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(requireEnvVar('OAUTH_JWT_SECRET'))
    const issuer = requireEnvVar('OAUTH_TOKEN_ISSUER', 'adsapp')

    const { payload } = await jwtVerify(token, secret, {
      issuer,
    })

    return payload as unknown as OAuthJWTPayload
  } catch (error) {
    // JWT verification failed (expired, invalid signature, etc.)
    return null
  }
}

/**
 * Check if a token has been revoked in the database
 */
export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('oauth_access_tokens')
      .select('revoked_at')
      .eq('token_hash', tokenHash)
      .single()

    if (error) {
      console.error('Token revocation check error:', error)
      return true // Fail secure
    }

    return !!data?.revoked_at
  } catch (error) {
    console.error('Token revocation check error:', error)
    return true // Fail secure
  }
}

// ============================================================================
// Refresh Tokens (30 days lifespan)
// ============================================================================

/**
 * Generate a refresh token with 30-day expiration
 * Returns both the token and its expiration date
 */
export function generateRefreshToken(): {
  token: string
  expiresAt: Date
} {
  const token = generateSecureToken(48)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  return { token, expiresAt }
}

// ============================================================================
// Authorization Codes (10 minutes lifespan)
// ============================================================================

/**
 * Generate an authorization code with 10-minute expiration
 * Returns both the code and its expiration date
 */
export function generateAuthorizationCode(): {
  code: string
  expiresAt: Date
} {
  const code = generateSecureToken(32)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes

  return { code, expiresAt }
}

// ============================================================================
// PKCE (Proof Key for Code Exchange)
// ============================================================================

/**
 * Verify PKCE code challenge
 * Supports S256 (SHA256) method
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain'
): boolean {
  if (method === 'plain') {
    return verifier === challenge
  }

  if (method === 'S256') {
    const computed = createHash('sha256')
      .update(verifier)
      .digest('base64url')

    return computed === challenge
  }

  return false
}

// ============================================================================
// Client Secret Management
// ============================================================================

/**
 * Verify a client secret against its bcrypt hash
 */
export async function verifyClientSecret(
  secret: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(secret, hash)
  } catch {
    return false
  }
}

/**
 * Hash a client secret using bcrypt for secure storage
 */
export async function hashClientSecret(secret: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(secret, saltRounds)
}
