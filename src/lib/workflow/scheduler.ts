/**
 * Workflow Scheduler
 *
 * Handles scheduled workflow executions:
 * - One-time scheduled workflows
 * - Recurring workflows (interval-based)
 * - Cron-based workflows
 *
 * Designed to be called periodically (e.g., every minute via cron job or Edge Function)
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { createExecutionEngine, WhatsAppCredentials, ContactInfo } from './execution-engine'
import { createExecutionLogger } from './execution-logger'
import { createRetryHandler } from './retry-handler'
import type { Workflow } from '@/types/workflow'

// ============================================================================
// TYPES
// ============================================================================

export type ScheduleType = 'once' | 'recurring' | 'cron'

export interface ScheduleConfig {
  // For 'once' type
  scheduledAt?: string

  // For 'recurring' type
  intervalMinutes?: number
  startAt?: string
  endAt?: string

  // For 'cron' type
  cronExpression?: string
}

export interface WorkflowSchedule {
  id: string
  workflowId: string
  organizationId: string
  scheduleType: ScheduleType
  scheduleConfig: ScheduleConfig
  timezone: string
  isActive: boolean
  nextExecutionAt: string | null
  lastExecutionAt: string | null
  lastExecutionStatus: string | null
  maxExecutions: number | null
  executionCount: number
  createdBy: string | null
}

export interface SchedulerResult {
  schedulesProcessed: number
  executionsStarted: number
  errors: string[]
}

// ============================================================================
// WORKFLOW SCHEDULER CLASS
// ============================================================================

export class WorkflowScheduler {
  private supabase = createServiceRoleClient()
  private retryHandler = createRetryHandler()

  /**
   * Process all due scheduled workflows
   */
  async processDueSchedules(): Promise<SchedulerResult> {
    const result: SchedulerResult = {
      schedulesProcessed: 0,
      executionsStarted: 0,
      errors: [],
    }

    try {
      // Get all active schedules that are due
      const { data: dueSchedules, error } = await this.supabase
        .from('workflow_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_execution_at', new Date().toISOString())
        .order('next_execution_at', { ascending: true })
        .limit(100) // Process in batches

      if (error) {
        result.errors.push(`Failed to fetch schedules: ${error.message}`)
        return result
      }

      if (!dueSchedules || dueSchedules.length === 0) {
        return result
      }

      console.log(`[Scheduler] Processing ${dueSchedules.length} due schedules`)

      // Process each schedule
      for (const schedule of dueSchedules) {
        result.schedulesProcessed++

        try {
          const executed = await this.executeScheduledWorkflow(schedule)
          if (executed) {
            result.executionsStarted++
          }

          // Update schedule for next execution
          await this.updateScheduleAfterExecution(schedule)
        } catch (scheduleError) {
          const errorMsg = `Schedule ${schedule.id}: ${scheduleError}`
          result.errors.push(errorMsg)
          console.error(`[Scheduler] ${errorMsg}`)

          // Mark schedule execution as failed
          await this.markScheduleFailed(schedule.id, String(scheduleError))
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Scheduler error: ${error}`)
      return result
    }
  }

  /**
   * Execute a scheduled workflow
   */
  private async executeScheduledWorkflow(schedule: WorkflowSchedule): Promise<boolean> {
    // Get the workflow
    const { data: workflowData, error: workflowError } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', schedule.workflowId)
      .eq('status', 'active')
      .single()

    if (workflowError || !workflowData) {
      console.warn(`[Scheduler] Workflow ${schedule.workflowId} not found or not active`)
      return false
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

    // Get contacts to execute for
    // For scheduled workflows, get all contacts in the target segment/list
    const contacts = await this.getTargetContacts(schedule, workflowData)

    if (contacts.length === 0) {
      console.log(`[Scheduler] No contacts to execute workflow ${workflow.name}`)
      return false
    }

    // Get organization WhatsApp credentials
    const { data: orgSettings } = await this.supabase
      .from('organizations')
      .select('whatsapp_access_token, whatsapp_phone_number_id')
      .eq('id', schedule.organizationId)
      .single()

    const credentials: WhatsAppCredentials | undefined = orgSettings?.whatsapp_access_token
      ? {
          accessToken: orgSettings.whatsapp_access_token,
          phoneNumberId: orgSettings.whatsapp_phone_number_id,
        }
      : undefined

    // Execute workflow for each contact
    let executionCount = 0
    for (const contact of contacts) {
      try {
        const engine = createExecutionEngine(workflow)

        const contactInfo: ContactInfo = {
          id: contact.id,
          phone: contact.phone_number,
          name: contact.name,
          email: contact.email,
          tags: contact.tags,
          customFields: contact.custom_fields,
        }

        const executionContext = await engine.startExecution(
          contact.id,
          schedule.organizationId,
          contactInfo,
          credentials
        )

        // Save execution
        await this.supabase.from('workflow_executions').insert({
          id: executionContext.executionId,
          workflow_id: workflow.id,
          contact_id: contact.id,
          organization_id: schedule.organizationId,
          status: executionContext.status,
          current_node_id: executionContext.currentNodeId,
          execution_path: executionContext.executionPath,
          execution_data: executionContext.context,
          trigger_type: 'schedule',
          error_message: executionContext.errorMessage,
          error_node_id: executionContext.errorNodeId,
          retry_count: executionContext.retryCount,
        })

        executionCount++
      } catch (contactError) {
        console.error(`[Scheduler] Failed to execute for contact ${contact.id}:`, contactError)
      }
    }

    console.log(`[Scheduler] Executed workflow "${workflow.name}" for ${executionCount} contacts`)
    return executionCount > 0
  }

  /**
   * Get target contacts for scheduled workflow
   */
  private async getTargetContacts(schedule: WorkflowSchedule, workflowData: any): Promise<any[]> {
    // Check workflow trigger config for target criteria
    const nodes = workflowData.nodes || []
    const triggerNode = nodes.find((n: any) => n.type === 'trigger')
    const triggerConfig = triggerNode?.data?.triggerConfig || {}

    let query = this.supabase
      .from('contacts')
      .select('id, phone_number, name, email, tags, custom_fields')
      .eq('organization_id', schedule.organizationId)
      .eq('status', 'active')
      .limit(1000) // Limit batch size

    // Apply segment/tag filters if configured
    if (triggerConfig.tagIds && triggerConfig.tagIds.length > 0) {
      query = query.overlaps('tags', triggerConfig.tagIds)
    }

    const { data: contacts, error } = await query

    if (error) {
      console.error(`[Scheduler] Failed to get target contacts:`, error)
      return []
    }

    return contacts || []
  }

  /**
   * Update schedule after execution
   */
  private async updateScheduleAfterExecution(schedule: WorkflowSchedule): Promise<void> {
    const now = new Date()
    const updates: Partial<Record<string, any>> = {
      last_execution_at: now.toISOString(),
      last_execution_status: 'completed',
      execution_count: schedule.executionCount + 1,
      updated_at: now.toISOString(),
    }

    // Calculate next execution time
    const nextExecutionAt = this.calculateNextExecution(schedule)

    if (nextExecutionAt) {
      updates.next_execution_at = nextExecutionAt.toISOString()
    } else {
      // No more executions (one-time or max reached)
      updates.is_active = false
      updates.next_execution_at = null
    }

    // Check if max executions reached
    if (schedule.maxExecutions && schedule.executionCount + 1 >= schedule.maxExecutions) {
      updates.is_active = false
      updates.next_execution_at = null
    }

    await this.supabase
      .from('workflow_schedules')
      .update(updates)
      .eq('id', schedule.id)
  }

  /**
   * Calculate next execution time based on schedule type
   */
  private calculateNextExecution(schedule: WorkflowSchedule): Date | null {
    const config = schedule.scheduleConfig

    switch (schedule.scheduleType) {
      case 'once':
        // One-time execution, no next
        return null

      case 'recurring':
        if (!config.intervalMinutes) return null

        const nextRecurring = new Date()
        nextRecurring.setMinutes(nextRecurring.getMinutes() + config.intervalMinutes)

        // Check if within end date
        if (config.endAt && new Date(config.endAt) < nextRecurring) {
          return null
        }

        return nextRecurring

      case 'cron':
        if (!config.cronExpression) return null

        // Parse cron and calculate next
        return this.getNextCronExecution(config.cronExpression, schedule.timezone)

      default:
        return null
    }
  }

  /**
   * Parse cron expression and get next execution time
   * Simplified cron parser (supports: minute hour day month weekday)
   */
  private getNextCronExecution(cronExpression: string, timezone: string): Date | null {
    try {
      const parts = cronExpression.split(' ')
      if (parts.length !== 5) return null

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

      // Start from current time + 1 minute
      const now = new Date()
      const next = new Date(now)
      next.setMinutes(now.getMinutes() + 1)
      next.setSeconds(0)
      next.setMilliseconds(0)

      // Simple implementation: find next matching time within 7 days
      for (let i = 0; i < 7 * 24 * 60; i++) {
        if (this.matchesCron(next, minute, hour, dayOfMonth, month, dayOfWeek)) {
          return next
        }
        next.setMinutes(next.getMinutes() + 1)
      }

      return null
    } catch (error) {
      console.error('[Scheduler] Failed to parse cron expression:', error)
      return null
    }
  }

  /**
   * Check if a date matches cron expression
   */
  private matchesCron(
    date: Date,
    minute: string,
    hour: string,
    dayOfMonth: string,
    month: string,
    dayOfWeek: string
  ): boolean {
    return (
      this.matchesCronField(date.getMinutes(), minute) &&
      this.matchesCronField(date.getHours(), hour) &&
      this.matchesCronField(date.getDate(), dayOfMonth) &&
      this.matchesCronField(date.getMonth() + 1, month) &&
      this.matchesCronField(date.getDay(), dayOfWeek)
    )
  }

  /**
   * Match a single cron field
   */
  private matchesCronField(value: number, field: string): boolean {
    if (field === '*') return true

    // Handle comma-separated values
    if (field.includes(',')) {
      return field.split(',').some((v) => parseInt(v) === value)
    }

    // Handle ranges
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number)
      return value >= start && value <= end
    }

    // Handle step values
    if (field.includes('/')) {
      const [base, step] = field.split('/')
      const stepNum = parseInt(step)
      if (base === '*') {
        return value % stepNum === 0
      }
      return (value - parseInt(base)) % stepNum === 0
    }

    return parseInt(field) === value
  }

  /**
   * Mark schedule execution as failed
   */
  private async markScheduleFailed(scheduleId: string, error: string): Promise<void> {
    await this.supabase
      .from('workflow_schedules')
      .update({
        last_execution_status: 'failed',
        metadata: { lastError: error },
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
  }

  /**
   * Create a new workflow schedule
   */
  async createSchedule(
    workflowId: string,
    organizationId: string,
    scheduleType: ScheduleType,
    scheduleConfig: ScheduleConfig,
    options: {
      timezone?: string
      maxExecutions?: number
      createdBy?: string
    } = {}
  ): Promise<string | null> {
    // Calculate first execution time
    let nextExecutionAt: Date | null = null

    switch (scheduleType) {
      case 'once':
        nextExecutionAt = scheduleConfig.scheduledAt
          ? new Date(scheduleConfig.scheduledAt)
          : null
        break

      case 'recurring':
        nextExecutionAt = scheduleConfig.startAt
          ? new Date(scheduleConfig.startAt)
          : new Date()
        break

      case 'cron':
        nextExecutionAt = scheduleConfig.cronExpression
          ? this.getNextCronExecution(scheduleConfig.cronExpression, options.timezone || 'UTC')
          : null
        break
    }

    if (!nextExecutionAt) {
      console.error('[Scheduler] Could not calculate next execution time')
      return null
    }

    const { data, error } = await this.supabase
      .from('workflow_schedules')
      .insert({
        workflow_id: workflowId,
        organization_id: organizationId,
        schedule_type: scheduleType,
        schedule_config: scheduleConfig,
        timezone: options.timezone || 'UTC',
        is_active: true,
        next_execution_at: nextExecutionAt.toISOString(),
        max_executions: options.maxExecutions || null,
        execution_count: 0,
        created_by: options.createdBy || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Scheduler] Failed to create schedule:', error)
      return null
    }

    return data?.id || null
  }

  /**
   * Deactivate a schedule
   */
  async deactivateSchedule(scheduleId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('workflow_schedules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)

    return !error
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a new workflow scheduler instance
 */
export function createScheduler(): WorkflowScheduler {
  return new WorkflowScheduler()
}

/**
 * Process due schedules (called by cron job or Edge Function)
 */
export async function processDueSchedules(): Promise<SchedulerResult> {
  const scheduler = new WorkflowScheduler()
  return scheduler.processDueSchedules()
}

// Export singleton
export const workflowScheduler = new WorkflowScheduler()
