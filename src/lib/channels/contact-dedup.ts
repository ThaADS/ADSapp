/**
 * Contact Deduplication Utilities
 * Purpose: Normalize channel identifiers and find/create contacts with channel connections
 * Date: 2026-01-24
 */

import { ChannelType } from '@/types/channels'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

export interface ContactInfo {
  name?: string
  avatarUrl?: string
  metadata?: Record<string, unknown>
}

export interface FindOrCreateResult {
  contactId: string
  isNew: boolean
}

// ============================================================================
// Identifier Normalization
// ============================================================================

/**
 * Normalizes a channel identifier to a standard format based on channel type.
 *
 * @param channelType - The type of channel
 * @param identifier - The raw channel identifier
 * @returns Normalized identifier
 *
 * @example
 * normalizeIdentifier(ChannelType.WHATSAPP, '+1 (555) 123-4567') // '+15551234567'
 * normalizeIdentifier(ChannelType.INSTAGRAM, '@username') // 'username'
 */
export function normalizeIdentifier(
  channelType: ChannelType,
  identifier: string
): string {
  switch (channelType) {
    case ChannelType.WHATSAPP:
    case ChannelType.SMS:
      return normalizePhoneNumber(identifier)

    case ChannelType.INSTAGRAM:
      // Remove @ prefix, lowercase
      return identifier.toLowerCase().replace(/^@/, '').trim()

    case ChannelType.FACEBOOK:
      // Facebook PSID is already normalized, just trim
      return identifier.trim()

    default:
      return identifier.trim()
  }
}

/**
 * Normalizes a phone number to E.164 format.
 * Removes all non-numeric characters except leading +.
 *
 * @param phone - The phone number to normalize
 * @returns The normalized phone number in E.164 format
 *
 * @example
 * normalizePhoneNumber('+1 (555) 123-4567') // '+15551234567'
 * normalizePhoneNumber('15551234567') // '+15551234567'
 * normalizePhoneNumber('31612345678') // '+31612345678'
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all characters except digits and leading +
  let cleaned = phone.replace(/[^0-9+]/g, '')

  // Ensure the number starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`
  }

  return cleaned
}

// ============================================================================
// Contact Management
// ============================================================================

/**
 * Finds an existing contact or creates a new one for a channel identifier.
 * Also creates/updates the channel_connection record.
 *
 * @param supabase - The Supabase client
 * @param organizationId - The organization ID
 * @param channelType - The channel type
 * @param channelIdentifier - The raw channel identifier (will be normalized)
 * @param contactInfo - Optional contact information
 * @returns The contact ID and whether it was newly created
 */
export async function findOrCreateContact(
  supabase: SupabaseClient,
  organizationId: string,
  channelType: ChannelType,
  channelIdentifier: string,
  contactInfo: ContactInfo = {}
): Promise<FindOrCreateResult> {
  const normalized = normalizeIdentifier(channelType, channelIdentifier)

  // 1. Check if channel_connection exists
  const { data: existingConnection } = await supabase
    .from('channel_connections')
    .select('contact_id')
    .eq('organization_id', organizationId)
    .eq('channel_type', channelType)
    .eq('channel_identifier', normalized)
    .single()

  if (existingConnection) {
    // Update activity tracking
    await updateChannelConnectionActivity(
      supabase,
      organizationId,
      channelType,
      normalized
    )

    return { contactId: existingConnection.contact_id, isNew: false }
  }

  // 2. For phone-based channels, search existing contacts by phone number
  if (channelType === ChannelType.WHATSAPP || channelType === ChannelType.SMS) {
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('phone_number', normalized)
      .single()

    if (existingContact) {
      // Create channel_connection for existing contact
      await createChannelConnection(
        supabase,
        organizationId,
        existingContact.id,
        channelType,
        normalized,
        contactInfo
      )
      return { contactId: existingContact.id, isNew: false }
    }
  }

  // 3. Create new contact
  const { data: newContact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      organization_id: organizationId,
      name: contactInfo.name || normalized,
      phone_number: (channelType === ChannelType.WHATSAPP || channelType === ChannelType.SMS)
        ? normalized
        : null,
      avatar_url: contactInfo.avatarUrl || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (contactError || !newContact) {
    throw new Error(`Failed to create contact: ${contactError?.message}`)
  }

  // 4. Create channel_connection for new contact
  await createChannelConnection(
    supabase,
    organizationId,
    newContact.id,
    channelType,
    normalized,
    contactInfo
  )

  return { contactId: newContact.id, isNew: true }
}

// ============================================================================
// Channel Connection Management
// ============================================================================

/**
 * Creates a new channel connection record for a contact.
 */
async function createChannelConnection(
  supabase: SupabaseClient,
  organizationId: string,
  contactId: string,
  channelType: ChannelType,
  channelIdentifier: string,
  contactInfo: ContactInfo
): Promise<void> {
  const { error } = await supabase
    .from('channel_connections')
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      channel_type: channelType,
      channel_identifier: channelIdentifier,
      display_name: contactInfo.name || null,
      avatar_url: contactInfo.avatarUrl || null,
      channel_metadata: contactInfo.metadata || {},
      is_primary: true, // First connection for this channel is primary
      is_active: true,
      last_message_at: new Date().toISOString(),
      message_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    // Log but don't throw - contact exists, connection is nice-to-have for tracking
    console.error('[contact-dedup] Failed to create channel connection:', error.message)
  }
}

/**
 * Updates the activity tracking for a channel connection.
 */
async function updateChannelConnectionActivity(
  supabase: SupabaseClient,
  organizationId: string,
  channelType: ChannelType,
  channelIdentifier: string
): Promise<void> {
  // Use raw SQL increment for message_count to avoid race conditions
  const { error } = await supabase
    .from('channel_connections')
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId)
    .eq('channel_type', channelType)
    .eq('channel_identifier', channelIdentifier)

  if (error) {
    console.error('[contact-dedup] Failed to update channel connection activity:', error.message)
  }

  // Increment message_count separately using RPC if available
  // For now, we skip the increment since supabase.sql is not standard
  // This can be improved with a custom RPC function
}

/**
 * Upserts a channel connection (update if exists, create if not).
 *
 * @param supabase - The Supabase client
 * @param organizationId - The organization ID
 * @param contactId - The contact ID
 * @param channelType - The channel type
 * @param channelIdentifier - The raw channel identifier (will be normalized)
 * @param updates - Partial contact info to update
 */
export async function upsertChannelConnection(
  supabase: SupabaseClient,
  organizationId: string,
  contactId: string,
  channelType: ChannelType,
  channelIdentifier: string,
  updates: Partial<ContactInfo> = {}
): Promise<void> {
  const normalized = normalizeIdentifier(channelType, channelIdentifier)

  const { error } = await supabase
    .from('channel_connections')
    .upsert(
      {
        organization_id: organizationId,
        contact_id: contactId,
        channel_type: channelType,
        channel_identifier: normalized,
        display_name: updates.name || null,
        avatar_url: updates.avatarUrl || null,
        channel_metadata: updates.metadata || {},
        is_active: true,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'organization_id,channel_type,channel_identifier'
      }
    )

  if (error) {
    console.error('[contact-dedup] Failed to upsert channel connection:', error.message)
  }
}

/**
 * Gets all channel connections for a contact.
 *
 * @param supabase - The Supabase client
 * @param organizationId - The organization ID
 * @param contactId - The contact ID
 * @returns Array of channel connections
 */
export async function getContactChannelConnections(
  supabase: SupabaseClient,
  organizationId: string,
  contactId: string
): Promise<Array<{
  channel_type: ChannelType
  channel_identifier: string
  display_name: string | null
  is_primary: boolean
  last_message_at: string | null
}>> {
  const { data, error } = await supabase
    .from('channel_connections')
    .select('channel_type, channel_identifier, display_name, is_primary, last_message_at')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })

  if (error) {
    console.error('[contact-dedup] Failed to get channel connections:', error.message)
    return []
  }

  return data || []
}
