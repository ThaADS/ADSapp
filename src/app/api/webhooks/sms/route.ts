/**
 * SMS Webhook Route
 * POST: Handle incoming SMS messages from Twilio
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  processIncomingSMS,
  generateEmptyTwiML,
} from '@/lib/integrations/sms'
import { TwilioIncomingSMS } from '@/types/sms'

// Twilio sends form data, not JSON
export async function POST(request: NextRequest) {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-twilio-signature') || ''

    // Get the full webhook URL
    const webhookUrl = request.url

    // Parse form data from Twilio
    const formData = await request.formData()
    const payload: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        payload[key] = value
      }
    })

    // Log incoming webhook (for debugging)
    console.log('Incoming SMS webhook:', {
      from: payload.From,
      to: payload.To,
      messageSid: payload.MessageSid,
    })

    // Process the webhook
    const result = await processIncomingSMS(
      payload as unknown as TwilioIncomingSMS,
      signature,
      webhookUrl
    )

    if (!result.success && !result.is_duplicate) {
      console.error('SMS webhook processing failed:', result.error)
      // Still return 200 to Twilio to prevent retries for business logic errors
    }

    // Return TwiML response (empty = acknowledge receipt)
    return new NextResponse(generateEmptyTwiML(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    console.error('SMS webhook error:', error)

    // Return 500 to trigger Twilio retry
    return new NextResponse(generateEmptyTwiML(), {
      status: 500,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}

// Twilio may also send GET for verification
export async function GET(request: NextRequest) {
  // Simple health check
  return NextResponse.json({ status: 'ok', service: 'sms-webhook' })
}
