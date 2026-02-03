/**
 * Twilio WhatsApp Templates API
 * Purpose: List and manage templates
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getTemplatesForOrganization,
  syncTwilioTemplates,
} from '@/lib/integrations/twilio-whatsapp/template-sync'

/**
 * GET /api/integrations/twilio-whatsapp/templates
 * List all templates for the organization
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get templates
    const templates = await getTemplatesForOrganization(profile.organization_id)

    // Get sync status
    const { data: connection } = await supabase
      .from('twilio_whatsapp_connections')
      .select('id, last_verified_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    return NextResponse.json({
      templates,
      syncStatus: connection
        ? {
            connectionId: connection.id,
            lastSyncedAt: connection.last_verified_at,
          }
        : null,
    })
  } catch (error) {
    console.error('Templates list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/twilio-whatsapp/templates
 * Trigger template sync
 */
export async function POST() {
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

    // Get user's organization and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get active connection
    const { data: connection } = await supabase
      .from('twilio_whatsapp_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (!connection) {
      return NextResponse.json(
        { error: 'No active Twilio WhatsApp connection found' },
        { status: 404 }
      )
    }

    // Sync templates
    const result = await syncTwilioTemplates(connection.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      added: result.added,
      updated: result.updated,
      removed: result.removed,
    })
  } catch (error) {
    console.error('Templates sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
