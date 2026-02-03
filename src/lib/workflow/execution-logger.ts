/**
 * Workflow Execution Logger
 *
 * Provides detailed logging of workflow execution for debugging and analytics.
 * Persists execution logs to workflow_execution_logs table.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { WorkflowNodeType } from '@/types/workflow'

// ============================================================================
// TYPES
// ============================================================================

export type LogStatus = 'started' | 'completed' | 'failed' | 'skipped'

export interface ExecutionLogEntry {
  executionId: string
  organizationId: string
  nodeId: string
  nodeType: string
  status: LogStatus
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  errorMessage?: string
  errorCode?: string
  metadata?: Record<string, any>
  startedAt: Date
  completedAt?: Date
}

export interface ExecutionLogSummary {
  executionId: string
  totalNodes: number
  completedNodes: number
  failedNodes: number
  skippedNodes: number
  totalDurationMs: number
  logs: ExecutionLogEntry[]
}

// ============================================================================
// EXECUTION LOGGER CLASS
// ============================================================================

export class WorkflowExecutionLogger {
  private _supabase: SupabaseClient | null = null
  private _providedSupabase: SupabaseClient | undefined
  private executionId: string
  private organizationId: string
  private pendingLogs: Map<string, ExecutionLogEntry> = new Map()

  private getSupabase(): SupabaseClient {
    if (!this._supabase) {
      this._supabase = this._providedSupabase || createServiceRoleClient()
    }
    return this._supabase
  }

  constructor(executionId: string, organizationId: string, supabase?: SupabaseClient) {
    this.executionId = executionId
    this.organizationId = organizationId
    this._providedSupabase = supabase
  }

  /**
   * Log the start of a node execution
   */
  async logNodeStart(
    nodeId: string,
    nodeType: WorkflowNodeType | string,
    inputData?: Record<string, any>
  ): Promise<void> {
    const entry: ExecutionLogEntry = {
      executionId: this.executionId,
      organizationId: this.organizationId,
      nodeId,
      nodeType: this.normalizeNodeType(nodeType),
      status: 'started',
      inputData,
      startedAt: new Date(),
    }

    // Store in pending logs
    this.pendingLogs.set(nodeId, entry)

    // Save to database
    try {
      await this.getSupabase().from('workflow_execution_logs').insert({
        execution_id: this.executionId,
        organization_id: this.organizationId,
        node_id: nodeId,
        node_type: this.normalizeNodeType(nodeType),
        status: 'started',
        input_data: inputData || {},
        started_at: entry.startedAt.toISOString(),
      })
    } catch (error) {
      console.error('[ExecutionLogger] Failed to log node start:', error)
    }
  }

  /**
   * Log successful completion of a node execution
   */
  async logNodeComplete(
    nodeId: string,
    outputData?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const pendingEntry = this.pendingLogs.get(nodeId)
    const completedAt = new Date()

    try {
      // Update the log entry
      const { error } = await this.getSupabase()
        .from('workflow_execution_logs')
        .update({
          status: 'completed',
          output_data: outputData || {},
          metadata: metadata || {},
          completed_at: completedAt.toISOString(),
        })
        .eq('execution_id', this.executionId)
        .eq('node_id', nodeId)
        .eq('status', 'started')

      if (error) {
        // Insert new entry if update failed (entry might not exist)
        await this.getSupabase().from('workflow_execution_logs').insert({
          execution_id: this.executionId,
          organization_id: this.organizationId,
          node_id: nodeId,
          node_type: pendingEntry?.nodeType || 'unknown',
          status: 'completed',
          input_data: pendingEntry?.inputData || {},
          output_data: outputData || {},
          metadata: metadata || {},
          started_at: pendingEntry?.startedAt?.toISOString() || new Date().toISOString(),
          completed_at: completedAt.toISOString(),
        })
      }

      // Clean up pending log
      this.pendingLogs.delete(nodeId)
    } catch (error) {
      console.error('[ExecutionLogger] Failed to log node completion:', error)
    }
  }

  /**
   * Log failed node execution
   */
  async logNodeFailure(
    nodeId: string,
    errorMessage: string,
    errorCode?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const pendingEntry = this.pendingLogs.get(nodeId)
    const completedAt = new Date()

    try {
      // Update the log entry
      const { error } = await this.getSupabase()
        .from('workflow_execution_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          error_code: errorCode,
          metadata: metadata || {},
          completed_at: completedAt.toISOString(),
        })
        .eq('execution_id', this.executionId)
        .eq('node_id', nodeId)
        .eq('status', 'started')

      if (error) {
        // Insert new entry if update failed
        await this.getSupabase().from('workflow_execution_logs').insert({
          execution_id: this.executionId,
          organization_id: this.organizationId,
          node_id: nodeId,
          node_type: pendingEntry?.nodeType || 'unknown',
          status: 'failed',
          input_data: pendingEntry?.inputData || {},
          error_message: errorMessage,
          error_code: errorCode,
          metadata: metadata || {},
          started_at: pendingEntry?.startedAt?.toISOString() || new Date().toISOString(),
          completed_at: completedAt.toISOString(),
        })
      }

      // Clean up pending log
      this.pendingLogs.delete(nodeId)
    } catch (error) {
      console.error('[ExecutionLogger] Failed to log node failure:', error)
    }
  }

  /**
   * Log skipped node (e.g., condition branch not taken)
   */
  async logNodeSkipped(
    nodeId: string,
    nodeType: WorkflowNodeType | string,
    reason?: string
  ): Promise<void> {
    try {
      await this.getSupabase().from('workflow_execution_logs').insert({
        execution_id: this.executionId,
        organization_id: this.organizationId,
        node_id: nodeId,
        node_type: this.normalizeNodeType(nodeType),
        status: 'skipped',
        metadata: reason ? { skipReason: reason } : {},
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[ExecutionLogger] Failed to log node skip:', error)
    }
  }

  /**
   * Get execution log summary
   */
  async getExecutionSummary(): Promise<ExecutionLogSummary | null> {
    try {
      const { data: logs, error } = await this.getSupabase()
        .from('workflow_execution_logs')
        .select('*')
        .eq('execution_id', this.executionId)
        .order('started_at', { ascending: true })

      if (error || !logs) {
        console.error('[ExecutionLogger] Failed to get execution summary:', error)
        return null
      }

      const completedLogs = logs.filter((l) => l.status === 'completed')
      const failedLogs = logs.filter((l) => l.status === 'failed')
      const skippedLogs = logs.filter((l) => l.status === 'skipped')

      // Calculate total duration
      let totalDurationMs = 0
      for (const log of completedLogs) {
        if (log.completed_at && log.started_at) {
          const duration = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
          totalDurationMs += duration
        }
      }

      return {
        executionId: this.executionId,
        totalNodes: logs.length,
        completedNodes: completedLogs.length,
        failedNodes: failedLogs.length,
        skippedNodes: skippedLogs.length,
        totalDurationMs,
        logs: logs.map((log) => ({
          executionId: log.execution_id,
          organizationId: log.organization_id,
          nodeId: log.node_id,
          nodeType: log.node_type,
          status: log.status as LogStatus,
          inputData: log.input_data,
          outputData: log.output_data,
          errorMessage: log.error_message,
          errorCode: log.error_code,
          metadata: log.metadata,
          startedAt: new Date(log.started_at),
          completedAt: log.completed_at ? new Date(log.completed_at) : undefined,
        })),
      }
    } catch (error) {
      console.error('[ExecutionLogger] Failed to get execution summary:', error)
      return null
    }
  }

  /**
   * Normalize node type to match database constraint
   */
  private normalizeNodeType(nodeType: string): string {
    // Map workflow node types to database-compatible types
    const typeMap: Record<string, string> = {
      trigger: 'trigger',
      message: 'action',
      delay: 'delay',
      condition: 'condition',
      action: 'action',
      wait_until: 'delay',
      split: 'condition',
      webhook: 'webhook',
      ai: 'ai_response',
      goal: 'action',
    }

    return typeMap[nodeType] || 'action'
  }
}

// ============================================================================
// STATIC HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new execution logger instance
 */
export function createExecutionLogger(
  executionId: string,
  organizationId: string,
  supabase?: SupabaseClient
): WorkflowExecutionLogger {
  return new WorkflowExecutionLogger(executionId, organizationId, supabase)
}

/**
 * Get logs for a specific workflow execution
 */
export async function getExecutionLogs(executionId: string): Promise<ExecutionLogSummary | null> {
  const supabase = createServiceRoleClient()

  const { data: logs, error } = await supabase
    .from('workflow_execution_logs')
    .select('*')
    .eq('execution_id', executionId)
    .order('started_at', { ascending: true })

  if (error || !logs || logs.length === 0) {
    return null
  }

  const organizationId = logs[0].organization_id
  const logger = new WorkflowExecutionLogger(executionId, organizationId, supabase)
  return logger.getExecutionSummary()
}

/**
 * Delete old execution logs (retention policy)
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<number> {
  const supabase = createServiceRoleClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  const { data, error } = await supabase
    .from('workflow_execution_logs')
    .delete()
    .lt('started_at', cutoffDate.toISOString())
    .select('id')

  if (error) {
    console.error('[ExecutionLogger] Failed to cleanup old logs:', error)
    return 0
  }

  return data?.length || 0
}
