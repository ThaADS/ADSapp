/**
 * Workflow Trigger Service
 *
 * Evaluates and triggers workflows based on incoming events:
 * - Incoming WhatsApp messages
 * - Contact updates (tags, fields)
 * - Scheduled triggers
 * - Webhook events
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { WorkflowExecutionEngine, createExecutionEngine, WhatsAppCredentials, ContactInfo } from './execution-engine'
import type { Workflow, TriggerEventType, TriggerNodeData } from '@/types/workflow'

// ============================================================================
// TYPES
// ============================================================================

export interface TriggerEvent {
  type: TriggerEventType
  organizationId: string
  contactId: string
  data: Record<string, any>
  timestamp: Date
}

export interface TriggerEvaluationResult {
  triggered: boolean
  workflow?: Workflow
  reason?: string
}

// ============================================================================
// TRIGGER SERVICE
// ============================================================================

export class WorkflowTriggerService {
  private supabase = createServiceRoleClient()

  /**
   * Evaluate all active workflows for a trigger event
   */
  async evaluateTriggers(event: TriggerEvent): Promise<TriggerEvaluationResult[]> {
    const results: TriggerEvaluationResult[] = []

    try {
      // Get all active workflows for this organization
      const { data: workflows, error } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', event.organizationId)
        .eq('status', 'active')

      if (error) {
        console.error('[TriggerService] Error fetching workflows:', error)
        return results
      }

      if (!workflows || workflows.length === 0) {
        return results
      }

      // Evaluate each workflow
      for (const workflowData of workflows) {
        const result = await this.evaluateWorkflowTrigger(workflowData, event)
        results.push(result)

        // If triggered, start execution
        if (result.triggered && result.workflow) {
          await this.startWorkflowExecution(result.workflow, event)
        }
      }

      return results
    } catch (error) {
      console.error('[TriggerService] Error evaluating triggers:', error)
      return results
    }
  }

  /**
   * Evaluate if a specific workflow should be triggered
   */
  private async evaluateWorkflowTrigger(
    workflowData: any,
    event: TriggerEvent
  ): Promise<TriggerEvaluationResult> {
    try {
      // Parse workflow structure
      const nodes = workflowData.nodes || []
      const triggerNode = nodes.find((n: any) => n.type === 'trigger')

      if (!triggerNode) {
        return { triggered: false, reason: 'No trigger node found' }
      }

      const triggerData = triggerNode.data as TriggerNodeData

      // Check if trigger type matches
      if (triggerData.triggerType !== event.type) {
        return { triggered: false, reason: 'Trigger type mismatch' }
      }

      // Evaluate trigger conditions
      const conditionsMet = await this.evaluateTriggerConditions(triggerData, event)
      if (!conditionsMet) {
        return { triggered: false, reason: 'Trigger conditions not met' }
      }

      // Check if contact can enter workflow
      const canEnter = await this.canContactEnterWorkflow(
        workflowData.id,
        event.contactId,
        workflowData.settings
      )
      if (!canEnter) {
        return { triggered: false, reason: 'Contact already in workflow or reentry not allowed' }
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

      return { triggered: true, workflow }
    } catch (error) {
      console.error('[TriggerService] Error evaluating workflow trigger:', error)
      return { triggered: false, reason: `Error: ${error}` }
    }
  }

  /**
   * Evaluate trigger-specific conditions
   */
  private async evaluateTriggerConditions(
    triggerData: TriggerNodeData,
    event: TriggerEvent
  ): Promise<boolean> {
    const config = triggerData.triggerConfig

    switch (triggerData.triggerType) {
      case 'contact_replied':
        // Any incoming message triggers this
        return event.type === 'contact_replied'

      case 'tag_applied':
        // Check if the applied tag is in the configured list
        if (config.tagIds && config.tagIds.length > 0) {
          const appliedTagId = event.data.tagId
          return config.tagIds.includes(appliedTagId)
        }
        return true // Any tag if no specific tags configured

      case 'contact_added':
        // Check if added to specific list (if configured)
        if (event.data.listId && config.tagIds) {
          // tagIds might be used for lists in some implementations
          return config.tagIds.includes(event.data.listId)
        }
        return true

      case 'custom_field_changed':
        // Check if the changed field matches
        if (config.fieldName) {
          const changedField = event.data.fieldName
          const changedValue = event.data.fieldValue

          if (changedField !== config.fieldName) {
            return false
          }

          // If specific value is configured, check it
          if (config.fieldValue && changedValue !== config.fieldValue) {
            return false
          }
        }
        return true

      case 'webhook_received':
        // Webhook triggers are handled separately
        return event.type === 'webhook_received'

      case 'date_time':
        // Scheduled triggers are handled by the scheduler
        return false

      default:
        return true
    }
  }

  /**
   * Check if contact can enter/re-enter workflow
   */
  private async canContactEnterWorkflow(
    workflowId: string,
    contactId: string,
    settings: any
  ): Promise<boolean> {
    try {
      // Check for existing executions
      const { data: existingExecutions, error } = await this.supabase
        .from('workflow_executions')
        .select('id, status')
        .eq('workflow_id', workflowId)
        .eq('contact_id', contactId)

      if (error) {
        console.error('[TriggerService] Error checking existing executions:', error)
        return true // Allow on error to not block workflows
      }

      if (!existingExecutions || existingExecutions.length === 0) {
        return true // No previous execution
      }

      // Check if reentry is allowed
      const allowReentry = settings?.allowReentry ?? false
      const maxExecutions = settings?.maxExecutionsPerContact ?? 1

      if (!allowReentry) {
        return false // Reentry not allowed
      }

      // Count completed/failed executions
      const completedCount = existingExecutions.filter(
        (e) => e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled'
      ).length

      // Check if currently active
      const hasActiveExecution = existingExecutions.some(
        (e) => e.status === 'running' || e.status === 'pending' || e.status === 'waiting'
      )

      if (hasActiveExecution) {
        return false // Already has active execution
      }

      // Check max executions
      if (completedCount >= maxExecutions) {
        return false // Max executions reached
      }

      return true
    } catch (error) {
      console.error('[TriggerService] Error in canContactEnterWorkflow:', error)
      return true // Allow on error
    }
  }

  /**
   * Start workflow execution for a contact
   */
  private async startWorkflowExecution(
    workflow: Workflow,
    event: TriggerEvent
  ): Promise<void> {
    try {
      // Get contact information
      const { data: contact, error: contactError } = await this.supabase
        .from('contacts')
        .select('id, phone_number, name, email, tags, custom_fields')
        .eq('id', event.contactId)
        .single()

      if (contactError || !contact) {
        console.error('[TriggerService] Contact not found:', event.contactId)
        return
      }

      // Get organization's WhatsApp credentials
      const { data: orgSettings, error: settingsError } = await this.supabase
        .from('organizations')
        .select('whatsapp_access_token, whatsapp_phone_number_id')
        .eq('id', event.organizationId)
        .single()

      const contactInfo: ContactInfo = {
        id: contact.id,
        phone: contact.phone_number,
        name: contact.name,
        email: contact.email,
        tags: contact.tags,
        customFields: contact.custom_fields,
      }

      const credentials: WhatsAppCredentials | undefined = orgSettings?.whatsapp_access_token
        ? {
            accessToken: orgSettings.whatsapp_access_token,
            phoneNumberId: orgSettings.whatsapp_phone_number_id,
          }
        : undefined

      // Create execution engine
      const engine = createExecutionEngine(workflow)

      // Start execution
      const executionContext = await engine.startExecution(
        event.contactId,
        event.organizationId,
        contactInfo,
        credentials
      )

      // Save execution to database
      const { error: saveError } = await this.supabase
        .from('workflow_executions')
        .insert({
          id: executionContext.executionId,
          workflow_id: workflow.id,
          contact_id: event.contactId,
          organization_id: event.organizationId,
          status: executionContext.status,
          current_node_id: executionContext.currentNodeId,
          execution_path: executionContext.executionPath,
          execution_data: executionContext.context,
          input_data: event.data,
          trigger_type: event.type,
          error_message: executionContext.errorMessage,
          error_node_id: executionContext.errorNodeId,
          retry_count: executionContext.retryCount,
        })

      if (saveError) {
        console.error('[TriggerService] Error saving execution:', saveError)
      } else {
        console.log(`[TriggerService] Started workflow "${workflow.name}" for contact ${event.contactId}`)
      }
    } catch (error) {
      console.error('[TriggerService] Error starting workflow execution:', error)
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Process incoming message and check for workflow triggers
 */
export async function processMessageTrigger(
  organizationId: string,
  contactId: string,
  messageData: Record<string, any>
): Promise<TriggerEvaluationResult[]> {
  const service = new WorkflowTriggerService()

  return service.evaluateTriggers({
    type: 'contact_replied',
    organizationId,
    contactId,
    data: messageData,
    timestamp: new Date(),
  })
}

/**
 * Process tag application and check for workflow triggers
 */
export async function processTagTrigger(
  organizationId: string,
  contactId: string,
  tagId: string
): Promise<TriggerEvaluationResult[]> {
  const service = new WorkflowTriggerService()

  return service.evaluateTriggers({
    type: 'tag_applied',
    organizationId,
    contactId,
    data: { tagId },
    timestamp: new Date(),
  })
}

/**
 * Process contact creation and check for workflow triggers
 */
export async function processContactAddedTrigger(
  organizationId: string,
  contactId: string,
  listId?: string
): Promise<TriggerEvaluationResult[]> {
  const service = new WorkflowTriggerService()

  return service.evaluateTriggers({
    type: 'contact_added',
    organizationId,
    contactId,
    data: { listId },
    timestamp: new Date(),
  })
}

/**
 * Process custom field change and check for workflow triggers
 */
export async function processFieldChangeTrigger(
  organizationId: string,
  contactId: string,
  fieldName: string,
  fieldValue: any
): Promise<TriggerEvaluationResult[]> {
  const service = new WorkflowTriggerService()

  return service.evaluateTriggers({
    type: 'custom_field_changed',
    organizationId,
    contactId,
    data: { fieldName, fieldValue },
    timestamp: new Date(),
  })
}

// Export singleton for convenience
export const workflowTriggerService = new WorkflowTriggerService()
