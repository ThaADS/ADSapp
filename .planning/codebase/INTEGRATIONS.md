# External Integrations

**Generated:** 2026-01-21

## Overview

ADSapp integrates with multiple external services for messaging, payments, authentication, and observability.

## WhatsApp Business Cloud API

**Location:** `src/lib/whatsapp/`

### Components
| File | Purpose |
|------|---------|
| `enhanced-client.ts` | Full-featured WhatsApp client |
| `service.ts` | Core messaging service |
| `media-handler.ts` | Media upload/download |
| `bulk-messaging.ts` | Broadcast campaigns |
| `drip-campaigns.ts` | Automated sequences |
| `webhooks.ts` | Incoming message handler |

### Configuration
```env
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
```

### Webhook Endpoint
- **Route:** `src/app/api/webhooks/whatsapp/route.ts`
- **Validation:** `src/lib/middleware/whatsapp-webhook-validator.ts`
- Handles: messages, status updates, delivery receipts

## Stripe Payments

**Location:** `src/lib/stripe/`, `src/lib/billing/`

### Components
| File | Purpose |
|------|---------|
| `payment-links.ts` | Payment link generation |
| `src/lib/billing/stripe.ts` | Core Stripe client |
| `src/lib/billing/usage.ts` | Usage-based billing |

### Configuration
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook Endpoint
- **Route:** `src/app/api/webhooks/stripe/route.ts`
- Handles: checkout.session.completed, invoice.paid, subscription events

### Features
- Subscription plans
- Usage-based billing
- Payment links integration with WhatsApp

## Supabase (Database & Auth)

**Location:** `src/lib/supabase/`

### Components
| File | Purpose |
|------|---------|
| `server.ts` | Server-side client with RLS |
| `client.ts` | Browser client |
| `middleware.ts` | Session management |
| `rpc-functions.ts` | Secure database functions |

### Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Security Features
- Row Level Security (RLS) on all tenant tables
- Service role client for admin operations only
- Input validation via `QueryValidators`

## Email (Resend)

**Location:** `src/lib/email/`

### Configuration
```env
RESEND_API_KEY=re_...
```

### Usage
- Transactional emails
- Email verification
- Password reset
- Notification emails

## AI/LLM (OpenRouter)

**Location:** `src/lib/ai/`

### Components
| File | Purpose |
|------|---------|
| `openrouter.ts` | Multi-model AI client |
| `drafts.ts` | Message draft generation |
| `sentiment.ts` | Sentiment analysis |
| `auto-response.ts` | Automated responses |

### Configuration
```env
OPENROUTER_API_KEY=sk-or-...
```

### Features
- Multiple LLM model support
- Auto-responses
- Message drafting
- Sentiment analysis

## CRM Integrations

**Location:** `src/lib/crm/`

### Supported CRMs
| CRM | Status | Files |
|-----|--------|-------|
| Salesforce | Implemented | `sync-manager.ts` |
| HubSpot | Implemented | `sync-manager.ts` |
| Pipedrive | Implemented | `sync-manager.ts` |

### Webhook Route
- **Route:** `src/app/api/crm/webhooks/route.ts`
- **Sync Route:** `src/app/api/crm/sync/route.ts`

## SSO Authentication

**Location:** `src/lib/auth/sso/`

### SAML 2.0
| File | Purpose |
|------|---------|
| `saml.ts` | SAML authentication handler |
| Uses `@boxyhq/saml-jackson` for SAML processing |

### OAuth 2.0/OIDC
| File | Purpose |
|------|---------|
| `oauth.ts` | OAuth/OIDC handler |
| Uses `openid-client` for OIDC flows |

### Features
- Enterprise SSO support
- Identity provider integration
- Token management

## Redis (Caching & Queues)

**Location:** Various files

### Usage
| Purpose | Package |
|---------|---------|
| Serverless caching | `@upstash/redis` |
| Persistent caching | `ioredis` |
| Job queues | `bullmq` |

### Configuration
```env
REDIS_URL=redis://...
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

## Observability

### OpenTelemetry
- Distributed tracing
- Metrics collection
- Jaeger export

### Sentry
- Error tracking
- Performance monitoring
- `@sentry/nextjs` integration

## AWS KMS

**Location:** `src/lib/security/encryption.ts`

### Usage
- Field-level encryption
- Key management
- Secure credential storage

### Configuration
```env
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
KMS_KEY_ID=...
```

## Integration Patterns

### Webhook Processing
```typescript
// Pattern: Validate → Parse → Process → Respond
export async function POST(request: Request) {
  // 1. Validate webhook signature
  const isValid = await validateSignature(request)
  if (!isValid) return Response.json({ error: 'Invalid' }, { status: 401 })

  // 2. Parse payload
  const payload = await request.json()

  // 3. Process asynchronously (queue)
  await queue.add('process-webhook', payload)

  // 4. Return quickly
  return Response.json({ received: true })
}
```

### External API Calls
```typescript
// Pattern: Retry with exponential backoff
async function callExternalAPI() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api.call()
    } catch (error) {
      if (attempt === 2) throw error
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
}
```

---
*Integrations mapped: 2026-01-21*
