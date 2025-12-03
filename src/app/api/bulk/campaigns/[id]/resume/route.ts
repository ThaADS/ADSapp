// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 * Resume Broadcast Campaign
 * POST /api/bulk/campaigns/[id]/resume
 *
 * Note: Uses type assertions for bulk_campaigns table
 * which exists in the database but is not yet in the generated TypeScript types.
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
    const { data: campaign } = await supabase
      .from('bulk_campaigns')
      .select('status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaign as { status: string }
    if (campaignData.status !== 'paused') {
      return NextResponse.json(
        { error: 'Only paused campaigns can be resumed' },
        { status: 400 }
      )
    }

    // Resume campaign
    // @ts-expect-error - bulk_campaigns table exists but not in generated types
    const { error } = await supabase
      .from('bulk_campaigns')
      .update({
        status: 'running',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      message: 'Campaign resumed successfully',
    })
  } catch (error) {
    console.error('Resume campaign error:', error)
    return createErrorResponse(error)
  }
}
