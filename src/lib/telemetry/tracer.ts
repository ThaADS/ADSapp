/**
 * OpenTelemetry Tracer Configuration
 *
 * Initializes distributed tracing with OpenTelemetry SDK for monitoring
 * API requests, database queries, and external service calls.
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api'

let sdk: NodeSDK | null = null

/**
 * Initialize OpenTelemetry tracer
 */
export async function initializeTracer() {
  // Prevent double initialization
  if (sdk) {
    return
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'adsapp-whatsapp-inbox'
  const serviceVersion = process.env.npm_package_version || '0.1.0'
  const environment = process.env.NODE_ENV || 'development'

  // Configure resource attributes
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    environment,
    deployment: process.env.VERCEL_ENV || 'local',
  })

  // Configure trace exporter based on environment
  const traceExporter = getTraceExporter()

  // Configure SDK
  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Fine-tune instrumentations
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: req => {
            // Ignore health check and static file requests
            const url = req.url || ''
            return url.includes('/_next/') || url.includes('/favicon.ico') || url === '/api/health'
          },
          requestHook: (span, request) => {
            // Add custom attributes to HTTP spans
            span.setAttribute('http.client_ip', getClientIP(request))
          },
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable to reduce noise
        },
      }),
    ],
    // Configure metric reader for production
    metricReader:
      process.env.NODE_ENV === 'production'
        ? new PeriodicExportingMetricReader({
            exporter: traceExporter as any,
            exportIntervalMillis: 60000, // Export every minute
          })
        : undefined,
  })

  // Start SDK
  try {
    await sdk.start()
    console.log('✅ OpenTelemetry tracing initialized')
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error)
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await sdk?.shutdown()
      console.log('OpenTelemetry SDK shut down successfully')
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK:', error)
    }
  })
}

/**
 * Get trace exporter based on environment
 */
function getTraceExporter() {
  // Production: Use OTLP HTTP exporter (DataDog, New Relic, etc.)
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    })
  }

  // Development: Use Jaeger exporter
  if (process.env.JAEGER_ENDPOINT) {
    return new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT,
    })
  }

  // Default: Use Jaeger with default settings (localhost:14268)
  return new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  })
}

/**
 * Get tracer instance for manual instrumentation
 */
export function getTracer() {
  return trace.getTracer('adsapp-whatsapp-inbox', '0.1.0')
}

/**
 * Create a new span manually
 */
export function createSpan(name: string, attributes?: Record<string, any>) {
  const tracer = getTracer()
  return tracer.startSpan(name, {
    attributes,
  })
}

/**
 * Execute function within a traced span
 */
export async function traceAsync<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const tracer = getTracer()
  return tracer.startActiveSpan(spanName, { attributes }, async span => {
    try {
      const result = await fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Execute synchronous function within a traced span
 */
export function traceSync<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, any>
): T {
  const tracer = getTracer()
  return tracer.startActiveSpan(spanName, { attributes }, span => {
    try {
      const result = fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.recordException(error as Error)
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
 * Get client IP from request
 */
function getClientIP(request: any): string {
  const headers = request.headers
  const forwarded = headers['x-forwarded-for']
  const real = headers['x-real-ip']
  const cf = headers['cf-connecting-ip']

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return real || cf || 'unknown'
}

/**
 * Sampling configuration
 */
export const SAMPLING_CONFIG = {
  // Sample 100% in development
  development: 1.0,
  // Sample 10% in production to reduce costs
  production: parseFloat(process.env.OTEL_SAMPLING_RATE || '0.1'),
  // Always sample critical endpoints
  critical: 1.0,
}

/**
 * Check if request should be sampled
 */
export function shouldSample(url: string): boolean {
  const environment = process.env.NODE_ENV || 'development'

  // Always sample critical endpoints
  const criticalEndpoints = ['/api/webhooks/', '/api/billing/', '/api/auth/']

  if (criticalEndpoints.some(endpoint => url.includes(endpoint))) {
    return true
  }

  // Use configured sampling rate
  const samplingRate =
    SAMPLING_CONFIG[environment as keyof typeof SAMPLING_CONFIG] || SAMPLING_CONFIG.production
  return Math.random() < samplingRate
}
