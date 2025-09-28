import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { alertManager } from '@/lib/monitoring/alerts'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved')
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')

    // Get user context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let alerts = alertManager.getAlerts(
      resolved === 'true' ? true : resolved === 'false' ? false : undefined
    )

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }

    // Filter by type
    if (type) {
      alerts = alerts.filter(alert => alert.type === type)
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const paginatedAlerts = alerts.slice(offset, offset + limit)

    return NextResponse.json({
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: alerts.length,
        totalPages: Math.ceil(alerts.length / limit)
      }
    })

  } catch (error) {
    console.error('Alerts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const alert = await request.json()

    // Validate alert data
    if (!alert.type || !alert.severity || !alert.title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store alert in database
    const supabase = await createClient()
    const { error } = await supabase
      .from('alerts')
      .insert({
        ...alert,
        timestamp: new Date().toISOString(),
        resolved: false
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Alert storage error:', error)
    return NextResponse.json(
      { error: 'Failed to store alert' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')
    const { resolved } = await request.json()

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    // Get user context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update alert
    if (resolved !== undefined) {
      alertManager.resolveAlert(alertId)

      // Update in database
      const { error } = await supabase
        .from('alerts')
        .update({
          resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolved_by: user.id
        })
        .eq('id', alertId)

      if (error) {
        throw error
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Alert update error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}