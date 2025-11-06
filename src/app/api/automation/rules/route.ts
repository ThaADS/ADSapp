// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
  validatePagination,
} from '@/lib/api-utils'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request)

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('is_active')
    const triggerType = searchParams.get('trigger_type')
    const { page, limit, offset } = validatePagination(request)

    const supabase = await createClient()

    let query = supabase
      .from('automation_rules')
      .select(
        `
        id,
        name,
        description,
        trigger_type,
        trigger_conditions,
        actions,
        is_active,
        created_by,
        created_at,
        updated_at,
        profiles:created_by (
          id,
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', organizationId)

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (triggerType) {
      query = query.eq('trigger_type', triggerType)
    }

    const {
      data: rules,
      error,
      count,
    } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Add execution count for each rule (this would come from a separate logs table in production)
    const rulesWithStats = (rules || []).map(rule => ({
      ...rule,
      execution_count: 0, // TODO: Implement execution logging
      last_executed_at: null,
    }))

    return createSuccessResponse({
      rules: rulesWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    })
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userId } = getTenantContext(request)

    const body = await request.json()
    const { name, description, trigger_type, trigger_conditions, actions, is_active = true } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rule name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (
      !trigger_type ||
      !['keyword', 'business_hours', 'unassigned', 'first_message'].includes(trigger_type)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid trigger_type. Must be one of: keyword, business_hours, unassigned, first_message',
        },
        { status: 400 }
      )
    }

    if (!trigger_conditions || typeof trigger_conditions !== 'object') {
      return NextResponse.json(
        { error: 'trigger_conditions is required and must be an object' },
        { status: 400 }
      )
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'actions is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate actions structure
    for (const action of actions) {
      if (
        !action.type ||
        !['send_message', 'add_tag', 'assign_agent', 'create_ticket'].includes(action.type)
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid action type. Must be one of: send_message, add_tag, assign_agent, create_ticket',
          },
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

    const supabase = await createClient()

    // Check for duplicate rule name
    const { data: existingRule } = await supabase
      .from('automation_rules')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', name.trim())
      .single()

    if (existingRule) {
      return NextResponse.json({ error: 'A rule with this name already exists' }, { status: 409 })
    }

    // Create automation rule
    const { data: rule, error } = await supabase
      .from('automation_rules')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description || null,
        trigger_type,
        trigger_conditions,
        actions,
        is_active,
        created_by: userId,
      })
      .select(
        `
        *,
        profiles:created_by (
          id,
          full_name,
          email
        )
      `
      )
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(
      {
        ...rule,
        execution_count: 0,
        last_executed_at: null,
      },
      201
    )
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return createErrorResponse(error)
  }
}
