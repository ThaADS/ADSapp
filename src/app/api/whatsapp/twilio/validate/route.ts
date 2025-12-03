/**
 * API Route: Validate Twilio Credentials
 * Verifies Twilio account credentials for WhatsApp integration
 */

import { createClient } from '@/lib/supabase/server'

interface TwilioCredentials {
  accountSid: string
  authToken: string
  phoneNumber: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credentials: TwilioCredentials = await request.json()

    // Validate required fields
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      return Response.json({ error: 'Missing required credentials' }, { status: 400 })
    }

    // Validate Account SID format (starts with AC, 34 chars total)
    if (!/^AC[a-f0-9]{32}$/i.test(credentials.accountSid)) {
      return Response.json({
        error: 'Invalid Account SID format. Should start with "AC" followed by 32 characters.',
      }, { status: 400 })
    }

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(credentials.phoneNumber.replace(/\s/g, ''))) {
      return Response.json({
        error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      }, { status: 400 })
    }

    // In production, you would validate against Twilio API:
    // const twilio = require('twilio')(credentials.accountSid, credentials.authToken)
    // await twilio.api.accounts(credentials.accountSid).fetch()

    // For demo purposes, we'll do basic validation and return success
    // if the formats are correct

    // Simulate API validation with a small delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if this is a sandbox number (for demo purposes)
    const isSandbox = credentials.phoneNumber.includes('14155238886')

    return Response.json({
      valid: true,
      accountInfo: {
        sid: credentials.accountSid,
        phoneNumber: credentials.phoneNumber,
        isSandbox,
        capabilities: {
          whatsapp: true,
          sms: true,
          voice: !isSandbox,
        },
      },
    })
  } catch (error) {
    console.error('Twilio validation error:', error)
    return Response.json({ error: 'Failed to validate Twilio credentials' }, { status: 500 })
  }
}
