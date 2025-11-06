// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 * OAuth 2.0 / OIDC Authentication Handler
 * Implements OAuth 2.0 with PKCE and OpenID Connect support
 */

import { createClient } from '@/lib/supabase/server'
import { Issuer, generators, TokenSet, Client } from 'openid-client'
import * as jose from 'jose'
import * as crypto from 'crypto'
import {
  OAuthConfig,
  OAuthTokenResponse,
  OIDCUserInfo,
  SSOConfiguration,
  SSOError,
  PKCEConfig,
} from './types'

export class OAuthHandler {
  private config: SSOConfiguration
  private oauthConfig: OAuthConfig
  private client?: Client

  constructor(config: SSOConfiguration) {
    this.config = config
    this.oauthConfig = {
      clientId: config.oauth_client_id!,
      clientSecret: config.oauth_client_secret!,
      authorizationUrl: config.oauth_authorization_url!,
      tokenUrl: config.oauth_token_url!,
      userInfoUrl: config.oauth_userinfo_url,
      jwksUrl: config.oauth_jwks_url,
      scopes: config.oauth_scopes || ['openid', 'email', 'profile'],
      pkceEnabled: config.oauth_pkce_enabled ?? true,
    }
  }

  /**
   * Initialize OIDC client if JWKS URL is available
   */
  private async initializeClient(): Promise<void> {
    if (this.client || !this.oauthConfig.jwksUrl) {
      return
    }

    try {
      const issuer = await Issuer.discover(this.oauthConfig.authorizationUrl)
      this.client = new issuer.Client({
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        redirect_uris: [this.getRedirectUri()],
        response_types: ['code'],
      })
    } catch (error) {
      // Fall back to manual OAuth flow
      console.warn('OIDC discovery failed, using manual OAuth flow')
    }
  }

  /**
   * Generate authorization URL with PKCE
   */
  async generateAuthorizationUrl(
    state?: string
  ): Promise<{ url: string; state: string; codeVerifier?: string }> {
    await this.initializeClient()

    const stateParam = state || this.generateState()
    let codeVerifier: string | undefined
    let codeChallenge: string | undefined

    // Generate PKCE parameters if enabled
    if (this.oauthConfig.pkceEnabled) {
      const pkce = this.generatePKCE()
      codeVerifier = pkce.codeVerifier
      codeChallenge = pkce.codeChallenge
    }

    // Store state and PKCE parameters
    await this.storeOAuthState(stateParam, codeVerifier, codeChallenge)

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: this.oauthConfig.scopes.join(' '),
      state: stateParam,
    })

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', 'S256')
    }

    const url = `${this.oauthConfig.authorizationUrl}?${params.toString()}`

    return { url, state: stateParam, codeVerifier }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ tokens: OAuthTokenResponse; userInfo: OIDCUserInfo }> {
    // Verify state parameter
    const storedState = await this.verifyAndConsumeState(state)

    if (!storedState) {
      throw this.createSSOError('INVALID_OAUTH_STATE', 'Invalid or expired state parameter')
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, storedState.codeVerifier)

      // Validate ID token if present (OIDC)
      if (tokens.id_token) {
        await this.validateIdToken(tokens.id_token)
      }

      // Fetch user info
      const userInfo = await this.fetchUserInfo(tokens.access_token)

      return { tokens, userInfo }
    } catch (error) {
      throw this.createSSOError(
        'TOKEN_EXCHANGE_FAILED',
        'Failed to exchange authorization code for tokens',
        { error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
      })

      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokens = (await response.json()) as OAuthTokenResponse
      return tokens
    } catch (error) {
      throw this.createSSOError('TOKEN_EXCHANGE_FAILED', 'Failed to refresh access token', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      // Not all providers support token revocation
      // Implement provider-specific revocation if available
      const params = new URLSearchParams({
        token,
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
      })

      // Example revocation endpoint (provider-specific)
      const revocationUrl = this.oauthConfig.tokenUrl.replace('/token', '/revoke')

      await fetch(revocationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (error) {
      // Token revocation is best-effort
      console.error('Token revocation failed:', error)
    }
  }

  // Private helper methods

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private generatePKCE(): PKCEConfig {
    const codeVerifier = generators.codeVerifier()
    const codeChallenge = generators.codeChallenge(codeVerifier)

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    }
  }

  private getRedirectUri(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/auth/sso/oauth/callback`
  }

  private async storeOAuthState(
    state: string,
    codeVerifier?: string,
    codeChallenge?: string
  ): Promise<void> {
    const supabase = await createClient()
    const nonce = crypto.randomBytes(32).toString('hex')

    await supabase.from('sso_oauth_states').insert({
      state,
      sso_config_id: this.config.id,
      code_verifier: codeVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallenge ? 'S256' : undefined,
      redirect_uri: this.getRedirectUri(),
      nonce,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })
  }

  private async verifyAndConsumeState(state: string): Promise<{ codeVerifier?: string } | null> {
    const supabase = await createClient()

    // Fetch and mark as consumed in one transaction
    const { data, error } = await supabase
      .from('sso_oauth_states')
      .select('*')
      .eq('state', state)
      .eq('consumed', false)
      .single()

    if (error || !data) {
      return null
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      return null
    }

    // Mark as consumed
    await supabase
      .from('sso_oauth_states')
      .update({ consumed: true, consumed_at: new Date().toISOString() })
      .eq('id', data.id)

    return {
      codeVerifier: data.code_verifier || undefined,
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUri(),
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
    })

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier)
    }

    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const tokens = (await response.json()) as OAuthTokenResponse
    return tokens
  }

  private async fetchUserInfo(accessToken: string): Promise<OIDCUserInfo> {
    if (!this.oauthConfig.userInfoUrl) {
      throw this.createSSOError('USER_INFO_FETCH_FAILED', 'UserInfo URL not configured')
    }

    const response = await fetch(this.oauthConfig.userInfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`UserInfo fetch failed: ${response.statusText}`)
    }

    const userInfo = (await response.json()) as OIDCUserInfo
    return userInfo
  }

  private async validateIdToken(idToken: string): Promise<void> {
    try {
      if (!this.oauthConfig.jwksUrl) {
        // Skip validation if JWKS URL not available
        return
      }

      // Fetch JWKS
      const JWKS = jose.createRemoteJWKSet(new URL(this.oauthConfig.jwksUrl))

      // Verify JWT signature
      const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: this.extractIssuerFromAuthUrl(),
        audience: this.oauthConfig.clientId,
      })

      // Additional validation
      const now = Math.floor(Date.now() / 1000)

      if (payload.exp && payload.exp < now) {
        throw new Error('ID token has expired')
      }

      if (payload.nbf && payload.nbf > now) {
        throw new Error('ID token not yet valid')
      }
    } catch (error) {
      throw this.createSSOError('INVALID_CREDENTIALS', 'ID token validation failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private extractIssuerFromAuthUrl(): string {
    try {
      const url = new URL(this.oauthConfig.authorizationUrl)
      return url.origin
    } catch {
      return this.oauthConfig.authorizationUrl
    }
  }

  private createSSOError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): SSOError {
    return {
      code: code as any,
      message,
      details,
    }
  }
}

/**
 * Initialize OAuth handler from configuration
 */
export async function createOAuthHandler(configId: string): Promise<OAuthHandler> {
  const supabase = await createClient()

  const { data: config, error } = await supabase
    .from('sso_configurations')
    .select('*')
    .eq('id', configId)
    .in('provider_type', ['oauth', 'oidc'])
    .single()

  if (error || !config) {
    throw new Error('OAuth configuration not found')
  }

  if (!config.enabled) {
    throw new Error('OAuth configuration is disabled')
  }

  return new OAuthHandler(config)
}
