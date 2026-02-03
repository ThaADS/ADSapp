/**
 * Instagram Integration Module
 * Purpose: Export all Instagram DM integration functionality
 * Date: 2026-01-28
 */

// Client and OAuth
export {
  buildInstagramAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getConnectedPages,
  getInstagramBusinessAccount,
  saveInstagramConnection,
  getInstagramConnection,
  getInstagramConnectionByUserId,
  disconnectInstagram,
  sendInstagramMessage,
  getInstagramConversations,
  getConversationMessages,
  getRateLimitInfo,
  subscribeToWebhooks,
  refreshAccessToken,
  encryptAccessToken,
  decryptAccessToken,
  INSTAGRAM_SCOPES
} from './client'

// Webhook Handler
export {
  verifyWebhookSignature,
  handleVerificationChallenge,
  processInstagramWebhook,
  type WebhookProcessingResult
} from './webhook-handler'

// Comment Automation
export {
  createCommentRule,
  getCommentRules,
  updateCommentRule,
  deleteCommentRule,
  processComment,
  processPendingDelayedDMs,
  getCommentRuleStats
} from './comment-automation'
