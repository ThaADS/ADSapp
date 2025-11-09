/**
 * Individual Drip Campaign API
 * Endpoints for managing a specific campaign
 */

import { createClient } from '@/lib/supabase/server'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/drip-campaigns/[id]
 * Get a specific drip campaign with all steps
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get campaign (RLS will ensure user can only access their org's campaigns)
    const engine = new DripCampaignEngine(supabase)
    const campaign = await engine.getCampaign(params.id)

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Failed to get drip campaign:', error)
    return NextResponse.json(
      {
        error: 'Failed to get campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/drip-campaigns/[id]
 * Update a drip campaign
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Check permissions
    if (profile?.role === 'agent') {
      return NextResponse.json(
        { error: 'Insufficient permissions to update campaigns' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Update campaign
    const { data, error } = await supabase
      .from('drip_campaigns')
      .update({
        name: body.name,
        description: body.description,
        trigger_config: body.triggerConfig,
        settings: body.settings,
        updated_at: new Date(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update drip campaign:', error)
    return NextResponse.json(
      {
        error: 'Failed to update campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/drip-campaigns/[id]
 * Delete (archive) a drip campaign
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Check permissions (only admin/owner)
    if (profile?.role === 'agent') {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete campaigns' },
        { status: 403 }
      )
    }

    // Archive campaign (don't actually delete due to foreign keys)
    const { error } = await supabase
      .from('drip_campaigns')
      .update({
        status: 'archived',
        is_active: false,
        updated_at: new Date(),
      })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to archive campaign: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete drip campaign:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
