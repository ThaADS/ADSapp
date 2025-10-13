import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQueueManager } from '@/lib/queue/queue-manager';
import { QueueName } from '@/lib/queue/bull-config';

/**
 * GET /api/jobs/[id]
 * Get job status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Try to find job in all queues
    const queueManager = getQueueManager();
    const queueNames = Object.values(QueueName);

    let jobInfo = null;

    for (const queueName of queueNames) {
      try {
        const job = await queueManager.getJob(queueName, id);
        if (job) {
          // Verify job belongs to user's organization
          if (job.data.organizationId === profile.organization_id) {
            jobInfo = job;
            break;
          }
        }
      } catch (error) {
        // Continue checking other queues
        continue;
      }
    }

    if (!jobInfo) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: jobInfo
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 * Cancel a job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Check permissions (only agents and above can cancel jobs)
    if (!['owner', 'admin', 'agent'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Try to cancel job in all queues
    const queueManager = getQueueManager();
    const queueNames = Object.values(QueueName);

    let cancelled = false;

    for (const queueName of queueNames) {
      try {
        // First verify job belongs to user's organization
        const job = await queueManager.getJob(queueName, id);
        if (job && job.data.organizationId === profile.organization_id) {
          cancelled = await queueManager.cancelJob(queueName, id);
          if (cancelled) {
            break;
          }
        }
      } catch (error) {
        // Continue checking other queues
        continue;
      }
    }

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
