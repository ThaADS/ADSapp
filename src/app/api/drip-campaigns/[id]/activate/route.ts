/**
 * Activate Drip Campaign API
 * POST /api/drip-campaigns/[id]/activate
 */

import { createClient } from '@/lib/supabase/server'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
        { error: 'Insufficient permissions to activate campaigns' },
        { status: 403 }
      )
    }

    // Activate campaign
    const engine = new DripCampaignEngine(supabase)
    const campaign = await engine.activateCampaign(params.id)

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Failed to activate drip campaign:', error)
    return NextResponse.json(
      {
        error: 'Failed to activate campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
