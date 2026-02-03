/**
 * SMS Connect API Route
 * POST: Connect Twilio account to organization
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import {
  verifyTwilioCredentials,
  getPhoneNumber,
  configurePhoneNumberWebhooks,
  encryptToken,
} from '@/lib/integrations/sms'
import { ConnectSMSRequest } from '@/types/sms'

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

    // Get user's profile with organization
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

    // Parse request body
    const body: ConnectSMSRequest = await request.json()

    // Validate inputs
    if (!body.twilio_account_sid || !body.twilio_auth_token || !body.phone_number_sid) {
      return NextResponse.json(
        { error: 'Missing required fields: twilio_account_sid, twilio_auth_token, phone_number_sid' },
        { status: 400 }
      )
    }

    // Validate Account SID format (starts with AC)
    if (!body.twilio_account_sid.startsWith('AC')) {
      return NextResponse.json(
        { error: 'Invalid Twilio Account SID format' },
        { status: 400 }
      )
    }

    // Verify Twilio credentials
    const credentialCheck = await verifyTwilioCredentials(
      body.twilio_account_sid,
      body.twilio_auth_token
    )

    if (!credentialCheck.valid) {
      return NextResponse.json(
        { error: `Invalid Twilio credentials: ${credentialCheck.error}` },
        { status: 400 }
      )
    }

    // Get phone number details
    let phoneNumber
    try {
      phoneNumber = await getPhoneNumber(
        body.twilio_account_sid,
        body.twilio_auth_token,
        body.phone_number_sid
      )
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to fetch phone number: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Check if phone number supports SMS
    if (!phoneNumber.capabilities.sms) {
      return NextResponse.json(
        { error: 'This phone number does not support SMS' },
        { status: 400 }
      )
    }

    // Check if phone number is already connected
    const { data: existing } = await supabase
      .from('sms_connections')
      .select('id, organization_id')
      .eq('phone_number', phoneNumber.phone_number)
      .single()

    if (existing) {
      if (existing.organization_id === profile.organization_id) {
        return NextResponse.json(
          { error: 'This phone number is already connected to your organization' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'This phone number is already connected to another organization' },
        { status: 400 }
      )
    }

    // Configure webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms`
    try {
      await configurePhoneNumberWebhooks(
        body.twilio_account_sid,
        body.twilio_auth_token,
        body.phone_number_sid,
        webhookUrl
      )
    } catch (error) {
      console.error('Failed to configure webhooks:', error)
      // Continue anyway - webhooks can be configured manually
    }

    // Store connection
    const { data: connection, error: insertError } = await supabase
      .from('sms_connections')
      .insert({
        organization_id: profile.organization_id,
        twilio_account_sid: body.twilio_account_sid,
        twilio_auth_token_hash: encryptToken(body.twilio_auth_token),
        phone_number: phoneNumber.phone_number,
        phone_number_sid: body.phone_number_sid,
        friendly_name: phoneNumber.friendly_name,
        sms_enabled: phoneNumber.capabilities.sms,
        mms_enabled: phoneNumber.capabilities.mms,
        voice_enabled: phoneNumber.capabilities.voice,
        messaging_service_sid: body.messaging_service_sid || null,
        is_active: true,
        webhook_configured: true,
        last_verified_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create SMS connection:', insertError)
      return NextResponse.json(
        { error: 'Failed to create SMS connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        phone_number: connection.phone_number,
        friendly_name: connection.friendly_name,
        sms_enabled: connection.sms_enabled,
        mms_enabled: connection.mms_enabled,
        webhook_configured: connection.webhook_configured,
      },
    })
  } catch (error) {
    console.error('SMS connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
