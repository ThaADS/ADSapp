/**
 * Workflow Engine Module
 *
 * Comprehensive workflow automation system for WhatsApp campaigns.
 * Supports visual workflow builder, execution engine, triggers, and scheduling.
 */

// Core Execution Engine
export {
  WorkflowExecutionEngine,
  createExecutionEngine,
  executeWorkflowForContact,
  type ExecutionContext,
  type NodeExecutionResult,
  type WhatsAppCredentials,
  type ContactInfo,
} from './execution-engine'

// Enhanced Execution Engine (with logging, retries)
export {
  EnhancedWorkflowEngine,
  createEnhancedEngine,
  executeWorkflowEnhanced,
} from './enhanced-execution-engine'

// Trigger Service
export {
  WorkflowTriggerService,
  workflowTriggerService,
  processMessageTrigger,
  processTagTrigger,
  processContactAddedTrigger,
  processFieldChangeTrigger,
  type TriggerEvent,
  type TriggerEvaluationResult,
} from './trigger-service'

// Execution Logging
export {
  WorkflowExecutionLogger,
  createExecutionLogger,
  getExecutionLogs,
  cleanupOldLogs,
  type ExecutionLogEntry,
  type ExecutionLogSummary,
  type LogStatus,
} from './execution-logger'

// Retry Handler
export {
  WorkflowRetryHandler,
  createRetryHandler,
  defaultRetryHandler,
  executeWithRetry,
  withTimeout,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryState,
  type RetryResult,
} from './retry-handler'

// Scheduler
export {
  WorkflowScheduler,
  workflowScheduler,
  createScheduler,
  processDueSchedules,
  type ScheduleType,
  type ScheduleConfig,
  type WorkflowSchedule,
  type SchedulerResult,
} from './scheduler'

// Action Handlers
export {
  executeAction,
  getAvailableActions,
  handleAddTag,
  handleRemoveTag,
  handleUpdateField,
  handleAddToList,
  handleRemoveFromList,
  handleSendNotification,
  type ActionResult,
} from './action-handlers'

// AI Handler
export {
  WorkflowAIHandler,
  workflowAIHandler,
  executeAIAction,
  type AIResult,
} from './ai-handler'

// Templates (if exists)
export * from './templates'
