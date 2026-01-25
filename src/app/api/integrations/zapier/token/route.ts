/**
 * OAuth 2.0 Token Endpoint
 *
 * POST /api/integrations/zapier/token
 *
 * Exchanges authorization codes for access tokens or refreshes tokens.
 * Supports both application/x-www-form-urlencoded and application/json.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from '@/lib/integrations/zapier/oauth-provider'
import type { OAuthErrorResponse, OAuthTokenRequest } from '@/types/oauth'

export async function POST(request: NextRequest) {
  try {
    // Parse request body (supports form-urlencoded and JSON)
    const contentType = request.headers.get('content-type') || ''
    let params: OAuthTokenRequest

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      params = {
        grant_type: formData.get('grant_type') as any,
        code: formData.get('code') as string | undefined,
        redirect_uri: formData.get('redirect_uri') as string | undefined,
        client_id: formData.get('client_id') as string,
        client_secret: formData.get('client_secret') as string,
        refresh_token: formData.get('refresh_token') as string | undefined,
        code_verifier: formData.get('code_verifier') as string | undefined,
      }
    } else {
      params = await request.json()
    }

    // Validate required parameters
    if (!params.grant_type || !params.client_id || !params.client_secret) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        } as OAuthErrorResponse,
        { status: 400 }
      )
    }

    // Handle authorization_code grant
    if (params.grant_type === 'authorization_code') {
      if (!params.code || !params.redirect_uri) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing code or redirect_uri',
          } as OAuthErrorResponse,
          { status: 400 }
        )
      }

      const result = await exchangeCodeForTokens({
        code: params.code,
        clientId: params.client_id,
        clientSecret: params.client_secret,
        redirectUri: params.redirect_uri,
        codeVerifier: params.code_verifier,
      })

      if (!result.success || !result.tokens) {
        return NextResponse.json(result.error!, {
          status: result.error?.error === 'invalid_client' ? 401 : 400,
        })
      }

      return NextResponse.json(result.tokens, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      })
    }

    // Handle refresh_token grant
    if (params.grant_type === 'refresh_token') {
      if (!params.refresh_token) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing refresh_token',
          } as OAuthErrorResponse,
          { status: 400 }
        )
      }

      const result = await refreshAccessToken({
        refreshToken: params.refresh_token,
        clientId: params.client_id,
        clientSecret: params.client_secret,
      })

      if (!result.success || !result.tokens) {
        return NextResponse.json(result.error!, {
          status: result.error?.error === 'invalid_client' ? 401 : 400,
        })
      }

      return NextResponse.json(result.tokens, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      })
    }

    // Unsupported grant type
    return NextResponse.json(
      {
        error: 'unsupported_grant_type',
        error_description: `Grant type ${params.grant_type} is not supported`,
      } as OAuthErrorResponse,
      { status: 400 }
    )
  } catch (error) {
    console.error('Token endpoint error:', error)

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Internal server error',
      } as OAuthErrorResponse,
      { status: 500 }
    )
  }
}
