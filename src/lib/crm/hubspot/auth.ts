/**
 * HubSpot OAuth 2.0 Authentication
 *
 * Implements OAuth 2.0 for HubSpot API
 * https://developers.hubspot.com/docs/api/oauth/overview
 */

import { CRMCredentials } from '../base-client'

export interface HubSpotAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
}

export interface HubSpotTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export class HubSpotAuth {
  private config: HubSpotAuthConfig
  private readonly AUTH_URL = 'https://app.hubspot.com/oauth/authorize'
  private readonly TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

  constructor(config: HubSpotAuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || [
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.objects.deals.read',
        'crm.objects.deals.write',
        'crm.objects.companies.read',
        'crm.objects.companies.write',
      ],
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes!.join(' '),
      ...(state && { state }),
    })

    return `${this.AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<CRMCredentials> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HubSpot OAuth error: ${error}`)
    }

    const data: HubSpotTokenResponse = await response.json()

    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<CRMCredentials> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HubSpot token refresh error: ${error}`)
    }

    const data: HubSpotTokenResponse = await response.json()

    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    // HubSpot doesn't have a specific revoke endpoint
    // Tokens expire automatically or can be revoked from HubSpot UI
    console.log('HubSpot token revocation must be done from HubSpot settings')
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken)
      return response.ok
    } catch (error) {
      return false
    }
  }
}
