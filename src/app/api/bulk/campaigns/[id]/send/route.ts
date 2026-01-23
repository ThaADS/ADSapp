/**
 * Send Broadcast Campaign
 * POST /api/bulk/campaigns/[id]/send
 *
 * Note: Uses type assertions for bulk_campaigns and bulk_message_jobs tables
 * which exist in the database but are not yet in the generated TypeScript types.
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
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Verify permissions - use type assertion for role
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get campaign
    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaign as { id: string; status: string }

    // Verify campaign can be sent
    if (!['draft', 'scheduled'].includes(campaignData.status)) {
      return NextResponse.json(
        { error: `Campaign with status '${campaignData.status}' cannot be sent. Only draft or scheduled campaigns can be sent.` },
        { status: 400 }
      )
    }

    // Update campaign status
    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { error: updateError } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // Update all pending jobs to be ready for processing
    // @ts-expect-error - bulk_message_jobs table exists but not in generated types
    const { error: jobsError } = await supabase
      .from('bulk_message_jobs')
      .update({
        scheduled_at: new Date().toISOString(),
      })
      .eq('campaign_id', id)
      .eq('status', 'pending')

    if (jobsError) {
      throw jobsError
    }

    return createSuccessResponse({
      message: 'Campaign sent successfully. Messages will be processed shortly.',
      campaign: {
        id: campaignData.id,
        status: 'running',
      },
    })
  } catch (error) {
    console.error('Send campaign error:', error)
    return createErrorResponse(error)
  }
}
