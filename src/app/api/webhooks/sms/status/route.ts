/**
 * SMS Status Webhook Route
 * POST: Handle delivery status callbacks from Twilio
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { processSMSStatusCallback } from '@/lib/integrations/sms'
import { TwilioStatusCallback } from '@/types/sms'

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

    // Log status update (for debugging)
    console.log('SMS status callback:', {
      messageSid: payload.MessageSid,
      status: payload.MessageStatus,
      errorCode: payload.ErrorCode,
    })

    // Process the status callback
    const result = await processSMSStatusCallback(
      payload as unknown as TwilioStatusCallback,
      signature,
      webhookUrl
    )

    if (!result.success && !result.is_duplicate) {
      console.error('SMS status callback processing failed:', result.error)
    }

    // Return 200 to acknowledge receipt
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('SMS status callback error:', error)
    // Return 200 anyway to prevent excessive retries
    return new NextResponse(null, { status: 200 })
  }
}
