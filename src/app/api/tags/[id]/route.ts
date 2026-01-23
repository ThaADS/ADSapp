import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export const dynamic = 'force-dynamic'

// GET /api/tags/[id] - Get tag details with contacts using this tag
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request)

    const { id } = await params
    const supabase = await createClient()

    // Get tag details using new schema
    const { data: tag, error } = await supabase
      .from('tags')
      .select(
        `
        *,
        category:tag_categories(
          id,
          name,
          description
        )
      `
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
      }
      throw error
    }

    // Get contacts with this tag via junction table
    const { data: contactsData, error: contactsError } = await supabase
      .from('contact_tags')
      .select(
        `
        contact:contacts(
          id,
          name,
          phone_number,
          whatsapp_id,
          profile_picture_url,
          created_at
        ),
        assigned_at,
        assigned_by:profiles!contact_tags_assigned_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('tag_id', id)
      .limit(100)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
    }

    // Transform contacts data
    const contacts =
      contactsData?.map(ct => ({
        ...ct.contact,
        tag_assigned_at: ct.assigned_at,
        tag_assigned_by: ct.assigned_by,
      })) || []

    return createSuccessResponse({
      tag: {
        ...tag,
        usage_count: contacts.length,
      },
      contacts,
    })
  } catch (error) {
    console.error('Error fetching tag:', error)
    return createErrorResponse(error)
  }
}

// PUT /api/tags/[id] - Update tag
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userId } = getTenantContext(request)

    const { id } = await params
    const supabase = await createClient()

    // Check user role permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can update tags.' },
        { status: 403 }
      )
    }

    // Get existing tag
    const { data: existingTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
      }
      throw fetchError
    }

    const body = await request.json()
    const { name, description, color_hex, color_class, icon, category_id, sort_order, is_active } =
      body

    // Validate new name if provided
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Tag name must be a non-empty string' }, { status: 400 })
      }

      // Check if new name conflicts with another tag
      if (name.trim() !== existingTag.name) {
        const { data: conflictTag } = await supabase
          .from('tags')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', name.trim())
          .single()

        if (conflictTag) {
          return NextResponse.json(
            { error: 'A tag with this name already exists' },
            { status: 409 }
          )
        }
      }
    }

    // Validate color_hex if provided
    if (color_hex && !/^#[0-9A-Fa-f]{6}$/i.test(color_hex)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF0000)' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined && name.trim() !== existingTag.name) {
      updateData.name = name.trim()
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }
    if (color_hex !== undefined) {
      updateData.color_hex = color_hex
    }
    if (color_class !== undefined) {
      updateData.color_class = color_class
    }
    if (icon !== undefined) {
      updateData.icon = icon || null
    }
    if (category_id !== undefined) {
      updateData.category_id = category_id || null
    }
    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    if (Object.keys(updateData).length === 0) {
      return createSuccessResponse({
        ...existingTag,
        usage_count: existingTag.usage_count || 0,
      })
    }

    // Update tag with new schema
    const { data: updatedTag, error: updateError } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(
        `
        *,
        category:tag_categories(
          id,
          name,
          description
        )
      `
      )
      .single()

    if (updateError) {
      throw updateError
    }

    return createSuccessResponse({
      ...updatedTag,
    })
  } catch (error) {
    console.error('Error updating tag:', error)
    return createErrorResponse(error)
  }
}

// DELETE /api/tags/[id] - Delete tag (soft delete or hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userId } = getTenantContext(request)

    const { id } = await params
    const supabase = await createClient()

    // Check user role permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can delete tags.' },
        { status: 403 }
      )
    }

    // Get tag to be deleted
    const { data: tag, error: fetchError } = await supabase
      .from('tags')
      .select('*, usage_count')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
      }
      throw fetchError
    }

    // Check if force delete is requested
    const { searchParams } = new URL(request.url)
    const forceDelete = searchParams.get('force') === 'true'

    if (forceDelete) {
      // Hard delete: Remove all contact_tags entries and then delete the tag
      // The ON DELETE CASCADE will handle this automatically
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (deleteError) {
        throw deleteError
      }

      return createSuccessResponse({
        message: 'Tag permanently deleted',
        removed_from_contacts: tag.usage_count || 0,
      })
    } else {
      // Soft delete: Just mark as inactive
      const { error: deactivateError } = await supabase
        .from('tags')
        .update({ is_active: false })
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (deactivateError) {
        throw deactivateError
      }

      return createSuccessResponse({
        message: 'Tag deactivated successfully',
        note: 'Tag is hidden but contact associations are preserved. Use force=true to permanently delete.',
      })
    }
  } catch (error) {
    console.error('Error deleting tag:', error)
    return createErrorResponse(error)
  }
}
