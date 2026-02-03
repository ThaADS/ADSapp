import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/mentions/[id]/viewed
 * Mark a mention as viewed by the current user
 * Only the mentioned user can mark their own mention as viewed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mentionId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Update mention only if:
    // 1. It belongs to the current user (mentioned_user_id)
    // 2. It's in the user's organization
    // 3. It hasn't been viewed yet (viewed_at IS NULL)
    const { data, error } = await supabase
      .from('mentions')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', mentionId)
      .eq('mentioned_user_id', user.id)
      .eq('organization_id', organizationId)
      .is('viewed_at', null)
      .select('id, viewed_at')
      .single()

    if (error) {
      // PGRST116 = no rows returned (already viewed or not found)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Mention not found or already viewed' },
          { status: 404 }
        )
      }
      throw error
    }

    return createSuccessResponse({ mention: data })
  } catch (error) {
    console.error('Error marking mention as viewed:', error)
    return createErrorResponse(error)
  }
}
