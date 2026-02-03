/**
 * Push Notification Test API Route
 * POST: Send a test push notification to a user's devices
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendUserPushNotification } from '@/lib/push'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional message from body
    const body = await request.json().catch(() => ({}))
    const title = body.title || 'Test Notification'
    const message = body.message || 'This is a test push notification from ADSapp'

    // Send test notification
    const result = await sendUserPushNotification({
      user_id: user.id,
      title,
      body: message,
      source_type: 'system',
      data: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      devices_sent: result.devices_sent,
      message: result.devices_sent === 0
        ? 'No active devices found. Register a device first.'
        : `Test notification sent to ${result.devices_sent} device(s)`,
    })
  } catch (error) {
    console.error('Push test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
