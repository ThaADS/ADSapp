/**
 * OpenTelemetry Metrics Collection
 *
 * Custom metrics for business and technical monitoring
 */

import { metrics, Histogram, Counter, ObservableGauge } from '@opentelemetry/api'

const meter = metrics.getMeter('adsapp-metrics', '0.1.0')

/**
 * HTTP Request Metrics
 */
export const httpRequestDuration = meter.createHistogram('http.request.duration', {
  description: 'Duration of HTTP requests in milliseconds',
  unit: 'ms',
})

export const httpRequestCount = meter.createCounter('http.request.count', {
  description: 'Total number of HTTP requests',
  unit: '1',
})

export const httpRequestErrors = meter.createCounter('http.request.errors', {
  description: 'Total number of HTTP request errors',
  unit: '1',
})

/**
 * Database Query Metrics
 */
export const dbQueryDuration = meter.createHistogram('db.query.duration', {
  description: 'Duration of database queries in milliseconds',
  unit: 'ms',
})

export const dbQueryCount = meter.createCounter('db.query.count', {
  description: 'Total number of database queries',
  unit: '1',
})

export const dbQueryErrors = meter.createCounter('db.query.errors', {
  description: 'Total number of database query errors',
  unit: '1',
})

export const dbConnectionPoolSize = meter.createObservableGauge('db.connection.pool.size', {
  description: 'Current database connection pool size',
  unit: '1',
})

/**
 * WhatsApp API Metrics
 */
export const whatsappMessagesSent = meter.createCounter('whatsapp.messages.sent', {
  description: 'Total number of WhatsApp messages sent',
  unit: '1',
})

export const whatsappMessagesReceived = meter.createCounter('whatsapp.messages.received', {
  description: 'Total number of WhatsApp messages received',
  unit: '1',
})

export const whatsappApiCallDuration = meter.createHistogram('whatsapp.api.call.duration', {
  description: 'Duration of WhatsApp API calls in milliseconds',
  unit: 'ms',
})

export const whatsappApiErrors = meter.createCounter('whatsapp.api.errors', {
  description: 'Total number of WhatsApp API errors',
  unit: '1',
})

export const whatsappWebhookEvents = meter.createCounter('whatsapp.webhook.events', {
  description: 'Total number of WhatsApp webhook events received',
  unit: '1',
})

/**
 * Stripe/Billing Metrics
 */
export const stripeBillingEvents = meter.createCounter('stripe.billing.events', {
  description: 'Total number of Stripe billing events',
  unit: '1',
})

export const stripeApiCallDuration = meter.createHistogram('stripe.api.call.duration', {
  description: 'Duration of Stripe API calls in milliseconds',
  unit: 'ms',
})

export const stripeWebhookEvents = meter.createCounter('stripe.webhook.events', {
  description: 'Total number of Stripe webhook events received',
  unit: '1',
})

/**
 * Queue Processing Metrics
 */
export const queueJobsEnqueued = meter.createCounter('queue.jobs.enqueued', {
  description: 'Total number of jobs enqueued',
  unit: '1',
})

export const queueJobsProcessed = meter.createCounter('queue.jobs.processed', {
  description: 'Total number of jobs processed',
  unit: '1',
})

export const queueJobsFailed = meter.createCounter('queue.jobs.failed', {
  description: 'Total number of jobs that failed',
  unit: '1',
})

export const queueJobDuration = meter.createHistogram('queue.job.duration', {
  description: 'Duration of queue job processing in milliseconds',
  unit: 'ms',
})

export const queueSize = meter.createObservableGauge('queue.size', {
  description: 'Current queue size',
  unit: '1',
})

/**
 * Cache Metrics
 */
export const cacheHits = meter.createCounter('cache.hits', {
  description: 'Total number of cache hits',
  unit: '1',
})

export const cacheMisses = meter.createCounter('cache.misses', {
  description: 'Total number of cache misses',
  unit: '1',
})

export const cacheOperationDuration = meter.createHistogram('cache.operation.duration', {
  description: 'Duration of cache operations in milliseconds',
  unit: 'ms',
})

/**
 * Business Metrics
 */
export const conversationsCreated = meter.createCounter('business.conversations.created', {
  description: 'Total number of conversations created',
  unit: '1',
})

export const conversationsClosed = meter.createCounter('business.conversations.closed', {
  description: 'Total number of conversations closed',
  unit: '1',
})

export const conversationResponseTime = meter.createHistogram('business.conversation.response_time', {
  description: 'Time to first response in conversations (seconds)',
  unit: 's',
})

export const activeConversations = meter.createObservableGauge('business.conversations.active', {
  description: 'Current number of active conversations',
  unit: '1',
})

export const contactsCreated = meter.createCounter('business.contacts.created', {
  description: 'Total number of contacts created',
  unit: '1',
})

export const templatesUsed = meter.createCounter('business.templates.used', {
  description: 'Total number of templates used',
  unit: '1',
})

export const automationRulesTriggered = meter.createCounter('business.automation.rules_triggered', {
  description: 'Total number of automation rules triggered',
  unit: '1',
})

/**
 * Authentication Metrics
 */
export const authLoginAttempts = meter.createCounter('auth.login.attempts', {
  description: 'Total number of login attempts',
  unit: '1',
})

export const authLoginSuccess = meter.createCounter('auth.login.success', {
  description: 'Total number of successful logins',
  unit: '1',
})

export const authLoginFailures = meter.createCounter('auth.login.failures', {
  description: 'Total number of failed login attempts',
  unit: '1',
})

export const authMfaVerifications = meter.createCounter('auth.mfa.verifications', {
  description: 'Total number of MFA verifications',
  unit: '1',
})

export const authSessionsDuration = meter.createHistogram('auth.session.duration', {
  description: 'Duration of user sessions in minutes',
  unit: 'min',
})

/**
 * RBAC Metrics
 */
export const rbacPermissionChecks = meter.createCounter('rbac.permission.checks', {
  description: 'Total number of permission checks',
  unit: '1',
})

export const rbacPermissionDenied = meter.createCounter('rbac.permission.denied', {
  description: 'Total number of permission denials',
  unit: '1',
})

export const rbacRoleChanges = meter.createCounter('rbac.role.changes', {
  description: 'Total number of role changes',
  unit: '1',
})

/**
 * Helper Functions for Recording Metrics
 */

export interface MetricAttributes {
  endpoint?: string
  method?: string
  statusCode?: number
  organizationId?: string
  userId?: string
  errorType?: string
  queueName?: string
  jobType?: string
  cacheKey?: string
  [key: string]: string | number | boolean | undefined
}

export function recordHttpRequest(duration: number, attributes: MetricAttributes) {
  httpRequestDuration.record(duration, attributes)
  httpRequestCount.add(1, attributes)

  if (attributes.statusCode && attributes.statusCode >= 400) {
    httpRequestErrors.add(1, attributes)
  }
}

export function recordDatabaseQuery(duration: number, attributes: MetricAttributes) {
  dbQueryDuration.record(duration, attributes)
  dbQueryCount.add(1, attributes)
}

export function recordDatabaseError(attributes: MetricAttributes) {
  dbQueryErrors.add(1, attributes)
}

export function recordWhatsAppMessage(type: 'sent' | 'received', attributes: MetricAttributes) {
  if (type === 'sent') {
    whatsappMessagesSent.add(1, attributes)
  } else {
    whatsappMessagesReceived.add(1, attributes)
  }
}

export function recordWhatsAppApiCall(duration: number, attributes: MetricAttributes) {
  whatsappApiCallDuration.record(duration, attributes)
}

export function recordWhatsAppError(attributes: MetricAttributes) {
  whatsappApiErrors.add(1, attributes)
}

export function recordQueueJob(
  operation: 'enqueued' | 'processed' | 'failed',
  attributes: MetricAttributes,
  duration?: number
) {
  switch (operation) {
    case 'enqueued':
      queueJobsEnqueued.add(1, attributes)
      break
    case 'processed':
      queueJobsProcessed.add(1, attributes)
      if (duration) {
        queueJobDuration.record(duration, attributes)
      }
      break
    case 'failed':
      queueJobsFailed.add(1, attributes)
      break
  }
}

export function recordCacheOperation(
  operation: 'hit' | 'miss',
  duration: number,
  attributes: MetricAttributes
) {
  if (operation === 'hit') {
    cacheHits.add(1, attributes)
  } else {
    cacheMisses.add(1, attributes)
  }
  cacheOperationDuration.record(duration, attributes)
}

export function recordBusinessEvent(
  event: 'conversation_created' | 'conversation_closed' | 'contact_created' | 'template_used' | 'automation_triggered',
  attributes: MetricAttributes
) {
  switch (event) {
    case 'conversation_created':
      conversationsCreated.add(1, attributes)
      break
    case 'conversation_closed':
      conversationsClosed.add(1, attributes)
      break
    case 'contact_created':
      contactsCreated.add(1, attributes)
      break
    case 'template_used':
      templatesUsed.add(1, attributes)
      break
    case 'automation_triggered':
      automationRulesTriggered.add(1, attributes)
      break
  }
}

export function recordAuthEvent(
  event: 'login_attempt' | 'login_success' | 'login_failure' | 'mfa_verification',
  attributes: MetricAttributes
) {
  switch (event) {
    case 'login_attempt':
      authLoginAttempts.add(1, attributes)
      break
    case 'login_success':
      authLoginSuccess.add(1, attributes)
      break
    case 'login_failure':
      authLoginFailures.add(1, attributes)
      break
    case 'mfa_verification':
      authMfaVerifications.add(1, attributes)
      break
  }
}

export function recordRbacEvent(
  event: 'permission_check' | 'permission_denied' | 'role_change',
  attributes: MetricAttributes
) {
  switch (event) {
    case 'permission_check':
      rbacPermissionChecks.add(1, attributes)
      break
    case 'permission_denied':
      rbacPermissionDenied.add(1, attributes)
      break
    case 'role_change':
      rbacRoleChanges.add(1, attributes)
      break
  }
}

/**
 * Calculate cache hit rate
 */
export async function getCacheHitRate(): Promise<number> {
  // This would typically be calculated from metrics backend
  // For now, return a placeholder that can be implemented
  return 0
}

/**
 * Get current performance percentiles
 */
export interface PerformancePercentiles {
  p50: number
  p95: number
  p99: number
}

export async function getPerformancePercentiles(): Promise<PerformancePercentiles> {
  // This would typically be calculated from metrics backend
  // For now, return placeholders
  return {
    p50: 0,
    p95: 0,
    p99: 0,
  }
}
