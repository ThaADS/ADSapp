/**
 * Admin Users Management API
 * Provides comprehensive user management across all organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SuperAdminPermissions } from '@/lib/super-admin';
import { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

type TypedSupabaseClient = SupabaseClient<Database>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_super_admin?: boolean;
  organization_id: string | null;
  organizations?: Organization | null;
  conversations?: unknown[];
  messages?: unknown[];
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const permissions = new SuperAdminPermissions();
    const { searchParams } = new URL(request.url);

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search');
    const organizationId = searchParams.get('organizationId');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        organizations(id, name, slug, status),
        conversations!conversations_assigned_to_fkey(count),
        messages!messages_sender_id_fkey(count)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform the data
    const users = (data as ProfileData[] || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      isSuperAdmin: profile.is_super_admin || false,
      organizationId: profile.organization_id,
      organization: profile.organizations ? {
        id: profile.organizations.id,
        name: profile.organizations.name,
        slug: profile.organizations.slug,
        status: profile.organizations.status,
      } : null,
      assignedConversations: Array.isArray(profile.conversations) ? profile.conversations.length : 0,
      sentMessages: Array.isArray(profile.messages) ? profile.messages.length : 0,
      lastSeenAt: profile.last_seen_at,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }));

    // Log the access
    await permissions.logSystemAuditEvent(
      'list_users',
      undefined,
      undefined,
      {
        filters: { search, organizationId, role, isActive },
        pagination: { page, limit },
        resultCount: users.length
      },
      'info'
    );

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
          roles: ['owner', 'admin', 'agent'],
          statuses: ['active', 'inactive'],
        },
        applied: { search, organizationId, role, isActive },
      },
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Batch user operations
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const permissions = new SuperAdminPermissions();
    const body = await request.json();

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const { userIds, action, data: actionData } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    interface UpdateData {
      is_active?: boolean;
      role?: string;
      organization_id?: string;
      is_super_admin?: boolean;
      updated_at: string;
    }

    interface BatchResult {
      userId: string;
      success: boolean;
      error?: string;
      user?: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        is_active: boolean;
        is_super_admin: boolean;
      };
    }

    let updateData: UpdateData = { updated_at: new Date().toISOString() };
    const results: BatchResult[] = [];

    switch (action) {
      case 'activate':
        updateData = { is_active: true, updated_at: new Date().toISOString() };
        break;
      case 'deactivate':
        updateData = { is_active: false, updated_at: new Date().toISOString() };
        break;
      case 'change_role':
        if (!actionData?.role || !['owner', 'admin', 'agent'].includes(actionData.role)) {
          return NextResponse.json(
            { error: 'Valid role is required for role change' },
            { status: 400 }
          );
        }
        updateData = { role: actionData.role, updated_at: new Date().toISOString() };
        break;
      case 'grant_super_admin':
        updateData = { is_super_admin: true, updated_at: new Date().toISOString() };
        break;
      case 'revoke_super_admin':
        updateData = { is_super_admin: false, updated_at: new Date().toISOString() };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Process each user
    for (const userId of userIds) {
      try {
        const { data: updatedUser, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select('id, email, full_name, role, is_active, is_super_admin')
          .single();

        if (updateError) {
          results.push({
            userId,
            success: false,
            error: updateError.message,
          });
        } else {
          results.push({
            userId,
            success: true,
            user: updatedUser,
          });

          // Log individual user action
          await permissions.logSystemAuditEvent(
            `bulk_${action}`,
            undefined,
            userId,
            {
              action,
              actionData,
              userEmail: updatedUser.email,
              userName: updatedUser.full_name
            },
            'info'
          );
        }
      } catch (err) {
        console.error('Error updating user:', err);
        results.push({
          userId,
          success: false,
          error: 'Unexpected error occurred',
        });
      }
    }

    // Log the bulk operation
    await permissions.logSystemAuditEvent(
      'bulk_user_operation',
      undefined,
      undefined,
      {
        action,
        userIds,
        actionData,
        results: results.map(r => ({ userId: r.userId, success: r.success }))
      },
      'info'
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      message: `Batch operation completed. ${successCount} successful, ${failureCount} failed.`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });

  } catch (error) {
    console.error('Admin batch user operation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}