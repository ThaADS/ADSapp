/**
 * ADSapp OAuth 2.0 Authentication for Zapier
 *
 * Uses Authorization Code Grant with PKCE support.
 * ADSapp serves as the OAuth provider, Zapier is the consumer.
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

const authentication = {
  type: 'oauth2',
  connectionLabel: '{{organization_name}}',

  oauth2Config: {
    // Authorization URL - user is redirected here to grant access
    authorizeUrl: {
      url: `${BASE_URL}/api/integrations/zapier/authorize`,
      params: {
        client_id: '{{process.env.CLIENT_ID}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
        scope: 'messages:read messages:write contacts:read contacts:write triggers:read triggers:write',
        state: '{{bundle.inputData.state}}'
      }
    },

    // Token exchange URL - exchange authorization code for access token
    getAccessToken: {
      url: `${BASE_URL}/api/integrations/zapier/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: {
        grant_type: 'authorization_code',
        code: '{{bundle.inputData.code}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}'
      }
    },

    // Refresh token URL - get new access token using refresh token
    refreshAccessToken: {
      url: `${BASE_URL}/api/integrations/zapier/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: {
        grant_type: 'refresh_token',
        refresh_token: '{{bundle.authData.refresh_token}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}'
      }
    },

    // Scopes requested - aligns with ADSapp OAuth provider scopes
    scope: 'messages:read messages:write contacts:read contacts:write triggers:read triggers:write',

    // Enable automatic token refresh on 401 responses
    autoRefresh: true
  },

  // Test the connection by getting the current user profile
  test: {
    url: `${BASE_URL}/api/integrations/zapier/me`,
    method: 'GET'
  }
}

module.exports = authentication
