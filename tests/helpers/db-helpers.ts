/**
 * Database Test Helpers
 *
 * Comprehensive utilities for creating, managing, and cleaning up
 * test data in the database for integration and E2E tests.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server'
import type {
  Organization,
  Profile,
  Contact,
  Conversation,
  Message,
  MessageTemplate,
  AutomationRule,
} from '@/types/database'

// =============================================================================
// Type Definitions
// =============================================================================

export interface TestOrganization extends Partial<Organization> {
  name?: string
  subdomain?: string
  subscription_plan?: string
  settings?: Record<string, any>
}

export interface TestUser extends Partial<Profile> {
  email?: string
  full_name?: string
  role?: string
  organization_id?: string
  permissions?: Record<string, any>
}

export interface TestContact extends Partial<Contact> {
  whatsapp_id?: string
  phone_number?: string
  name?: string
  organization_id?: string
}

export interface TestConversation extends Partial<Conversation> {
  contact_id?: string
  organization_id?: string
  status?: string
  assigned_agent_id?: string
}

export interface TestMessage extends Partial<Message> {
  conversation_id?: string
  sender_id?: string
  content?: string
  message_type?: string
}

// =============================================================================
// Organization Management
// =============================================================================

/**
 * Create a test organization with default values
 */
export async function createTestOrganization(
  data: TestOrganization = {}
): Promise<Organization> {
  const supabase = await createClient()

  const organizationData = {
    name: data.name || `Test Organization ${Date.now()}`,
    subdomain: data.subdomain || `test-org-${Date.now()}`,
    subscription_plan: data.subscription_plan || 'starter',
    settings: data.settings || {
      branding: {
        primary_color: '#3B82F6',
        logo_url: null,
      },
      features: {
        whatsapp_enabled: true,
        analytics_enabled: true,
        automation_enabled: true,
      },
      limits: {
        max_users: 10,
        max_contacts: 1000,
        max_messages_per_month: 10000,
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  }

  const { data: organization, error } = await supabase
    .from('organizations')
    .insert(organizationData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test organization: ${error.message}`)
  }

  return organization as Organization
}

/**
 * Update a test organization
 */
export async function updateTestOrganization(
  id: string,
  updates: Partial<Organization>
): Promise<Organization> {
  const supabase = await createClient()

  const { data: organization, error } = await supabase
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update test organization: ${error.message}`)
  }

  return organization as Organization
}

/**
 * Delete a test organization and all associated data
 */
export async function deleteTestOrganization(id: string): Promise<void> {
  const supabase = await createClient()

  // Delete in correct order to maintain referential integrity
  await supabase.from('messages').delete().eq('organization_id', id)
  await supabase.from('conversations').delete().eq('organization_id', id)
  await supabase.from('contacts').delete().eq('organization_id', id)
  await supabase.from('message_templates').delete().eq('organization_id', id)
  await supabase.from('automation_rules').delete().eq('organization_id', id)
  await supabase.from('profiles').delete().eq('organization_id', id)

  const { error } = await supabase.from('organizations').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete test organization: ${error.message}`)
  }
}

// =============================================================================
// User Management
// =============================================================================

/**
 * Create a test user profile
 */
export async function createTestUser(data: TestUser = {}): Promise<Profile> {
  const supabase = await createClient()

  // Create organization if not provided
  let organizationId = data.organization_id
  if (!organizationId) {
    const org = await createTestOrganization()
    organizationId = org.id
  }

  const timestamp = Date.now()
  const userData = {
    id: data.id || `user-${timestamp}`,
    organization_id: organizationId,
    email: data.email || `test-user-${timestamp}@example.com`,
    full_name: data.full_name || `Test User ${timestamp}`,
    role: data.role || 'agent',
    permissions: data.permissions || {
      can_manage_contacts: true,
      can_send_messages: true,
      can_view_analytics: true,
    },
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...data,
  }

  const { data: user, error } = await supabase
    .from('profiles')
    .insert(userData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  return user as Profile
}

/**
 * Create an admin user
 */
export async function createTestAdminUser(
  organizationId?: string
): Promise<Profile> {
  return createTestUser({
    role: 'admin',
    organization_id: organizationId,
    permissions: {
      can_manage_contacts: true,
      can_send_messages: true,
      can_view_analytics: true,
      can_manage_users: true,
      can_manage_settings: true,
      can_manage_billing: true,
    },
  })
}

/**
 * Create a super admin user
 */
export async function createTestSuperAdminUser(): Promise<Profile> {
  const org = await createTestOrganization({ name: 'Super Admin Org' })

  return createTestUser({
    role: 'super_admin',
    organization_id: org.id,
    permissions: {
      can_manage_all_organizations: true,
      can_view_system_logs: true,
      can_manage_system_settings: true,
    },
  })
}

/**
 * Delete a test user
 */
export async function deleteTestUser(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`)
  }
}

// =============================================================================
// Contact Management
// =============================================================================

/**
 * Create a test contact
 */
export async function createTestContact(
  data: TestContact = {}
): Promise<Contact> {
  const supabase = await createClient()

  // Create organization if not provided
  let organizationId = data.organization_id
  if (!organizationId) {
    const org = await createTestOrganization()
    organizationId = org.id
  }

  const timestamp = Date.now()
  const contactData = {
    organization_id: organizationId,
    whatsapp_id: data.whatsapp_id || `+1555${timestamp.toString().slice(-7)}`,
    phone_number: data.phone_number || `+1555${timestamp.toString().slice(-7)}`,
    name: data.name || `Test Contact ${timestamp}`,
    profile_data: {
      avatar_url: null,
      company: 'Test Company',
      tags: ['test'],
      custom_fields: {},
    },
    created_at: new Date().toISOString(),
    ...data,
  }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test contact: ${error.message}`)
  }

  return contact as Contact
}

/**
 * Create multiple test contacts
 */
export async function createTestContacts(
  count: number,
  organizationId?: string
): Promise<Contact[]> {
  const contacts: Contact[] = []

  for (let i = 0; i < count; i++) {
    const contact = await createTestContact({
      organization_id: organizationId,
      name: `Test Contact ${i + 1}`,
    })
    contacts.push(contact)
  }

  return contacts
}

/**
 * Delete a test contact
 */
export async function deleteTestContact(id: string): Promise<void> {
  const supabase = await createClient()

  // Delete associated conversations and messages first
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', id)

  if (conversations) {
    for (const conv of conversations) {
      await supabase.from('messages').delete().eq('conversation_id', conv.id)
    }
    await supabase.from('conversations').delete().eq('contact_id', id)
  }

  const { error } = await supabase.from('contacts').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete test contact: ${error.message}`)
  }
}

// =============================================================================
// Conversation Management
// =============================================================================

/**
 * Create a test conversation
 */
export async function createTestConversation(
  data: TestConversation = {}
): Promise<Conversation> {
  const supabase = await createClient()

  // Create contact if not provided
  let contactId = data.contact_id
  let organizationId = data.organization_id

  if (!contactId) {
    const contact = await createTestContact({ organization_id: organizationId })
    contactId = contact.id
    organizationId = contact.organization_id
  }

  const conversationData = {
    organization_id: organizationId!,
    contact_id: contactId,
    status: data.status || 'open',
    assigned_agent_id: data.assigned_agent_id || null,
    metadata: {
      source: 'whatsapp',
      priority: 'normal',
      tags: [],
    },
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...data,
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test conversation: ${error.message}`)
  }

  return conversation as Conversation
}

/**
 * Delete a test conversation
 */
export async function deleteTestConversation(id: string): Promise<void> {
  const supabase = await createClient()

  // Delete messages first
  await supabase.from('messages').delete().eq('conversation_id', id)

  const { error } = await supabase.from('conversations').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete test conversation: ${error.message}`)
  }
}

// =============================================================================
// Message Management
// =============================================================================

/**
 * Create a test message
 */
export async function createTestMessage(
  data: TestMessage = {}
): Promise<Message> {
  const supabase = await createClient()

  // Create conversation if not provided
  let conversationId = data.conversation_id
  if (!conversationId) {
    const conversation = await createTestConversation()
    conversationId = conversation.id
  }

  const messageData = {
    conversation_id: conversationId,
    sender_id: data.sender_id || null,
    content: data.content || 'Test message content',
    message_type: data.message_type || 'text',
    whatsapp_message_id: `wamid_test_${Date.now()}`,
    metadata: {
      status: 'sent',
      read: false,
    },
    timestamp: new Date().toISOString(),
    ...data,
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test message: ${error.message}`)
  }

  return message as Message
}

/**
 * Create multiple test messages for a conversation
 */
export async function createTestMessages(
  conversationId: string,
  count: number
): Promise<Message[]> {
  const messages: Message[] = []

  for (let i = 0; i < count; i++) {
    const message = await createTestMessage({
      conversation_id: conversationId,
      content: `Test message ${i + 1}`,
    })
    messages.push(message)
  }

  return messages
}

// =============================================================================
// Template Management
// =============================================================================

/**
 * Create a test message template
 */
export async function createTestTemplate(
  organizationId?: string
): Promise<MessageTemplate> {
  const supabase = await createClient()

  // Create organization if not provided
  if (!organizationId) {
    const org = await createTestOrganization()
    organizationId = org.id
  }

  const timestamp = Date.now()
  const templateData = {
    organization_id: organizationId,
    name: `Test Template ${timestamp}`,
    content: 'Hello {{name}}, this is a test template message.',
    category: 'general',
    variables: ['name'],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
  }

  const { data: template, error } = await supabase
    .from('message_templates')
    .insert(templateData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test template: ${error.message}`)
  }

  return template as MessageTemplate
}

// =============================================================================
// Cleanup Utilities
// =============================================================================

/**
 * Clean up all test data (use with caution!)
 */
export async function cleanupAllTestData(): Promise<void> {
  const supabase = await createClient()

  console.warn('⚠️ Cleaning up all test data...')

  // Delete in correct order
  await supabase.from('messages').delete().like('whatsapp_message_id', '%test%')
  await supabase.from('conversations').delete().like('id', '%test%')
  await supabase.from('contacts').delete().like('whatsapp_id', '%test%')
  await supabase.from('message_templates').delete().like('name', 'Test Template%')
  await supabase.from('automation_rules').delete().like('name', 'Test Rule%')
  await supabase.from('profiles').delete().like('email', '%@example.com')
  await supabase.from('organizations').delete().like('name', 'Test Organization%')

  console.log('✅ Test data cleanup complete')
}

/**
 * Clean up test data for a specific organization
 */
export async function cleanupOrganizationData(
  organizationId: string
): Promise<void> {
  await deleteTestOrganization(organizationId)
}

// =============================================================================
// Transaction Helpers
// =============================================================================

/**
 * Execute a function within a test transaction context
 */
export async function withTestTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // Rollback would happen here if using database transactions
    throw error
  }
}

/**
 * Create a complete test environment with organization, users, and contacts
 */
export async function createTestEnvironment() {
  const org = await createTestOrganization()
  const admin = await createTestAdminUser(org.id)
  const agent = await createTestUser({ organization_id: org.id, role: 'agent' })
  const contacts = await createTestContacts(5, org.id)
  const conversation = await createTestConversation({
    organization_id: org.id,
    contact_id: contacts[0].id,
    assigned_agent_id: agent.id,
  })
  const messages = await createTestMessages(conversation.id, 10)

  return {
    organization: org,
    admin,
    agent,
    contacts,
    conversation,
    messages,
    async cleanup() {
      await deleteTestOrganization(org.id)
    },
  }
}

// =============================================================================
// Export All Helpers
// =============================================================================

export default {
  createTestOrganization,
  updateTestOrganization,
  deleteTestOrganization,
  createTestUser,
  createTestAdminUser,
  createTestSuperAdminUser,
  deleteTestUser,
  createTestContact,
  createTestContacts,
  deleteTestContact,
  createTestConversation,
  deleteTestConversation,
  createTestMessage,
  createTestMessages,
  createTestTemplate,
  cleanupAllTestData,
  cleanupOrganizationData,
  withTestTransaction,
  createTestEnvironment,
}
