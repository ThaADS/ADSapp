/**
 * Salesforce OAuth 2.0 Authentication
 *
 * Implements OAuth 2.0 Web Server Flow for Salesforce
 * https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm
 */

import { CRMCredentials } from '../base-client'

export interface SalesforceAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  environment?: 'production' | 'sandbox'
}

export interface SalesforceTokenResponse {
  access_token: string
  refresh_token: string
  instance_url: string
  id: string
  token_type: string
  issued_at: string
  signature: string
}

export class SalesforceAuth {
  private config: SalesforceAuthConfig

  constructor(config: SalesforceAuthConfig) {
    this.config = config
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    const baseUrl =
      this.config.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com'

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'api refresh_token',
      ...(state && { state }),
    })

    return `${baseUrl}/services/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<CRMCredentials> {
    const baseUrl =
      this.config.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com'

    const response = await fetch(`${baseUrl}/services/oauth2/token`, {
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
      throw new Error(`Salesforce OAuth error: ${error}`)
    }

    const data: SalesforceTokenResponse = await response.json()

    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      expiresAt: new Date(parseInt(data.issued_at) + 2 * 60 * 60 * 1000), // 2 hours
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<CRMCredentials> {
    const baseUrl =
      this.config.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com'

    const response = await fetch(`${baseUrl}/services/oauth2/token`, {
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
      throw new Error(`Salesforce token refresh error: ${error}`)
    }

    const data: SalesforceTokenResponse = await response.json()

    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep the original refresh token
      instanceUrl: data.instance_url,
      expiresAt: new Date(parseInt(data.issued_at) + 2 * 60 * 60 * 1000), // 2 hours
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    const baseUrl =
      this.config.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com'

    const response = await fetch(`${baseUrl}/services/oauth2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Salesforce token revocation error: ${error}`)
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string, instanceUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }
}
