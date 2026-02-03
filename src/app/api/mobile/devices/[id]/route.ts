/**
 * Mobile Device by ID API Route
 * GET: Get device details
 * PATCH: Update device (tokens, preferences)
 * DELETE: Unregister device
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { UpdateDeviceRequest } from '@/types/mobile'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate device ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 })
    }

    // Get device
    const { data: device, error: queryError } = await supabase
      .from('device_registrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (queryError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Remove sensitive token data
    const sanitizedDevice = {
      ...device,
      fcm_token: device.fcm_token ? '***' : null,
      apns_token: device.apns_token ? '***' : null,
      expo_push_token: device.expo_push_token ? '***' : null,
    }

    return NextResponse.json({ device: sanitizedDevice })
  } catch (error) {
    console.error('Device get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate device ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 })
    }

    // Check device exists and belongs to user
    const { data: existing, error: existError } = await supabase
      .from('device_registrations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Parse request body
    const body: UpdateDeviceRequest = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {
      last_active_at: new Date().toISOString(),
    }

    if (body.device_name !== undefined) {
      updateData.device_name = body.device_name
    }

    if (body.fcm_token !== undefined) {
      updateData.fcm_token = body.fcm_token
      updateData.token_updated_at = new Date().toISOString()
    }

    if (body.apns_token !== undefined) {
      updateData.apns_token = body.apns_token
      updateData.token_updated_at = new Date().toISOString()
    }

    if (body.expo_push_token !== undefined) {
      updateData.expo_push_token = body.expo_push_token
      updateData.token_updated_at = new Date().toISOString()
    }

    if (body.notifications_enabled !== undefined) {
      updateData.notifications_enabled = body.notifications_enabled
    }

    if (body.notification_sound !== undefined) {
      updateData.notification_sound = body.notification_sound
    }

    if (body.notification_vibrate !== undefined) {
      updateData.notification_vibrate = body.notification_vibrate
    }

    if (body.quiet_hours_start !== undefined) {
      updateData.quiet_hours_start = body.quiet_hours_start
    }

    if (body.quiet_hours_end !== undefined) {
      updateData.quiet_hours_end = body.quiet_hours_end
    }

    // Update device
    const { data: device, error: updateError } = await supabase
      .from('device_registrations')
      .update(updateData)
      .eq('id', id)
      .select('id, device_id, device_os, notifications_enabled')
      .single()

    if (updateError) {
      console.error('Failed to update device:', updateError)
      return NextResponse.json(
        { error: 'Failed to update device' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      device,
    })
  } catch (error) {
    console.error('Device update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate device ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 })
    }

    // Soft delete - mark as inactive
    const { error: updateError } = await supabase
      .from('device_registrations')
      .update({
        is_active: false,
        fcm_token: null,
        apns_token: null,
        expo_push_token: null,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to unregister device:', updateError)
      return NextResponse.json(
        { error: 'Failed to unregister device' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Device delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
