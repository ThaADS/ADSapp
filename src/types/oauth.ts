/**
 * OAuth 2.0 Provider Type Definitions
 *
 * These types support ADSapp's role as an OAuth 2.0 Authorization Server
 * for Zapier and future integrations.
 */

// =====================================================
// OAuth Scopes
// =====================================================

/**
 * OAuth scopes supported by ADSapp
 */
export type OAuthScope =
  | 'messages:read'
  | 'messages:write'
  | 'contacts:read'
  | 'contacts:write'
  | 'webhooks:manage'

// =====================================================
// Database Entity Types
// =====================================================

/**
 * OAuth client application (e.g., Zapier)
 */
export interface OAuthClient {
  id: string
  name: string
  client_id: string
  // Note: client_secret_hash is never exposed in API responses
  redirect_uris: string[]
  scopes: OAuthScope[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Authorization code (short-lived, 10 minutes)
 * Used in Authorization Code Grant flow
 */
export interface OAuthAuthorizationCode {
  id: string
  code: string
  client_id: string
  user_id: string
  organization_id: string
  redirect_uri: string
  scopes: OAuthScope[]
  code_challenge?: string
  code_challenge_method?: 'S256' | 'plain'
  state: string
  expires_at: string
  used_at?: string
  created_at: string
}

/**
 * Access token (1 hour lifespan)
 * JWT-based token for API authentication
 */
export interface OAuthAccessToken {
  id: string
  token_hash: string
  client_id: string
  user_id: string
  organization_id: string
  scopes: OAuthScope[]
  expires_at: string
  revoked_at?: string
  created_at: string
}

/**
 * Refresh token (30 days lifespan)
 * Used to obtain new access tokens
 */
export interface OAuthRefreshToken {
  id: string
  token_hash: string
  access_token_id: string
  client_id: string
  user_id: string
  organization_id: string
  expires_at: string
  revoked_at?: string
  used_at?: string
  created_at: string
}

// =====================================================
// JWT Payload
// =====================================================

/**
 * JWT payload structure for access tokens
 */
export interface OAuthJWTPayload {
  sub: string  // user_id
  org: string  // organization_id
  scope: string  // space-separated scopes
  iat: number  // issued at (Unix timestamp)
  exp: number  // expires at (Unix timestamp)
  iss: 'adsapp'  // issuer
  aud: string  // audience (client name, e.g., 'zapier')
  jti: string  // JWT ID (token id)
}

// =====================================================
// Authorization Request
// =====================================================

/**
 * OAuth authorization request parameters
 * Used in GET /api/oauth/authorize
 */
export interface OAuthAuthorizeRequest {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  state: string
  scope?: string  // Optional, space-separated scopes
  code_challenge?: string  // PKCE code challenge
  code_challenge_method?: 'S256' | 'plain'  // PKCE method
}

// =====================================================
// Token Request
// =====================================================

/**
 * OAuth token request parameters
 * Used in POST /api/oauth/token
 */
export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string  // Required for authorization_code grant
  redirect_uri?: string  // Required for authorization_code grant
  client_id: string
  client_secret: string
  refresh_token?: string  // Required for refresh_token grant
  code_verifier?: string  // Required if PKCE was used
}

// =====================================================
// Token Response
// =====================================================

/**
 * Successful token response
 * Returned from POST /api/oauth/token
 */
export interface OAuthTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number  // Seconds until expiration
  refresh_token?: string  // Optional, for long-lived connections
  scope: string  // Space-separated scopes
}

// =====================================================
// Error Response
// =====================================================

/**
 * OAuth error response
 * Follows RFC 6749 error format
 */
export interface OAuthErrorResponse {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope'
  error_description?: string
  error_uri?: string
}

// =====================================================
// Revocation Request
// =====================================================

/**
 * Token revocation request
 * Used in POST /api/oauth/revoke
 */
export interface OAuthRevokeRequest {
  token: string
  token_type_hint?: 'access_token' | 'refresh_token'
  client_id: string
  client_secret: string
}

// =====================================================
// Consent Request
// =====================================================

/**
 * User consent information for authorization UI
 */
export interface OAuthConsentInfo {
  client: {
    name: string
    redirect_uri: string
  }
  user: {
    id: string
    email: string
    organization_id: string
  }
  scopes: OAuthScope[]
  state: string
}

// =====================================================
// Token Validation Result
// =====================================================

/**
 * Result of token validation
 * Used internally by middleware
 */
export interface TokenValidationResult {
  valid: boolean
  payload?: OAuthJWTPayload
  error?: string
}
