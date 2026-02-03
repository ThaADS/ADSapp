/**
 * Facebook Messenger Integration Module
 * Purpose: Exports for Facebook Messenger integration
 * Date: 2026-01-28
 */

// Client exports
export {
  // OAuth
  buildFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getPageAccessToken,

  // Page discovery
  getOwnedPages,

  // Connection management
  saveFacebookConnection,
  getFacebookConnection,
  getFacebookConnectionByPageId,
  disconnectFacebook,

  // Messaging
  sendFacebookMessage,
  sendTextMessage,
  sendQuickReplyMessage,
  sendTemplateMessage,
  sendTypingIndicator,

  // User profile
  getUserProfile,

  // Handover protocol
  passThreadControl,
  takeThreadControl,
  getThreadOwner,

  // Webhooks
  subscribeToWebhooks,

  // Token management
  refreshAccessToken,
  encryptAccessToken,
  decryptAccessToken,

  // Constants
  FACEBOOK_MESSENGER_SCOPES
} from './client'

// Webhook handler exports
export {
  verifyWebhookSignature,
  handleVerificationChallenge,
  processFacebookWebhook,
  type WebhookProcessingResult
} from './webhook-handler'
