/**
 * Shopify Webhook Endpoint
 *
 * POST /api/webhooks/shopify
 * Receives and processes all Shopify webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/integrations/shopify/webhook-handler'

// Disable body parsing to get raw body for HMAC verification
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const body = await request.text()

    // Process webhook
    const result = await processWebhook(request.headers, body)

    if (!result.success) {
      // Log error but return 200 to prevent retries for permanent failures
      console.error('Webhook processing failed:', result.error)

      // Only return error status for signature verification failures
      if (result.error?.includes('signature')) {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        )
      }
    }

    // Always return 200 to acknowledge receipt
    // Shopify retries failed webhooks, so we want to acknowledge
    // even if processing fails (we handle retries internally)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook endpoint error:', error)

    // Return 200 to prevent infinite retries
    // The error is logged for investigation
    return NextResponse.json({ success: true })
  }
}

// Handle webhook verification (optional health check)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'shopify-webhooks',
  })
}
