/**
 * Channel Adapters - Factory and Exports
 * Purpose: Centralized adapter creation and exports for multi-channel messaging
 * Date: 2026-01-24
 * Updated: 2026-01-28 - Added Instagram, Facebook, and SMS adapters
 * Updated: 2026-02-03 - Added Twilio WhatsApp adapter
 */

import { ChannelType, ChannelAdapter } from '@/types/channels'
import { WhatsAppAdapter } from './whatsapp'
import { InstagramAdapter } from './instagram'
import { FacebookAdapter } from './facebook'
import { SMSAdapter } from './sms'
import { TwilioWhatsAppAdapter } from './twilio-whatsapp'

// ============================================================================
// Re-export Adapter Classes
// ============================================================================

export { BaseChannelAdapter } from './base'
export { WhatsAppAdapter } from './whatsapp'
export { InstagramAdapter } from './instagram'
export { FacebookAdapter } from './facebook'
export { SMSAdapter } from './sms'
export { TwilioWhatsAppAdapter } from './twilio-whatsapp'

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
 * Creates an Instagram adapter for a specific organization.
 * Uses the organization's stored and decrypted credentials.
 *
 * @param organizationId - The organization ID to create adapter for
 * @returns A configured InstagramAdapter instance
 * @throws Error if Instagram credentials are not found for the organization
 */
export async function createInstagramAdapter(organizationId: string): Promise<InstagramAdapter> {
  return InstagramAdapter.createForOrganization(organizationId)
}

/**
 * Creates a Facebook adapter for a specific organization.
 * Uses the organization's stored and decrypted credentials.
 *
 * @param organizationId - The organization ID to create adapter for
 * @returns A configured FacebookAdapter instance
 * @throws Error if Facebook credentials are not found for the organization
 */
export async function createFacebookAdapter(organizationId: string): Promise<FacebookAdapter> {
  return FacebookAdapter.createForOrganization(organizationId)
}

/**
 * Creates an SMS adapter for a specific organization.
 * Uses the organization's stored and decrypted Twilio credentials.
 *
 * @param organizationId - The organization ID to create adapter for
 * @returns A configured SMSAdapter instance
 * @throws Error if SMS/Twilio credentials are not found for the organization
 */
export async function createSMSAdapter(organizationId: string): Promise<SMSAdapter> {
  return SMSAdapter.createForOrganization(organizationId)
}

/**
 * Creates a Twilio WhatsApp adapter for a specific organization.
 * Uses the organization's stored and decrypted Twilio credentials.
 *
 * @param organizationId - The organization ID to create adapter for
 * @returns A configured TwilioWhatsAppAdapter instance
 * @throws Error if Twilio WhatsApp credentials are not found for the organization
 */
export async function createTwilioWhatsAppAdapter(organizationId: string): Promise<TwilioWhatsAppAdapter> {
  return TwilioWhatsAppAdapter.createForOrganization(organizationId)
}

/**
 * Generic factory to create an adapter by channel type for an organization.
 * Currently supports WhatsApp, Instagram, Facebook, and SMS. Future channels will be added here.
 *
 * @param organizationId - The organization ID to create adapter for
 * @param channelType - The type of channel to create adapter for
 * @returns A configured channel adapter instance
 * @throws Error if the channel type is not implemented or credentials not found
 */
export async function createAdapterForOrganization(
  organizationId: string,
  channelType: ChannelType
): Promise<ChannelAdapter> {
  switch (channelType) {
    case ChannelType.WHATSAPP:
      return createWhatsAppAdapter(organizationId)

    case ChannelType.INSTAGRAM:
      return createInstagramAdapter(organizationId)

    case ChannelType.FACEBOOK:
      return createFacebookAdapter(organizationId)

    case ChannelType.SMS:
      return createSMSAdapter(organizationId)

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

/**
 * Type guard to check if an adapter is an Instagram adapter.
 */
export function isInstagramAdapter(adapter: unknown): adapter is InstagramAdapter {
  return adapter instanceof InstagramAdapter
}

/**
 * Type guard to check if an adapter is a Facebook adapter.
 */
export function isFacebookAdapter(adapter: unknown): adapter is FacebookAdapter {
  return adapter instanceof FacebookAdapter
}

/**
 * Type guard to check if an adapter is an SMS adapter.
 */
export function isSMSAdapter(adapter: unknown): adapter is SMSAdapter {
  return adapter instanceof SMSAdapter
}

/**
 * Type guard to check if an adapter is a Twilio WhatsApp adapter.
 */
export function isTwilioWhatsAppAdapter(adapter: unknown): adapter is TwilioWhatsAppAdapter {
  return adapter instanceof TwilioWhatsAppAdapter
}
