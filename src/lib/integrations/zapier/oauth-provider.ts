/**
 * OAuth 2.0 Provider Service
 *
 * Core OAuth 2.0 Authorization Server logic for Zapier integration.
 * Implements Authorization Code Grant flow with PKCE support.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  OAuthScope,
  OAuthClient,
  OAuthErrorResponse,
  OAuthTokenResponse,
} from '@/types/oauth'
import {
  generateAccessToken,
  generateRefreshToken,
  generateAuthorizationCode,
  verifyCodeChallenge,
  verifyClientSecret,
  hashToken,
} from './token-manager'

// ============================================================================
// Client Validation
// ============================================================================

/**
 * Validate OAuth client and redirect URI
 */
export async function validateClient(
  clientId: string,
  redirectUri: string
): Promise<{
  valid: boolean
  client?: OAuthClient
  error?: OAuthErrorResponse
}> {
  const supabase = createServiceRoleClient()

  const { data: client, error } = await supabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  if (error || !client) {
    return {
      valid: false,
      error: {
        error: 'invalid_client',
        error_description: 'Client not found or inactive',
      },
    }
  }

  // Verify redirect URI is allowed
  if (!client.redirect_uris.includes(redirectUri)) {
    return {
      valid: false,
      error: {
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri',
      },
    }
  }

  return { valid: true, client }
}

// ============================================================================
// Authorization Code Grant
// ============================================================================

/**
 * Create authorization code after user consent
 */
export async function createAuthorizationCode(params: {
  clientId: string
  userId: string
  organizationId: string
  redirectUri: string
  scopes: OAuthScope[]
  state: string
  codeChallenge?: string
  codeChallengeMethod?: 'S256' | 'plain'
}): Promise<{
  code: string
  expiresAt: Date
}> {
  const supabase = createServiceRoleClient()
  const { code, expiresAt } = generateAuthorizationCode()

  const { error } = await supabase.from('oauth_authorization_codes').insert({
    code,
    client_id: params.clientId,
    user_id: params.userId,
    organization_id: params.organizationId,
    redirect_uri: params.redirectUri,
    scopes: params.scopes,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create authorization code: ${error.message}`)
  }

  return { code, expiresAt }
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  codeVerifier?: string
}): Promise<{
  success: boolean
  tokens?: OAuthTokenResponse
  error?: OAuthErrorResponse
}> {
  const supabase = createServiceRoleClient()

  // 1. Fetch authorization code
  const { data: authCode, error: fetchError } = await supabase
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code', params.code)
    .is('used_at', null)
    .single()

  if (fetchError || !authCode) {
    return {
      success: false,
      error: {
        error: 'invalid_grant',
        error_description: 'Authorization code not found or already used',
      },
    }
  }

  // 2. Check expiration
  if (new Date(authCode.expires_at) < new Date()) {
    return {
      success: false,
      error: {
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      },
    }
  }

  // 3. Verify client
  if (authCode.client_id !== params.clientId) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Client mismatch',
      },
    }
  }

  // 4. Verify redirect URI
  if (authCode.redirect_uri !== params.redirectUri) {
    return {
      success: false,
      error: {
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch',
      },
    }
  }

  // 5. Verify client secret
  const { data: client, error: clientError } = await supabase
    .from('oauth_clients')
    .select('client_secret_hash, name')
    .eq('client_id', params.clientId)
    .single()

  if (clientError || !client) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Client not found',
      },
    }
  }

  const secretValid = await verifyClientSecret(
    params.clientSecret,
    client.client_secret_hash
  )

  if (!secretValid) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      },
    }
  }

  // 6. Verify PKCE if present
  if (authCode.code_challenge) {
    if (!params.codeVerifier) {
      return {
        success: false,
        error: {
          error: 'invalid_request',
          error_description: 'code_verifier required',
        },
      }
    }

    const pkceValid = verifyCodeChallenge(
      params.codeVerifier,
      authCode.code_challenge,
      authCode.code_challenge_method || 'S256'
    )

    if (!pkceValid) {
      return {
        success: false,
        error: {
          error: 'invalid_grant',
          error_description: 'Invalid code_verifier',
        },
      }
    }
  }

  // 7. Mark code as used
  await supabase
    .from('oauth_authorization_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', authCode.id)

  // 8. Generate tokens
  const accessTokenId = crypto.randomUUID()
  const accessToken = await generateAccessToken(
    authCode.user_id,
    authCode.organization_id,
    authCode.scopes,
    client.name,
    accessTokenId
  )

  const { token: refreshToken, expiresAt: refreshExpiresAt } = generateRefreshToken()

  // 9. Store tokens in database
  const accessTokenHash = hashToken(accessToken)
  const refreshTokenHash = hashToken(refreshToken)

  const accessExpiresAt = new Date()
  accessExpiresAt.setHours(accessExpiresAt.getHours() + 1) // 1 hour

  const { error: tokenError } = await supabase.from('oauth_access_tokens').insert({
    id: accessTokenId,
    token_hash: accessTokenHash,
    client_id: params.clientId,
    user_id: authCode.user_id,
    organization_id: authCode.organization_id,
    scopes: authCode.scopes,
    expires_at: accessExpiresAt.toISOString(),
  })

  if (tokenError) {
    return {
      success: false,
      error: {
        error: 'server_error',
        error_description: 'Failed to store access token',
      },
    }
  }

  const { error: refreshError } = await supabase.from('oauth_refresh_tokens').insert({
    token_hash: refreshTokenHash,
    access_token_id: accessTokenId,
    client_id: params.clientId,
    user_id: authCode.user_id,
    organization_id: authCode.organization_id,
    expires_at: refreshExpiresAt.toISOString(),
  })

  if (refreshError) {
    return {
      success: false,
      error: {
        error: 'server_error',
        error_description: 'Failed to store refresh token',
      },
    }
  }

  // 10. Return token response
  return {
    success: true,
    tokens: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour in seconds
      refresh_token: refreshToken,
      scope: authCode.scopes.join(' '),
    },
  }
}

// ============================================================================
// Refresh Token Grant
// ============================================================================

/**
 * Exchange refresh token for new access token
 */
export async function refreshAccessToken(params: {
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<{
  success: boolean
  tokens?: OAuthTokenResponse
  error?: OAuthErrorResponse
}> {
  const supabase = createServiceRoleClient()
  const refreshTokenHash = hashToken(params.refreshToken)

  // 1. Fetch refresh token
  const { data: storedToken, error: fetchError } = await supabase
    .from('oauth_refresh_tokens')
    .select('*, oauth_access_tokens!inner(scopes)')
    .eq('token_hash', refreshTokenHash)
    .is('revoked_at', null)
    .is('used_at', null)
    .single()

  if (fetchError || !storedToken) {
    return {
      success: false,
      error: {
        error: 'invalid_grant',
        error_description: 'Refresh token not found or revoked',
      },
    }
  }

  // 2. Check expiration
  if (new Date(storedToken.expires_at) < new Date()) {
    return {
      success: false,
      error: {
        error: 'invalid_grant',
        error_description: 'Refresh token expired',
      },
    }
  }

  // 3. Verify client
  if (storedToken.client_id !== params.clientId) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Client mismatch',
      },
    }
  }

  // 4. Verify client secret
  const { data: client, error: clientError } = await supabase
    .from('oauth_clients')
    .select('client_secret_hash, name')
    .eq('client_id', params.clientId)
    .single()

  if (clientError || !client) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Client not found',
      },
    }
  }

  const secretValid = await verifyClientSecret(
    params.clientSecret,
    client.client_secret_hash
  )

  if (!secretValid) {
    return {
      success: false,
      error: {
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      },
    }
  }

  // 5. Mark refresh token as used (single-use)
  await supabase
    .from('oauth_refresh_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', storedToken.id)

  // 6. Revoke old access token
  await supabase
    .from('oauth_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', storedToken.access_token_id)

  // 7. Generate new tokens
  const newAccessTokenId = crypto.randomUUID()
  const newAccessToken = await generateAccessToken(
    storedToken.user_id,
    storedToken.organization_id,
    (storedToken as any).oauth_access_tokens.scopes,
    client.name,
    newAccessTokenId
  )

  const { token: newRefreshToken, expiresAt: newRefreshExpiresAt } = generateRefreshToken()

  // 8. Store new tokens
  const newAccessTokenHash = hashToken(newAccessToken)
  const newRefreshTokenHash = hashToken(newRefreshToken)

  const accessExpiresAt = new Date()
  accessExpiresAt.setHours(accessExpiresAt.getHours() + 1) // 1 hour

  await supabase.from('oauth_access_tokens').insert({
    id: newAccessTokenId,
    token_hash: newAccessTokenHash,
    client_id: params.clientId,
    user_id: storedToken.user_id,
    organization_id: storedToken.organization_id,
    scopes: (storedToken as any).oauth_access_tokens.scopes,
    expires_at: accessExpiresAt.toISOString(),
  })

  await supabase.from('oauth_refresh_tokens').insert({
    token_hash: newRefreshTokenHash,
    access_token_id: newAccessTokenId,
    client_id: params.clientId,
    user_id: storedToken.user_id,
    organization_id: storedToken.organization_id,
    expires_at: newRefreshExpiresAt.toISOString(),
  })

  // 9. Return token response
  return {
    success: true,
    tokens: {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: (storedToken as any).oauth_access_tokens.scopes.join(' '),
    },
  }
}

// ============================================================================
// Token Revocation
// ============================================================================

/**
 * Revoke access or refresh token
 */
export async function revokeToken(params: {
  token: string
  tokenTypeHint?: 'access_token' | 'refresh_token'
}): Promise<{ success: boolean }> {
  const supabase = createServiceRoleClient()
  const tokenHash = hashToken(params.token)

  // Try as access token first (or if hint says so)
  if (!params.tokenTypeHint || params.tokenTypeHint === 'access_token') {
    const { data: accessToken } = await supabase
      .from('oauth_access_tokens')
      .select('id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single()

    if (accessToken) {
      await supabase
        .from('oauth_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessToken.id)

      // Also revoke associated refresh tokens
      await supabase
        .from('oauth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('access_token_id', accessToken.id)

      return { success: true }
    }
  }

  // Try as refresh token
  if (!params.tokenTypeHint || params.tokenTypeHint === 'refresh_token') {
    const { data: refreshToken } = await supabase
      .from('oauth_refresh_tokens')
      .select('id, access_token_id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single()

    if (refreshToken) {
      await supabase
        .from('oauth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', refreshToken.id)

      // Also revoke associated access token
      await supabase
        .from('oauth_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', refreshToken.access_token_id)

      return { success: true }
    }
  }

  // Per RFC 7009, return success even if token not found
  return { success: true }
}
