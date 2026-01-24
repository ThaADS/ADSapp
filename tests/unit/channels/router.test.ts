/**
 * Unit Tests for UnifiedMessageRouter
 *
 * Tests the central message routing functionality including:
 * - Adapter registration and unregistration
 * - Message routing to correct adapters
 * - Error handling for missing adapters and validation failures
 * - Feature checking across adapters
 *
 * @module tests/unit/channels/router
 */

import { UnifiedMessageRouter } from '@/lib/channels/router'
import {
  ChannelType,
  ChannelFeature,
  CanonicalMessage,
  ChannelAdapter,
  SendResult,
  HealthStatus,
  ValidationResult,
  MessageStatus
} from '@/types/channels'

// ============================================================================
// Mock Adapter Implementation
// ============================================================================

/**
 * Mock adapter implementing ChannelAdapter interface for testing purposes.
 * All methods are Jest mock functions that can be configured per test.
 */
class MockAdapter implements ChannelAdapter {
  readonly channelType: ChannelType
  readonly name: string

  send: jest.Mock<Promise<SendResult>, [CanonicalMessage]>
  receive: jest.Mock<Promise<CanonicalMessage>, [unknown]>
  getStatus: jest.Mock<Promise<MessageStatus>, [string]>
  supportsFeature: jest.Mock<boolean, [ChannelFeature]>
  getFeatures: jest.Mock<ChannelFeature[], []>
  validateMessage: jest.Mock<ValidationResult, [CanonicalMessage]>
  healthCheck: jest.Mock<Promise<HealthStatus>, []>

  constructor(channelType: ChannelType = ChannelType.WHATSAPP, name: string = 'Mock Adapter') {
    this.channelType = channelType
    this.name = name

    // Initialize mock functions with default implementations
    this.send = jest.fn().mockResolvedValue({ success: true, channelMessageId: 'mock_msg_123' })
    this.receive = jest.fn().mockResolvedValue(createTestMessage())
    this.getStatus = jest.fn().mockResolvedValue('sent')
    this.supportsFeature = jest.fn().mockReturnValue(true)
    this.getFeatures = jest.fn().mockReturnValue([ChannelFeature.MEDIA, ChannelFeature.RICH_CONTENT])
    this.validateMessage = jest.fn().mockReturnValue({ valid: true, errors: [] })
    this.healthCheck = jest.fn().mockResolvedValue({ isHealthy: true, latency: 50 })
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Creates a test canonical message with sensible defaults.
 */
function createTestMessage(overrides: Partial<CanonicalMessage> = {}): CanonicalMessage {
  return {
    id: 'msg_123',
    conversationId: 'conv_456',
    channelType: ChannelType.WHATSAPP,
    channelMessageId: '',
    direction: 'outbound',
    senderType: 'agent',
    contentType: 'text',
    content: 'Hello, how can I help you today?',
    status: 'pending',
    channelMetadata: { phoneNumber: '+1234567890' },
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('UnifiedMessageRouter', () => {
  let router: UnifiedMessageRouter
  let mockAdapter: MockAdapter

  beforeEach(() => {
    // Create router with health checks disabled to avoid timers in tests
    router = new UnifiedMessageRouter({ enableHealthChecks: false })
    mockAdapter = new MockAdapter()
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up router to prevent memory leaks
    router.shutdown()
  })

  // ==========================================================================
  // Adapter Registration Tests
  // ==========================================================================

  describe('adapter registration', () => {
    it('should register an adapter', () => {
      router.registerAdapter(mockAdapter)

      const retrieved = router.getAdapter(ChannelType.WHATSAPP)
      expect(retrieved).toBe(mockAdapter)
    })

    it('should return registered channels', () => {
      router.registerAdapter(mockAdapter)

      const channels = router.getRegisteredChannels()
      expect(channels).toContain(ChannelType.WHATSAPP)
    })

    it('should return undefined for unregistered channel type', () => {
      const adapter = router.getAdapter(ChannelType.INSTAGRAM)
      expect(adapter).toBeUndefined()
    })

    it('should replace existing adapter when registering same channel type', () => {
      const firstAdapter = new MockAdapter(ChannelType.WHATSAPP, 'First')
      const secondAdapter = new MockAdapter(ChannelType.WHATSAPP, 'Second')

      router.registerAdapter(firstAdapter)
      router.registerAdapter(secondAdapter)

      const retrieved = router.getAdapter(ChannelType.WHATSAPP)
      expect(retrieved?.name).toBe('Second')
    })

    it('should unregister an adapter', () => {
      router.registerAdapter(mockAdapter)
      router.unregisterAdapter(ChannelType.WHATSAPP)

      expect(router.getAdapter(ChannelType.WHATSAPP)).toBeUndefined()
      expect(router.getRegisteredChannels()).not.toContain(ChannelType.WHATSAPP)
    })

    it('should handle unregistering non-existent adapter gracefully', () => {
      // Should not throw
      expect(() => router.unregisterAdapter(ChannelType.INSTAGRAM)).not.toThrow()
    })

    it('should register multiple adapters for different channel types', () => {
      const whatsappAdapter = new MockAdapter(ChannelType.WHATSAPP, 'WhatsApp')
      const instagramAdapter = new MockAdapter(ChannelType.INSTAGRAM, 'Instagram')

      router.registerAdapter(whatsappAdapter)
      router.registerAdapter(instagramAdapter)

      expect(router.getRegisteredChannels()).toHaveLength(2)
      expect(router.getAdapter(ChannelType.WHATSAPP)?.name).toBe('WhatsApp')
      expect(router.getAdapter(ChannelType.INSTAGRAM)?.name).toBe('Instagram')
    })
  })

  // ==========================================================================
  // Message Routing Tests
  // ==========================================================================

  describe('message routing', () => {
    it('should route message to correct adapter', async () => {
      mockAdapter.send.mockResolvedValue({ success: true, channelMessageId: 'wa_123' })
      router.registerAdapter(mockAdapter)

      const testMessage = createTestMessage()
      const result = await router.route(testMessage)

      expect(result.success).toBe(true)
      expect(result.channelType).toBe(ChannelType.WHATSAPP)
      expect(result.channelMessageId).toBe('wa_123')
      expect(mockAdapter.send).toHaveBeenCalledWith(testMessage)
    })

    it('should fail if no adapter registered for channel type', async () => {
      const testMessage = createTestMessage()
      const result = await router.route(testMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No adapter registered')
      expect(result.retryable).toBe(false)
    })

    it('should fail if validation fails', async () => {
      mockAdapter.validateMessage.mockReturnValue({
        valid: false,
        errors: ['Phone number is required']
      })
      router.registerAdapter(mockAdapter)

      const testMessage = createTestMessage()
      const result = await router.route(testMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
      expect(result.error).toContain('Phone number is required')
      expect(result.retryable).toBe(false)
    })

    it('should fail if channel does not support required media feature', async () => {
      mockAdapter.supportsFeature.mockImplementation(
        (feature: ChannelFeature) => feature !== ChannelFeature.MEDIA
      )
      router.registerAdapter(mockAdapter)

      const messageWithMedia = createTestMessage({
        contentType: 'media',
        media: {
          type: 'image',
          url: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg'
        }
      })

      const result = await router.route(messageWithMedia)

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support media')
      expect(result.retryable).toBe(false)
    })

    it('should fail if channel does not support required rich content feature', async () => {
      mockAdapter.supportsFeature.mockImplementation(
        (feature: ChannelFeature) => feature !== ChannelFeature.RICH_CONTENT
      )
      router.registerAdapter(mockAdapter)

      const messageWithRichContent = createTestMessage({
        contentType: 'rich',
        richContent: {
          type: 'button',
          payload: { buttons: [{ id: '1', title: 'Click me' }] }
        }
      })

      const result = await router.route(messageWithRichContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support rich content')
      expect(result.retryable).toBe(false)
    })

    it('should handle adapter send errors gracefully', async () => {
      mockAdapter.send.mockRejectedValue(new Error('Network timeout'))
      router.registerAdapter(mockAdapter)

      const testMessage = createTestMessage()
      const result = await router.route(testMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network timeout')
    })

    it('should return retryable=true for rate limit errors', async () => {
      mockAdapter.send.mockRejectedValue(new Error('Rate limit exceeded (429)'))
      router.registerAdapter(mockAdapter)

      const testMessage = createTestMessage()
      const result = await router.route(testMessage)

      expect(result.success).toBe(false)
      expect(result.retryable).toBe(true)
    })

    it('should include routedAt timestamp in result', async () => {
      mockAdapter.send.mockResolvedValue({ success: true, channelMessageId: 'wa_123' })
      router.registerAdapter(mockAdapter)

      const beforeRoute = new Date()
      const result = await router.route(createTestMessage())
      const afterRoute = new Date()

      expect(result.routedAt).toBeDefined()
      expect(result.routedAt.getTime()).toBeGreaterThanOrEqual(beforeRoute.getTime())
      expect(result.routedAt.getTime()).toBeLessThanOrEqual(afterRoute.getTime())
    })
  })

  // ==========================================================================
  // Message Receiving Tests
  // ==========================================================================

  describe('message receiving', () => {
    it('should receive and normalize inbound message', async () => {
      const canonicalMessage = createTestMessage({
        direction: 'inbound',
        senderType: 'contact',
        channelMessageId: 'wa_xyz',
        status: 'delivered'
      })
      mockAdapter.receive.mockResolvedValue(canonicalMessage)
      router.registerAdapter(mockAdapter)

      const webhookPayload = { /* mock webhook payload */ }
      const result = await router.receive(ChannelType.WHATSAPP, webhookPayload)

      expect(result).toEqual(canonicalMessage)
      expect(mockAdapter.receive).toHaveBeenCalledWith(webhookPayload)
    })

    it('should throw if no adapter for channel type', async () => {
      await expect(
        router.receive(ChannelType.INSTAGRAM, {})
      ).rejects.toThrow('No adapter registered')
    })

    it('should propagate adapter receive errors', async () => {
      mockAdapter.receive.mockRejectedValue(new Error('Invalid webhook payload'))
      router.registerAdapter(mockAdapter)

      await expect(
        router.receive(ChannelType.WHATSAPP, {})
      ).rejects.toThrow('Invalid webhook payload')
    })
  })

  // ==========================================================================
  // Feature Checking Tests
  // ==========================================================================

  describe('feature checking', () => {
    it('should check if channel supports feature - positive case', () => {
      mockAdapter.supportsFeature.mockImplementation(
        (feature: ChannelFeature) => feature === ChannelFeature.MEDIA
      )
      router.registerAdapter(mockAdapter)

      expect(router.channelSupportsFeature(ChannelType.WHATSAPP, ChannelFeature.MEDIA)).toBe(true)
    })

    it('should check if channel supports feature - negative case', () => {
      mockAdapter.supportsFeature.mockImplementation(
        (feature: ChannelFeature) => feature === ChannelFeature.MEDIA
      )
      router.registerAdapter(mockAdapter)

      expect(router.channelSupportsFeature(ChannelType.WHATSAPP, ChannelFeature.TYPING_INDICATORS)).toBe(false)
    })

    it('should return false for unregistered channel', () => {
      expect(router.channelSupportsFeature(ChannelType.INSTAGRAM, ChannelFeature.MEDIA)).toBe(false)
    })
  })

  // ==========================================================================
  // Health Status Tests
  // ==========================================================================

  describe('health status', () => {
    it('should return health status for all registered channels', () => {
      const whatsappAdapter = new MockAdapter(ChannelType.WHATSAPP, 'WhatsApp')
      const instagramAdapter = new MockAdapter(ChannelType.INSTAGRAM, 'Instagram')

      router.registerAdapter(whatsappAdapter)
      router.registerAdapter(instagramAdapter)

      const healthStatuses = router.getHealthStatus()

      expect(healthStatuses).toHaveLength(2)
    })

    it('should return health status for specific channel', () => {
      router.registerAdapter(mockAdapter)

      const health = router.getChannelHealth(ChannelType.WHATSAPP)

      expect(health).toBeDefined()
      expect(health?.channelType).toBe(ChannelType.WHATSAPP)
    })

    it('should return undefined for unregistered channel health', () => {
      const health = router.getChannelHealth(ChannelType.INSTAGRAM)

      expect(health).toBeUndefined()
    })
  })

  // ==========================================================================
  // Shutdown Tests
  // ==========================================================================

  describe('shutdown', () => {
    it('should clear all adapters on shutdown', () => {
      router.registerAdapter(mockAdapter)
      router.shutdown()

      expect(router.getRegisteredChannels()).toHaveLength(0)
      expect(router.getAdapter(ChannelType.WHATSAPP)).toBeUndefined()
    })
  })
})
