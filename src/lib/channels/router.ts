/**
 * Unified Message Router
 * Purpose: Central routing for all channel adapters with health monitoring
 * Date: 2026-01-24
 */

import {
  ChannelType,
  ChannelAdapter,
  CanonicalMessage,
  SendResult,
  ChannelFeature
} from '@/types/channels'
import { ChannelHealthMonitor, ChannelHealthStatus } from './health'

// ============================================================================
// Types
// ============================================================================

export interface RouterOptions {
  healthMonitor?: ChannelHealthMonitor
  enableHealthChecks?: boolean
}

export interface RoutingResult extends SendResult {
  channelType: ChannelType
  routedAt: Date
}

// ============================================================================
// UnifiedMessageRouter Class
// ============================================================================

export class UnifiedMessageRouter {
  private adapters: Map<ChannelType, ChannelAdapter> = new Map()
  private healthMonitor: ChannelHealthMonitor

  constructor(options?: RouterOptions) {
    this.healthMonitor = options?.healthMonitor ?? new ChannelHealthMonitor()

    if (options?.enableHealthChecks !== false) {
      this.healthMonitor.startPeriodicChecks()
    }
  }

  /**
   * Register a channel adapter
   */
  registerAdapter(adapter: ChannelAdapter): void {
    if (this.adapters.has(adapter.channelType)) {
      console.warn(`Adapter for ${adapter.channelType} already registered, replacing`)
    }
    this.adapters.set(adapter.channelType, adapter)
    this.healthMonitor.registerAdapter(adapter)
    console.log(`Registered adapter: ${adapter.name} (${adapter.channelType})`)
  }

  /**
   * Unregister a channel adapter
   */
  unregisterAdapter(channelType: ChannelType): void {
    this.adapters.delete(channelType)
    this.healthMonitor.unregisterAdapter(channelType)
  }

  /**
   * Get a registered adapter by channel type
   */
  getAdapter(channelType: ChannelType): ChannelAdapter | undefined {
    return this.adapters.get(channelType)
  }

  /**
   * Get all registered channel types
   */
  getRegisteredChannels(): ChannelType[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Route an outbound message through the appropriate adapter
   */
  async route(message: CanonicalMessage): Promise<RoutingResult> {
    const { channelType } = message

    // 1. Get adapter
    const adapter = this.adapters.get(channelType)
    if (!adapter) {
      return {
        success: false,
        error: `No adapter registered for channel: ${channelType}`,
        retryable: false,
        channelType,
        routedAt: new Date()
      }
    }

    // 2. Check channel health
    const health = this.healthMonitor.getHealth(channelType)
    if (health && !health.isHealthy) {
      return {
        success: false,
        error: `Channel ${channelType} is unhealthy: ${health.lastError}`,
        retryable: true, // Retryable because channel may recover
        channelType,
        routedAt: new Date()
      }
    }

    // 3. Validate message supports required features
    if (message.richContent && !adapter.supportsFeature(ChannelFeature.RICH_CONTENT)) {
      return {
        success: false,
        error: `Channel ${channelType} does not support rich content`,
        retryable: false,
        channelType,
        routedAt: new Date()
      }
    }

    if (message.media && !adapter.supportsFeature(ChannelFeature.MEDIA)) {
      return {
        success: false,
        error: `Channel ${channelType} does not support media`,
        retryable: false,
        channelType,
        routedAt: new Date()
      }
    }

    // 4. Validate message
    const validation = adapter.validateMessage(message)
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        retryable: false,
        channelType,
        routedAt: new Date()
      }
    }

    // 5. Send via adapter
    try {
      const result = await adapter.send(message)

      if (result.success) {
        this.healthMonitor.recordSuccess(channelType)
      } else {
        this.healthMonitor.recordFailure(channelType, result.error || 'Unknown error')
      }

      return {
        ...result,
        channelType,
        routedAt: new Date()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.healthMonitor.recordFailure(channelType, errorMessage)

      return {
        success: false,
        error: errorMessage,
        retryable: this.isRetryableError(error),
        channelType,
        routedAt: new Date()
      }
    }
  }

  /**
   * Receive and normalize an inbound message from a webhook payload
   */
  async receive(
    channelType: ChannelType,
    webhookPayload: unknown
  ): Promise<CanonicalMessage> {
    const adapter = this.adapters.get(channelType)
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`)
    }

    try {
      const canonicalMessage = await adapter.receive(webhookPayload)
      this.healthMonitor.recordSuccess(channelType)
      return canonicalMessage

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.healthMonitor.recordFailure(channelType, errorMessage)
      throw error
    }
  }

  /**
   * Get health status for all channels
   */
  getHealthStatus(): ChannelHealthStatus[] {
    return this.healthMonitor.getAllHealth()
  }

  /**
   * Get health status for a specific channel
   */
  getChannelHealth(channelType: ChannelType): ChannelHealthStatus | undefined {
    return this.healthMonitor.getHealth(channelType)
  }

  /**
   * Check if a channel supports a specific feature
   */
  channelSupportsFeature(channelType: ChannelType, feature: ChannelFeature): boolean {
    const adapter = this.adapters.get(channelType)
    return adapter ? adapter.supportsFeature(feature) : false
  }

  /**
   * Shutdown the router and stop health checks
   */
  shutdown(): void {
    this.healthMonitor.stopPeriodicChecks()
    this.adapters.clear()
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('429') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503')
      )
    }
    return false
  }
}
