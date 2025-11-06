/**
 * Admin Webhooks Statistics API
 * Provides webhook processing statistics for super admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()

    // Get webhook event counts by status
    const [totalEvents, completedEvents, failedEvents, processingEvents] = await Promise.all([
      supabase.from('webhook_events').select('id', { count: 'exact' }),

      supabase.from('webhook_events').select('id', { count: 'exact' }).eq('status', 'completed'),

      supabase.from('webhook_events').select('id', { count: 'exact' }).eq('status', 'failed'),

      supabase.from('webhook_events').select('id', { count: 'exact' }).eq('status', 'processing'),
    ])

    // Get processing time statistics (for completed events only)
    const { data: completedEventsWithTiming } = await supabase
      .from('webhook_events')
      .select('created_at, processed_at')
      .eq('status', 'completed')
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(1000)

    // Calculate average processing time
    let avgProcessingTime = 0
    if (completedEventsWithTiming && completedEventsWithTiming.length > 0) {
      const processingTimes = completedEventsWithTiming.map(event => {
        const created = new Date(event.created_at).getTime()
        const processed = new Date(event.processed_at!).getTime()
        return processed - created
      })

      const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0)
      avgProcessingTime = Math.round(totalProcessingTime / processingTimes.length)
    }

    // Get event type distribution
    const { data: eventsByType } = await supabase
      .from('webhook_events')
      .select('event_type, status')

    const eventTypeStats = (eventsByType || []).reduce(
      (acc, event) => {
        if (!acc[event.event_type]) {
          acc[event.event_type] = {
            total: 0,
            completed: 0,
            failed: 0,
            pending: 0,
            processing: 0,
          }
        }
        acc[event.event_type].total += 1
        acc[event.event_type][event.status] += 1
        return acc
      },
      {} as Record<string, any>
    )

    // Get recent errors (last 24 hours)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: recentErrors } = await supabase
      .from('webhook_events')
      .select('id, event_type, error_message, created_at')
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      total: totalEvents.count || 0,
      successful: completedEvents.count || 0,
      failed: failedEvents.count || 0,
      pending: 0,
      processing: processingEvents.count || 0,
      avgProcessingTime,
      eventTypeStats,
      recentErrors: recentErrors || [],
      successRate:
        totalEvents.count && totalEvents.count > 0
          ? Math.round(((completedEvents.count || 0) / totalEvents.count) * 10000) / 100
          : 0,
    })
  } catch (error) {
    console.error('Admin webhook stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
