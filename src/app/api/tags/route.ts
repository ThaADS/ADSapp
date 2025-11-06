// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

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

export async function GET(request: NextRequest) {
  try {
    // 🔧 FIX: Query organization directly instead of relying on middleware headers
    // Root cause: Next.js 15 doesn't propagate headers when middleware returns null
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const categoryId = searchParams.get('category_id')

    let query = supabase
      .from('tags')
      .select(
        `
        id,
        name,
        description,
        color_hex,
        color_class,
        icon,
        sort_order,
        usage_count,
        is_active,
        created_at,
        updated_at,
        category:tag_categories(
          id,
          name,
          description
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    // Filter by active status
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Filter by category
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: tags, error } = await query

    if (error) {
      throw error
    }

    return createSuccessResponse({
      tags: tags || [],
      total: tags?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔧 FIX: Query organization directly instead of relying on middleware headers
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id
    const userId = user.id

    const supabase = await createClient()

    // Check user role permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can create tags.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, color_hex, color_class, icon, category_id, sort_order } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate color_hex format if provided
    if (color_hex && !/^#[0-9A-Fa-f]{6}$/i.test(color_hex)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF0000)' },
        { status: 400 }
      )
    }

    // Check if tag with this name already exists for the organization
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('name', name.trim())
      .single()

    if (existingTag) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 })
    }

    // Create new tag with new schema
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        color_hex: color_hex || '#6B7280',
        color_class: color_class || 'bg-gray-100 text-gray-800',
        icon: icon || null,
        category_id: category_id || null,
        sort_order: sort_order || 0,
        created_by: userId,
        is_active: true,
      })
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

    if (error) {
      throw error
    }

    return createSuccessResponse(
      {
        ...tag,
        usage_count: 0,
      },
      201
    )
  } catch (error) {
    console.error('Error creating tag:', error)
    return createErrorResponse(error)
  }
}
