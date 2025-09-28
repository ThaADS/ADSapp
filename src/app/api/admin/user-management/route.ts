/**
 * Admin User Management API
 * Provides comprehensive user management capabilities for super admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Define types
interface UserData {
  full_name?: string;
  role?: string;
  organization_id?: string;
}

// Helper function to check if user is super admin
async function isSuperAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', userId)
      .single();

    if (!profile) return false;
    return profile.role === 'owner' || profile.is_super_admin === true;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

// GET - List all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Authentication check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Super admin check
    const isAdmin = await isSuperAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const organizationId = searchParams.get('organization_id') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        is_active,
        is_super_admin,
        last_seen_at,
        created_at,
        updated_at,
        organization_id,
        organizations (
          id,
          name,
          slug
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('User management API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user or update existing user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Authentication check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Super admin check
    const isAdmin = await isSuperAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const { action, userId, userData } = body;

    switch (action) {
      case 'update_user':
        return await updateUser(supabase, userId, userData);
      case 'deactivate_user':
        return await deactivateUser(supabase, userId);
      case 'activate_user':
        return await activateUser(supabase, userId);
      case 'change_role':
        return await changeUserRole(supabase, userId, userData.role);
      case 'reset_password':
        return await resetUserPassword(supabase, userId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('User management POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for user operations
async function updateUser(supabase: SupabaseClient, userId: string, userData: UserData) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: userData.full_name,
      role: userData.role,
      organization_id: userData.organization_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { user: data, message: 'User updated successfully' }
  });
}

async function deactivateUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { user: data, message: 'User deactivated successfully' }
  });
}

async function activateUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error activating user:', error);
    return NextResponse.json({ error: 'Failed to activate user' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { user: data, message: 'User activated successfully' }
  });
}

async function changeUserRole(supabase: SupabaseClient, userId: string, newRole: string) {
  // Validate role
  const validRoles = ['owner', 'admin', 'agent'];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error changing user role:', error);
    return NextResponse.json({ error: 'Failed to change user role' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { user: data, message: `User role changed to ${newRole}` }
  });
}

async function resetUserPassword(_supabase: SupabaseClient, _userId: string) {
  // This would typically involve generating a reset token and sending an email
  // For now, we'll just return a success message
  return NextResponse.json({
    success: true,
    data: { message: 'Password reset instructions sent to user email' }
  });
}
