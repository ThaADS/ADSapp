/**
 * Twilio WhatsApp Connect Route
 * Purpose: Save and verify Twilio WhatsApp credentials
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { saveTwilioWhatsAppCredentials } from '@/lib/integrations/twilio-whatsapp/client'

/**
 * POST /api/integrations/twilio-whatsapp/connect
 * Connect a Twilio WhatsApp account to the organization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or Owner role required.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { accountSid, authToken, whatsappNumber, friendlyName } = body

    // Validate inputs
    if (!accountSid || typeof accountSid !== 'string') {
      return NextResponse.json({ error: 'Account SID is required' }, { status: 400 })
    }

    if (!authToken || typeof authToken !== 'string') {
      return NextResponse.json({ error: 'Auth Token is required' }, { status: 400 })
    }

    if (!whatsappNumber || typeof whatsappNumber !== 'string') {
      return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 })
    }

    // Validate account SID format (AC + 32 hex chars)
    if (!/^AC[a-f0-9]{32}$/i.test(accountSid)) {
      return NextResponse.json(
        { error: 'Invalid Account SID format. Should start with AC followed by 32 characters.' },
        { status: 400 }
      )
    }

    // Validate phone number format (E.164)
    const phoneValidation = QueryValidators.text(whatsappNumber, 20)
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Normalize phone number
    let normalizedNumber = whatsappNumber.replace(/[^0-9+]/g, '')
    if (!normalizedNumber.startsWith('+')) {
      normalizedNumber = `+${normalizedNumber}`
    }

    // Save credentials (validates with Twilio API)
    const result = await saveTwilioWhatsAppCredentials(profile.organization_id, {
      accountSid,
      authToken,
      whatsappNumber: normalizedNumber,
      friendlyName,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save credentials' },
        { status: 400 }
      )
    }

    // Return webhook URL for configuration
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`

    return NextResponse.json({
      success: true,
      connectionId: result.connectionId,
      webhookUrl,
      message: 'Twilio WhatsApp connected successfully. Configure this webhook URL in your Twilio console.',
    })
  } catch (error) {
    console.error('Twilio WhatsApp connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/twilio-whatsapp/connect
 * Get current Twilio WhatsApp connection status
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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

    // Get connection status
    const { data: connection, error: connError } = await supabase
      .from('twilio_whatsapp_connections')
      .select('id, whatsapp_number, friendly_name, is_active, webhook_configured, last_verified_at, created_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (connError && connError.code !== 'PGRST116') {
      throw connError
    }

    if (!connection) {
      return NextResponse.json({
        connected: false,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`,
      })
    }

    return NextResponse.json({
      connected: true,
      connectionId: connection.id,
      whatsappNumber: connection.whatsapp_number,
      friendlyName: connection.friendly_name,
      webhookConfigured: connection.webhook_configured,
      lastVerifiedAt: connection.last_verified_at,
      connectedAt: connection.created_at,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`,
    })
  } catch (error) {
    console.error('Twilio WhatsApp status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/twilio-whatsapp/connect
 * Disconnect Twilio WhatsApp from the organization
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Deactivate connection (soft delete)
    const { error: updateError } = await supabase
      .from('twilio_whatsapp_connections')
      .update({ is_active: false })
      .eq('organization_id', profile.organization_id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Twilio WhatsApp disconnected successfully',
    })
  } catch (error) {
    console.error('Twilio WhatsApp disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
