/**
 * Facebook Messenger Integration Status Endpoint
 *
 * GET /api/integrations/facebook - Get connection status
 * DELETE /api/integrations/facebook - Disconnect integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFacebookConnection, disconnectFacebook } from '@/lib/integrations/facebook'

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

    // Get Facebook connection
    const connection = await getFacebookConnection(profile.organization_id)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null
      })
    }

    // Return safe connection data (no tokens)
    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        page_id: connection.page_id,
        page_name: connection.page_name,
        is_active: connection.is_active,
        webhook_subscribed: connection.webhook_subscribed,
        token_expires_at: connection.token_expires_at,
        scopes: connection.scopes,
        created_at: connection.created_at,
        updated_at: connection.updated_at
      }
    })
  } catch (error) {
    console.error('Get Facebook status error:', error)
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

    // Disconnect Facebook
    const success = await disconnectFacebook(profile.organization_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect Facebook' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect Facebook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
