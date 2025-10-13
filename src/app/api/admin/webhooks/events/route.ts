/**
 * Admin Webhook Events API (S-003)
 * ==================================
 * Super admin endpoint for viewing webhook events and statistics.
 *
 * GET /api/admin/webhooks/events - List webhook events
 *
 * Security: Super admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookHandler } from '@/lib/billing/webhook-handler';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify super admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Build query
    let query = supabase
      .from('webhook_events')
      .select('*', { count: 'exact' });

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: events, error: eventsError, count } = await query;

    if (eventsError) {
      throw new Error(`Failed to fetch webhook events: ${eventsError.message}`);
    }

    // 5. Get statistics
    const webhookHandler = new WebhookHandler();
    const statistics = await webhookHandler.getWebhookStatistics();

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
    });
  } catch (error) {
    const err = error as Error;
    console.error('Webhook events API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
