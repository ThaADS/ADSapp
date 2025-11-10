/**
 * Pipedrive API Token Authentication
 *
 * Pipedrive uses API token authentication instead of OAuth
 * https://pipedrive.readme.io/docs/core-api-concepts-authentication
 */

import { CRMCredentials } from '../base-client'

export interface PipedriveAuthConfig {
  apiToken: string
  companyDomain?: string
}

export class PipedriveAuth {
  private config: PipedriveAuthConfig

  constructor(config: PipedriveAuthConfig) {
    this.config = config
  }

  /**
   * Get API token
   */
  getApiToken(): string {
    return this.config.apiToken
  }

  /**
   * Get credentials
   */
  getCredentials(): CRMCredentials {
    return {
      clientId: '',
      clientSecret: '',
      apiKey: this.config.apiToken,
    }
  }

  /**
   * Validate API token
   */
  async validateToken(): Promise<boolean> {
    try {
      const baseUrl = this.config.companyDomain
        ? `https://${this.config.companyDomain}.pipedrive.com`
        : 'https://api.pipedrive.com'

      const response = await fetch(
        `${baseUrl}/api/v1/users/me?api_token=${this.config.apiToken}`
      )

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    const baseUrl = this.config.companyDomain
      ? `https://${this.config.companyDomain}.pipedrive.com`
      : 'https://api.pipedrive.com'

    const response = await fetch(`${baseUrl}/api/v1/users/me?api_token=${this.config.apiToken}`)

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Revoke token (Pipedrive doesn't support programmatic revocation)
   */
  async revokeToken(): Promise<void> {
    console.log('Pipedrive API tokens must be revoked manually from settings')
  }
}
