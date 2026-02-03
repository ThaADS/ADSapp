/**
 * Shopify OAuth Callback Endpoint
 *
 * GET /api/integrations/shopify/callback
 * Handles OAuth callback from Shopify and completes the connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { completeOAuthFlow, verifyOAuthState } from '@/lib/integrations/shopify/client'
import type { ShopifyOAuthCallback } from '@/types/shopify'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract callback parameters
    const callback: ShopifyOAuthCallback = {
      code: searchParams.get('code') || '',
      shop: searchParams.get('shop') || '',
      state: searchParams.get('state') || '',
      hmac: searchParams.get('hmac') || '',
      timestamp: searchParams.get('timestamp') || '',
    }

    // Validate required parameters
    if (!callback.code || !callback.shop || !callback.state || !callback.hmac) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings/integrations?error=missing_parameters`
      )
    }

    // Get state from cookie
    const stateCookie = request.cookies.get('shopify_oauth_state')
    if (!stateCookie) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings/integrations?error=state_expired`
      )
    }

    let stateData: {
      state: string
      organization_id: string
      user_id: string
      created_at: number
    }

    try {
      stateData = JSON.parse(stateCookie.value)
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings/integrations?error=invalid_state`
      )
    }

    // Verify state matches
    if (!verifyOAuthState(callback.state, stateData.state)) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings/integrations?error=state_mismatch`
      )
    }

    // Check state hasn't expired (10 minute window)
    const stateAge = Date.now() - stateData.created_at
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings/integrations?error=state_expired`
      )
    }

    // Complete OAuth flow
    const result = await completeOAuthFlow(stateData.organization_id, callback)

    // Clear state cookie
    const response = NextResponse.redirect(
      result.success
        ? `${APP_URL}/dashboard/settings/integrations?shopify=connected&shop=${result.shop_domain}`
        : `${APP_URL}/dashboard/settings/integrations?error=${encodeURIComponent(result.error || 'connection_failed')}`
    )

    response.cookies.delete('shopify_oauth_state')

    return response
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings/integrations?error=internal_error`
    )
  }
}
