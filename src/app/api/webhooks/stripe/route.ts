/**
 * Stripe Webhook Handler (S-003: Enhanced with Idempotency)
 * ===========================================================
 * Processes Stripe webhook events with idempotency guarantees,
 * signature validation, and comprehensive error handling.
 *
 * POST /api/webhooks/stripe - Process Stripe webhook events
 *
 * Security: Signature verification required
 * Compliance: PCI DSS webhook security requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateStripeWebhook } from '@/lib/middleware/webhook-validator'
import { WebhookHandler } from '@/lib/billing/webhook-handler'
import { WEBHOOK_SECURITY_HEADERS } from '@/lib/middleware/webhook-validator'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate webhook signature and extract event
    const validation = await validateStripeWebhook(request)

    if (!validation.valid || !validation.event) {
      console.error('Webhook validation failed:', validation.error)

      return NextResponse.json(
        {
          error: 'Webhook validation failed',
          code: validation.errorCode,
        },
        {
          status: 400,
          headers: WEBHOOK_SECURITY_HEADERS,
        }
      )
    }

    const event = validation.event

    console.log(`[Stripe Webhook] Processing event: ${event.type} - ${event.id}`)

    // 2. Process webhook with idempotency
    const webhookHandler = new WebhookHandler()
    const result = await webhookHandler.processWebhookWithIdempotency(
      event,
      request.headers.get('stripe-signature') || ''
    )

    // 3. Return result
    if (result.success) {
      if (result.alreadyProcessed) {
        console.log(`[Stripe Webhook] Event already processed: ${event.id}`)
        return NextResponse.json(
          {
            received: true,
            eventId: event.id,
            eventType: event.type,
            alreadyProcessed: true,
          },
          {
            status: 200,
            headers: WEBHOOK_SECURITY_HEADERS,
          }
        )
      }

      return NextResponse.json(
        {
          received: true,
          eventId: event.id,
          eventType: event.type,
          processed: result.processed,
        },
        {
          status: 200,
          headers: WEBHOOK_SECURITY_HEADERS,
        }
      )
    } else {
      console.error(`[Stripe Webhook] Processing failed: ${result.error}`)

      return NextResponse.json(
        {
          received: true,
          eventId: event.id,
          eventType: event.type,
          error: result.error,
          retryable: result.retryable,
        },
        {
          status: result.retryable ? 500 : 400,
          headers: WEBHOOK_SECURITY_HEADERS,
        }
      )
    }
  } catch (error) {
    const err = error as Error
    console.error('Stripe webhook error:', err)

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: err.message,
      },
      {
        status: 500,
        headers: WEBHOOK_SECURITY_HEADERS,
      }
    )
  }
}
