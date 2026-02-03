/**
 * Twilio WhatsApp Webhook Route
 * Purpose: Handle incoming messages and status callbacks from Twilio
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleTwilioWhatsAppWebhook } from '@/lib/integrations/twilio-whatsapp/webhook-handler'

// Twilio sends webhooks as application/x-www-form-urlencoded
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/twilio-whatsapp
 * Handles incoming WhatsApp messages and status callbacks from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Get the full URL for signature validation
    const url = request.url

    // Get Twilio signature from headers
    const signature = request.headers.get('X-Twilio-Signature') || ''

    // Parse form data
    const formData = await request.formData()
    const params: Record<string, string> = {}

    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    // Process webhook
    const result = await handleTwilioWhatsAppWebhook(params, signature, url)

    if (!result.success && !result.isDuplicate) {
      console.error('Twilio WhatsApp webhook error:', result.error)
      // Return 200 to prevent Twilio retries for known errors
      // Only return error status for signature validation failures
      if (result.error === 'Invalid webhook signature') {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      if (result.error?.includes('No active connection')) {
        return new NextResponse('Not Found', { status: 404 })
      }
    }

    // Return TwiML empty response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    )
  } catch (error) {
    console.error('Twilio WhatsApp webhook error:', error)
    // Return 500 to trigger Twilio retry
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * GET /api/webhooks/twilio-whatsapp
 * Health check endpoint for webhook configuration verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
