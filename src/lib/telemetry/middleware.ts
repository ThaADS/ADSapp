/**
 * Telemetry Middleware for API Routes
 *
 * Automatically instruments Next.js API routes with distributed tracing
 * and metrics collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { trace, context, SpanStatusCode } from '@opentelemetry/api'
import { getTracer, shouldSample } from './tracer'
import { recordHttpRequest, MetricAttributes } from './metrics'

export interface TelemetryOptions {
  /** Custom span name (defaults to endpoint path) */
  spanName?: string
  /** Additional span attributes */
  attributes?: Record<string, any>
  /** Skip tracing for this request */
  skip?: boolean
  /** Force sampling regardless of sampling rate */
  forceSample?: boolean
}

/**
 * Wrap API route handler with telemetry
 */
export function withTelemetry(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: TelemetryOptions = {}
) {
  return async (request: NextRequest, ctx?: any): Promise<NextResponse> => {
    const { pathname } = new URL(request.url)

    // Check if should skip tracing
    if (options.skip || (!options.forceSample && !shouldSample(pathname))) {
      return handler(request, ctx)
    }

    const tracer = getTracer()
    const spanName = options.spanName || `${request.method} ${pathname}`
    const startTime = Date.now()

    return tracer.startActiveSpan(
      spanName,
      {
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          'http.route': pathname,
          'http.user_agent': request.headers.get('user-agent') || 'unknown',
          'http.client_ip': getClientIP(request),
          ...options.attributes,
        },
      },
      async span => {
        try {
          // Add request context to span
          if (ctx?.user) {
            span.setAttribute('user.id', ctx.user.id)
          }
          if (ctx?.profile?.organization_id) {
            span.setAttribute('organization.id', ctx.profile.organization_id)
          }

          // Execute handler
          const response = await handler(request, ctx)

          // Record response details
          span.setAttribute('http.status_code', response.status)

          // Set span status based on HTTP status code
          if (response.status >= 400) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${response.status}`,
            })
          } else {
            span.setStatus({ code: SpanStatusCode.OK })
          }

          // Record metrics
          const duration = Date.now() - startTime
          const metricAttributes: MetricAttributes = {
            endpoint: pathname,
            method: request.method,
            statusCode: response.status,
            organizationId: ctx?.profile?.organization_id,
            userId: ctx?.user?.id,
          }
          recordHttpRequest(duration, metricAttributes)

          return response
        } catch (error) {
          // Record exception
          span.recordException(error as Error)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          })

          // Record error metrics
          const duration = Date.now() - startTime
          const metricAttributes: MetricAttributes = {
            endpoint: pathname,
            method: request.method,
            statusCode: 500,
            organizationId: ctx?.profile?.organization_id,
            userId: ctx?.user?.id,
            errorType: error instanceof Error ? error.name : 'UnknownError',
          }
          recordHttpRequest(duration, metricAttributes)

          throw error
        } finally {
          span.end()
        }
      }
    )
  }
}

/**
 * Create a custom span within an API route
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const tracer = getTracer()

  return tracer.startActiveSpan(name, { attributes }, async span => {
    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>) {
  const span = trace.getActiveSpan()
  if (span) {
    span.addEvent(name, attributes)
  }
}

/**
 * Set attributes on current span
 */
export function setSpanAttributes(attributes: Record<string, any>) {
  const span = trace.getActiveSpan()
  if (span) {
    span.setAttributes(attributes)
  }
}

/**
 * Record exception in current span
 */
export function recordSpanException(error: Error) {
  const span = trace.getActiveSpan()
  if (span) {
    span.recordException(error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    })
  }
}

/**
 * Get current trace ID for correlation
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan()
  if (span) {
    const spanContext = span.spanContext()
    return spanContext.traceId
  }
  return undefined
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cf = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return real || cf || 'unknown'
}

/**
 * Trace database queries
 */
export async function traceDbQuery<T>(
  operation: string,
  tableName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(`db.query.${operation}`, fn, {
    'db.system': 'postgresql',
    'db.name': 'supabase',
    'db.operation': operation,
    'db.table': tableName,
    ...attributes,
  })
}

/**
 * Trace external API calls
 */
export async function traceExternalCall<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(`external.${service}.${operation}`, fn, {
    'external.service': service,
    'external.operation': operation,
    ...attributes,
  })
}

/**
 * Trace WhatsApp API calls
 */
export async function traceWhatsAppCall<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return traceExternalCall('whatsapp', operation, fn, attributes)
}

/**
 * Trace Stripe API calls
 */
export async function traceStripeCall<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return traceExternalCall('stripe', operation, fn, attributes)
}

/**
 * Trace queue job processing
 */
export async function traceQueueJob<T>(
  jobName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(`queue.job.${jobName}`, fn, {
    'queue.job_name': jobName,
    ...attributes,
  })
}

/**
 * Trace automation workflow execution
 */
export async function traceAutomation<T>(
  workflowName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return withSpan(`automation.workflow.${workflowName}`, fn, {
    'automation.workflow': workflowName,
    ...attributes,
  })
}
