/**
 * Pause Broadcast Campaign
 * POST /api/bulk/campaigns/[id]/pause
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Verify permissions
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get campaign
    const { data: campaign } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.status !== 'running') {
      return NextResponse.json(
        { error: 'Only running campaigns can be paused' },
        { status: 400 }
      )
    }

    // Pause campaign
    const { error } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      message: 'Campaign paused successfully',
    })
  } catch (error) {
    console.error('Pause campaign error:', error)
    return createErrorResponse(error)
  }
}
