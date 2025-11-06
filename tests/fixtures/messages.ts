/**
 * Message Test Fixtures
 *
 * Sample message data for testing different message types.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import type { Message } from '@/types/database'

// =============================================================================
// Text Messages
// =============================================================================

export const incomingTextMessage: Message = {
  id: 'msg-incoming-001',
  conversation_id: 'conv-open-001',
  sender_id: null,
  sender_type: 'contact',
  content: 'Hello, I need help with my account',
  message_type: 'text',
  whatsapp_message_id: 'wamid_incoming_001',
  metadata: {
    status: 'delivered',
  },
  media_url: null,
  media_type: null,
  is_read: false,
  delivered_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  read_at: null,
  timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
}

export const outgoingTextMessage: Message = {
  id: 'msg-outgoing-001',
  conversation_id: 'conv-open-001',
  sender_id: 'user-agent-001',
  sender_type: 'agent',
  content: "Hello! I'd be happy to help you with your account.",
  message_type: 'text',
  whatsapp_message_id: 'wamid_outgoing_001',
  metadata: {
    status: 'read',
  },
  media_url: null,
  media_type: null,
  is_read: true,
  delivered_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  read_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
}

// =============================================================================
// Media Messages
// =============================================================================

export const imageMessage: Message = {
  id: 'msg-image-001',
  conversation_id: 'conv-open-001',
  sender_id: null,
  sender_type: 'contact',
  content: 'Here is a screenshot of the issue',
  message_type: 'image',
  whatsapp_message_id: 'wamid_image_001',
  metadata: {
    status: 'delivered',
    caption: 'Screenshot of error message',
  },
  media_url: 'https://test.com/media/screenshot.jpg',
  media_type: 'image/jpeg',
  is_read: true,
  delivered_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  read_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
}

export const documentMessage: Message = {
  id: 'msg-document-001',
  conversation_id: 'conv-open-001',
  sender_id: 'user-agent-001',
  sender_type: 'agent',
  content: 'Please review this document',
  message_type: 'document',
  whatsapp_message_id: 'wamid_document_001',
  metadata: {
    status: 'delivered',
    filename: 'terms-and-conditions.pdf',
    file_size: 245678,
  },
  media_url: 'https://test.com/media/terms.pdf',
  media_type: 'application/pdf',
  is_read: false,
  delivered_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  read_at: null,
  timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
}

// =============================================================================
// Template Messages
// =============================================================================

export const templateMessage: Message = {
  id: 'msg-template-001',
  conversation_id: 'conv-open-001',
  sender_id: 'user-agent-001',
  sender_type: 'system',
  content: 'Thank you for contacting us! Your ticket #12345 has been created.',
  message_type: 'template',
  whatsapp_message_id: 'wamid_template_001',
  metadata: {
    status: 'delivered',
    template_id: 'template-001',
    template_name: 'ticket_created',
    variables: {
      ticket_id: '12345',
    },
  },
  media_url: null,
  media_type: null,
  is_read: true,
  delivered_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  read_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
}

// =============================================================================
// Collections for Testing
// =============================================================================

export const allMessages: Message[] = [
  incomingTextMessage,
  outgoingTextMessage,
  imageMessage,
  documentMessage,
  templateMessage,
]

export const textMessages: Message[] = [incomingTextMessage, outgoingTextMessage]

export const mediaMessages: Message[] = [imageMessage, documentMessage]

export const incomingMessages: Message[] = [incomingTextMessage, imageMessage]

export const outgoingMessages: Message[] = [outgoingTextMessage, documentMessage, templateMessage]
