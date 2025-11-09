/**
 * Individual Workflow API Routes
 *
 * GET    /api/workflows/[id] - Get workflow by ID
 * PUT    /api/workflows/[id] - Update workflow
 * DELETE /api/workflows/[id] - Delete workflow
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/workflows/[id]
 * Get a single workflow by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Fetch workflow (RLS ensures it belongs to user's organization)
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (error || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/[id]
 * Update a workflow
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { name, description, type, status, nodes, edges, settings } = body;

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (settings !== undefined) updateData.settings = settings;

    // Update workflow (RLS ensures it belongs to user's organization)
    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update workflow:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Delete a workflow
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Delete workflow (RLS ensures it belongs to user's organization)
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Failed to delete workflow:', error);
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
