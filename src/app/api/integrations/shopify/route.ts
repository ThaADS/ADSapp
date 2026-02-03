/**
 * Shopify Integration Status Endpoint
 *
 * GET /api/integrations/shopify - Get integration status
 * DELETE /api/integrations/shopify - Disconnect integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getIntegration, disconnectIntegration } from '@/lib/integrations/shopify/client'

export async function GET(request: NextRequest) {
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get integration
    const integration = await getIntegration(profile.organization_id)

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      })
    }

    // Return integration info (without sensitive data)
    return NextResponse.json({
      connected: true,
      integration: {
        id: integration.id,
        shop_domain: integration.shop_domain,
        scopes: integration.scopes,
        api_version: integration.api_version,
        is_active: integration.is_active,
        last_sync_at: integration.last_sync_at,
        created_at: integration.created_at,
      },
    })
  } catch (error) {
    console.error('Get Shopify integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins and owners can disconnect
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Disconnect integration
    const success = await disconnectIntegration(profile.organization_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect Shopify error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
