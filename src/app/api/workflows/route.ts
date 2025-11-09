/**
 * Workflows API Routes
 *
 * GET    /api/workflows - List all workflows
 * POST   /api/workflows - Create new workflow
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Workflow } from '@/types/workflow';

/**
 * GET /api/workflows
 * List all workflows for the user's organization
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('workflows')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: workflows, error, count } = await query;

    if (error) {
      console.error('Failed to fetch workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      workflows,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Create a new workflow
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, type, nodes, edges, settings } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        organization_id: profile.organization_id,
        name,
        description: description || null,
        type,
        status: 'draft',
        nodes: nodes || [],
        edges: edges || [],
        settings: settings || {
          allowReentry: false,
          stopOnError: true,
          trackConversions: false,
          timezone: 'UTC',
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create workflow:', error);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
