/**
 * Twilio WhatsApp Verify Route
 * Purpose: Verify Twilio credentials without saving
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwilioWhatsAppClient } from '@/lib/integrations/twilio-whatsapp/client'

/**
 * POST /api/integrations/twilio-whatsapp/verify
 * Verify Twilio credentials without saving
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { accountSid, authToken, whatsappNumber } = body

    // Basic validation
    if (!accountSid || !authToken || !whatsappNumber) {
      return NextResponse.json(
        { error: 'Account SID, Auth Token, and WhatsApp number are required' },
        { status: 400 }
      )
    }

    // Create temporary client and verify
    const client = new TwilioWhatsAppClient({
      accountSid,
      authToken,
      whatsappNumber,
    })

    const result = await client.verifyCredentials()

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'Credentials verified successfully',
    })
  } catch (error) {
    console.error('Twilio WhatsApp verify error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
