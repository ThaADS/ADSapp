# Distributed Tracing Guide

## Overview

ADSapp uses OpenTelemetry for distributed tracing, providing end-to-end visibility into request flows, database queries, external API calls, and business operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenTelemetry SDK                        │
├─────────────────────────────────────────────────────────────┤
│  Auto-Instrumentation  │  Manual Instrumentation           │
│  - HTTP Requests        │  - Business Logic                 │
│  - Database Queries     │  - WhatsApp API                   │
│  - Redis Operations     │  - Stripe API                     │
│                         │  - Queue Jobs                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Trace Exporters     │
                ├───────────────────────┤
                │ • Jaeger (Dev)        │
                │ • OTLP (Production)   │
                │ • DataDog/New Relic   │
                └───────────────────────┘
```

## Setup

### Environment Variables

```bash
# OpenTelemetry Configuration
OTEL_SERVICE_NAME=adsapp-whatsapp-inbox
OTEL_SAMPLING_RATE=0.1  # 10% sampling in production

# Development: Jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Production: OTLP (DataDog, New Relic, etc.)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.com/v1/traces
OTEL_EXPORTER_OTLP_HEADERS={"api-key":"your-api-key"}
```

### Local Development with Jaeger

Start Jaeger using Docker:

```bash
docker run -d --name jaeger \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Access Jaeger UI at: http://localhost:16686

## Usage

### Automatic Instrumentation

HTTP requests, database queries, and Express middleware are automatically instrumented. No code changes required.

### Manual Instrumentation

#### API Routes

```typescript
import { withTelemetry } from '@/lib/telemetry'

async function handler(request: NextRequest, context: any) {
  // Your handler logic
  return NextResponse.json({ success: true })
}

export const GET = withTelemetry(handler, {
  spanName: 'GET /api/conversations',
  attributes: {
    'api.version': 'v1',
  },
})
```

#### Business Operations

```typescript
import { traceConversationOperation } from '@/lib/telemetry'

const conversation = await traceConversationOperation(
  'create',
  conversationId,
  async () => {
    return await supabase.from('conversations').insert(data).single()
  },
  {
    'conversation.type': 'support',
    'organization.id': organizationId,
  }
)
```

#### Database Queries

```typescript
import { traceDbQuery } from '@/lib/telemetry'

const users = await traceDbQuery('select', 'profiles', async () => {
  return await supabase.from('profiles').select('*')
})
```

#### External API Calls

**WhatsApp:**

```typescript
import { traceSendWhatsAppMessage } from '@/lib/telemetry'

const result = await traceSendWhatsAppMessage(
  recipientPhone,
  async () => {
    return await whatsappClient.sendMessage({
      to: recipientPhone,
      body: message,
    })
  },
  organizationId
)
```

**Stripe:**

```typescript
import { traceStripeCheckout } from '@/lib/telemetry'

const session = await traceStripeCheckout(
  priceId,
  async () => {
    return await stripe.checkout.sessions.create({
      price: priceId,
      // ... other options
    })
  },
  organizationId
)
```

#### Queue Jobs

```typescript
import { traceQueueJob } from '@/lib/telemetry'

await traceQueueJob(
  'bulk-message-send',
  async () => {
    // Process bulk message job
    return await processBulkMessages(jobData)
  },
  {
    'queue.name': 'bulk-messages',
    'job.id': jobId,
  }
)
```

### Custom Spans

```typescript
import { withSpan, addSpanEvent, setSpanAttributes } from '@/lib/telemetry'

const result = await withSpan(
  'process-automation-workflow',
  async () => {
    addSpanEvent('workflow-started', { workflowId })

    // Step 1
    const conditions = await evaluateConditions()
    setSpanAttributes({ 'conditions.matched': conditions.length })

    // Step 2
    const actions = await executeActions()
    addSpanEvent('actions-executed', { count: actions.length })

    return { success: true, actions }
  },
  {
    'workflow.id': workflowId,
    'workflow.type': 'auto-reply',
  }
)
```

## Metrics

### Available Metrics

**HTTP Metrics:**

- `http.request.duration` - Request latency histogram
- `http.request.count` - Total requests counter
- `http.request.errors` - Error count

**Database Metrics:**

- `db.query.duration` - Query latency histogram
- `db.query.count` - Total queries counter
- `db.query.errors` - Query error count

**WhatsApp Metrics:**

- `whatsapp.messages.sent` - Messages sent counter
- `whatsapp.messages.received` - Messages received counter
- `whatsapp.api.call.duration` - API call latency
- `whatsapp.api.errors` - API error count

**Queue Metrics:**

- `queue.jobs.enqueued` - Jobs enqueued counter
- `queue.jobs.processed` - Jobs processed counter
- `queue.jobs.failed` - Failed jobs counter
- `queue.job.duration` - Job processing latency

**Business Metrics:**

- `business.conversations.created` - Conversations created
- `business.conversations.closed` - Conversations closed
- `business.contacts.created` - Contacts created
- `business.templates.used` - Templates used
- `business.automation.rules_triggered` - Automation triggers

### Recording Custom Metrics

```typescript
import { recordBusinessEvent } from '@/lib/telemetry'

// Record a business event
recordBusinessEvent('conversation_created', {
  conversationId: conversation.id,
  organizationId: conversation.organization_id,
  type: 'support',
})
```

## Trace Context Propagation

Trace context is automatically propagated through:

- HTTP headers (`traceparent`, `tracestate`)
- Database connections (tags)
- Queue jobs (metadata)
- External API calls (headers)

### Get Current Trace ID

```typescript
import { getCurrentTraceId } from '@/lib/telemetry'

const traceId = getCurrentTraceId()
console.log('Current trace:', traceId)

// Include in logs for correlation
logger.info('Processing request', { traceId })
```

## Sampling

### Sampling Rates

- **Development:** 100% (all traces)
- **Production:** 10% (configurable via `OTEL_SAMPLING_RATE`)
- **Critical Endpoints:** 100% (always sampled)

### Critical Endpoints (Always Sampled)

- `/api/webhooks/*`
- `/api/billing/*`
- `/api/auth/*`

### Custom Sampling

```typescript
import { withTelemetry } from '@/lib/telemetry'

export const GET = withTelemetry(handler, {
  forceSample: true, // Always sample this endpoint
})
```

## Performance Impact

OpenTelemetry instrumentation overhead:

- **Average:** <5ms per request
- **Memory:** ~10-20MB
- **CPU:** <2% additional load

### Optimization Tips

1. **Use appropriate sampling rates** - Don't sample everything in production
2. **Batch span exports** - Default 5000ms interval
3. **Limit span attributes** - Only include essential data
4. **Filter noisy endpoints** - Exclude health checks, static files

## Troubleshooting

### No Traces Appearing

1. Check environment variables are set
2. Verify exporter endpoint is reachable
3. Check sampling rate (might be too low)
4. Look for initialization errors in logs

### High Memory Usage

1. Reduce sampling rate
2. Increase export interval
3. Limit span attribute size
4. Check for span leaks (not properly ended)

### Missing Spans

1. Ensure functions are properly wrapped
2. Check span is ended (use `withSpan` helper)
3. Verify context propagation
4. Check for exceptions breaking span chain

## Production Deployment

### DataDog Integration

```bash
# Environment variables
OTEL_EXPORTER_OTLP_ENDPOINT=https://http-intake.logs.datadoghq.com/v1/input
OTEL_EXPORTER_OTLP_HEADERS={"DD-API-KEY":"your-api-key"}
```

### New Relic Integration

```bash
# Environment variables
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4317
OTEL_EXPORTER_OTLP_HEADERS={"api-key":"your-license-key"}
```

### Custom Collector

For advanced configurations, deploy your own OpenTelemetry Collector:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  logging:
    loglevel: debug
  otlp:
    endpoint: your-backend:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging, otlp]
```

## Best Practices

1. **Name spans descriptively** - Use clear, hierarchical names
2. **Add relevant attributes** - Include business context
3. **Record exceptions** - Always record errors in spans
4. **Use semantic conventions** - Follow OpenTelemetry standards
5. **Add events for milestones** - Track important steps
6. **Keep spans focused** - Don't make spans too large
7. **End spans properly** - Use helpers to avoid leaks
8. **Sample intelligently** - Balance visibility and cost

## Metrics Endpoint

Access metrics via API:

```bash
GET /api/metrics
Authorization: Bearer <super_admin_token>

Response:
{
  "period": {
    "start": "2025-10-14T15:00:00Z",
    "end": "2025-10-14T16:00:00Z"
  },
  "performance": {
    "totalRequests": 1523,
    "p50Duration": 45,
    "p95Duration": 230,
    "p99Duration": 890,
    "avgDuration": 67
  },
  "errors": {
    "total": 12,
    "rate": 0.79
  },
  "endpoints": {
    "/api/conversations": {
      "count": 456,
      "avgDuration": 52,
      "errorRate": 0.44
    }
  }
}
```

## Support

For issues or questions:

- Check Jaeger UI for trace details
- Review application logs for errors
- Contact DevOps team for collector issues
- See OpenTelemetry docs: https://opentelemetry.io/docs/
