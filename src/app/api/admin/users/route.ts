/**
 * Admin Users Management API
 * Provides comprehensive user management across all organizations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'
import { adminMiddleware } from '@/lib/middleware'
import { logSuperAdminAction } from '@/lib/super-admin'

type TypedSupabaseClient = SupabaseClient<Database>

interface Organization {
  id: string
  name: string
  slug: string
  status: string
}

interface ProfileData {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  is_super_admin?: boolean
  organization_id: string | null
  organizations?: Organization | null
  conversations?: unknown[]
  messages?: unknown[]
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search')
    const organizationId = searchParams.get('organizationId')
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build the query - simplified to avoid complex joins
    let query = supabase.from('profiles').select('*', { count: 'exact' })

    // Apply filters with input sanitization
    if (search) {
      const sanitizedSearch = search
        .replace(/[%_'"\\;]/g, '') // Remove SQL wildcards and escape chars
        .substring(0, 100) // Limit length
        .trim()
      if (sanitizedSearch.length > 0) {
        query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`)
      }
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (role) {
      query = query.eq('role', role as any)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get unique organization IDs and user IDs for batch queries
    const orgIds = [
      ...new Set(
        (data || []).map(p => p.organization_id).filter((id): id is string => id !== null)
      ),
    ]
    const userIds = (data || []).map(p => p.id)

    // Fetch related data in parallel
    const [orgData, conversationCounts, messageCounts] = await Promise.all([
      orgIds.length > 0
        ? supabase.from('organizations').select('id, name, slug, status').in('id', orgIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from('conversations').select('assigned_to').in('assigned_to', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase
            .from('messages')
            .select('sender_id')
            .eq('sender_type', 'agent')
            .in('sender_id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    // Create lookup maps
    const orgMap = new Map((orgData.data || []).map(org => [org.id, org]))
    const conversationCountMap = new Map<string, number>()
    ;(conversationCounts.data || []).forEach(conv => {
      if (conv.assigned_to) {
        conversationCountMap.set(
          conv.assigned_to,
          (conversationCountMap.get(conv.assigned_to) || 0) + 1
        )
      }
    })
    const messageCountMap = new Map<string, number>()
    ;(messageCounts.data || []).forEach(msg => {
      if (msg.sender_id) {
        messageCountMap.set(msg.sender_id, (messageCountMap.get(msg.sender_id) || 0) + 1)
      }
    })

    // Transform the data
    const users = ((data as ProfileData[]) || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      isSuperAdmin: profile.is_super_admin || false,
      organizationId: profile.organization_id,
      organization:
        profile.organization_id && orgMap.has(profile.organization_id)
          ? {
              id: orgMap.get(profile.organization_id)!.id,
              name: orgMap.get(profile.organization_id)!.name,
              slug: orgMap.get(profile.organization_id)!.slug,
              status: orgMap.get(profile.organization_id)!.status,
            }
          : null,
      assignedConversations: conversationCountMap.get(profile.id) || 0,
      sentMessages: messageCountMap.get(profile.id) || 0,
      lastSeenAt: profile.last_seen_at,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }))

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: {
        available: {
          roles: ['owner', 'admin', 'agent', 'super_admin'],
          statuses: ['active', 'inactive'],
        },
        applied: { search, organizationId, role, isActive },
      },
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Batch user operations
export async function PATCH(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const body = await request.json()

    const { userIds, action, data: actionData } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    interface UpdateData {
      is_active?: boolean
      role?: 'owner' | 'admin' | 'agent' | 'super_admin'
      organization_id?: string
      is_super_admin?: boolean
      updated_at: string
    }

    interface BatchResult {
      userId: string
      success: boolean
      error?: string
      user?: {
        id: string
        email: string
        full_name: string | null
        role: 'owner' | 'admin' | 'agent' | 'super_admin'
        is_active: boolean
        is_super_admin: boolean
      }
    }

    let updateData: UpdateData = { updated_at: new Date().toISOString() }
    const results: BatchResult[] = []

    switch (action) {
      case 'activate':
        updateData = { is_active: true, updated_at: new Date().toISOString() }
        break
      case 'deactivate':
        updateData = { is_active: false, updated_at: new Date().toISOString() }
        break
      case 'change_role':
        if (
          !actionData?.role ||
          !['owner', 'admin', 'agent', 'super_admin'].includes(actionData.role)
        ) {
          return NextResponse.json(
            { error: 'Valid role is required for role change' },
            { status: 400 }
          )
        }
        updateData = {
          role: actionData.role as 'owner' | 'admin' | 'agent' | 'super_admin',
          updated_at: new Date().toISOString(),
        }
        break
      case 'grant_super_admin':
        updateData = { is_super_admin: true, updated_at: new Date().toISOString() }
        break
      case 'revoke_super_admin':
        updateData = { is_super_admin: false, updated_at: new Date().toISOString() }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Process each user
    for (const userId of userIds) {
      try {
        const { data: updatedUser, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select('id, email, full_name, role, is_active, is_super_admin')
          .single()

        if (updateError) {
          results.push({
            userId,
            success: false,
            error: updateError.message,
          })
        } else {
          results.push({
            userId,
            success: true,
            user: updatedUser,
          })

          // Log the audit action
          await logSuperAdminAction(
            action,
            'profile',
            userId,
            {
              action,
              updatedUser,
              actionData,
            }
          )
        }
      } catch (err) {
        console.error('Error updating user:', err)
        results.push({
          userId,
          success: false,
          error: 'Unexpected error occurred',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      message: `Batch operation completed. ${successCount} successful, ${failureCount} failed.`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    })
  } catch (error) {
    console.error('Admin batch user operation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
