/**
 * Enhanced Workflow Execution Engine
 *
 * Extends the base execution engine with:
 * - Execution logging (step-by-step tracking)
 * - Error handling with retries (exponential backoff)
 * - Real action implementations (database operations)
 * - AI integration
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { WorkflowExecutionEngine, ExecutionContext, NodeExecutionResult, WhatsAppCredentials, ContactInfo } from './execution-engine'
import { createExecutionLogger, WorkflowExecutionLogger } from './execution-logger'
import { createRetryHandler, WorkflowRetryHandler, DEFAULT_RETRY_CONFIG } from './retry-handler'
import { executeAction } from './action-handlers'
import { executeAIAction } from './ai-handler'
import type { Workflow, WorkflowNode, ActionNodeData, AINodeData, ConditionNodeData } from '@/types/workflow'

// ============================================================================
// ENHANCED EXECUTION ENGINE
// ============================================================================

export class EnhancedWorkflowEngine extends WorkflowExecutionEngine {
  private logger: WorkflowExecutionLogger | null = null
  private retryHandler: WorkflowRetryHandler
  private enableLogging: boolean
  private supabase = createServiceRoleClient()

  constructor(
    workflow: Workflow,
    options: {
      enableLogging?: boolean
      retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>
    } = {}
  ) {
    super(workflow)
    this.enableLogging = options.enableLogging ?? true
    this.retryHandler = createRetryHandler(options.retryConfig)
  }

  /**
   * Start workflow execution with enhanced features
   */
  async startExecution(
    contactId: string,
    organizationId: string,
    contact?: ContactInfo,
    whatsappCredentials?: WhatsAppCredentials
  ): Promise<ExecutionContext> {
    // Call parent to create context
    const context = await super.startExecution(contactId, organizationId, contact, whatsappCredentials)

    // Initialize logger
    if (this.enableLogging) {
      this.logger = createExecutionLogger(context.executionId, organizationId, this.supabase)
    }

    return context
  }

  /**
   * Execute action node with real database operations
   */
  protected async executeActionNode(
    node: WorkflowNode & { data: ActionNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { actionConfig } = node.data

    // Log node start
    if (this.logger) {
      await this.logger.logNodeStart(node.id, 'action', {
        actionType: actionConfig.actionType,
        config: actionConfig,
      })
    }

    try {
      // Execute real action
      const result = await executeAction(context, actionConfig)

      if (!result.success) {
        // Try retry
        const retryResult = await this.retryHandler.evaluateRetry(
          context.executionId,
          node.id,
          result.error || 'Action failed',
          context.retryCount
        )

        if (retryResult.shouldRetry) {
          context.retryCount++
          // Return waiting status for retry
          if (this.logger) {
            await this.logger.logNodeFailure(node.id, result.error || 'Action failed', 'RETRY_SCHEDULED')
          }
          return {
            success: false,
            error: result.error,
            waitUntil: retryResult.nextAttemptAt,
          }
        }

        // Max retries exceeded
        if (this.logger) {
          await this.logger.logNodeFailure(node.id, result.error || 'Action failed', 'MAX_RETRIES_EXCEEDED')
        }
        return {
          success: false,
          error: result.error,
        }
      }

      // Log success
      if (this.logger) {
        await this.logger.logNodeComplete(node.id, result.data)
      }

      return {
        success: true,
        context: {
          ...context.context,
          [`action_${node.id}`]: result.data,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (this.logger) {
        await this.logger.logNodeFailure(node.id, errorMessage)
      }

      return {
        success: false,
        error: `Action failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Execute AI node with real AI integration
   */
  protected async executeAINode(
    node: WorkflowNode & { data: AINodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { aiConfig } = node.data

    // Log node start
    if (this.logger) {
      await this.logger.logNodeStart(node.id, 'ai', {
        action: aiConfig.action,
        model: aiConfig.model,
      })
    }

    try {
      // Execute AI action
      const result = await executeAIAction(context, aiConfig)

      if (!result.success) {
        // AI errors are usually not retryable (bad prompts, etc.)
        if (this.logger) {
          await this.logger.logNodeFailure(node.id, result.error || 'AI execution failed')
        }
        return {
          success: false,
          error: result.error,
        }
      }

      // Log success
      if (this.logger) {
        await this.logger.logNodeComplete(node.id, result.data)
      }

      return {
        success: true,
        context: {
          ...context.context,
          [`ai_${node.id}`]: result.data,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Check if retryable
      const retryResult = await this.retryHandler.evaluateRetry(
        context.executionId,
        node.id,
        errorMessage,
        context.retryCount
      )

      if (retryResult.shouldRetry) {
        context.retryCount++
        if (this.logger) {
          await this.logger.logNodeFailure(node.id, errorMessage, 'RETRY_SCHEDULED')
        }
        return {
          success: false,
          error: errorMessage,
          waitUntil: retryResult.nextAttemptAt,
        }
      }

      if (this.logger) {
        await this.logger.logNodeFailure(node.id, errorMessage)
      }

      return {
        success: false,
        error: `AI failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Execute condition node with real data evaluation
   */
  protected async executeConditionNode(
    node: WorkflowNode & { data: ConditionNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { conditionConfig } = node.data

    // Log node start
    if (this.logger) {
      await this.logger.logNodeStart(node.id, 'condition', {
        field: conditionConfig.field,
        operator: conditionConfig.operator,
        value: conditionConfig.value,
      })
    }

    try {
      // Fetch actual contact data
      const { data: contact } = await this.supabase
        .from('contacts')
        .select('tags, custom_fields, status, source, last_message_at')
        .eq('id', context.contactId)
        .single()

      // Build contact data object for evaluation
      const contactData: Record<string, any> = {
        tag: contact?.tags || [],
        custom_field: contact?.custom_fields || {},
        contact_status: contact?.status,
        contact_source: contact?.source,
        last_message_date: contact?.last_message_at,
        ...context.context, // Include workflow context
      }

      // Evaluate condition(s)
      let conditionMet: boolean

      if (conditionConfig.conditions && conditionConfig.conditions.length > 0) {
        // Multiple conditions with logical operators
        conditionMet = this.evaluateMultipleConditions(conditionConfig.conditions, contactData)
      } else {
        // Single condition
        conditionMet = this.evaluateSingleCondition(
          conditionConfig.field,
          conditionConfig.operator,
          conditionConfig.value,
          contactData
        )
      }

      // Find outgoing edges
      const trueEdge = (this as any).edges.find(
        (e: any) => e.source === node.id && e.sourceHandle === 'true'
      )
      const falseEdge = (this as any).edges.find(
        (e: any) => e.source === node.id && e.sourceHandle === 'false'
      )

      const nextNodeId = conditionMet ? trueEdge?.target : falseEdge?.target

      // Log completion
      if (this.logger) {
        await this.logger.logNodeComplete(node.id, {
          conditionMet,
          nextPath: conditionMet ? 'true' : 'false',
        })
      }

      return {
        success: true,
        nextNodeId,
        context: {
          ...context.context,
          [`condition_${node.id}`]: conditionMet,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (this.logger) {
        await this.logger.logNodeFailure(node.id, errorMessage)
      }

      return {
        success: false,
        error: `Condition evaluation failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateSingleCondition(
    field: string,
    operator: string,
    value: string | number | boolean,
    contactData: Record<string, any>
  ): boolean {
    // Get field value based on field type
    let fieldValue: any

    switch (field) {
      case 'tag':
        fieldValue = contactData.tag || []
        break
      case 'custom_field':
        // For custom fields, value might be "fieldName:expectedValue"
        const [customFieldName] = String(value).split(':')
        fieldValue = contactData.custom_field?.[customFieldName]
        break
      default:
        fieldValue = contactData[field]
    }

    // Evaluate operator
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value)
        }
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value)
        }
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      case 'is_empty':
        return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || fieldValue === ''
      case 'is_not_empty':
        return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0) && fieldValue !== ''
      default:
        return false
    }
  }

  /**
   * Evaluate multiple conditions with logical operators
   */
  private evaluateMultipleConditions(
    conditions: Array<{
      field: string
      operator: string
      value: string | number | boolean
      logicalOperator?: 'AND' | 'OR'
    }>,
    contactData: Record<string, any>
  ): boolean {
    if (conditions.length === 0) return true

    let result = this.evaluateSingleCondition(
      conditions[0].field,
      conditions[0].operator,
      conditions[0].value,
      contactData
    )

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i]
      const conditionResult = this.evaluateSingleCondition(
        condition.field,
        condition.operator,
        condition.value,
        contactData
      )

      const logicalOp = conditions[i - 1].logicalOperator || 'AND'

      if (logicalOp === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }
    }

    return result
  }

  /**
   * Get execution summary with logs
   */
  async getExecutionSummary(): Promise<any> {
    if (!this.logger) {
      return null
    }
    return this.logger.getExecutionSummary()
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an enhanced workflow execution engine
 */
export function createEnhancedEngine(
  workflow: Workflow,
  options?: {
    enableLogging?: boolean
    retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>
  }
): EnhancedWorkflowEngine {
  return new EnhancedWorkflowEngine(workflow, options)
}

/**
 * Execute workflow with enhanced features
 */
export async function executeWorkflowEnhanced(
  workflow: Workflow,
  contactId: string,
  organizationId: string,
  contact?: ContactInfo,
  whatsappCredentials?: WhatsAppCredentials
): Promise<ExecutionContext> {
  const engine = createEnhancedEngine(workflow)
  return engine.startExecution(contactId, organizationId, contact, whatsappCredentials)
}
