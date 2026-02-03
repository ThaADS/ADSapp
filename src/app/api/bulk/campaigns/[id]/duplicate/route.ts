/**
 * Duplicate Campaign API
 * POST /api/bulk/campaigns/[id]/duplicate
 *
 * Creates a copy of an existing campaign with draft status
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Validate campaign ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      )
    }

    // Verify permissions
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get original campaign
    const { data: original, error: fetchError } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Create duplicate with new ID and reset status
    const newCampaign = {
      id: crypto.randomUUID(),
      organization_id: original.organization_id,
      name: `${original.name} (kopie)`,
      description: original.description,
      type: original.type,
      status: 'draft',
      template_id: original.template_id,
      message: original.message,
      target_audience: original.target_audience,
      scheduling: {
        ...original.scheduling,
        type: 'immediate', // Reset to immediate for duplicate
        scheduledAt: null,
      },
      rate_limiting: original.rate_limiting,
      statistics: {
        totalTargets: original.statistics?.totalTargets || 0,
        messagesSent: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesFailed: 0,
        optOuts: 0,
        replies: 0,
        deliveryRate: 0,
        readRate: 0,
        replyRate: 0,
        failureRate: 0,
      },
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    }

    const { data: duplicated, error: insertError } = await supabase
      .from('bulk_campaigns')
      .insert(newCampaign)
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return createSuccessResponse({
      message: 'Campaign duplicated successfully',
      campaign: duplicated,
    })
  } catch (error) {
    console.error('Duplicate campaign error:', error)
    return createErrorResponse(error)
  }
}
