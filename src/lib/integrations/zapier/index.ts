/**
 * Zapier Integration Module
 *
 * Exports all Zapier integration components:
 * - OAuth provider functions
 * - Token management
 * - Rate limiting
 * - Authentication middleware
 * - Combined middleware wrapper
 */

// =====================================================
// Token Manager
// =====================================================

export {
  generateSecureToken,
  hashToken,
  generateAccessToken,
  verifyAccessToken,
  isTokenRevoked,
  generateRefreshToken,
  generateAuthorizationCode,
  verifyCodeChallenge,
  verifyClientSecret,
  hashClientSecret,
} from './token-manager'

// =====================================================
// Rate Limiter
// =====================================================

export {
  RATE_LIMITS,
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitType,
  type RateLimitResult,
} from './rate-limiter'

// =====================================================
// Auth Middleware
// =====================================================

export {
  validateBearerToken,
  requireScopes,
  createUnauthorizedResponse,
  createForbiddenResponse,
  type AuthResult,
} from './auth-middleware'

// =====================================================
// Combined Middleware
// =====================================================

export {
  withZapierMiddleware,
  createSuccessResponse,
  createErrorResponse,
  getClientIP,
  type ZapierContext,
  type ZapierMiddlewareOptions,
  type ZapierHandler,
} from './middleware'

// =====================================================
// Webhook Service
// =====================================================

export {
  WebhookService,
  webhookService,
  deliverWebhook,
  processRetries,
} from './webhook-service'

// =====================================================
// Event Emitter
// =====================================================

export {
  emitZapierEvent,
  emitMessageReceived,
  emitContactCreated,
  emitContactUpdated,
  ZapierEventEmitter,
} from './event-emitter'
