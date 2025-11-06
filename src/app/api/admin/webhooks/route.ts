/**
 * Admin Webhooks Main API
 * Provides webhook event listing and management for super admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'
import { WebhookHandler } from '@/lib/billing/webhook-handler'

export async function GET(request: NextRequest) {
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // TODO: Re-enable when webhook_events table is created
    // The table doesn't exist yet, so return empty results
    console.log('Webhook events table not yet created - returning empty results')

    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('eventType') || undefined
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Return empty results for now
    const events: any[] = []
    const count = 0
    const statistics: any[] = []

    /* ORIGINAL CODE - Uncomment when tables exist:
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('webhook_events')
      .select('*', { count: 'exact' });

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (status) {
      query = query.eq('status', status as any);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: events, error: eventsError, count } = await query;

    if (eventsError) {
      throw new Error(`Failed to fetch webhook events: ${eventsError.message}`);
    }

    // Get statistics
    const webhookHandler = new WebhookHandler();
    const statistics = await webhookHandler.getWebhookStatistics();
    */

    return NextResponse.json({
      success: true,
      events: events || [],
      statistics,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
      filters: {
        available: {
          eventTypes: [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'customer.subscription.trial_will_end',
            'invoice.paid',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'invoice.created',
            'invoice.finalized',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'payment_intent.requires_action',
            'payment_intent.canceled',
            'charge.succeeded',
            'charge.failed',
            'charge.refunded',
            'charge.dispute.created',
            'customer.created',
            'customer.updated',
            'customer.deleted',
            'checkout.session.completed',
            'checkout.session.expired',
          ],
          statuses: ['processing', 'completed', 'failed'],
        },
        applied: { eventType, status },
      },
    })
  } catch (error) {
    const err = error as Error
    console.error('Admin webhooks API error:', err)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    )
  }
}
