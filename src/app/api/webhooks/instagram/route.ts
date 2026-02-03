/**
 * Instagram Webhook Endpoint
 *
 * GET /api/webhooks/instagram - Webhook verification
 * POST /api/webhooks/instagram - Process incoming events
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleVerificationChallenge,
  processInstagramWebhook
} from '@/lib/integrations/instagram'
import type { InstagramWebhookPayload } from '@/types/instagram'

/**
 * GET - Webhook verification (required by Meta)
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
    // Return challenge as plain text
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
 * POST - Process incoming webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify signature
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      console.error('Instagram webhook: Missing signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Instagram webhook: Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse payload
    let payload: InstagramWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('Instagram webhook: Invalid JSON')
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Process webhook
    const result = await processInstagramWebhook(payload)

    if (!result.success) {
      console.error('Instagram webhook processing errors:', result.errors)
    }

    // Always return 200 to acknowledge receipt
    // Meta will retry if we return errors
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors.length > 0 ? result.errors : undefined
    })
  } catch (error) {
    console.error('Instagram webhook error:', error)

    // Still return 200 to prevent retries for unexpected errors
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}
