/**
 * Individual Broadcast Campaign API
 * GET/PATCH/DELETE /api/bulk/campaigns/[id]
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

// Type definitions for bulk campaign tables (not in generated types yet)
interface BulkCampaign {
  id: string
  organization_id: string
  name: string
  description?: string
  type: string
  status: string
  template_id?: string
  message?: Record<string, unknown>
  target_audience: Record<string, unknown>
  scheduling: Record<string, unknown>
  rate_limiting: Record<string, unknown>
  statistics?: Record<string, unknown>
  created_by?: string
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

interface BulkMessageJob {
  id: string
  campaign_id: string
  contact_id: string
  whatsapp_id: string
  status: string
  message_id?: string
  scheduled_at: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  failed_at?: string
  error?: string
  retry_count: number
  created_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const supabase = await createClient()

    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { data: campaign, error } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaign as BulkCampaign

    // @ts-expect-error - bulk_message_jobs table exists but not in generated types
    const { data: jobs } = await supabase
      .from('bulk_message_jobs')
      .select('status, delivered_at, read_at, failed_at, error')
      .eq('campaign_id', campaignData.id)

    const jobsData = (jobs || []) as BulkMessageJob[]
    const stats = {
      total: jobsData.length,
      pending: jobsData.filter(j => j.status === 'pending').length,
      sent: jobsData.filter(j => j.status === 'sent').length,
      delivered: jobsData.filter(j => j.delivered_at).length,
      read: jobsData.filter(j => j.read_at).length,
      failed: jobsData.filter(j => j.failed_at).length,
    }

    return createSuccessResponse({
      campaign: {
        ...campaignData,
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

    const body = await request.json()
    const supabase = await createClient()

    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { data: existing } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const existingData = existing as { status: string }

    // Prevent modification of completed campaigns
    if (['completed', 'failed', 'cancelled'].includes(existingData.status)) {
      return NextResponse.json(
        { error: 'Cannot modify completed, failed, or cancelled campaigns' },
        { status: 400 }
      )
    }

    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { data: updated, error } = await supabase
      .from('bulk_campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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

    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { data: existing } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { error } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    // Cancel pending jobs
    // @ts-expect-error - bulk_message_jobs table exists but not in generated types
    await supabase
      .from('bulk_message_jobs')
      .update({ status: 'cancelled' })
      .eq('campaign_id', id)
      .eq('status', 'pending')

    return createSuccessResponse({
      message: 'Campaign cancelled successfully',
    })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return createErrorResponse(error)
  }
}
