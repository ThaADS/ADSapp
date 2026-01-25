'use strict'

/**
 * Credential Manager for Organization API Credentials
 *
 * Handles secure retrieval and decryption of organization credentials.
 * All sensitive credentials are stored encrypted with AES-256-GCM.
 */

import {
  decryptCredential,
  isEncryptedCredential,
  type EncryptedCredential,
} from './encryption'

/**
 * Organization WhatsApp credentials
 */
export interface WhatsAppCredentials {
  accessToken: string
  phoneNumberId: string
  businessAccountId: string | null
  webhookVerifyToken: string | null
}

/**
 * Try to parse a stored credential value
 * Handles both encrypted (JSON object) and plaintext (legacy) formats
 */
function parseStoredCredential(
  storedValue: string | null,
  organizationId: string
): string | null {
  if (!storedValue) return null

  // Try to parse as encrypted credential (JSON format)
  try {
    const parsed = JSON.parse(storedValue)
    if (isEncryptedCredential(parsed)) {
      return decryptCredential(parsed as EncryptedCredential, organizationId)
    }
  } catch {
    // Not JSON, might be plaintext (legacy data)
  }

  // Return as-is if not encrypted (legacy plaintext)
  // In production, you should migrate all legacy data
  console.warn(
    `[Security Warning] Found unencrypted credential for organization ${organizationId}. ` +
      'Please run migration to encrypt all credentials.'
  )
  return storedValue
}

/**
 * Decrypt WhatsApp credentials from organization data
 *
 * @param organizationId - The organization ID (used as tenant key)
 * @param encryptedAccessToken - The encrypted access token from database
 * @param phoneNumberId - The WhatsApp phone number ID (not encrypted)
 * @param businessAccountId - The WhatsApp business account ID (not encrypted)
 * @param encryptedWebhookToken - The encrypted webhook verify token from database
 * @returns Decrypted WhatsApp credentials
 */
export function decryptWhatsAppCredentials(
  organizationId: string,
  encryptedAccessToken: string | null,
  phoneNumberId: string | null,
  businessAccountId: string | null,
  encryptedWebhookToken: string | null
): WhatsAppCredentials | null {
  if (!encryptedAccessToken || !phoneNumberId) {
    return null
  }

  const accessToken = parseStoredCredential(encryptedAccessToken, organizationId)
  const webhookVerifyToken = parseStoredCredential(encryptedWebhookToken, organizationId)

  if (!accessToken) {
    return null
  }

  return {
    accessToken,
    phoneNumberId,
    businessAccountId,
    webhookVerifyToken,
  }
}

/**
 * Check if credentials need migration (plaintext to encrypted)
 *
 * @param storedValue - The stored credential value
 * @returns true if the credential is plaintext and needs encryption
 */
export function needsEncryptionMigration(storedValue: string | null): boolean {
  if (!storedValue) return false

  try {
    const parsed = JSON.parse(storedValue)
    return !isEncryptedCredential(parsed)
  } catch {
    // Not JSON = plaintext = needs migration
    return true
  }
}

/**
 * Get WhatsApp configuration status for an organization
 * Used for checking if WhatsApp is configured without exposing credentials
 */
export interface WhatsAppConfigStatus {
  isConfigured: boolean
  hasAccessToken: boolean
  hasPhoneNumberId: boolean
  hasBusinessAccountId: boolean
  hasWebhookToken: boolean
  needsMigration: boolean
}

export function getWhatsAppConfigStatus(
  accessToken: string | null,
  phoneNumberId: string | null,
  businessAccountId: string | null,
  webhookToken: string | null
): WhatsAppConfigStatus {
  return {
    isConfigured: !!(accessToken && phoneNumberId),
    hasAccessToken: !!accessToken,
    hasPhoneNumberId: !!phoneNumberId,
    hasBusinessAccountId: !!businessAccountId,
    hasWebhookToken: !!webhookToken,
    needsMigration:
      needsEncryptionMigration(accessToken) || needsEncryptionMigration(webhookToken),
  }
}
