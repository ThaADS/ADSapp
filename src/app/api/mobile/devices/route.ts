/**
 * Mobile Devices API Route
 * POST: Register a new device
 * GET: List user's devices
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import {
  RegisterDeviceRequest,
  DeviceRegistrationResponse,
  DeviceRegistration,
} from '@/types/mobile'

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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Parse request body
    const body: RegisterDeviceRequest = await request.json()

    // Validate required fields
    if (!body.device_id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 })
    }

    if (!body.device_os || !['ios', 'android', 'web'].includes(body.device_os)) {
      return NextResponse.json(
        { error: 'Valid device_os is required (ios, android, web)' },
        { status: 400 }
      )
    }

    // Validate device ID length
    const deviceIdValidation = QueryValidators.text(body.device_id, 255)
    if (!deviceIdValidation.isValid) {
      return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 })
    }

    // Upsert device registration
    const { data: device, error: upsertError } = await supabase
      .from('device_registrations')
      .upsert(
        {
          user_id: user.id,
          organization_id: profile.organization_id,
          device_id: body.device_id,
          device_name: body.device_name || null,
          device_model: body.device_model || null,
          device_os: body.device_os,
          device_os_version: body.device_os_version || null,
          app_version: body.app_version || null,
          fcm_token: body.fcm_token || null,
          apns_token: body.apns_token || null,
          expo_push_token: body.expo_push_token || null,
          token_updated_at: body.fcm_token || body.apns_token || body.expo_push_token
            ? new Date().toISOString()
            : null,
          is_active: true,
          last_active_at: new Date().toISOString(),
          notifications_enabled: true,
        },
        { onConflict: 'user_id,device_id' }
      )
      .select('id, device_id, device_os, notifications_enabled')
      .single()

    if (upsertError) {
      console.error('Failed to register device:', upsertError)
      return NextResponse.json(
        { error: 'Failed to register device' },
        { status: 500 }
      )
    }

    const response: DeviceRegistrationResponse = {
      success: true,
      device: {
        id: device.id,
        device_id: device.device_id,
        device_os: device.device_os,
        notifications_enabled: device.notifications_enabled,
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Device registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's devices
    const { data: devices, error: queryError } = await supabase
      .from('device_registrations')
      .select('id, device_id, device_name, device_model, device_os, device_os_version, app_version, is_active, notifications_enabled, last_active_at, created_at')
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false })

    if (queryError) {
      console.error('Failed to fetch devices:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      )
    }

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Device list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
