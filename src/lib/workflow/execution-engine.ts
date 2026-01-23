/**
 * Workflow Execution Engine
 *
 * Processes and executes workflow nodes for individual contacts.
 * Handles all node types with proper state tracking and error handling.
 */

import { WhatsAppClient } from '@/lib/whatsapp/client';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowExecutionStatus,
  TriggerNodeData,
  MessageNodeData,
  DelayNodeData,
  ConditionNodeData,
  ActionNodeData,
  WaitUntilNodeData,
  SplitNodeData,
  WebhookNodeData,
  AINodeData,
  GoalNodeData,
} from '@/types/workflow';
import {
  isTriggerNode,
  isMessageNode,
  isDelayNode,
  isConditionNode,
  isActionNode,
  isWaitUntilNode,
  isSplitNode,
  isWebhookNode,
  isAINode,
  isGoalNode,
} from '@/types/workflow';

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * WhatsApp credentials for sending messages
 */
export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
}

/**
 * Contact information for workflow execution
 */
export interface ContactInfo {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Execution context passed through workflow execution
 */
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  contactId: string;
  organizationId: string;
  currentNodeId: string;
  executionPath: string[];
  context: Record<string, any>; // Persisted data
  status: WorkflowExecutionStatus;
  errorMessage?: string;
  errorNodeId?: string;
  retryCount: number;
  // Added for actual message sending
  contact?: ContactInfo;
  whatsappCredentials?: WhatsAppCredentials;
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  success: boolean;
  nextNodeId?: string | string[]; // Can be multiple for split nodes
  waitUntil?: Date; // For delay nodes
  error?: string;
  context?: Record<string, any>; // Updated context data
  shouldStop?: boolean; // Stop workflow execution
}

// ============================================================================
// WORKFLOW EXECUTION ENGINE
// ============================================================================

export class WorkflowExecutionEngine {
  private workflow: Workflow;
  private nodes: Map<string, WorkflowNode>;
  private edges: WorkflowEdge[];

  constructor(workflow: Workflow) {
    this.workflow = workflow;
    this.nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
    this.edges = workflow.edges;
  }

  /**
   * Start workflow execution for a contact
   */
  async startExecution(
    contactId: string,
    organizationId: string,
    contact?: ContactInfo,
    whatsappCredentials?: WhatsAppCredentials
  ): Promise<ExecutionContext> {
    // Find trigger node
    const triggerNode = this.workflow.nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('Workflow must have a trigger node');
    }

    // Create initial execution context
    const context: ExecutionContext = {
      workflowId: this.workflow.id,
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      organizationId,
      currentNodeId: triggerNode.id,
      executionPath: [triggerNode.id],
      context: {},
      status: 'running',
      retryCount: 0,
      contact,
      whatsappCredentials,
    };

    // Execute from trigger node
    await this.executeNextNode(context);

    return context;
  }

  /**
   * Resume execution from a specific node (e.g., after delay)
   */
  async resumeExecution(executionContext: ExecutionContext): Promise<void> {
    await this.executeNextNode(executionContext);
  }

  /**
   * Execute next node in workflow
   */
  private async executeNextNode(context: ExecutionContext): Promise<void> {
    const node = this.nodes.get(context.currentNodeId);
    if (!node) {
      context.status = 'failed';
      context.errorMessage = `Node not found: ${context.currentNodeId}`;
      return;
    }

    try {
      // Execute the node
      const result = await this.executeNode(node, context);

      if (!result.success) {
        context.status = 'failed';
        context.errorMessage = result.error || 'Node execution failed';
        context.errorNodeId = node.id;
        return;
      }

      // Update context with any data from node execution
      if (result.context) {
        context.context = { ...context.context, ...result.context };
      }

      // Check if should stop
      if (result.shouldStop) {
        context.status = 'completed';
        return;
      }

      // Handle delay
      if (result.waitUntil) {
        context.status = 'waiting';
        return;
      }

      // Get next nodes
      const nextNodeIds = Array.isArray(result.nextNodeId)
        ? result.nextNodeId
        : result.nextNodeId
        ? [result.nextNodeId]
        : this.getNextNodeIds(node.id);

      if (nextNodeIds.length === 0) {
        // No more nodes, workflow complete
        context.status = 'completed';
        return;
      }

      // For now, take first path (in production, would handle splits)
      const nextNodeId = nextNodeIds[0];
      context.currentNodeId = nextNodeId;
      context.executionPath.push(nextNodeId);

      // Continue execution
      await this.executeNextNode(context);
    } catch (error) {
      context.status = 'failed';
      context.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      context.errorNodeId = node.id;
    }
  }

  /**
   * Execute individual node based on type
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    if (isTriggerNode(node)) {
      return this.executeTriggerNode(node, context);
    } else if (isMessageNode(node)) {
      return this.executeMessageNode(node, context);
    } else if (isDelayNode(node)) {
      return this.executeDelayNode(node, context);
    } else if (isConditionNode(node)) {
      return this.executeConditionNode(node, context);
    } else if (isActionNode(node)) {
      return this.executeActionNode(node, context);
    } else if (isWaitUntilNode(node)) {
      return this.executeWaitUntilNode(node, context);
    } else if (isSplitNode(node)) {
      return this.executeSplitNode(node, context);
    } else if (isWebhookNode(node)) {
      return this.executeWebhookNode(node, context);
    } else if (isAINode(node)) {
      return this.executeAINode(node, context);
    } else if (isGoalNode(node)) {
      return this.executeGoalNode(node, context);
    }

    return {
      success: false,
      error: `Unknown node type: ${node.type}`,
    };
  }

  /**
   * Execute trigger node (just pass through)
   */
  private async executeTriggerNode(
    node: WorkflowNode & { data: TriggerNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    // Trigger just starts the workflow, no action needed
    return { success: true };
  }

  /**
   * Execute message node (send WhatsApp message)
   */
  private async executeMessageNode(
    node: WorkflowNode & { data: MessageNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const { messageConfig } = node.data;

      // Check if we have the required data for sending
      if (!context.contact?.phone) {
        console.warn(`[Workflow] No phone number for contact ${context.contactId}, skipping message`);
        return { success: true }; // Continue workflow but skip message
      }

      if (!context.whatsappCredentials) {
        console.warn(`[Workflow] No WhatsApp credentials available, skipping message`);
        return { success: true }; // Continue workflow but skip message
      }

      // Create WhatsApp client with organization credentials
      const whatsappClient = new WhatsAppClient(
        context.whatsappCredentials.accessToken,
        context.whatsappCredentials.phoneNumberId
      );

      // Prepare message content with variable substitution
      let messageText = messageConfig.customMessage || '';

      // Replace variables with contact data
      if (context.contact) {
        messageText = messageText
          .replace(/\{\{name\}\}/gi, context.contact.name || '')
          .replace(/\{\{phone\}\}/gi, context.contact.phone || '')
          .replace(/\{\{email\}\}/gi, context.contact.email || '');

        // Replace custom field variables
        if (context.contact.customFields) {
          Object.entries(context.contact.customFields).forEach(([key, value]) => {
            messageText = messageText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), String(value || ''));
          });
        }
      }

      // Send message based on type
      if (messageConfig.templateId) {
        // Send template message
        await whatsappClient.sendTemplateMessage(
          context.contact.phone,
          messageConfig.templateId,
          messageConfig.templateLanguage || 'en',
          messageConfig.templateComponents || []
        );
        console.log(`[Workflow] Sent template message "${messageConfig.templateId}" to ${context.contact.phone}`);
      } else if (messageConfig.mediaUrl) {
        // Send media message
        const mediaType = messageConfig.mediaType || 'image';
        if (mediaType === 'image') {
          await whatsappClient.sendImageMessage(
            context.contact.phone,
            messageConfig.mediaUrl,
            messageText || undefined
          );
        } else if (mediaType === 'document') {
          await whatsappClient.sendDocumentMessage(
            context.contact.phone,
            messageConfig.mediaUrl,
            messageConfig.mediaFilename,
            messageText || undefined
          );
        }
        console.log(`[Workflow] Sent ${mediaType} message to ${context.contact.phone}`);
      } else if (messageText) {
        // Send text message
        await whatsappClient.sendTextMessage(context.contact.phone, messageText);
        console.log(`[Workflow] Sent text message to ${context.contact.phone}: "${messageText.substring(0, 50)}..."`);
      } else {
        console.warn(`[Workflow] No message content configured for node ${node.id}`);
      }

      return {
        success: true,
        context: {
          ...context.context,
          [`message_${node.id}`]: {
            sentAt: new Date().toISOString(),
            to: context.contact.phone,
            type: messageConfig.templateId ? 'template' : messageConfig.mediaUrl ? 'media' : 'text',
          },
        },
      };
    } catch (error) {
      console.error(`[Workflow] Failed to send message:`, error);
      return {
        success: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute delay node (wait for specified time)
   */
  private async executeDelayNode(
    node: WorkflowNode & { data: DelayNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { delayConfig } = node.data;

    // Calculate delay in milliseconds
    let delayMs = 0;
    switch (delayConfig.unit) {
      case 'minutes':
        delayMs = delayConfig.amount * 60 * 1000;
        break;
      case 'hours':
        delayMs = delayConfig.amount * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = delayConfig.amount * 24 * 60 * 60 * 1000;
        break;
      case 'weeks':
        delayMs = delayConfig.amount * 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const waitUntil = new Date(Date.now() + delayMs);

    return {
      success: true,
      waitUntil,
    };
  }

  /**
   * Execute condition node (evaluate condition and branch)
   */
  private async executeConditionNode(
    node: WorkflowNode & { data: ConditionNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { conditionConfig } = node.data;

    // TODO: Fetch contact data and evaluate condition
    // const contact = await fetchContactData(context.contactId);
    // const conditionMet = evaluateCondition(conditionConfig, contact);

    // For now, randomly decide (in production, use actual evaluation)
    const conditionMet = Math.random() > 0.5;

    // Find outgoing edges
    const trueEdge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === 'true'
    );
    const falseEdge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === 'false'
    );

    const nextNodeId = conditionMet ? trueEdge?.target : falseEdge?.target;

    return {
      success: true,
      nextNodeId,
      context: {
        ...context.context,
        [`condition_${node.id}`]: conditionMet,
      },
    };
  }

  /**
   * Execute action node (perform action like add tag, update field)
   */
  private async executeActionNode(
    node: WorkflowNode & { data: ActionNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { actionConfig } = node.data;

    try {
      switch (actionConfig.actionType) {
        case 'add_tag':
          // TODO: Add tags to contact
          console.log(`[Workflow] Adding tags to contact ${context.contactId}:`, actionConfig.tagIds);
          break;

        case 'remove_tag':
          // TODO: Remove tags from contact
          console.log(`[Workflow] Removing tags from contact ${context.contactId}:`, actionConfig.tagIds);
          break;

        case 'update_field':
          // TODO: Update contact field
          console.log(`[Workflow] Updating field ${actionConfig.fieldName} = ${actionConfig.fieldValue}`);
          break;

        case 'add_to_list':
          // TODO: Add contact to list
          console.log(`[Workflow] Adding contact to list ${actionConfig.listId}`);
          break;

        case 'remove_from_list':
          // TODO: Remove contact from list
          console.log(`[Workflow] Removing contact from list ${actionConfig.listId}`);
          break;

        case 'send_notification':
          // TODO: Send notification
          console.log(`[Workflow] Sending notification to ${actionConfig.notificationEmail}`);
          break;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute wait until node (wait for event or condition)
   */
  private async executeWaitUntilNode(
    node: WorkflowNode & { data: WaitUntilNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { waitUntilConfig } = node.data;

    // TODO: Implement event waiting logic
    // For now, treat as delay if specific_date
    if (waitUntilConfig.eventType === 'specific_date' && waitUntilConfig.date) {
      const waitUntil = new Date(waitUntilConfig.date);
      if (waitUntilConfig.time) {
        const [hours, minutes] = waitUntilConfig.time.split(':');
        waitUntil.setHours(parseInt(hours), parseInt(minutes));
      }
      return { success: true, waitUntil };
    }

    // For other event types, would need to set up listeners
    return { success: true };
  }

  /**
   * Execute split node (A/B testing split)
   */
  private async executeSplitNode(
    node: WorkflowNode & { data: SplitNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { splitConfig } = node.data;

    let selectedBranchId: string;

    if (splitConfig.splitType === 'random' || splitConfig.splitType === 'percentage') {
      // Random percentage split
      const random = Math.random() * 100;
      let cumulative = 0;

      for (const branch of splitConfig.branches) {
        cumulative += branch.percentage;
        if (random <= cumulative) {
          selectedBranchId = branch.id;
          break;
        }
      }

      selectedBranchId = selectedBranchId! || splitConfig.branches[0]?.id;
    } else {
      // Field-based split
      // TODO: Implement field-based splitting
      selectedBranchId = splitConfig.branches[0]?.id;
    }

    // Find edge for selected branch
    const selectedEdge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === selectedBranchId
    );

    return {
      success: true,
      nextNodeId: selectedEdge?.target,
      context: {
        ...context.context,
        [`split_${node.id}`]: selectedBranchId,
      },
    };
  }

  /**
   * Execute webhook node (call external API)
   */
  private async executeWebhookNode(
    node: WorkflowNode & { data: WebhookNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { webhookConfig } = node.data;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...webhookConfig.headers,
      };

      // Add authentication
      if (webhookConfig.authType === 'bearer' && webhookConfig.authToken) {
        headers['Authorization'] = `Bearer ${webhookConfig.authToken}`;
      } else if (webhookConfig.authType === 'basic' && webhookConfig.authUsername && webhookConfig.authPassword) {
        const auth = Buffer.from(`${webhookConfig.authUsername}:${webhookConfig.authPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      } else if (webhookConfig.authType === 'api_key' && webhookConfig.authApiKey && webhookConfig.authApiKeyHeader) {
        headers[webhookConfig.authApiKeyHeader] = webhookConfig.authApiKey;
      }

      // Make request
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method,
        headers,
        body: webhookConfig.method !== 'GET' ? webhookConfig.body : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Save response if configured
      const updatedContext = webhookConfig.saveResponse && webhookConfig.responseField
        ? { [webhookConfig.responseField]: responseData }
        : {};

      return {
        success: true,
        context: updatedContext,
      };
    } catch (error) {
      // Retry logic
      if (webhookConfig.retryOnFailure && context.retryCount < (webhookConfig.maxRetries || 3)) {
        context.retryCount++;
        // TODO: Implement retry with backoff
      }

      return {
        success: false,
        error: `Webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute AI node (AI-powered actions)
   */
  private async executeAINode(
    node: WorkflowNode & { data: AINodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { aiConfig } = node.data;

    // TODO: Implement AI integrations (OpenAI, Claude, etc.)
    console.log(`[Workflow] AI Action: ${aiConfig.action} with model ${aiConfig.model}`);

    // Placeholder implementation
    const aiResult = {
      sentiment: 'positive',
      category: 'support',
      extracted_info: {},
      generated_response: 'AI generated response',
      translated_text: 'Translated text',
    };

    return {
      success: true,
      context: {
        ...context.context,
        [`ai_${node.id}`]: aiResult,
      },
    };
  }

  /**
   * Execute goal node (track conversion)
   */
  private async executeGoalNode(
    node: WorkflowNode & { data: GoalNodeData },
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { goalConfig } = node.data;

    try {
      // TODO: Track goal in analytics
      console.log(`[Workflow] Goal reached: ${goalConfig.goalName} (${goalConfig.goalType})`);

      // Send notification if configured
      if (goalConfig.notifyOnCompletion && goalConfig.notificationEmail) {
        // TODO: Send notification email
        console.log(`[Workflow] Sending goal notification to ${goalConfig.notificationEmail}`);
      }

      return {
        success: true,
        context: {
          ...context.context,
          [`goal_${node.id}`]: {
            goalName: goalConfig.goalName,
            goalType: goalConfig.goalType,
            achievedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Goal tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get next node IDs from current node
   */
  private getNextNodeIds(currentNodeId: string): string[] {
    const outgoingEdges = this.edges.filter((e) => e.source === currentNodeId);
    return outgoingEdges.map((e) => e.target);
  }

  /**
   * Evaluate condition against contact data
   */
  private evaluateCondition(
    conditionConfig: ConditionNodeData['conditionConfig'],
    contactData: Record<string, any>
  ): boolean {
    const { field, operator, value } = conditionConfig;

    // Get field value from contact
    const fieldValue = contactData[field];

    // Evaluate operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new workflow execution engine instance
 */
export function createExecutionEngine(workflow: Workflow): WorkflowExecutionEngine {
  return new WorkflowExecutionEngine(workflow);
}

/**
 * Execute workflow for a contact (convenience function)
 */
export async function executeWorkflowForContact(
  workflow: Workflow,
  contactId: string,
  organizationId: string
): Promise<ExecutionContext> {
  const engine = createExecutionEngine(workflow);
  return engine.startExecution(contactId, organizationId);
}
