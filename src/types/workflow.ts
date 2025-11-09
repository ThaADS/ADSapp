/**
 * Workflow Builder Type Definitions
 *
 * Comprehensive type system for visual workflow builder using React Flow.
 * Supports drag-and-drop campaign creation with conditional branching.
 */

import type { Node, Edge, NodeProps } from '@xyflow/react';

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Available workflow node types
 */
export type WorkflowNodeType =
  | 'trigger'      // Campaign start trigger (contact added, tag applied, etc.)
  | 'message'      // Send WhatsApp message
  | 'delay'        // Wait/delay before next action
  | 'condition'    // Conditional branching (if/else logic)
  | 'action';      // Other actions (add tag, update field, etc.)

/**
 * Trigger event types for campaign start
 */
export type TriggerEventType =
  | 'contact_added'           // When contact is added to list
  | 'tag_applied'             // When tag is applied to contact
  | 'webhook_received'        // When webhook is triggered
  | 'date_time'               // At specific date/time
  | 'contact_replied'         // When contact sends message
  | 'custom_field_changed';   // When custom field value changes

/**
 * Delay unit types
 */
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks';

/**
 * Condition operator types
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Condition field types
 */
export type ConditionFieldType =
  | 'tag'
  | 'custom_field'
  | 'last_message_date'
  | 'contact_status'
  | 'contact_source';

/**
 * Action types for action nodes
 */
export type ActionType =
  | 'add_tag'
  | 'remove_tag'
  | 'update_field'
  | 'add_to_list'
  | 'remove_from_list'
  | 'send_notification';

// ============================================================================
// NODE DATA CONFIGURATIONS
// ============================================================================

/**
 * Base configuration shared by all node types
 */
export interface BaseNodeData {
  label: string;
  description?: string;
  isValid?: boolean;      // Validation state
  validationErrors?: string[];
}

/**
 * Trigger node configuration
 */
export interface TriggerNodeData extends BaseNodeData {
  triggerType: TriggerEventType;
  triggerConfig: {
    // For tag_applied trigger
    tagIds?: string[];

    // For date_time trigger
    scheduledDate?: string;
    scheduledTime?: string;
    timezone?: string;

    // For webhook_received trigger
    webhookUrl?: string;
    webhookSecret?: string;

    // For custom_field_changed trigger
    fieldName?: string;
    fieldValue?: string;
  };
}

/**
 * Message node configuration
 */
export interface MessageNodeData extends BaseNodeData {
  messageConfig: {
    templateId?: string;           // Reference to existing template
    customMessage?: string;        // Or custom message text
    mediaUrl?: string;             // Optional media attachment
    mediaType?: 'image' | 'video' | 'document' | 'audio';
    variables?: Record<string, string>; // Template variables

    // Message personalization
    useContactName?: boolean;
    fallbackName?: string;
  };
}

/**
 * Delay node configuration
 */
export interface DelayNodeData extends BaseNodeData {
  delayConfig: {
    amount: number;
    unit: DelayUnit;

    // Advanced delay options
    businessHoursOnly?: boolean;   // Only count business hours
    skipWeekends?: boolean;        // Skip Saturday/Sunday
    specificTime?: string;         // Send at specific time (HH:MM format)
  };
}

/**
 * Condition node configuration
 */
export interface ConditionNodeData extends BaseNodeData {
  conditionConfig: {
    field: ConditionFieldType;
    operator: ConditionOperator;
    value: string | number | boolean;

    // Multiple conditions support
    conditions?: Array<{
      field: ConditionFieldType;
      operator: ConditionOperator;
      value: string | number | boolean;
      logicalOperator?: 'AND' | 'OR';
    }>;
  };
}

/**
 * Action node configuration
 */
export interface ActionNodeData extends BaseNodeData {
  actionConfig: {
    actionType: ActionType;

    // For tag operations
    tagIds?: string[];

    // For field updates
    fieldName?: string;
    fieldValue?: string;

    // For list operations
    listId?: string;

    // For notifications
    notificationEmail?: string;
    notificationMessage?: string;
  };
}

/**
 * Union type for all node data types
 */
export type WorkflowNodeData =
  | TriggerNodeData
  | MessageNodeData
  | DelayNodeData
  | ConditionNodeData
  | ActionNodeData;

// ============================================================================
// WORKFLOW NODE & EDGE
// ============================================================================

/**
 * Workflow node with typed data
 */
export interface WorkflowNode extends Node {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

/**
 * Workflow edge (connection) with optional labels
 */
export interface WorkflowEdge extends Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;      // For multiple outputs (e.g., condition true/false)
  targetHandle?: string;
  label?: string;             // Edge label (e.g., "Yes", "No")
  type?: 'default' | 'smoothstep' | 'step' | 'straight';
  animated?: boolean;         // Animate edge for better visualization
}

// ============================================================================
// WORKFLOW STRUCTURE
// ============================================================================

/**
 * Workflow status
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Workflow type classification
 */
export type WorkflowType = 'drip_campaign' | 'broadcast' | 'automation' | 'custom';

/**
 * Complete workflow structure
 */
export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: WorkflowType;
  status: WorkflowStatus;

  // Workflow definition
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;

  // Execution settings
  settings: {
    maxExecutionsPerContact?: number;   // Limit how many times contact can enter
    allowReentry?: boolean;             // Can contact re-enter workflow?
    stopOnError?: boolean;              // Stop workflow if error occurs
    timezone?: string;                  // Workflow timezone

    // Performance tracking
    trackConversions?: boolean;
    conversionGoal?: string;
  };

  // Statistics (read-only)
  stats?: {
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    conversionRate?: number;
  };
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Workflow execution status for a specific contact
 */
export type WorkflowExecutionStatus =
  | 'pending'      // Waiting to start
  | 'running'      // Currently executing
  | 'waiting'      // In delay node
  | 'completed'    // Successfully completed
  | 'failed'       // Error occurred
  | 'cancelled';   // Manually stopped

/**
 * Individual workflow execution instance
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  status: WorkflowExecutionStatus;

  // Execution tracking
  currentNodeId: string;           // Current position in workflow
  executionPath: string[];         // History of nodes visited

  // Timing
  startedAt: string;
  completedAt?: string;
  nextExecutionAt?: string;        // For delayed nodes

  // Error handling
  errorMessage?: string;
  errorNodeId?: string;
  retryCount?: number;

  // Context data (persisted across execution)
  context: Record<string, any>;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

/**
 * Props for custom node components
 */
export interface CustomNodeProps<T extends WorkflowNodeData = WorkflowNodeData> extends NodeProps {
  data: T;
  selected?: boolean;
}

/**
 * Workflow canvas viewport
 */
export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Node palette item (for sidebar)
 */
export interface NodePaletteItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;           // Icon name or component
  category: 'trigger' | 'action' | 'logic' | 'other';
  disabled?: boolean;
  maxInstances?: number;  // Max number allowed in workflow
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  isValid: boolean;
  errors: Array<{
    nodeId?: string;
    edgeId?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Node validation rules
 */
export interface NodeValidationRules {
  requiresIncoming?: boolean;     // Must have incoming edge
  requiresOutgoing?: boolean;     // Must have outgoing edge
  maxIncoming?: number;           // Max incoming edges
  maxOutgoing?: number;           // Max outgoing edges
  requiredFields?: string[];      // Required data fields
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Workflow export format
 */
export interface WorkflowExport {
  version: string;
  exportedAt: string;
  workflow: Workflow;
  metadata: {
    exportedBy: string;
    organizationName?: string;
  };
}

/**
 * Type guard functions
 */
export const isWorkflowNode = (node: any): node is WorkflowNode => {
  return node && typeof node.id === 'string' && typeof node.type === 'string';
};

export const isTriggerNode = (node: WorkflowNode): node is WorkflowNode & { data: TriggerNodeData } => {
  return node.type === 'trigger';
};

export const isMessageNode = (node: WorkflowNode): node is WorkflowNode & { data: MessageNodeData } => {
  return node.type === 'message';
};

export const isDelayNode = (node: WorkflowNode): node is WorkflowNode & { data: DelayNodeData } => {
  return node.type === 'delay';
};

export const isConditionNode = (node: WorkflowNode): node is WorkflowNode & { data: ConditionNodeData } => {
  return node.type === 'condition';
};

export const isActionNode = (node: WorkflowNode): node is WorkflowNode & { data: ActionNodeData } => {
  return node.type === 'action';
};
