/**
 * Send Broadcast Campaign
 * POST /api/bulk/campaigns/[id]/send
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
  { params }: { params: { id: string } }
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
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify campaign can be sent
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Campaign with status '${campaign.status}' cannot be sent. Only draft or scheduled campaigns can be sent.` },
        { status: 400 }
      )
    }

    // Update campaign status
    const { error: updateError } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    // Update all pending jobs to be ready for processing
    const { error: jobsError } = await supabase
      .from('bulk_message_jobs')
      .update({
        scheduled_at: new Date().toISOString(),
      })
      .eq('campaign_id', params.id)
      .eq('status', 'pending')

    if (jobsError) {
      throw jobsError
    }

    return createSuccessResponse({
      message: 'Campaign sent successfully. Messages will be processed shortly.',
      campaign: {
        id: campaign.id,
        status: 'running',
      },
    })
  } catch (error) {
    console.error('Send campaign error:', error)
    return createErrorResponse(error)
  }
}
