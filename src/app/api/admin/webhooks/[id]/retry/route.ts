/**
 * Admin Webhook Retry API
 * Allows super admins to manually retry failed webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminMiddleware } from '@/lib/middleware';
import { WebhookHandler } from '@/lib/billing/webhook-handler';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const supabase = await createClient();
    const { id: eventId } = await context.params;

    // Validate event ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID format' },
        { status: 400 }
      );
    }

    // Check if webhook event exists and is in a retryable state
    const { data: webhookEvent, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !webhookEvent) {
      return NextResponse.json(
        { error: 'Webhook event not found' },
        { status: 404 }
      );
    }

    // Only allow retry for failed events
    if (webhookEvent.status !== 'failed') {
      return NextResponse.json(
        {
          error: 'Can only retry failed events',
          currentStatus: webhookEvent.status
        },
        { status: 400 }
      );
    }

    // Check retry count limit
    const maxRetries = 5;
    if (webhookEvent.retry_count >= maxRetries) {
      return NextResponse.json(
        {
          error: 'Maximum retry attempts exceeded',
          retryCount: webhookEvent.retry_count,
          maxRetries
        },
        { status: 400 }
      );
    }

    // Perform retry
    const webhookHandler = new WebhookHandler();
    const result = await webhookHandler.retryFailedWebhook(eventId, maxRetries);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook event retried successfully',
        eventId: result.eventId,
        processed: result.processed,
        alreadyProcessed: result.alreadyProcessed
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          retryable: result.retryable,
          eventId: result.eventId
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const err = error as Error;
    console.error('Admin webhook retry API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check retry status
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const supabase = await createClient();
    const { id: eventId } = await context.params;

    // Validate event ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID format' },
        { status: 400 }
      );
    }

    // Get webhook event details
    const { data: webhookEvent, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !webhookEvent) {
      return NextResponse.json(
        { error: 'Webhook event not found' },
        { status: 404 }
      );
    }

    // Determine if event can be retried
    const maxRetries = 5;
    const canRetry = (
      webhookEvent.status === 'failed' &&
      webhookEvent.retry_count < maxRetries
    );

    return NextResponse.json({
      event: {
        id: webhookEvent.id,
        stripeEventId: webhookEvent.stripe_event_id,
        eventType: webhookEvent.event_type,
        status: webhookEvent.status,
        retryCount: webhookEvent.retry_count,
        errorMessage: webhookEvent.error_message,
        createdAt: webhookEvent.created_at,
        processedAt: webhookEvent.processed_at,
        nextRetryAt: webhookEvent.next_retry_at
      },
      retryInfo: {
        canRetry,
        maxRetries,
        remainingRetries: Math.max(0, maxRetries - webhookEvent.retry_count),
        reason: !canRetry
          ? webhookEvent.status === 'completed'
            ? 'Event already completed'
            : webhookEvent.status === 'processing'
            ? 'Event currently processing'
            : 'Maximum retries exceeded'
          : null
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('Admin webhook retry check API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
