/**
 * Shopify Integration Module
 *
 * Exports all Shopify integration functionality
 */

// Client and OAuth
export {
  buildAuthorizationUrl,
  completeOAuthFlow,
  getIntegration,
  getIntegrationByShop,
  disconnectIntegration,
  generateOAuthState,
  verifyOAuthState,
  normalizeShopDomain,
  isValidShopDomain,
  shopifyAdminRequest,
  encryptAccessToken,
  decryptAccessToken,
} from './client'

// Webhook handling
export {
  processWebhook,
  verifyWebhookSignature,
  extractWebhookHeaders,
} from './webhook-handler'

// Product sync
export {
  syncProducts,
  syncAllProducts,
  getProducts,
  getProductById,
} from './product-sync'

// Cart recovery
export {
  processAbandonedCarts,
  sendCartRecoveryMessage,
  getAbandonedCarts,
  markCartAsAbandoned,
} from './cart-recovery'
