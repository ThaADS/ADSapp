import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

type TypedSupabaseClient = SupabaseClient<Database>

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate the data
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    // Get user context if available
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Prepare the analytics data
    const analyticsData = {
      ...data,
      user_id: user?.id || null,
      session_id: request.headers.get('x-session-id'),
      ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
      user_agent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    }

    // TODO WEEK 5+: Create performance_analytics table for advanced analytics
    // Store in database (you might want to use a separate analytics DB)
    // const { error: dbError } = await supabase
    //   .from('performance_analytics')
    //   .insert(analyticsData)

    // if (dbError) {
    //   console.error('Failed to store performance analytics:', dbError)
    //   // Don't fail the request for analytics errors
    // }

    // Send to external analytics services
    await Promise.allSettled([
      sendToGoogleAnalytics(analyticsData),
      sendToCustomAnalytics(analyticsData),
    ])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Performance analytics error:', error)

    // Return success even on error to not affect user experience
    return NextResponse.json({ success: true })
  }
}

interface AnalyticsData {
  user_id?: string | null;
  session_id?: string | null;
  ip_address?: string;
  user_agent?: string | null;
  timestamp: string;
  [key: string]: unknown;
}

async function sendToGoogleAnalytics(data: AnalyticsData) {
  // Send to Google Analytics Measurement Protocol
  if (process.env.GA_MEASUREMENT_ID) {
    try {
      const params = new URLSearchParams({
        v: '1',
        tid: process.env.GA_MEASUREMENT_ID,
        cid: data.user_id || 'anonymous',
        t: 'event',
        ec: 'Performance',
        ea: (data.type as string) || 'unknown',
        el: (data.name as string) || '',
        ev: String(Math.round((data.value as number) || (data.duration as number) || 0)),
      })

      await fetch('https://www.google-analytics.com/collect', {
        method: 'POST',
        body: params,
      })
    } catch (error) {
      console.error('GA analytics error:', error)
    }
  }
}

async function sendToCustomAnalytics(data: AnalyticsData) {
  // Send to your custom analytics service
  // This could be DataDog, New Relic, etc.

  if (process.env.CUSTOM_ANALYTICS_ENDPOINT) {
    try {
      await fetch(process.env.CUSTOM_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CUSTOM_ANALYTICS_API_KEY}`,
        },
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('Custom analytics error:', error)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const metric = searchParams.get('metric')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate time range
    const now = new Date()
    let startTime: Date

    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // TODO WEEK 5+: Implement performance_analytics table for GET endpoint
    // For now, return mock data structure until table is created
    return NextResponse.json({
      data: {
        web_vitals: {
          cls: { avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, count: 0 },
          fcp: { avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, count: 0 },
          fid: { avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, count: 0 },
          lcp: { avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, count: 0 },
          ttfb: { avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, count: 0 },
        },
        api_calls: [],
        custom_timings: [],
        errors: [],
        user_interactions: [],
        navigation_timing: [],
      },
      timeframe,
      metric,
      total_records: 0,
      note: 'Performance analytics table not yet created - returning placeholder data'
    })

    // Build query - COMMENTED OUT until performance_analytics table is created
    // let query = supabase
    //   .from('performance_analytics')
    //   .select('*')
    //   .gte('timestamp', startTime.toISOString())
    //   .lte('timestamp', now.toISOString())

    // if (metric) {
    //   query = query.eq('type', metric)
    // }

    // const { data: analytics, error } = await query
    //   .order('timestamp', { ascending: false })
    //   .limit(1000)

    // if (error) {
    //   throw error
    // }

    // // Aggregate the data
    // const aggregatedData = aggregateAnalytics(analytics || [], timeframe)

    // return NextResponse.json({
    //   data: aggregatedData,
    //   timeframe,
    //   metric,
    //   total_records: analytics?.length || 0,
    // })

  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

interface AggregatedData {
  web_vitals: {
    cls: number[];
    fcp: number[];
    fid: number[];
    lcp: number[];
    ttfb: number[];
  };
  api_calls: unknown[];
  custom_timings: unknown[];
  errors: unknown[];
  user_interactions: unknown[];
  navigation_timing: unknown[];
  [key: string]: unknown;
}

function aggregateAnalytics(data: AnalyticsData[], _timeframe: string): AggregatedData {
  const aggregated: AggregatedData = {
    web_vitals: {
      cls: [],
      fcp: [],
      fid: [],
      lcp: [],
      ttfb: [],
    },
    api_calls: [],
    custom_timings: [],
    errors: [],
    user_interactions: [],
    navigation_timing: [],
  }

  data.forEach(record => {
    switch (record.type) {
      case 'CLS':
        aggregated.web_vitals.cls.push(record.value as number)
        break
      case 'FCP':
        aggregated.web_vitals.fcp.push(record.value as number)
        break
      case 'FID':
        aggregated.web_vitals.fid.push(record.value as number)
        break
      case 'LCP':
        aggregated.web_vitals.lcp.push(record.value as number)
        break
      case 'TTFB':
        aggregated.web_vitals.ttfb.push(record.value as number)
        break
      case 'api-call':
        (aggregated.api_calls as AnalyticsData[]).push(record)
        break
      case 'custom-timing':
        (aggregated.custom_timings as AnalyticsData[]).push(record)
        break
      case 'error':
        (aggregated.errors as AnalyticsData[]).push(record)
        break
      case 'user-interaction':
        (aggregated.user_interactions as AnalyticsData[]).push(record)
        break
      case 'navigation-timing':
        (aggregated.navigation_timing as AnalyticsData[]).push(record)
        break
    }
  })

  // Calculate statistics
  Object.keys(aggregated.web_vitals).forEach(key => {
    const values = aggregated.web_vitals[key as keyof typeof aggregated.web_vitals] as number[]
    if (values.length > 0) {
      (aggregated.web_vitals as Record<string, unknown>)[key] = {
        avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        p50: percentile(values, 0.5),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.9),
        p95: percentile(values, 0.95),
        count: values.length,
      }
    }
  })

  return aggregated
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0

  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * p) - 1
  return sorted[index]
}