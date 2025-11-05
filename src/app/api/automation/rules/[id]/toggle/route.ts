// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);

    const { id } = await params
    const supabase = await createClient()

    // Get current rule
    const { data: rule, error: fetchError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Automation rule not found' },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Toggle is_active status
    const { data: updatedRule, error: updateError } = await supabase
      .from('automation_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        profiles:created_by (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    return createSuccessResponse({
      ...updatedRule,
      execution_count: 0,
      last_executed_at: null,
      message: `Rule ${updatedRule.is_active ? 'enabled' : 'disabled'} successfully`
    })

  } catch (error) {
    console.error('Error toggling automation rule:', error)
    return createErrorResponse(error)
  }
}
