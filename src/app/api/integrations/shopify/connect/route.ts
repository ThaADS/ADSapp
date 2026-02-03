/**
 * Shopify OAuth Connect Endpoint
 *
 * POST /api/integrations/shopify/connect
 * Initiates OAuth flow by generating authorization URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildAuthorizationUrl,
  generateOAuthState,
  isValidShopDomain,
} from '@/lib/integrations/shopify/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Only admins and owners can connect integrations
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { shop_domain } = body

    if (!shop_domain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Validate shop domain format
    if (!isValidShopDomain(shop_domain)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }

    // Generate state for CSRF protection
    const state = generateOAuthState()

    // Store state in session for verification on callback
    // Using a secure cookie with the state
    const stateData = {
      state,
      organization_id: profile.organization_id,
      user_id: user.id,
      created_at: Date.now(),
    }

    // Build authorization URL
    const authorizationUrl = buildAuthorizationUrl(shop_domain, state)

    // Create response with state cookie
    const response = NextResponse.json({
      authorization_url: authorizationUrl,
      state,
    })

    // Set secure cookie with state data (expires in 10 minutes)
    response.cookies.set('shopify_oauth_state', JSON.stringify(stateData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Shopify connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
