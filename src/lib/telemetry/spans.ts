/**
 * Custom Span Utilities
 *
 * Helper functions for creating custom spans for business logic
 */

import { withSpan, addSpanEvent, setSpanAttributes } from './middleware'
import { recordBusinessEvent, MetricAttributes } from './metrics'

/**
 * Trace conversation operations
 */
export async function traceConversationOperation<T>(
  operation: 'create' | 'update' | 'close' | 'assign',
  conversationId: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const result = await withSpan(
    `conversation.${operation}`,
    fn,
    {
      'conversation.id': conversationId,
      'conversation.operation': operation,
      ...attributes,
    }
  )

  // Record business metrics
  if (operation === 'create') {
    recordBusinessEvent('conversation_created', { conversationId })
  } else if (operation === 'close') {
    recordBusinessEvent('conversation_closed', { conversationId })
  }

  return result
}

/**
 * Trace contact operations
 */
export async function traceContactOperation<T>(
  operation: 'create' | 'update' | 'delete' | 'import',
  contactId: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const result = await withSpan(
    `contact.${operation}`,
    fn,
    {
      'contact.id': contactId,
      'contact.operation': operation,
      ...attributes,
    }
  )

  // Record business metrics
  if (operation === 'create') {
    recordBusinessEvent('contact_created', { contactId })
  }

  return result
}

/**
 * Trace template usage
 */
export async function traceTemplateUsage<T>(
  templateId: string,
  templateName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const result = await withSpan(
    'template.use',
    fn,
    {
      'template.id': templateId,
      'template.name': templateName,
      ...attributes,
    }
  )

  recordBusinessEvent('template_used', { templateId })

  return result
}

/**
 * Trace automation workflow execution
 */
export async function traceAutomationExecution<T>(
  workflowId: string,
  workflowName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const result = await withSpan(
    'automation.execute',
    fn,
    {
      'automation.id': workflowId,
      'automation.name': workflowName,
      ...attributes,
    }
  )

  recordBusinessEvent('automation_triggered', { workflowId })

  return result
}

/**
 * Trace bulk operations
 */
export async function traceBulkOperation<T>(
  operation: string,
  itemCount: number,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    `bulk.${operation}`,
    async () => {
      addSpanEvent('bulk_operation_started', { itemCount })

      const result = await fn()

      addSpanEvent('bulk_operation_completed', { itemCount })

      return result
    },
    {
      'bulk.operation': operation,
      'bulk.item_count': itemCount,
      ...attributes,
    }
  )
}

/**
 * Trace export operations
 */
export async function traceExport<T>(
  exportType: string,
  format: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    `export.${exportType}`,
    fn,
    {
      'export.type': exportType,
      'export.format': format,
      ...attributes,
    }
  )
}

/**
 * Trace import operations
 */
export async function traceImport<T>(
  importType: string,
  itemCount: number,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    `import.${importType}`,
    async () => {
      addSpanEvent('import_started', { itemCount })

      const result = await fn()

      addSpanEvent('import_completed', { itemCount })

      return result
    },
    {
      'import.type': importType,
      'import.item_count': itemCount,
      ...attributes,
    }
  )
}

/**
 * Trace webhook processing
 */
export async function traceWebhookProcessing<T>(
  source: string,
  eventType: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    `webhook.${source}`,
    fn,
    {
      'webhook.source': source,
      'webhook.event_type': eventType,
      ...attributes,
    }
  )
}

/**
 * Trace analytics computation
 */
export async function traceAnalytics<T>(
  metricName: string,
  timeRange: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    'analytics.compute',
    fn,
    {
      'analytics.metric': metricName,
      'analytics.time_range': timeRange,
      ...attributes,
    }
  )
}

/**
 * Trace cache operations
 */
export async function traceCacheOperation<T>(
  operation: 'get' | 'set' | 'delete' | 'invalidate',
  cacheKey: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(
    `cache.${operation}`,
    fn,
    {
      'cache.key': cacheKey,
      'cache.operation': operation,
      ...attributes,
    }
  )
}

/**
 * Add business context to current span
 */
export function addBusinessContext(context: {
  organizationId?: string
  userId?: string
  conversationId?: string
  contactId?: string
  [key: string]: string | number | boolean | undefined
}) {
  const attributes: Record<string, any> = {}

  if (context.organizationId) {
    attributes['organization.id'] = context.organizationId
  }
  if (context.userId) {
    attributes['user.id'] = context.userId
  }
  if (context.conversationId) {
    attributes['conversation.id'] = context.conversationId
  }
  if (context.contactId) {
    attributes['contact.id'] = context.contactId
  }

  // Add any other context attributes
  Object.entries(context).forEach(([key, value]) => {
    if (!['organizationId', 'userId', 'conversationId', 'contactId'].includes(key) && value !== undefined) {
      attributes[key] = value
    }
  })

  setSpanAttributes(attributes)
}
