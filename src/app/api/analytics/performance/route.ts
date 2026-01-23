/**
 * Performance Analytics Endpoint
 *
 * Collects Web Vitals and custom performance metrics from the client
 * Stores data for analysis and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Parse performance data
    const body = await request.json()
    const {
      type,
      name,
      value,
      id,
      navigationType,
      timestamp,
      url,
      userAgent,
      metrics,
    } = body

    // Get user info if authenticated (optional for performance tracking)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let organizationId = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      organizationId = profile?.organization_id
    }

    // Store in web_vitals_tracking table (if it exists)
    // Otherwise, just log to console for now
    try {
      const { error } = await supabase.from('web_vitals_tracking').insert({
        organization_id: organizationId,
        user_id: user?.id,
        metric_name: name || type,
        metric_value: value,
        metric_id: id,
        navigation_type: navigationType,
        page_url: url,
        user_agent: userAgent,
        additional_data: metrics || {},
        created_at: new Date(timestamp || Date.now()).toISOString(),
      })

      if (error) {
        // Table might not exist, log to console instead
        console.log('[Performance Metric]', {
          type,
          name,
          value,
          url,
          organizationId,
        })
      }
    } catch (dbError) {
      // Fallback: Just log to console
      console.log('[Performance Metric]', {
        type,
        name: name || type,
        value,
        url,
        user: user?.id || 'anonymous',
        org: organizationId || 'none',
      })
    }

    // Always return success (don't let performance tracking break the app)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    // Silently fail - performance tracking should never break the app
    console.error('[Performance API] Error:', error)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'performance-analytics',
    accepts: ['POST'],
  })
}
