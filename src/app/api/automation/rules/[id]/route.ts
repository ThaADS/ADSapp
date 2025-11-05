// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(
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

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select(`
        *,
        profiles:created_by (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Automation rule not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return createSuccessResponse({
      ...rule,
      execution_count: 0, // TODO: Implement execution logging
      last_executed_at: null
    })

  } catch (error) {
    console.error('Error fetching automation rule:', error)
    return createErrorResponse(error)
  }
}

export async function PUT(
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
    const body = await request.json();
    const {
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      is_active
    } = body

    const supabase = await createClient()

    // Check if rule exists
    const { data: existingRule, error: fetchError } = await supabase
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

    // Build update object
    const updateData: any = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Rule name must be a non-empty string' },
          { status: 400 }
        )
      }

      // Check for duplicate name
      if (name.trim() !== existingRule.name) {
        const { data: conflictRule } = await supabase
          .from('automation_rules')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', name.trim())
          .single()

        if (conflictRule) {
          return NextResponse.json(
            { error: 'A rule with this name already exists' },
            { status: 409 }
          )
        }
      }

      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description || null
    }

    if (trigger_type !== undefined) {
      if (!['keyword', 'business_hours', 'unassigned', 'first_message'].includes(trigger_type)) {
        return NextResponse.json(
          { error: 'Invalid trigger_type. Must be one of: keyword, business_hours, unassigned, first_message' },
          { status: 400 }
        )
      }
      updateData.trigger_type = trigger_type
    }

    if (trigger_conditions !== undefined) {
      if (typeof trigger_conditions !== 'object') {
        return NextResponse.json(
          { error: 'trigger_conditions must be an object' },
          { status: 400 }
        )
      }
      updateData.trigger_conditions = trigger_conditions
    }

    if (actions !== undefined) {
      if (!Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json(
          { error: 'actions must be a non-empty array' },
          { status: 400 }
        )
      }

      // Validate actions structure
      for (const action of actions) {
        if (!action.type || !['send_message', 'add_tag', 'assign_agent', 'create_ticket'].includes(action.type)) {
          return NextResponse.json(
            { error: 'Invalid action type. Must be one of: send_message, add_tag, assign_agent, create_ticket' },
            { status: 400 }
          )
        }

        if (!action.params || typeof action.params !== 'object') {
          return NextResponse.json(
            { error: 'Each action must have a params object' },
            { status: 400 }
          )
        }
      }

      updateData.actions = actions
    }

    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active must be a boolean' },
          { status: 400 }
        )
      }
      updateData.is_active = is_active
    }

    if (Object.keys(updateData).length === 0) {
      return createSuccessResponse({
        ...existingRule,
        execution_count: 0,
        last_executed_at: null
      })
    }

    // Update rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('automation_rules')
      .update(updateData)
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
      last_executed_at: null
    })

  } catch (error) {
    console.error('Error updating automation rule:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
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

    // Check if rule exists
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

    // Delete the rule
    const { error: deleteError } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (deleteError) {
      throw deleteError
    }

    return createSuccessResponse({
      message: 'Automation rule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return createErrorResponse(error)
  }
}
