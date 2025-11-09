/**
 * Drip Campaigns API
 * Endpoints for managing automated message sequences
 */

import { createClient } from '@/lib/supabase/server'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/drip-campaigns
 * Get all drip campaigns for the organization
 */
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get campaigns
    const engine = new DripCampaignEngine(supabase)
    const result = await engine.getCampaigns(profile.organization_id, {
      status: status as any,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get drip campaigns:', error)
    return NextResponse.json(
      {
        error: 'Failed to get campaigns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/drip-campaigns
 * Create a new drip campaign
 */
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check permissions (only admin/owner can create campaigns)
    if (profile.role === 'agent') {
      return NextResponse.json(
        { error: 'Insufficient permissions to create campaigns' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.triggerType) {
      return NextResponse.json({ error: 'Name and trigger type are required' }, { status: 400 })
    }

    // Create campaign
    const engine = new DripCampaignEngine(supabase)
    const campaign = await engine.createCampaign(profile.organization_id, {
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig || {},
      settings: body.settings || {
        stopOnReply: true,
        respectBusinessHours: false,
        maxContactsPerDay: 1000,
      },
      createdBy: user.id,
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Failed to create drip campaign:', error)
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
