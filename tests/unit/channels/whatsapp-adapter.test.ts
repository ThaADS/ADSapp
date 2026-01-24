/**
 * Unit Tests for WhatsApp Channel Adapter
 *
 * Tests the WhatsApp adapter implementation including:
 * - Channel type and metadata
 * - Feature support (RICH_CONTENT, MEDIA, READ_RECEIPTS, etc.)
 * - Message validation (phone number required, content length limits)
 * - Message format conversion
 *
 * @module tests/unit/channels/whatsapp-adapter
 */

import { WhatsAppAdapter } from '@/lib/channels/adapters/whatsapp'
import {
  ChannelType,
  ChannelFeature,
  CanonicalMessage
} from '@/types/channels'

// ============================================================================
// Mocks
// ============================================================================

// Mock the EnhancedWhatsAppClient
const mockSendMessage = jest.fn()
const mockGetBusinessProfile = jest.fn()

jest.mock('@/lib/whatsapp/enhanced-client', () => ({
  EnhancedWhatsAppClient: jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
    getBusinessProfile: mockGetBusinessProfile
  })),
  getWhatsAppClient: jest.fn()
}))

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

/**
 * Creates a mock EnhancedWhatsAppClient
 */
function createMockClient() {
  return {
    sendMessage: mockSendMessage,
    getBusinessProfile: mockGetBusinessProfile
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter

  beforeEach(() => {
    // Create adapter with mocked client
    const mockClient = createMockClient() as any
    adapter = new WhatsAppAdapter(mockClient, 'phone-id-123')
    jest.clearAllMocks()
  })

  // ==========================================================================
  // Metadata Tests
  // ==========================================================================

  describe('metadata', () => {
    it('should have correct channel type', () => {
      expect(adapter.channelType).toBe(ChannelType.WHATSAPP)
    })

    it('should have correct name', () => {
      expect(adapter.name).toBe('WhatsApp Business Cloud API')
    })
  })

  // ==========================================================================
  // Feature Support Tests
  // ==========================================================================

  describe('feature support', () => {
    it('should support rich content', () => {
      expect(adapter.supportsFeature(ChannelFeature.RICH_CONTENT)).toBe(true)
    })

    it('should support media', () => {
      expect(adapter.supportsFeature(ChannelFeature.MEDIA)).toBe(true)
    })

    it('should support read receipts', () => {
      expect(adapter.supportsFeature(ChannelFeature.READ_RECEIPTS)).toBe(true)
    })

    it('should support location sharing', () => {
      expect(adapter.supportsFeature(ChannelFeature.LOCATION_SHARING)).toBe(true)
    })

    it('should support contact cards', () => {
      expect(adapter.supportsFeature(ChannelFeature.CONTACT_CARDS)).toBe(true)
    })

    it('should support reactions', () => {
      expect(adapter.supportsFeature(ChannelFeature.REACTIONS)).toBe(true)
    })

    it('should NOT support typing indicators', () => {
      expect(adapter.supportsFeature(ChannelFeature.TYPING_INDICATORS)).toBe(false)
    })

    it('should return all supported features', () => {
      const features = adapter.getFeatures()

      expect(features).toContain(ChannelFeature.RICH_CONTENT)
      expect(features).toContain(ChannelFeature.MEDIA)
      expect(features).toContain(ChannelFeature.READ_RECEIPTS)
      expect(features).toContain(ChannelFeature.LOCATION_SHARING)
      expect(features).toContain(ChannelFeature.CONTACT_CARDS)
      expect(features).toContain(ChannelFeature.REACTIONS)
      expect(features).not.toContain(ChannelFeature.TYPING_INDICATORS)
    })
  })

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validation', () => {
    it('should validate valid message', () => {
      const validMessage = createTestMessage()
      const result = adapter.validateMessage(validMessage)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation without phone number in channelMetadata', () => {
      const invalidMessage = createTestMessage({
        channelMetadata: {}
      })

      const result = adapter.validateMessage(invalidMessage)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('phone number'))).toBe(true)
    })

    it('should fail validation with null channelMetadata', () => {
      const invalidMessage = createTestMessage()
      // @ts-expect-error - testing edge case
      invalidMessage.channelMetadata = null

      const result = adapter.validateMessage(invalidMessage)

      expect(result.valid).toBe(false)
    })

    it('should fail validation for text content over 4096 characters', () => {
      const longContent = 'a'.repeat(5000)
      const longMessage = createTestMessage({
        content: longContent
      })

      const result = adapter.validateMessage(longMessage)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('4096'))).toBe(true)
    })

    it('should pass validation for text content at exactly 4096 characters', () => {
      const maxContent = 'a'.repeat(4096)
      const maxMessage = createTestMessage({
        content: maxContent
      })

      const result = adapter.validateMessage(maxMessage)

      expect(result.valid).toBe(true)
    })

    it('should fail validation for unsupported media type', () => {
      const messageWithUnsupportedMedia = createTestMessage({
        contentType: 'media',
        media: {
          // @ts-expect-error - testing edge case with invalid media type
          type: 'unknown',
          url: 'https://example.com/file.xyz',
          mimeType: 'application/octet-stream'
        }
      })

      const result = adapter.validateMessage(messageWithUnsupportedMedia)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('unsupported media type'))).toBe(true)
    })

    it('should fail validation for media without URL', () => {
      const messageWithoutMediaUrl = createTestMessage({
        contentType: 'media',
        media: {
          type: 'image',
          url: '', // Empty URL
          mimeType: 'image/jpeg'
        }
      })

      const result = adapter.validateMessage(messageWithoutMediaUrl)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('url'))).toBe(true)
    })

    it('should pass validation for supported media types', () => {
      const supportedTypes = ['image', 'video', 'audio', 'document'] as const

      for (const mediaType of supportedTypes) {
        const messageWithMedia = createTestMessage({
          contentType: 'media',
          media: {
            type: mediaType,
            url: `https://example.com/file.${mediaType}`,
            mimeType: `${mediaType}/test`
          }
        })

        const result = adapter.validateMessage(messageWithMedia)
        expect(result.valid).toBe(true)
      }
    })

    it('should fail validation for wrong channel type', () => {
      const wrongChannelMessage = createTestMessage({
        channelType: ChannelType.INSTAGRAM
      })

      const result = adapter.validateMessage(wrongChannelMessage)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('channel type'))).toBe(true)
    })

    it('should fail validation for missing conversation ID', () => {
      const noConversationMessage = createTestMessage({
        conversationId: ''
      })

      const result = adapter.validateMessage(noConversationMessage)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('conversation'))).toBe(true)
    })

    it('should fail validation for empty message (no content, media, or rich content)', () => {
      const emptyMessage = createTestMessage({
        content: '',
        media: undefined,
        richContent: undefined
      })

      const result = adapter.validateMessage(emptyMessage)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('content'))).toBe(true)
    })
  })

  // ==========================================================================
  // Send Tests
  // ==========================================================================

  describe('send', () => {
    it('should send text message successfully', async () => {
      mockSendMessage.mockResolvedValue('wa_msg_123')

      const testMessage = createTestMessage()
      const result = await adapter.send(testMessage)

      expect(result.success).toBe(true)
      expect(result.channelMessageId).toBe('wa_msg_123')
      expect(mockSendMessage).toHaveBeenCalled()
    })

    it('should return validation errors without calling API', async () => {
      const invalidMessage = createTestMessage({
        channelMetadata: {} // Missing phone number
      })

      const result = await adapter.send(invalidMessage)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('API Error: Rate limit exceeded'))

      const testMessage = createTestMessage()
      const result = await adapter.send(testMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit')
      expect(result.retryable).toBe(true)
    })

    it('should mark non-retryable errors correctly', async () => {
      mockSendMessage.mockRejectedValue(new Error('Invalid phone number format'))

      const testMessage = createTestMessage()
      const result = await adapter.send(testMessage)

      expect(result.success).toBe(false)
      expect(result.retryable).toBe(false)
    })
  })

  // ==========================================================================
  // Health Check Tests
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return healthy status when API responds', async () => {
      mockGetBusinessProfile.mockResolvedValue({ name: 'Test Business' })

      const result = await adapter.healthCheck()

      expect(result.isHealthy).toBe(true)
      expect(result.latency).toBeDefined()
      expect(result.latency).toBeGreaterThanOrEqual(0)
    })

    it('should return unhealthy status when API fails', async () => {
      mockGetBusinessProfile.mockRejectedValue(new Error('API unavailable'))

      const result = await adapter.healthCheck()

      expect(result.isHealthy).toBe(false)
      expect(result.lastError).toContain('API unavailable')
    })
  })

  // ==========================================================================
  // Status Update Parsing Tests
  // ==========================================================================

  describe('parseStatusUpdates', () => {
    it('should parse status updates from webhook payload', () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry_123',
          changes: [{
            field: 'messages',
            value: {
              metadata: {
                phone_number_id: 'phone_123',
                display_phone_number: '+1234567890'
              },
              statuses: [{
                id: 'wa_msg_456',
                status: 'delivered',
                timestamp: '1706100000',
                recipient_id: '9876543210'
              }]
            }
          }]
        }]
      }

      const updates = adapter.parseStatusUpdates(webhookPayload)

      expect(updates).toHaveLength(1)
      expect(updates[0].channelMessageId).toBe('wa_msg_456')
      expect(updates[0].status).toBe('delivered')
      expect(updates[0].recipientId).toBe('9876543210')
    })

    it('should return empty array for non-status webhooks', () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wa_msg_789',
                from: '1234567890',
                text: { body: 'Hello' }
              }]
            }
          }]
        }]
      }

      const updates = adapter.parseStatusUpdates(webhookPayload)

      expect(updates).toHaveLength(0)
    })

    it('should map WhatsApp status values to canonical status', () => {
      const statuses = [
        { waStatus: 'sent', canonical: 'sent' },
        { waStatus: 'delivered', canonical: 'delivered' },
        { waStatus: 'read', canonical: 'read' },
        { waStatus: 'failed', canonical: 'failed' }
      ]

      for (const { waStatus, canonical } of statuses) {
        const webhookPayload = {
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                metadata: { phone_number_id: 'phone_123', display_phone_number: '+1234567890' },
                statuses: [{
                  id: 'wa_msg_test',
                  status: waStatus,
                  timestamp: '1706100000',
                  recipient_id: '1234567890'
                }]
              }
            }]
          }]
        }

        const updates = adapter.parseStatusUpdates(webhookPayload)
        expect(updates[0].status).toBe(canonical)
      }
    })
  })

  // ==========================================================================
  // Get Status Tests
  // ==========================================================================

  describe('getStatus', () => {
    it('should return sent as default status', async () => {
      // WhatsApp does not have a status lookup API
      // Status updates come via webhooks
      const status = await adapter.getStatus('wa_msg_123')

      expect(status).toBe('sent')
    })
  })
})
