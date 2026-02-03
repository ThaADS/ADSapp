/**
 * SMS Phone Numbers API Route
 * GET: List available Twilio phone numbers
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listPhoneNumbers, listMessagingServices } from '@/lib/integrations/sms'

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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can access this
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse credentials from request body
    const body = await request.json()

    if (!body.twilio_account_sid || !body.twilio_auth_token) {
      return NextResponse.json(
        { error: 'Twilio credentials are required' },
        { status: 400 }
      )
    }

    // Validate Account SID format
    if (!body.twilio_account_sid.startsWith('AC')) {
      return NextResponse.json(
        { error: 'Invalid Twilio Account SID format' },
        { status: 400 }
      )
    }

    try {
      // Fetch phone numbers
      const phoneNumbers = await listPhoneNumbers(
        body.twilio_account_sid,
        body.twilio_auth_token
      )

      // Filter to only SMS-capable numbers
      const smsNumbers = phoneNumbers.filter((pn) => pn.capabilities.sms)

      // Also try to fetch messaging services
      let messagingServices: Array<{
        sid: string
        friendly_name: string
      }> = []

      try {
        messagingServices = await listMessagingServices(
          body.twilio_account_sid,
          body.twilio_auth_token
        )
      } catch {
        // Messaging services may not be enabled
      }

      return NextResponse.json({
        phone_numbers: smsNumbers.map((pn) => ({
          sid: pn.sid,
          phone_number: pn.phone_number,
          friendly_name: pn.friendly_name,
          sms_enabled: pn.capabilities.sms,
          mms_enabled: pn.capabilities.mms,
          voice_enabled: pn.capabilities.voice,
        })),
        messaging_services: messagingServices.map((svc) => ({
          sid: svc.sid,
          friendly_name: svc.friendly_name,
        })),
      })
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error)
      return NextResponse.json(
        { error: `Failed to fetch phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('SMS phone numbers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
