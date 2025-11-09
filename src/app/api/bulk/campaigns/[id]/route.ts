/**
 * Individual Broadcast Campaign API
 * GET/PATCH/DELETE /api/bulk/campaigns/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get job statistics
    const { data: jobs } = await supabase
      .from('bulk_message_jobs')
      .select('status, delivered_at, read_at, failed_at, error')
      .eq('campaign_id', campaign.id)

    const stats = {
      total: jobs?.length || 0,
      pending: jobs?.filter(j => j.status === 'pending').length || 0,
      sent: jobs?.filter(j => j.status === 'sent').length || 0,
      delivered: jobs?.filter(j => j.delivered_at).length || 0,
      read: jobs?.filter(j => j.read_at).length || 0,
      failed: jobs?.filter(j => j.failed_at).length || 0,
    }

    return createSuccessResponse({
      campaign: {
        ...campaign,
        statistics: stats,
      },
    })
  } catch (error) {
    console.error('Get campaign error:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(
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

    const body = await request.json()
    const supabase = await createClient()

    // Check campaign exists and belongs to organization
    const { data: existing } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Prevent modification of completed campaigns
    if (['completed', 'failed', 'cancelled'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot modify completed, failed, or cancelled campaigns' },
        { status: 400 }
      )
    }

    // Update campaign
    const { data: updated, error } = await supabase
      .from('bulk_campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse({
      campaign: updated,
      message: 'Campaign updated successfully',
    })
  } catch (error) {
    console.error('Update campaign error:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
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

    // Check campaign exists
    const { data: existing } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Soft delete - mark as cancelled instead of deleting
    const { error } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    // Cancel pending jobs
    await supabase
      .from('bulk_message_jobs')
      .update({ status: 'cancelled' })
      .eq('campaign_id', params.id)
      .eq('status', 'pending')

    return createSuccessResponse({
      message: 'Campaign cancelled successfully',
    })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return createErrorResponse(error)
  }
}
