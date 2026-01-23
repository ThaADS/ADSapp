/**
 * Workflow Execution Engine
 * State machine for executing automation workflows with error handling and rollback
 */

import { createClient } from '@/lib/supabase/server'

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook' | 'ai_response'
  config: Record<string, any>
  connections: {
    success?: string // Next node ID on success
    failure?: string // Next node ID on failure
    true?: string // For condition nodes: if true
    false?: string // For condition nodes: if false
  }
}

export interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNode[]
  startNodeId: string
  variables?: Record<string, any>
}

export interface ExecutionContext {
  conversationId?: string
  contactId?: string
  messageId?: string
  triggerData: Record<string, any>
  variables: Record<string, any>
  organizationId: string
  userId?: string
}

export interface ExecutionResult {
  success: boolean
  executionId: string
  finalState: 'completed' | 'failed' | 'paused'
  error?: string
  output?: Record<string, any>
  path: string[] // Node IDs executed
}

export class WorkflowExecutionEngine {
  private maxNodeExecutions = 100 // Prevent infinite loops
  private executionTimeout = 300000 // 5 minutes

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const supabase = await createClient()
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const executionPath: string[] = []
    const executionData: Record<string, any> = {
      ...workflow.variables,
      ...context.variables,
    }

    try {
      // Create execution record
      const { error: createError } = await supabase.from('workflow_executions').insert({
        id: executionId,
        workflow_id: workflow.id,
        conversation_id: context.conversationId,
        organization_id: context.organizationId,
        status: 'running',
        input_data: context.triggerData,
        execution_data: executionData,
        triggered_by: context.userId,
        trigger_type: 'event',
      })

      if (createError) throw createError

      // Execute workflow starting from start node
      let currentNodeId: string | undefined = workflow.startNodeId
      let executionCount = 0
      const startTime = Date.now()

      while (currentNodeId && executionCount < this.maxNodeExecutions) {
        // Check timeout
        if (Date.now() - startTime > this.executionTimeout) {
          throw new Error('Workflow execution timeout')
        }

        const node = workflow.nodes.find(n => n.id === currentNodeId)
        if (!node) {
          throw new Error(`Node not found: ${currentNodeId}`)
        }

        executionPath.push(currentNodeId)

        // Log node execution start
        await this.logNodeExecution(executionId, context.organizationId, {
          node_id: node.id,
          node_type: node.type,
          status: 'started',
          input_data: executionData,
        })

        try {
          // Execute node
          const nodeResult = await this.executeNode(node, executionData, context)

          // Update execution data with node output
          Object.assign(executionData, nodeResult.output || {})

          // Log node completion
          await this.logNodeExecution(executionId, context.organizationId, {
            node_id: node.id,
            node_type: node.type,
            status: 'completed',
            output_data: nodeResult.output,
          })

          // Determine next node
          currentNodeId = this.getNextNode(node, nodeResult)
        } catch (nodeError: any) {
          // Log node failure
          await this.logNodeExecution(executionId, context.organizationId, {
            node_id: node.id,
            node_type: node.type,
            status: 'failed',
            error_message: nodeError.message,
          })

          // Update execution with error
          await supabase
            .from('workflow_executions')
            .update({
              status: 'failed',
              error_message: nodeError.message,
              error_node_id: node.id,
              completed_at: new Date().toISOString(),
              execution_path: executionPath,
            })
            .eq('id', executionId)

          return {
            success: false,
            executionId,
            finalState: 'failed',
            error: nodeError.message,
            path: executionPath,
          }
        }

        executionCount++
      }

      if (executionCount >= this.maxNodeExecutions) {
        throw new Error('Maximum node execution limit reached - possible infinite loop')
      }

      // Mark execution as completed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          output_data: executionData,
          completed_at: new Date().toISOString(),
          execution_path: executionPath,
        })
        .eq('id', executionId)

      return {
        success: true,
        executionId,
        finalState: 'completed',
        output: executionData,
        path: executionPath,
      }
    } catch (error: any) {
      // Update execution with error
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          execution_path: executionPath,
        })
        .eq('id', executionId)

      return {
        success: false,
        executionId,
        finalState: 'failed',
        error: error.message,
        path: executionPath,
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{
    success: boolean
    output?: Record<string, any>
    branch?: 'true' | 'false' | 'success' | 'failure'
  }> {
    switch (node.type) {
      case 'trigger':
        return this.executeTriggerNode(node, executionData, context)

      case 'condition':
        return this.executeConditionNode(node, executionData, context)

      case 'action':
        return this.executeActionNode(node, executionData, context)

      case 'delay':
        return this.executeDelayNode(node, executionData, context)

      case 'webhook':
        return this.executeWebhookNode(node, executionData, context)

      case 'ai_response':
        return this.executeAIResponseNode(node, executionData, context)

      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }
  }

  /**
   * Trigger node execution (starting point)
   */
  private async executeTriggerNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; output: Record<string, any> }> {
    // Trigger nodes just pass through the initial data
    return {
      success: true,
      output: {
        trigger_fired: true,
        trigger_data: context.triggerData,
      },
    }
  }

  /**
   * Condition node execution (if/else logic)
   */
  private async executeConditionNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; branch: 'true' | 'false' }> {
    const { condition_type, field, operator, value } = node.config

    let conditionMet = false

    switch (condition_type) {
      case 'keyword_match':
        const message = executionData.message_content || context.triggerData.content || ''
        const keywords = Array.isArray(node.config.keywords)
          ? node.config.keywords
          : [node.config.keyword]
        conditionMet = keywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()))
        break

      case 'tag_check':
        const contactTags = executionData.contact_tags || []
        const requiredTag = node.config.tag
        conditionMet = contactTags.includes(requiredTag)
        break

      case 'field_comparison':
        const fieldValue = executionData[field]
        conditionMet = this.evaluateComparison(fieldValue, operator, value)
        break

      case 'time_check':
        const currentHour = new Date().getHours()
        const startHour = parseInt(node.config.start_hour || 0)
        const endHour = parseInt(node.config.end_hour || 23)
        conditionMet = currentHour >= startHour && currentHour <= endHour
        break

      default:
        conditionMet = false
    }

    return {
      success: true,
      branch: conditionMet ? 'true' : 'false',
    }
  }

  /**
   * Action node execution (perform actions)
   */
  private async executeActionNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: Record<string, any> }> {
    const { action_type } = node.config

    switch (action_type) {
      case 'send_message':
        return await this.sendMessage(node.config, context)

      case 'add_tag':
        return await this.addTag(node.config, context)

      case 'remove_tag':
        return await this.removeTag(node.config, context)

      case 'assign_agent':
        return await this.assignAgent(node.config, context)

      case 'set_priority':
        return await this.setPriority(node.config, context)

      case 'create_note':
        return await this.createNote(node.config, context)

      default:
        throw new Error(`Unknown action type: ${action_type}`)
    }
  }

  /**
   * Delay node execution (wait/pause)
   */
  private async executeDelayNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean }> {
    const { delay_type, duration_seconds } = node.config

    if (delay_type === 'fixed_delay' && duration_seconds) {
      // For immediate execution, we just note the delay
      // In production, this would schedule the next node execution
      return { success: true }
    }

    return { success: true }
  }

  /**
   * Webhook node execution (HTTP requests)
   */
  private async executeWebhookNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: Record<string, any> }> {
    const { url, method = 'POST', headers = {}, body_template } = node.config

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          ...executionData,
          context,
        }),
      })

      const responseData = await response.json()

      return {
        success: response.ok,
        output: {
          webhook_response: responseData,
          webhook_status: response.status,
        },
      }
    } catch (error: any) {
      throw new Error(`Webhook failed: ${error.message}`)
    }
  }

  /**
   * AI Response node execution (generate intelligent responses)
   */
  private async executeAIResponseNode(
    node: WorkflowNode,
    executionData: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: Record<string, any> }> {
    // Placeholder for AI integration
    // In production, this would call OpenAI API or similar
    return {
      success: true,
      output: {
        ai_response: 'AI response placeholder',
        confidence: 0.9,
      },
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getNextNode(
    node: WorkflowNode,
    result: { success: boolean; branch?: string }
  ): string | undefined {
    if (result.branch) {
      return node.connections[result.branch]
    }

    return result.success ? node.connections.success : node.connections.failure
  }

  private evaluateComparison(fieldValue: any, operator: string, targetValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === targetValue
      case 'not_equals':
        return fieldValue !== targetValue
      case 'contains':
        return String(fieldValue).includes(String(targetValue))
      case 'greater_than':
        return Number(fieldValue) > Number(targetValue)
      case 'less_than':
        return Number(fieldValue) < Number(targetValue)
      default:
        return false
    }
  }

  private async logNodeExecution(
    executionId: string,
    organizationId: string,
    logData: {
      node_id: string
      node_type: string
      status: string
      input_data?: any
      output_data?: any
      error_message?: string
    }
  ) {
    const supabase = await createClient()
    const { error } = await supabase.from('workflow_execution_logs').insert({
      execution_id: executionId,
      organization_id: organizationId,
      ...logData,
      completed_at:
        logData.status === 'completed' || logData.status === 'failed'
          ? new Date().toISOString()
          : null,
    })

    if (error) {
      console.error('Failed to log node execution:', error)
    }
  }

  // ========================================================================
  // Action Implementations
  // ========================================================================

  private async sendMessage(config: any, context: ExecutionContext) {
    const { message_template, template_variables } = config

    let message = message_template

    // Replace template variables
    if (template_variables) {
      Object.entries(template_variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      })
    }

    // In production, send actual WhatsApp message
    console.log('Sending message:', message)

    return {
      success: true,
      output: {
        message_sent: true,
        message_id: `msg_${Date.now()}`,
      },
    }
  }

  private async addTag(config: any, context: ExecutionContext) {
    const { tag_name } = config

    if (!context.conversationId) {
      throw new Error('No conversation ID provided for tag operation')
    }

    // Add tag to conversation
    // In production, update the conversation's tags array
    console.log('Adding tag:', tag_name)

    return {
      success: true,
      output: {
        tag_added: tag_name,
      },
    }
  }

  private async removeTag(config: any, context: ExecutionContext) {
    const { tag_name } = config

    console.log('Removing tag:', tag_name)

    return {
      success: true,
      output: {
        tag_removed: tag_name,
      },
    }
  }

  private async assignAgent(config: any, context: ExecutionContext) {
    const { agent_id } = config

    if (!context.conversationId) {
      throw new Error('No conversation ID provided for assignment')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to: agent_id })
      .eq('id', context.conversationId)

    if (error) throw error

    return {
      success: true,
      output: {
        assigned_to: agent_id,
      },
    }
  }

  private async setPriority(config: any, context: ExecutionContext) {
    const { priority } = config

    if (!context.conversationId) {
      throw new Error('No conversation ID provided for priority update')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('conversations')
      .update({ priority })
      .eq('id', context.conversationId)

    if (error) throw error

    return {
      success: true,
      output: {
        priority_set: priority,
      },
    }
  }

  private async createNote(config: any, context: ExecutionContext) {
    const { note_content } = config

    if (!context.conversationId) {
      throw new Error('No conversation ID provided for note creation')
    }

    const supabase = await createClient()

    // Get existing notes
    const { data: conversation } = await supabase
      .from('conversations')
      .select('notes')
      .eq('id', context.conversationId)
      .single()

    const newNote = {
      id: `note_${Date.now()}`,
      content: note_content,
      created_by: 'system',
      created_at: new Date().toISOString(),
    }

    const updatedNotes = [...(conversation?.notes || []), newNote]

    const { error } = await supabase
      .from('conversations')
      .update({ notes: updatedNotes })
      .eq('id', context.conversationId)

    if (error) throw error

    return {
      success: true,
      output: {
        note_created: true,
        note_id: newNote.id,
      },
    }
  }
}

/**
 * Convenience function to trigger a workflow execution
 */
export async function triggerWorkflow(
  workflowId: string,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const supabase = await createClient()

  // Fetch workflow definition
  const { data: workflow, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('id', workflowId)
    .single()

  if (error || !workflow) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  // Convert database workflow to WorkflowDefinition
  const workflowDefinition: WorkflowDefinition = {
    id: workflow.id,
    name: workflow.name,
    nodes: workflow.trigger_conditions?.nodes || [],
    startNodeId: workflow.trigger_conditions?.startNodeId || '',
    variables: workflow.trigger_conditions?.variables || {},
  }

  const engine = new WorkflowExecutionEngine()
  return await engine.executeWorkflow(workflowDefinition, context)
}
