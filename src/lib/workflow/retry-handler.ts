/**
 * Workflow Retry Handler
 *
 * Implements retry logic with exponential backoff for failed workflow nodes.
 * Handles error recovery and fallback paths.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { WorkflowExecutionStatus } from '@/types/workflow'

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface RetryState {
  executionId: string
  nodeId: string
  retryCount: number
  lastError: string
  lastAttemptAt: Date
  nextAttemptAt?: Date
}

export interface RetryResult {
  shouldRetry: boolean
  nextAttemptAt?: Date
  error?: string
  exhausted?: boolean
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE',
    'GATEWAY_TIMEOUT',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
}

// ============================================================================
// RETRY HANDLER CLASS
// ============================================================================

export class WorkflowRetryHandler {
  private config: RetryConfig
  private _supabase: ReturnType<typeof createServiceRoleClient> | null = null

  private getSupabase() {
    if (!this._supabase) {
      this._supabase = createServiceRoleClient()
    }
    return this._supabase
  }

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Calculate delay for next retry using exponential backoff with jitter
   */
  calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: baseDelay * (multiplier ^ retryCount)
    const exponentialDelay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, retryCount)

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs)

    // Add jitter (±25%) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)

    return Math.round(cappedDelay + jitter)
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: string | Error): boolean {
    const errorString = error instanceof Error ? error.message : error

    // Check for explicitly retryable error patterns
    return this.config.retryableErrors.some((pattern) =>
      errorString.toUpperCase().includes(pattern.toUpperCase())
    )
  }

  /**
   * Evaluate if a retry should be attempted
   */
  async evaluateRetry(
    executionId: string,
    nodeId: string,
    error: string | Error,
    currentRetryCount: number
  ): Promise<RetryResult> {
    const errorString = error instanceof Error ? error.message : error

    // Check if max retries exceeded
    if (currentRetryCount >= this.config.maxRetries) {
      return {
        shouldRetry: false,
        exhausted: true,
        error: `Max retries (${this.config.maxRetries}) exceeded: ${errorString}`,
      }
    }

    // Check if error is retryable
    if (!this.isRetryableError(errorString)) {
      return {
        shouldRetry: false,
        error: `Non-retryable error: ${errorString}`,
      }
    }

    // Calculate next attempt time
    const delay = this.calculateRetryDelay(currentRetryCount)
    const nextAttemptAt = new Date(Date.now() + delay)

    // Log retry decision
    console.log(
      `[RetryHandler] Scheduling retry ${currentRetryCount + 1}/${this.config.maxRetries} ` +
        `for execution ${executionId} node ${nodeId} in ${delay}ms`
    )

    return {
      shouldRetry: true,
      nextAttemptAt,
    }
  }

  /**
   * Record retry attempt in database
   */
  async recordRetryAttempt(
    executionId: string,
    nodeId: string,
    retryCount: number,
    error: string,
    nextAttemptAt?: Date
  ): Promise<void> {
    try {
      // Update execution record
      await this.getSupabase()
        .from('workflow_executions')
        .update({
          retry_count: retryCount,
          error_message: error,
          error_node_id: nodeId,
          status: nextAttemptAt ? 'waiting' : 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId)

      // If scheduling retry, update metadata
      if (nextAttemptAt) {
        await this.getSupabase()
          .from('workflow_executions')
          .update({
            metadata: {
              nextRetryAt: nextAttemptAt.toISOString(),
              retryNodeId: nodeId,
            },
          })
          .eq('id', executionId)
      }
    } catch (dbError) {
      console.error('[RetryHandler] Failed to record retry attempt:', dbError)
    }
  }

  /**
   * Get pending retries that are due
   */
  async getPendingRetries(organizationId?: string): Promise<RetryState[]> {
    try {
      const now = new Date().toISOString()

      let query = this.getSupabase()
        .from('workflow_executions')
        .select('id, current_node_id, retry_count, error_message, metadata, updated_at')
        .eq('status', 'waiting')
        .lt('metadata->nextRetryAt', now)
        .lt('retry_count', this.config.maxRetries)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        console.error('[RetryHandler] Failed to get pending retries:', error)
        return []
      }

      return (data || []).map((execution) => ({
        executionId: execution.id,
        nodeId: execution.current_node_id,
        retryCount: execution.retry_count,
        lastError: execution.error_message,
        lastAttemptAt: new Date(execution.updated_at),
        nextAttemptAt: execution.metadata?.nextRetryAt
          ? new Date(execution.metadata.nextRetryAt)
          : undefined,
      }))
    } catch (error) {
      console.error('[RetryHandler] Failed to get pending retries:', error)
      return []
    }
  }

  /**
   * Handle error with retry logic
   */
  async handleError(
    executionId: string,
    nodeId: string,
    error: string | Error,
    currentRetryCount: number
  ): Promise<RetryResult> {
    const errorString = error instanceof Error ? error.message : error

    // Evaluate if we should retry
    const retryResult = await this.evaluateRetry(executionId, nodeId, errorString, currentRetryCount)

    // Record the attempt
    await this.recordRetryAttempt(
      executionId,
      nodeId,
      currentRetryCount + (retryResult.shouldRetry ? 1 : 0),
      errorString,
      retryResult.nextAttemptAt
    )

    return retryResult
  }

  /**
   * Mark execution as permanently failed
   */
  async markAsFailed(
    executionId: string,
    error: string,
    nodeId?: string
  ): Promise<void> {
    try {
      await this.getSupabase()
        .from('workflow_executions')
        .update({
          status: 'failed' as WorkflowExecutionStatus,
          error_message: error,
          error_node_id: nodeId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId)
    } catch (dbError) {
      console.error('[RetryHandler] Failed to mark execution as failed:', dbError)
    }
  }

  /**
   * Resume execution after successful retry
   */
  async markAsResumed(executionId: string): Promise<void> {
    try {
      await this.getSupabase()
        .from('workflow_executions')
        .update({
          status: 'running' as WorkflowExecutionStatus,
          error_message: null,
          metadata: {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId)
    } catch (dbError) {
      console.error('[RetryHandler] Failed to mark execution as resumed:', dbError)
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a retry handler with default configuration
 */
export function createRetryHandler(config?: Partial<RetryConfig>): WorkflowRetryHandler {
  return new WorkflowRetryHandler(config)
}

/**
 * Execute a function with automatic retry
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const handler = createRetryHandler(config)
  const maxRetries = config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt >= maxRetries) {
        break
      }

      if (!handler.isRetryableError(lastError)) {
        throw lastError
      }

      const delay = handler.calculateRetryDelay(attempt)
      console.log(`[RetryHandler] Attempt ${attempt + 1} failed, retrying in ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Wrap a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  return Promise.race([promise, timeout])
}

// Export default instance
export const defaultRetryHandler = new WorkflowRetryHandler()
