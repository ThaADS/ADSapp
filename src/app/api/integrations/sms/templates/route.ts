/**
 * SMS Templates API Route
 * GET: List SMS templates
 * POST: Create SMS template
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { CreateSMSTemplateRequest, SMSTemplate } from '@/types/sms'

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') !== 'false'

    // Build query
    let query = supabase
      .from('sms_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error: queryError } = await query

    if (queryError) {
      console.error('Failed to fetch SMS templates:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('SMS templates GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body: CreateSMSTemplateRequest = await request.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'Template body is required' }, { status: 400 })
    }

    // Validate body length (SMS limit)
    if (body.body.length > 16000) {
      return NextResponse.json(
        { error: 'Template body exceeds maximum length of 16000 characters' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('name', body.name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      )
    }

    // Extract variables from body (format: {{variable_name}})
    const variableMatches = body.body.match(/\{\{(\w+)\}\}/g) || []
    const detectedVariables = [...new Set(variableMatches.map((m) => m.replace(/[{}]/g, '')))]

    // Merge with provided variables
    const variables = body.variables || detectedVariables.map((name) => ({
      name,
      required: true,
      default: '',
    }))

    // Create template
    const { data: template, error: insertError } = await supabase
      .from('sms_templates')
      .insert({
        organization_id: profile.organization_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        body: body.body,
        variables,
        category: body.category?.trim() || null,
        tags: body.tags || [],
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create SMS template:', insertError)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('SMS templates POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
