/**
 * OAuth 2.0 Authorization Endpoint
 *
 * GET /api/integrations/zapier/authorize
 *
 * Initiates the authorization flow. Validates OAuth parameters,
 * checks user authentication, and redirects to consent page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateClient } from '@/lib/integrations/zapier/oauth-provider'
import type { OAuthScope } from '@/types/oauth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // 1. Validate required parameters
    const responseType = searchParams.get('response_type')
    const clientId = searchParams.get('client_id')
    const redirectUri = searchParams.get('redirect_uri')
    const state = searchParams.get('state')
    const scopeParam = searchParams.get('scope')
    const codeChallenge = searchParams.get('code_challenge')
    const codeChallengeMethod = searchParams.get('code_challenge_method')

    if (responseType !== 'code') {
      return NextResponse.redirect(
        buildErrorRedirect(redirectUri || '', 'unsupported_response_type', state)
      )
    }

    if (!clientId || !redirectUri || !state) {
      return new NextResponse(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate client and redirect URI
    const clientValidation = await validateClient(clientId, redirectUri)

    if (!clientValidation.valid || !clientValidation.client) {
      return NextResponse.redirect(
        buildErrorRedirect(
          redirectUri,
          clientValidation.error?.error || 'invalid_client',
          state,
          clientValidation.error?.error_description
        )
      )
    }

    // 3. Parse and validate scopes
    const requestedScopes = scopeParam
      ? (scopeParam.split(' ') as OAuthScope[])
      : clientValidation.client.scopes

    // Ensure requested scopes are subset of client's allowed scopes
    const validScopes = requestedScopes.filter((scope) =>
      clientValidation.client!.scopes.includes(scope)
    )

    if (validScopes.length === 0) {
      return NextResponse.redirect(
        buildErrorRedirect(redirectUri, 'invalid_scope', state)
      )
    }

    // 4. Check user authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('returnUrl', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 5. Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.redirect(
        buildErrorRedirect(redirectUri, 'access_denied', state, 'No organization context')
      )
    }

    // 6. Redirect to consent page
    const consentUrl = new URL('/oauth/consent', request.url)
    consentUrl.searchParams.set('client_id', clientId)
    consentUrl.searchParams.set('client_name', clientValidation.client.name)
    consentUrl.searchParams.set('redirect_uri', redirectUri)
    consentUrl.searchParams.set('state', state)
    consentUrl.searchParams.set('scope', validScopes.join(' '))

    if (codeChallenge) {
      consentUrl.searchParams.set('code_challenge', codeChallenge)
    }
    if (codeChallengeMethod) {
      consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
    }

    return NextResponse.redirect(consentUrl)
  } catch (error) {
    console.error('Authorization endpoint error:', error)

    return new NextResponse(
      JSON.stringify({
        error: 'server_error',
        error_description: 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Build error redirect URL per OAuth 2.0 spec
 */
function buildErrorRedirect(
  redirectUri: string,
  error: string,
  state?: string | null,
  errorDescription?: string
): URL {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error)

  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription)
  }

  if (state) {
    url.searchParams.set('state', state)
  }

  return url
}
