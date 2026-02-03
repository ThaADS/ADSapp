/**
 * SMS Integration Module
 * Exports for Twilio SMS integration
 * Date: 2026-01-28
 */

// Client exports
export {
  encryptToken,
  decryptToken,
  validateTwilioSignature,
  verifyTwilioCredentials,
  listPhoneNumbers,
  getPhoneNumber,
  configurePhoneNumberWebhooks,
  sendSMS,
  getMessage,
  getMessageMedia,
  isFinalStatus,
  isDeliverySuccess,
  isDeliveryFailure,
  lookupPhoneNumber,
  listMessagingServices,
  sendBulkSMS,
  TwilioSendError,
} from './client'

// Webhook handler exports
export {
  processIncomingSMS,
  processSMSStatusCallback,
  generateEmptyTwiML,
  generateTwiMLResponse,
} from './webhook-handler'
