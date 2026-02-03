/**
 * SMS Integration API Route
 * GET: Get SMS connection status
 * DELETE: Disconnect SMS
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SMSConnection, SMSConnectionStatus } from '@/types/sms'

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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get active SMS connections
    const { data: connections, error: connError } = await supabase
      .from('sms_connections')
      .select('id, phone_number, phone_number_sid, friendly_name, sms_enabled, mms_enabled, webhook_configured, last_verified_at, is_active, created_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (connError) {
      console.error('Failed to fetch SMS connections:', connError)
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      )
    }

    // Return connection status
    if (!connections || connections.length === 0) {
      const status: SMSConnectionStatus = { connected: false }
      return NextResponse.json(status)
    }

    // Return primary connection (first one)
    const primary = connections[0]
    const status: SMSConnectionStatus = {
      connected: true,
      connection: {
        id: primary.id,
        phone_number: primary.phone_number,
        friendly_name: primary.friendly_name,
        sms_enabled: primary.sms_enabled,
        mms_enabled: primary.mms_enabled,
        webhook_configured: primary.webhook_configured,
        last_verified_at: primary.last_verified_at,
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('SMS status error:', error)
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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can manage integrations
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get connection ID from query params
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connection_id')

    if (!connectionId) {
      // Disconnect all connections for this org
      const { error: updateError } = await supabase
        .from('sms_connections')
        .update({ is_active: false })
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)

      if (updateError) {
        console.error('Failed to disconnect SMS:', updateError)
        return NextResponse.json(
          { error: 'Failed to disconnect SMS' },
          { status: 500 }
        )
      }
    } else {
      // Disconnect specific connection
      const { error: updateError } = await supabase
        .from('sms_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('organization_id', profile.organization_id)

      if (updateError) {
        console.error('Failed to disconnect SMS:', updateError)
        return NextResponse.json(
          { error: 'Failed to disconnect SMS' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
