/**
 * Drip Campaign Steps API
 * POST /api/drip-campaigns/[id]/steps
 */

import { createClient } from '@/lib/supabase/server'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/drip-campaigns/[id]/steps
 * Add a new step to the campaign
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
        { error: 'Insufficient permissions to modify campaigns' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (
      !body.name ||
      !body.stepOrder ||
      !body.delayType ||
      body.delayValue === undefined ||
      !body.messageType
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: name, stepOrder, delayType, delayValue, messageType' },
        { status: 400 }
      )
    }

    // Create step
    const engine = new DripCampaignEngine(supabase)
    const step = await engine.addStep(id, {
      stepOrder: body.stepOrder,
      name: body.name,
      delayType: body.delayType,
      delayValue: body.delayValue,
      messageType: body.messageType,
      templateId: body.templateId,
      messageContent: body.messageContent,
      mediaUrl: body.mediaUrl,
      templateVariables: body.templateVariables,
      conditions: body.conditions || [],
      settings: body.settings || {
        sendOnlyDuringBusinessHours: false,
        skipWeekends: false,
      },
    })

    return NextResponse.json(step, { status: 201 })
  } catch (error) {
    console.error('Failed to add campaign step:', error)
    return NextResponse.json(
      {
        error: 'Failed to add step',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
