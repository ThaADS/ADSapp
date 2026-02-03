/**
 * Workflow Scheduler Cron Job
 *
 * POST /api/cron/workflow-scheduler
 *
 * This endpoint should be called periodically (e.g., every minute) by:
 * - Vercel Cron
 * - External cron service
 * - Edge Function scheduler
 *
 * Processes:
 * 1. Due workflow schedules
 * 2. Pending workflow retries
 * 3. Cleanup of old executions
 */

import { NextRequest, NextResponse } from 'next/server'
import { processDueSchedules } from '@/lib/workflow/scheduler'
import { createRetryHandler } from '@/lib/workflow/retry-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createEnhancedEngine } from '@/lib/workflow/enhanced-execution-engine'
import type { Workflow } from '@/types/workflow'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization')
    const cronSecret = authHeader?.replace('Bearer ', '')

    // In production, require CRON_SECRET
    if (process.env.NODE_ENV === 'production' && CRON_SECRET && cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      schedules: null as any,
      retries: null as any,
      errors: [] as string[],
      timestamp: new Date().toISOString(),
    }

    // 1. Process due schedules
    console.log('[Cron] Processing due workflow schedules...')
    try {
      results.schedules = await processDueSchedules()
      console.log(`[Cron] Schedules: ${results.schedules.executionsStarted} started`)
    } catch (error) {
      const msg = `Schedule processing error: ${error}`
      results.errors.push(msg)
      console.error(`[Cron] ${msg}`)
    }

    // 2. Process pending retries
    console.log('[Cron] Processing pending retries...')
    try {
      results.retries = await processPendingRetries()
      console.log(`[Cron] Retries: ${results.retries.processed} processed`)
    } catch (error) {
      const msg = `Retry processing error: ${error}`
      results.errors.push(msg)
      console.error(`[Cron] ${msg}`)
    }

    // 3. Optional: Cleanup old executions (run less frequently)
    const shouldCleanup = Math.random() < 0.1 // ~10% of runs
    if (shouldCleanup) {
      console.log('[Cron] Running cleanup...')
      try {
        await cleanupOldData()
      } catch (error) {
        console.error('[Cron] Cleanup error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('[Cron] Workflow scheduler error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Use POST in production' }, { status: 405 })
  }

  return POST(request)
}

/**
 * Process pending workflow retries
 */
async function processPendingRetries(): Promise<{ processed: number; errors: string[] }> {
  const supabase = createServiceRoleClient()
  const retryHandler = createRetryHandler()
  const result = { processed: 0, errors: [] as string[] }

  try {
    // Get executions waiting for retry
    const pendingRetries = await retryHandler.getPendingRetries()

    for (const retry of pendingRetries) {
      try {
        // Get the execution details
        const { data: execution, error: execError } = await supabase
          .from('workflow_executions')
          .select('*, workflows:workflow_id(*)')
          .eq('id', retry.executionId)
          .single()

        if (execError || !execution) {
          console.error(`[Cron] Execution ${retry.executionId} not found`)
          continue
        }

        // Get workflow
        const workflowData = execution.workflows
        if (!workflowData) {
          console.error(`[Cron] Workflow for execution ${retry.executionId} not found`)
          continue
        }

        // Build workflow object
        const workflow: Workflow = {
          id: workflowData.id,
          organizationId: workflowData.organization_id,
          name: workflowData.name,
          description: workflowData.description,
          type: workflowData.type || 'automation',
          status: workflowData.status,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          createdAt: workflowData.created_at,
          updatedAt: workflowData.updated_at,
          createdBy: workflowData.created_by,
          version: workflowData.version || 1,
          settings: workflowData.settings || {},
        }

        // Resume execution
        const engine = createEnhancedEngine(workflow)

        // Mark as resumed
        await retryHandler.markAsResumed(retry.executionId)

        // Resume from current node
        await engine.resumeExecution({
          workflowId: workflow.id,
          executionId: retry.executionId,
          contactId: execution.contact_id,
          organizationId: execution.organization_id,
          currentNodeId: retry.nodeId,
          executionPath: execution.execution_path || [],
          context: execution.execution_data || {},
          status: 'running',
          retryCount: retry.retryCount,
        })

        result.processed++
      } catch (retryError) {
        const msg = `Retry ${retry.executionId} failed: ${retryError}`
        result.errors.push(msg)
        console.error(`[Cron] ${msg}`)
      }
    }

    return result
  } catch (error) {
    console.error('[Cron] Retry processing error:', error)
    return result
  }
}

/**
 * Cleanup old workflow data
 */
async function cleanupOldData(): Promise<void> {
  const supabase = createServiceRoleClient()
  const retentionDays = 90

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // Delete old completed/failed executions
  const { error: execError } = await supabase
    .from('workflow_executions')
    .delete()
    .lt('completed_at', cutoffDate.toISOString())
    .in('status', ['completed', 'failed', 'cancelled'])

  if (execError) {
    console.error('[Cron] Failed to cleanup executions:', execError)
  }

  // Delete orphaned logs (execution_id no longer exists)
  // This is handled by CASCADE DELETE on workflow_executions

  console.log(`[Cron] Cleaned up data older than ${retentionDays} days`)
}
