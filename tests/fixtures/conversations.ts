/**
 * Conversation Test Fixtures
 *
 * Sample conversation data for testing different conversation states.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import type { Conversation } from '@/types/database'

// =============================================================================
// Open Conversations
// =============================================================================

export const openConversation: Conversation = {
  id: 'conv-open-001',
  organization_id: 'org-test-001',
  contact_id: 'contact-001',
  status: 'open',
  assigned_agent_id: 'user-agent-001',
  metadata: {
    source: 'whatsapp',
    priority: 'normal',
    labels: ['support', 'billing'],
    last_response_time: 120, // seconds
  },
  unread_count: 3,
  last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
  closed_at: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
}

export const urgentConversation: Conversation = {
  id: 'conv-urgent-001',
  organization_id: 'org-test-001',
  contact_id: 'contact-002',
  status: 'open',
  assigned_agent_id: 'user-agent-001',
  metadata: {
    source: 'whatsapp',
    priority: 'urgent',
    labels: ['vip', 'escalated'],
    escalated_at: new Date().toISOString(),
  },
  unread_count: 5,
  last_message_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
  closed_at: null,
  created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
}

// =============================================================================
// Unassigned Conversations
// =============================================================================

export const unassignedConversation: Conversation = {
  id: 'conv-unassigned-001',
  organization_id: 'org-test-001',
  contact_id: 'contact-003',
  status: 'open',
  assigned_agent_id: null,
  metadata: {
    source: 'whatsapp',
    priority: 'normal',
    labels: ['new'],
    awaiting_assignment: true,
  },
  unread_count: 1,
  last_message_at: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
  closed_at: null,
  created_at: new Date(Date.now() - 1000 * 60).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60).toISOString(),
}

// =============================================================================
// Closed Conversations
// =============================================================================

export const closedConversation: Conversation = {
  id: 'conv-closed-001',
  organization_id: 'org-test-001',
  contact_id: 'contact-001',
  status: 'closed',
  assigned_agent_id: 'user-agent-001',
  metadata: {
    source: 'whatsapp',
    priority: 'normal',
    labels: ['resolved'],
    resolution_time: 1800, // 30 minutes
    closing_reason: 'Issue resolved',
  },
  unread_count: 0,
  last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  closed_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
}

export const resolvedConversation: Conversation = {
  id: 'conv-resolved-001',
  organization_id: 'org-test-001',
  contact_id: 'contact-002',
  status: 'resolved',
  assigned_agent_id: 'user-agent-002',
  metadata: {
    source: 'whatsapp',
    priority: 'normal',
    labels: ['completed', 'satisfied'],
    satisfaction_score: 5,
  },
  unread_count: 0,
  last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  closed_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
}

// =============================================================================
// Collections for Testing
// =============================================================================

export const allConversations: Conversation[] = [
  openConversation,
  urgentConversation,
  unassignedConversation,
  closedConversation,
  resolvedConversation,
]

export const openConversations: Conversation[] = [
  openConversation,
  urgentConversation,
  unassignedConversation,
]

export const closedConversations: Conversation[] = [closedConversation, resolvedConversation]

export const assignedConversations: Conversation[] = [
  openConversation,
  urgentConversation,
  closedConversation,
  resolvedConversation,
]

export const unassignedConversations: Conversation[] = [unassignedConversation]
