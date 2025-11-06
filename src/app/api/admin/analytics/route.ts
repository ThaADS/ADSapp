/**
 * Admin Analytics API
 * Provides time-series metrics and analytics for super admin dashboard
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const now = new Date()
    let daysBack = 30

    switch (range) {
      case '7d':
        daysBack = 7
        break
      case '30d':
        daysBack = 30
        break
      case '90d':
        daysBack = 90
        break
      case '1y':
        daysBack = 365
        break
      default:
        daysBack = 30
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Fetch current period data
    const [
      currentUsers,
      previousUsers,
      currentMessages,
      previousMessages,
      currentOrgs,
      previousOrgs,
      currentRevenue,
      previousRevenue,
      timeSeriesData,
    ] = await Promise.all([
      // Current period users
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString()),

      // Previous period users
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      // Current period messages
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString()),

      // Previous period messages
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      // Current period active organizations
      supabase
        .from('organizations')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .gte('created_at', startDate.toISOString()),

      // Previous period active organizations
      supabase
        .from('organizations')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      // Current period revenue (from billing events)
      supabase
        .from('billing_events')
        .select('amount')
        .eq('event_type', 'payment_succeeded')
        .gte('created_at', startDate.toISOString()),

      // Previous period revenue
      supabase
        .from('billing_events')
        .select('amount')
        .eq('event_type', 'payment_succeeded')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      // Time series data for chart
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),
    ])

    // Calculate metrics
    const userTotal = currentUsers.count || 0
    const userPrevious = previousUsers.count || 0
    const userChange =
      userPrevious > 0 ? ((userTotal - userPrevious) / userPrevious) * 100 : userTotal > 0 ? 100 : 0

    const messageTotal = currentMessages.count || 0
    const messagePrevious = previousMessages.count || 0
    const messageChange =
      messagePrevious > 0
        ? ((messageTotal - messagePrevious) / messagePrevious) * 100
        : messageTotal > 0
          ? 100
          : 0

    const orgTotal = currentOrgs.count || 0
    const orgPrevious = previousOrgs.count || 0
    const orgChange =
      orgPrevious > 0 ? ((orgTotal - orgPrevious) / orgPrevious) * 100 : orgTotal > 0 ? 100 : 0

    // Calculate revenue (convert from cents to dollars)
    const revenueTotal =
      (currentRevenue.data || []).reduce((sum, event) => sum + (event.amount || 0), 0) / 100
    const revenuePrevious =
      (previousRevenue.data || []).reduce((sum, event) => sum + (event.amount || 0), 0) / 100
    const revenueChange =
      revenuePrevious > 0
        ? ((revenueTotal - revenuePrevious) / revenuePrevious) * 100
        : revenueTotal > 0
          ? 100
          : 0

    // Generate chart data (aggregate by day)
    const chartData: Array<{ date: string; users: number; messages: number; revenue: number }> = []
    const dateMap = new Map<string, { users: number; messages: number; revenue: number }>()

    // Get messages for time series
    const { data: messagesTimeSeries } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Get revenue for time series
    const { data: revenueTimeSeries } = await supabase
      .from('billing_events')
      .select('created_at, amount')
      .eq('event_type', 'payment_succeeded')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Aggregate users by date
    ;(timeSeriesData.data || []).forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { users: 0, messages: 0, revenue: 0 })
      }
      const entry = dateMap.get(date)!
      entry.users += 1
    })

    // Aggregate messages by date
    ;(messagesTimeSeries || []).forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { users: 0, messages: 0, revenue: 0 })
      }
      const entry = dateMap.get(date)!
      entry.messages += 1
    })

    // Aggregate revenue by date
    ;(revenueTimeSeries || []).forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { users: 0, messages: 0, revenue: 0 })
      }
      const entry = dateMap.get(date)!
      entry.revenue += (item.amount || 0) / 100
    })

    // Convert map to sorted array
    const sortedDates = Array.from(dateMap.keys()).sort()
    sortedDates.forEach(date => {
      const data = dateMap.get(date)!
      chartData.push({
        date,
        users: data.users,
        messages: data.messages,
        revenue: data.revenue,
      })
    })

    // Return analytics data
    return NextResponse.json({
      userGrowth: {
        total: userTotal,
        change: Math.round(userChange * 100) / 100,
      },
      messageVolume: {
        total: messageTotal,
        change: Math.round(messageChange * 100) / 100,
      },
      activeOrganizations: {
        total: orgTotal,
        change: Math.round(orgChange * 100) / 100,
      },
      revenue: {
        total: Math.round(revenueTotal * 100) / 100,
        change: Math.round(revenueChange * 100) / 100,
      },
      chartData,
      range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    })
  } catch (error) {
    console.error('Admin analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
