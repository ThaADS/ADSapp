/**
 * WhatsApp Provider Settings API
 * Purpose: Get and update WhatsApp provider settings
 * Phase: 24 - Integration & Settings
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getProviderSettingsWithConnections,
  updateProviderSettings,
} from '@/lib/integrations/whatsapp/provider-service'
import type { UpdateProviderSettingsRequest } from '@/types/whatsapp-settings'

/**
 * GET /api/integrations/whatsapp/provider
 * Get WhatsApp provider settings for the user's organization
 */
export async function GET() {
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

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get provider settings with connection details
    const response = await getProviderSettingsWithConnections(profile.organization_id)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Provider settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/integrations/whatsapp/provider
 * Update WhatsApp provider settings
 */
export async function PUT(request: NextRequest) {
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

    // Get user's profile and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Only admins and owners can update settings
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json() as UpdateProviderSettingsRequest

    // Validate active provider if provided
    if (body.activeProvider && !['cloud_api', 'twilio'].includes(body.activeProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "cloud_api" or "twilio"' },
        { status: 400 }
      )
    }

    // Validate fallback provider if provided
    if (body.fallbackProvider && !['cloud_api', 'twilio'].includes(body.fallbackProvider)) {
      return NextResponse.json(
        { error: 'Invalid fallback provider. Must be "cloud_api" or "twilio"' },
        { status: 400 }
      )
    }

    // Cannot set same provider as active and fallback
    if (body.activeProvider && body.fallbackProvider && body.activeProvider === body.fallbackProvider) {
      return NextResponse.json(
        { error: 'Fallback provider must be different from active provider' },
        { status: 400 }
      )
    }

    // Validate template preference if provided
    if (body.preferTemplatesFrom && !['active', 'cloud_api', 'twilio'].includes(body.preferTemplatesFrom)) {
      return NextResponse.json(
        { error: 'Invalid template preference. Must be "active", "cloud_api", or "twilio"' },
        { status: 400 }
      )
    }

    // Update settings
    const updatedSettings = await updateProviderSettings(profile.organization_id, body)

    // Get full response with connections
    const response = await getProviderSettingsWithConnections(profile.organization_id)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Update provider settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
