/**
 * Channel Health Monitoring
 * Purpose: Track and monitor the health status of channel adapters
 * Date: 2026-01-24
 */

import { ChannelType, ChannelAdapter, HealthStatus } from '@/types/channels'

// ============================================================================
// Types
// ============================================================================

export interface ChannelHealthStatus {
  channelType: ChannelType
  isHealthy: boolean
  lastCheck: Date
  latency?: number
  rateLimit?: {
    remaining: number
    resetAt: Date
  }
  lastError?: string
  consecutiveFailures: number
}

export interface HealthMonitorOptions {
  checkIntervalMs?: number
  unhealthyThreshold?: number
}

// ============================================================================
// ChannelHealthMonitor Class
// ============================================================================

export class ChannelHealthMonitor {
  private healthStatus: Map<ChannelType, ChannelHealthStatus> = new Map()
  private adapters: Map<ChannelType, ChannelAdapter> = new Map()

  // Configuration
  private readonly checkIntervalMs: number
  private readonly unhealthyThreshold: number
  private checkInterval: NodeJS.Timeout | null = null

  constructor(options?: HealthMonitorOptions) {
    this.checkIntervalMs = options?.checkIntervalMs ?? 60000 // 1 minute
    this.unhealthyThreshold = options?.unhealthyThreshold ?? 3
  }

  /**
   * Register an adapter for health monitoring
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter)
    this.healthStatus.set(adapter.channelType, {
      channelType: adapter.channelType,
      isHealthy: true, // Assume healthy until proven otherwise
      lastCheck: new Date(),
      consecutiveFailures: 0
    })
  }

  /**
   * Unregister an adapter from health monitoring
   */
  unregisterAdapter(channelType: ChannelType): void {
    this.adapters.delete(channelType)
    this.healthStatus.delete(channelType)
  }

  /**
   * Get current health status for a specific channel
   */
  getHealth(channelType: ChannelType): ChannelHealthStatus | undefined {
    return this.healthStatus.get(channelType)
  }

  /**
   * Get health status for all registered channels
   */
  getAllHealth(): ChannelHealthStatus[] {
    return Array.from(this.healthStatus.values())
  }

  /**
   * Perform a health check for a specific channel
   */
  async checkHealth(channelType: ChannelType): Promise<ChannelHealthStatus> {
    const adapter = this.adapters.get(channelType)
    const currentStatus = this.healthStatus.get(channelType)

    if (!adapter || !currentStatus) {
      throw new Error(`No adapter registered for channel: ${channelType}`)
    }

    try {
      const result: HealthStatus = await adapter.healthCheck()

      const newStatus: ChannelHealthStatus = {
        channelType,
        isHealthy: result.isHealthy,
        lastCheck: new Date(),
        latency: result.latency,
        rateLimit: result.rateLimit,
        consecutiveFailures: result.isHealthy ? 0 : currentStatus.consecutiveFailures + 1,
        lastError: result.lastError
      }

      // Mark unhealthy if consecutive failures exceed threshold
      if (newStatus.consecutiveFailures >= this.unhealthyThreshold) {
        newStatus.isHealthy = false
      }

      this.healthStatus.set(channelType, newStatus)
      return newStatus

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const newStatus: ChannelHealthStatus = {
        channelType,
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: currentStatus.consecutiveFailures + 1,
        lastError: errorMessage
      }

      this.healthStatus.set(channelType, newStatus)
      return newStatus
    }
  }

  /**
   * Start periodic health checks for all registered adapters
   */
  startPeriodicChecks(): void {
    if (this.checkInterval) return

    this.checkInterval = setInterval(async () => {
      const checkPromises = Array.from(this.adapters.keys()).map(type =>
        this.checkHealth(type).catch(err =>
          console.error(`Health check failed for ${type}:`, err)
        )
      )
      await Promise.allSettled(checkPromises)
    }, this.checkIntervalMs)
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Record a successful operation (resets failure count)
   */
  recordSuccess(channelType: ChannelType): void {
    const status = this.healthStatus.get(channelType)
    if (status) {
      status.isHealthy = true
      status.consecutiveFailures = 0
      status.lastCheck = new Date()
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(channelType: ChannelType, error: string): void {
    const status = this.healthStatus.get(channelType)
    if (status) {
      status.consecutiveFailures++
      status.lastError = error
      status.lastCheck = new Date()
      if (status.consecutiveFailures >= this.unhealthyThreshold) {
        status.isHealthy = false
      }
    }
  }
}
