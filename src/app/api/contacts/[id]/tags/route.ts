/**
 * Contact Tags API Route
 *
 * GET  /api/contacts/[id]/tags - List tags for a contact
 * POST /api/contacts/[id]/tags - Assign a tag to a contact
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/contacts/[id]/tags
 * List all tags assigned to a contact
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: contactId } = await params
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify contact belongs to organization
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Get tags for this contact via junction table
    const { data: contactTags, error: tagsError } = await supabase
      .from('contact_tags')
      .select(`
        tag_id,
        assigned_at,
        assigned_by,
        tags (
          id,
          name,
          color_hex,
          color_class,
          icon,
          is_active
        )
      `)
      .eq('contact_id', contactId)

    if (tagsError) {
      console.error('Failed to fetch contact tags:', tagsError)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    // Format response
    const tags = (contactTags || [])
      .filter((ct: any) => ct.tags?.is_active !== false)
      .map((ct: any) => ({
        id: ct.tags.id,
        name: ct.tags.name,
        color_hex: ct.tags.color_hex,
        color_class: ct.tags.color_class,
        icon: ct.tags.icon,
        assigned_at: ct.assigned_at,
        assigned_by: ct.assigned_by,
      }))

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Contact tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/contacts/[id]/tags
 * Assign a tag to a contact
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: contactId } = await params
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    // Verify contact belongs to organization
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Verify tag belongs to organization and is active
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', tagId)
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (tagError || !tag) {
      return NextResponse.json({ error: 'Tag not found or inactive' }, { status: 404 })
    }

    // Check if tag is already assigned
    const { data: existing } = await supabase
      .from('contact_tags')
      .select('id')
      .eq('contact_id', contactId)
      .eq('tag_id', tagId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Tag already assigned to this contact' }, { status: 409 })
    }

    // Assign tag to contact
    const { data: contactTag, error: insertError } = await supabase
      .from('contact_tags')
      .insert({
        contact_id: contactId,
        tag_id: tagId,
        assigned_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to assign tag:', insertError)
      return NextResponse.json({ error: 'Failed to assign tag' }, { status: 500 })
    }

    // Update tag usage count
    await supabase.rpc('increment_tag_usage', { tag_id: tagId }).catch(() => {
      // Ignore if RPC doesn't exist
    })

    return NextResponse.json({
      success: true,
      contactTag: {
        contact_id: contactId,
        tag_id: tagId,
        tag_name: tag.name,
        assigned_at: contactTag.assigned_at,
      },
    })
  } catch (error) {
    console.error('Contact tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
