/**
 * Metrics API Endpoint
 *
 * Expose OpenTelemetry metrics for monitoring and alerting
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { createClient } from '@/lib/supabase/server'

async function handler(request: NextRequest, context: any) {
  const { user, profile } = context

  try {
    const supabase = await createClient()

    // Only super admins can access raw metrics
    const isSuperAdmin = profile.role === 'super_admin'

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get metrics from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // Fetch performance metrics
    const { data: performanceMetrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })
      .limit(1000)

    // Fetch error logs
    const { data: errorLogs } = await supabase
      .from('error_logs')
      .select('*')
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })
      .limit(100)

    // Calculate percentiles
    const durations = (performanceMetrics || []).map(m => m.duration_ms)
    const p50 = calculatePercentile(durations, 0.5)
    const p95 = calculatePercentile(durations, 0.95)
    const p99 = calculatePercentile(durations, 0.99)

    // Calculate error rate
    const totalRequests = performanceMetrics?.length || 0
    const totalErrors = errorLogs?.length || 0
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    // Group metrics by endpoint
    const endpointMetrics = groupByEndpoint(performanceMetrics || [])

    return NextResponse.json({
      period: {
        start: oneHourAgo,
        end: new Date().toISOString(),
      },
      performance: {
        totalRequests,
        p50Duration: Math.round(p50),
        p95Duration: Math.round(p95),
        p99Duration: Math.round(p99),
        avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      },
      errors: {
        total: totalErrors,
        rate: Math.round(errorRate * 100) / 100,
      },
      endpoints: endpointMetrics,
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * percentile) - 1
  return sorted[index] || 0
}

function groupByEndpoint(metrics: any[]) {
  const grouped: Record<string, any> = {}

  metrics.forEach(metric => {
    const endpoint = metric.endpoint || 'unknown'
    if (!grouped[endpoint]) {
      grouped[endpoint] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
      }
    }

    grouped[endpoint].count++
    grouped[endpoint].totalDuration += metric.duration_ms
    grouped[endpoint].minDuration = Math.min(grouped[endpoint].minDuration, metric.duration_ms)
    grouped[endpoint].maxDuration = Math.max(grouped[endpoint].maxDuration, metric.duration_ms)

    if (metric.status_code >= 400) {
      grouped[endpoint].errors++
    }
  })

  // Calculate averages
  Object.keys(grouped).forEach(endpoint => {
    const data = grouped[endpoint]
    data.avgDuration = Math.round(data.totalDuration / data.count)
    data.errorRate = Math.round((data.errors / data.count) * 10000) / 100
    delete data.totalDuration
  })

  return grouped
}

export const GET = withAuth(handler)
