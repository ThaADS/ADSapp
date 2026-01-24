/**
 * Channel Adapters - Factory and Exports
 * Purpose: Centralized adapter creation and exports for multi-channel messaging
 * Date: 2026-01-24
 */

import { ChannelType } from '@/types/channels'
import { WhatsAppAdapter } from './whatsapp'

// ============================================================================
// Re-export Adapter Classes
// ============================================================================

export { BaseChannelAdapter } from './base'
export { WhatsAppAdapter } from './whatsapp'

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a WhatsApp adapter for a specific organization.
 * Uses the organization's stored and decrypted credentials.
 *
 * @param organizationId - The organization ID to create adapter for
 * @returns A configured WhatsAppAdapter instance
 * @throws Error if WhatsApp credentials are not found for the organization
 */
export async function createWhatsAppAdapter(organizationId: string): Promise<WhatsAppAdapter> {
  return WhatsAppAdapter.createForOrganization(organizationId)
}

/**
 * Generic factory to create an adapter by channel type for an organization.
 * Currently supports WhatsApp. Future channels will be added here.
 *
 * @param organizationId - The organization ID to create adapter for
 * @param channelType - The type of channel to create adapter for
 * @returns A configured channel adapter instance
 * @throws Error if the channel type is not implemented or credentials not found
 */
export async function createAdapterForOrganization(
  organizationId: string,
  channelType: ChannelType
): Promise<WhatsAppAdapter> {
  switch (channelType) {
    case ChannelType.WHATSAPP:
      return createWhatsAppAdapter(organizationId)

    case ChannelType.INSTAGRAM:
    case ChannelType.FACEBOOK:
    case ChannelType.SMS:
      throw new Error(`Channel type ${channelType} not yet implemented`)

    default:
      throw new Error(`Unknown channel type: ${channelType}`)
  }
}

// ============================================================================
// Adapter Type Guards
// ============================================================================

/**
 * Type guard to check if an adapter is a WhatsApp adapter.
 */
export function isWhatsAppAdapter(adapter: unknown): adapter is WhatsAppAdapter {
  return adapter instanceof WhatsAppAdapter
}
