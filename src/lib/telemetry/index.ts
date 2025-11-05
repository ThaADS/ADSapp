/**
 * Telemetry Module Index
 *
 * Export all telemetry utilities for easy import
 */

// Core tracer
export {
  initializeTracer,
  getTracer,
  createSpan,
  traceAsync,
  traceSync,
  addSpanEvent,
  setSpanAttributes,
  recordSpanException,
  shouldSample,
  SAMPLING_CONFIG,
} from './tracer'

// Metrics
export {
  recordHttpRequest,
  recordDatabaseQuery,
  recordDatabaseError,
  recordWhatsAppMessage,
  recordWhatsAppApiCall,
  recordWhatsAppError,
  recordQueueJob,
  recordCacheOperation,
  recordBusinessEvent,
  recordAuthEvent,
  recordRbacEvent,
  getCacheHitRate,
  getPerformancePercentiles,
  type MetricAttributes,
  type PerformancePercentiles,
} from './metrics'

// Middleware
export {
  withTelemetry,
  withSpan,
  getCurrentTraceId,
  traceDbQuery,
  traceExternalCall,
  traceWhatsAppCall,
  traceStripeCall,
  traceQueueJob,
  traceAutomation,
  type TelemetryOptions,
} from './middleware'

// Database tracing
export {
  createTracedSupabaseClient,
  traceQuery,
} from './database'

// External API tracing
export {
  traceSendWhatsAppMessage,
  traceWhatsAppWebhook,
  traceWhatsAppMediaDownload,
  traceStripeCheckout,
  traceStripeSubscription,
  traceStripeWebhook,
  traceStripePayment,
  traceExternalApiCall,
} from './external'

// Custom spans
export {
  traceConversationOperation,
  traceContactOperation,
  traceTemplateUsage,
  traceAutomationExecution,
  traceBulkOperation,
  traceExport,
  traceImport,
  traceWebhookProcessing,
  traceAnalytics,
  traceCacheOperation,
  addBusinessContext,
} from './spans'
