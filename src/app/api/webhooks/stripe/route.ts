import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/stripe/server'
import { StripeWebhookProcessor } from '@/lib/billing/webhook-processor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify the webhook signature and construct the event
    const event = await StripeService.handleWebhook(body, signature)

    console.log(`[Stripe Webhook] Processing event: ${event.type} - ${event.id}`)

    // Use the enhanced webhook processor
    const processor = new StripeWebhookProcessor()
    await processor.processEvent(event)

    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type
    })
  } catch (error) {
    console.error('Stripe webhook error:', error)

    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}