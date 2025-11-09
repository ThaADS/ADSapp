/**
 * Workflow Execution API Route
 *
 * POST /api/workflows/[id]/execute - Execute workflow for contact(s)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createExecutionEngine } from '@/lib/workflow/execution-engine';
import type { Workflow } from '@/types/workflow';

/**
 * POST /api/workflows/[id]/execute
 * Execute workflow for one or more contacts
 */
export async function POST(
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
    const { contactIds, contactId } = body;

    // Normalize to array
    const contacts = contactIds || (contactId ? [contactId] : []);

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact ID is required' },
        { status: 400 }
      );
    }

    // Fetch workflow (RLS ensures it belongs to user's organization)
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check workflow status
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      return NextResponse.json(
        { error: 'Workflow must be active or draft to execute' },
        { status: 400 }
      );
    }

    // Validate workflow has nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    // Execute workflow for each contact
    const executions = [];
    const errors = [];

    for (const contactId of contacts) {
      try {
        // Create execution engine
        const engine = createExecutionEngine(workflow as Workflow);

        // Start execution
        const execution = await engine.startExecution(
          contactId,
          profile.organization_id
        );

        // Save execution to database
        const { data: savedExecution, error: execError } = await supabase
          .from('workflow_executions')
          .insert({
            workflow_id: workflow.id,
            contact_id: contactId,
            organization_id: profile.organization_id,
            status: execution.status,
            current_node_id: execution.currentNodeId,
            execution_path: execution.executionPath,
            error_message: execution.errorMessage,
            error_node_id: execution.errorNodeId,
            retry_count: execution.retryCount,
            context: execution.context,
          })
          .select()
          .single();

        if (execError) {
          console.error('Failed to save execution:', execError);
          errors.push({
            contactId,
            error: 'Failed to save execution',
          });
        } else {
          executions.push(savedExecution);
        }
      } catch (error) {
        console.error(`Failed to execute workflow for contact ${contactId}:`, error);
        errors.push({
          contactId,
          error: error instanceof Error ? error.message : 'Execution failed',
        });
      }
    }

    return NextResponse.json({
      executions,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: contacts.length,
        successful: executions.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error('Workflow execution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
