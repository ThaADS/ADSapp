/**
 * WhatsApp Mock Factory
 *
 * Mocking utilities for WhatsApp Business Cloud API.
 */

// =============================================================================
// Mock WhatsApp API Client
// =============================================================================

export function createMockWhatsAppClient() {
  return {
    sendMessage: jest.fn().mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [
        {
          id: 'wamid_test_123',
        },
      ],
    }),
    sendTemplate: jest.fn().mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [
        {
          id: 'wamid_test_template_123',
        },
      ],
    }),
    markAsRead: jest.fn().mockResolvedValue({
      success: true,
    }),
    getMediaUrl: jest.fn().mockResolvedValue({
      url: 'https://test.com/media/file.jpg',
      mime_type: 'image/jpeg',
      sha256: 'test_hash',
      file_size: 1024,
    }),
    downloadMedia: jest.fn().mockResolvedValue(Buffer.from('test data')),
  }
}

// =============================================================================
// Mock Webhook Payloads
// =============================================================================

export const mockIncomingMessageWebhook = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'test_business_account_id',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+15551234567',
              phone_number_id: 'test_phone_number_id',
            },
            contacts: [
              {
                profile: {
                  name: 'Test Contact',
                },
                wa_id: '15559876543',
              },
            ],
            messages: [
              {
                from: '15559876543',
                id: 'wamid_incoming_test',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: 'text',
                text: {
                  body: 'Hello, I need help',
                },
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
}

export const mockStatusUpdateWebhook = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'test_business_account_id',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+15551234567',
              phone_number_id: 'test_phone_number_id',
            },
            statuses: [
              {
                id: 'wamid_test_status',
                status: 'delivered',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                recipient_id: '15559876543',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
}

// =============================================================================
// Export
// =============================================================================

export default {
  createMockWhatsAppClient,
  mockIncomingMessageWebhook,
  mockStatusUpdateWebhook,
}
