/**
 * Instagram OAuth Callback Endpoint
 *
 * GET /api/integrations/instagram/callback - Handles OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getConnectedPages,
  getInstagramBusinessAccount,
  saveInstagramConnection,
  subscribeToWebhooks
} from '@/lib/integrations/instagram'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=missing_params`
      )
    }

    // Decode state
    let stateData: { organizationId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=invalid_state`
      )
    }

    const { organizationId } = stateData

    // Verify user has permission for this organization
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=unauthorized`
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=organization_mismatch`
      )
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=insufficient_permissions`
      )
    }

    // Exchange code for token
    const { accessToken } = await exchangeCodeForToken(code)

    // Get long-lived token
    const { accessToken: longLivedToken, expiresIn } = await getLongLivedToken(accessToken)

    // Get connected Facebook Pages with Instagram accounts
    const pages = await getConnectedPages(longLivedToken)

    // Find first page with Instagram Business Account
    const pageWithInstagram = pages.find(p => p.instagram_business_account)

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=no_instagram_business_account`
      )
    }

    // Get Instagram account details
    const instagramAccount = await getInstagramBusinessAccount(
      pageWithInstagram.instagram_business_account.id,
      longLivedToken
    )

    // Save connection
    const connection = await saveInstagramConnection(
      organizationId,
      pageWithInstagram.id,
      pageWithInstagram.name,
      instagramAccount,
      longLivedToken,
      expiresIn
    )

    // Subscribe to webhooks
    await subscribeToWebhooks(connection)

    // Redirect to success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?instagram=connected`
    )
  } catch (error) {
    console.error('Instagram callback error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=${encodeURIComponent(message)}`
    )
  }
}
