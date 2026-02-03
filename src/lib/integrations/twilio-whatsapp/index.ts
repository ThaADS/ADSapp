/**
 * Twilio WhatsApp Integration
 * Re-exports all Twilio WhatsApp functionality
 * Date: 2026-02-03
 */

// Client exports
export {
  TwilioWhatsAppClient,
  validateTwilioSignature,
  getTwilioWhatsAppClient,
  saveTwilioWhatsAppCredentials,
  getAuthTokenForConnection,
  getConnectionByWhatsAppNumber,
  encryptToken,
  decryptToken,
} from './client'

// Type exports from client
export type {
  TwilioWhatsAppCredentials,
  TwilioWhatsAppMessage,
  TwilioMessageResponse,
} from './client'
