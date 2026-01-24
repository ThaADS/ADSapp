/**
 * Base Channel Adapter
 * Purpose: Abstract base class with shared utilities for all channel adapters
 * Date: 2026-01-24
 */

import {
  ChannelAdapter,
  ChannelType,
  ChannelFeature,
  CanonicalMessage,
  SendResult,
  MessageStatus,
  ValidationResult,
  HealthStatus
} from '@/types/channels'

/**
 * Abstract base class implementing ChannelAdapter interface.
 * Provides shared validation logic and utility methods for all channel adapters.
 */
export abstract class BaseChannelAdapter implements ChannelAdapter {
  // Identity - must be implemented by subclasses
  abstract readonly channelType: ChannelType
  abstract readonly name: string

  // Core operations - must be implemented by subclasses
  abstract send(message: CanonicalMessage): Promise<SendResult>
  abstract receive(webhookPayload: unknown): Promise<CanonicalMessage>
  abstract getStatus(channelMessageId: string): Promise<MessageStatus>

  // Feature support - must be implemented by subclasses
  abstract supportsFeature(feature: ChannelFeature): boolean
  abstract getFeatures(): ChannelFeature[]

  // Health check - must be implemented by subclasses
  abstract healthCheck(): Promise<HealthStatus>

  /**
   * Validates a canonical message before sending.
   * Combines base validation with channel-specific validation.
   */
  validateMessage(message: CanonicalMessage): ValidationResult {
    const errors: string[] = []

    // Base validation: message must have some content
    if (!message.content && !message.media && !message.richContent) {
      errors.push('Message must have content, media, or rich content')
    }

    // Base validation: channel metadata is required
    if (!message.channelMetadata) {
      errors.push('Channel metadata is required')
    }

    // Base validation: conversation ID is required
    if (!message.conversationId) {
      errors.push('Conversation ID is required')
    }

    // Base validation: channel type must match adapter
    if (message.channelType !== this.channelType) {
      errors.push(`Message channel type ${message.channelType} does not match adapter type ${this.channelType}`)
    }

    // Add channel-specific validation from subclasses
    const channelErrors = this.validateChannelSpecific(message)
    errors.push(...channelErrors)

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Hook for channel-specific validation.
   * Override in subclasses to add channel-specific validation rules.
   */
  protected validateChannelSpecific(_message: CanonicalMessage): string[] {
    return []
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Normalizes a phone number to E.164 format.
   * Removes all non-numeric characters except leading +.
   *
   * @param phone - The phone number to normalize
   * @returns The normalized phone number in E.164 format
   *
   * @example
   * normalizePhoneNumber('+1 (555) 123-4567') // returns '+15551234567'
   * normalizePhoneNumber('15551234567') // returns '+15551234567'
   */
  protected normalizePhoneNumber(phone: string): string {
    // Remove all characters except digits and leading +
    const cleaned = phone.replace(/[^0-9+]/g, '')

    // Ensure the number starts with +
    if (cleaned.startsWith('+')) {
      return cleaned
    }

    return `+${cleaned}`
  }

  /**
   * Determines if an error is retryable based on error type/message.
   * Retryable errors include rate limits, timeouts, and server errors.
   *
   * @param error - The error to check
   * @returns true if the error is retryable, false otherwise
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // Rate limit errors
      if (message.includes('rate limit') || message.includes('429')) {
        return true
      }

      // Network and timeout errors
      if (message.includes('timeout') || message.includes('network') || message.includes('econnreset')) {
        return true
      }

      // Server errors (5xx)
      if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
        return true
      }

      // Temporary unavailable
      if (message.includes('temporarily unavailable') || message.includes('service unavailable')) {
        return true
      }
    }

    return false
  }

  /**
   * Generates a unique internal message ID.
   * Format: msg_{timestamp}_{random}
   *
   * @returns A unique message ID string
   */
  protected generateMessageId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `msg_${timestamp}_${random}`
  }

  /**
   * Extracts error code from various error formats.
   *
   * @param error - The error to extract code from
   * @returns The error code or undefined
   */
  protected extractErrorCode(error: unknown): string | undefined {
    if (error instanceof Error) {
      // Try to extract numeric error code from message
      const match = error.message.match(/\b(\d{3})\b/)
      if (match) {
        return match[1]
      }
    }

    // Check for error object with code property
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as { code: unknown }).code)
    }

    return undefined
  }

  /**
   * Formats error for logging and storage.
   *
   * @param error - The error to format
   * @returns Formatted error message
   */
  protected formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    return JSON.stringify(error)
  }
}
