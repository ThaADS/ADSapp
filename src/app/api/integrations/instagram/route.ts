/**
 * Instagram Integration Status Endpoint
 *
 * GET /api/integrations/instagram - Get integration status
 * DELETE /api/integrations/instagram - Disconnect integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramConnection, disconnectInstagram, getRateLimitInfo } from '@/lib/integrations/instagram'

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

    // Get connection
    const connection = await getInstagramConnection(profile.organization_id)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      })
    }

    // Get rate limit info
    const rateLimitInfo = await getRateLimitInfo(profile.organization_id)

    // Return connection info (without sensitive data)
    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        instagram_user_id: connection.instagram_user_id,
        instagram_username: connection.instagram_username,
        page_name: connection.page_name,
        scopes: connection.scopes,
        is_active: connection.is_active,
        webhook_subscribed: connection.webhook_subscribed,
        token_expires_at: connection.token_expires_at,
        created_at: connection.created_at,
      },
      rateLimit: rateLimitInfo ? {
        messagesUsed: rateLimitInfo.messages_sent_this_hour,
        limit: rateLimitInfo.limit,
        resetsAt: new Date(
          new Date(rateLimitInfo.hour_window_start).getTime() + 60 * 60 * 1000
        ).toISOString()
      } : null
    })
  } catch (error) {
    console.error('Get Instagram integration error:', error)
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
    const success = await disconnectInstagram(profile.organization_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect Instagram error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
