// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ListMembersQuerySchema, ListMembersResponse } from '@/types/team';
import { hasPermission } from '@/lib/team/roles';

/**
 * GET /api/team/members
 * List team members for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role, permissions')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = ListMembersQuerySchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { organization_id, role, search, limit, offset } = validation.data;

    // Use user's organization if not specified (or verify access if specified)
    const targetOrgId = organization_id || profile.organization_id;

    // Verify user has access to the organization
    if (targetOrgId !== profile.organization_id) {
      // Only super admin can view other organizations
      if (profile.role !== 'owner' || !hasPermission(profile.role, profile.permissions, 'admin.super')) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access other organizations' },
          { status: 403 }
        );
      }
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('organization_id', targetOrgId);

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply pagination and sorting
    query = query
      .order('role', { ascending: false }) // Owner first
      .order('full_name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    const response: ListMembersResponse = {
      members: members || [],
      total: count || 0,
      limit,
      offset,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/team/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
