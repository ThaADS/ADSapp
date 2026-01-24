/**
 * Channels Module - Public API
 * Purpose: Unified exports for channel abstraction layer
 * Date: 2026-01-24
 */

// ============================================================================
// Main Exports
// ============================================================================

// Router
export { UnifiedMessageRouter } from './router'
export type { RouterOptions, RoutingResult } from './router'

// Health Monitor
export { ChannelHealthMonitor } from './health'
export type { ChannelHealthStatus, HealthMonitorOptions } from './health'

// ============================================================================
// Re-export Types from @/types/channels
// ============================================================================

export {
  ChannelType,
  ChannelFeature,
  type CanonicalMessage,
  type ChannelAdapter,
  type SendResult,
  type MessageStatus,
  type ValidationResult,
  type HealthStatus,
  type MediaContent,
  type RichContent,
  type MessageDirection,
  type SenderType,
  type ContentType,
  type MediaType,
  type RichContentType,
  type ChannelConnection,
  type ChannelMessage,
  type ChannelAdapterConfig,
  type AdapterFactory,
  type AdapterRegistry,
  type WebhookPayload,
  type ProcessedWebhookResult
} from '@/types/channels'

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Factory function to create a new message router instance
 * Adapters should be registered by the application after creation
 */
export function createRouter(options?: {
  enableHealthChecks?: boolean
}): UnifiedMessageRouter {
  return new UnifiedMessageRouter({
    enableHealthChecks: options?.enableHealthChecks ?? true
  })
}
