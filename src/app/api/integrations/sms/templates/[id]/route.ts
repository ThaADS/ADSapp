/**
 * SMS Template by ID API Route
 * GET: Get template details
 * PATCH: Update template
 * DELETE: Delete template
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { UpdateSMSTemplateRequest } from '@/types/sms'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Validate template ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    // Get template
    const { data: template, error: queryError } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (queryError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('SMS template GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can manage templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate template ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    // Check template exists
    const { data: existing, error: existError } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (existError || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Parse request body
    const body: UpdateSMSTemplateRequest = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Template name cannot be empty' }, { status: 400 })
      }

      // Check for duplicate name
      const { data: duplicate } = await supabase
        .from('sms_templates')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', body.name.trim())
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 400 }
        )
      }

      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.body !== undefined) {
      if (!body.body.trim()) {
        return NextResponse.json({ error: 'Template body cannot be empty' }, { status: 400 })
      }
      if (body.body.length > 16000) {
        return NextResponse.json(
          { error: 'Template body exceeds maximum length of 16000 characters' },
          { status: 400 }
        )
      }
      updateData.body = body.body
    }

    if (body.variables !== undefined) {
      updateData.variables = body.variables
    }

    if (body.category !== undefined) {
      updateData.category = body.category?.trim() || null
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    // Update template
    const { data: template, error: updateError } = await supabase
      .from('sms_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update SMS template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('SMS template PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can manage templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate template ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('sms_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Failed to delete SMS template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS template DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
