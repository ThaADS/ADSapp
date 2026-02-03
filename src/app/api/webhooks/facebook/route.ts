/**
 * Facebook Messenger Webhook Endpoint
 *
 * GET /api/webhooks/facebook - Webhook verification
 * POST /api/webhooks/facebook - Webhook event processing
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleVerificationChallenge,
  processFacebookWebhook
} from '@/lib/integrations/facebook'
import type { FacebookWebhookPayload } from '@/types/facebook'

/**
 * Webhook verification (GET)
 * Facebook sends a GET request to verify the webhook URL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (!mode || !token || !challenge) {
    return NextResponse.json(
      { error: 'Missing verification parameters' },
      { status: 400 }
    )
  }

  const result = handleVerificationChallenge(mode, token, challenge)

  if (result) {
    // Return the challenge as plain text (required by Facebook)
    return new NextResponse(result, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return NextResponse.json(
    { error: 'Verification failed' },
    { status: 403 }
  )
}

/**
 * Webhook event processing (POST)
 * Facebook sends POST requests with messaging events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify signature
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      console.error('Missing webhook signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse payload
    let payload: FacebookWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Process webhook events
    const result = await processFacebookWebhook(payload)

    if (!result.success) {
      console.error('Webhook processing errors:', result.errors)
      // Still return 200 to prevent Facebook from retrying
      // Log errors for investigation
    }

    // Always return 200 to acknowledge receipt
    // Facebook will retry if we return non-200
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors.length > 0 ? result.errors.length : undefined
    })
  } catch (error) {
    console.error('Facebook webhook error:', error)
    // Return 200 to prevent retries, but log the error
    return NextResponse.json({ success: false, error: 'Processing error' })
  }
}
