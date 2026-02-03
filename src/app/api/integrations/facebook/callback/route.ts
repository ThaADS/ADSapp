/**
 * Facebook Messenger OAuth Callback Endpoint
 * GET /api/integrations/facebook/callback - Handles OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getOwnedPages,
  saveFacebookConnection,
  subscribeToWebhooks
} from '@/lib/integrations/facebook'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorReason)
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=missing_params', request.url)
      )
    }

    // Decode state
    let stateData: { organizationId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=invalid_state', request.url)
      )
    }

    // Validate state timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=state_expired', request.url)
      )
    }

    // Exchange code for short-lived token
    const { accessToken: shortLivedToken } = await exchangeCodeForToken(code)

    // Get long-lived user token
    const { accessToken: longLivedToken, expiresIn } = await getLongLivedToken(shortLivedToken)

    // Get user's Pages
    const pages = await getOwnedPages(longLivedToken)

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=no_pages', request.url)
      )
    }

    // For now, connect the first Page
    // In a full implementation, you'd show a page selector UI
    const page = pages[0]

    // Save connection to database
    const connection = await saveFacebookConnection(
      stateData.organizationId,
      page.id,
      page.name,
      page.access_token, // Page access token from the accounts API
      longLivedToken, // User access token for refresh
      expiresIn
    )

    // Subscribe to webhooks
    await subscribeToWebhooks(connection)

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?success=facebook_connected', request.url)
    )
  } catch (error) {
    console.error('Facebook callback error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
