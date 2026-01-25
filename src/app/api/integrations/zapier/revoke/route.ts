/**
 * OAuth 2.0 Token Revocation Endpoint
 *
 * POST /api/integrations/zapier/revoke
 *
 * Revokes access or refresh tokens.
 * Per RFC 7009, always returns 200 OK (even for invalid tokens).
 */

import { NextRequest, NextResponse } from 'next/server'
import { revokeToken } from '@/lib/integrations/zapier/oauth-provider'
import type { OAuthRevokeRequest } from '@/types/oauth'

export async function POST(request: NextRequest) {
  try {
    // Parse request body (supports form-urlencoded and JSON)
    const contentType = request.headers.get('content-type') || ''
    let params: OAuthRevokeRequest

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      params = {
        token: formData.get('token') as string,
        token_type_hint: formData.get('token_type_hint') as any,
        client_id: formData.get('client_id') as string,
        client_secret: formData.get('client_secret') as string,
      }
    } else {
      params = await request.json()
    }

    // Validate required parameters
    if (!params.token) {
      // Per RFC 7009: Return 200 even for missing token
      return new NextResponse(null, { status: 200 })
    }

    // Client authentication is optional for public clients
    // but if provided, should be validated
    // For now, we accept all revocation requests

    // Revoke token
    await revokeToken({
      token: params.token,
      tokenTypeHint: params.token_type_hint,
    })

    // Per RFC 7009: Always return 200 OK
    // This prevents attackers from using revocation endpoint to probe for valid tokens
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('Revocation endpoint error:', error)

    // Per RFC 7009: Return 200 even on error
    return new NextResponse(null, { status: 200 })
  }
}
