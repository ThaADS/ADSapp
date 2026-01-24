# Phase 10: Zapier Integration - Research Document

**Created:** 2026-01-24
**Phase:** 10 of 19 (v2.0 Feature Gap Implementation)
**Depends on:** Phase 8 (Foundation Layer) - COMPLETE

## Executive Summary

This document provides comprehensive research for implementing Zapier integration in ADSapp. The integration requires ADSapp to act as an **OAuth 2.0 Provider** (not consumer), implement REST Hook triggers for real-time webhooks, expose action APIs for Zapier to call, and comply with Zapier's publishing requirements.

**Key Insight:** Zapier acts as the OAuth client; ADSapp must implement authorization server endpoints, webhook subscription management, and rate-limited action APIs.

---

## Part 1: Zapier Partner Requirements

### 1.1 Zapier Developer Platform Overview

Zapier's Developer Platform allows third-party applications to integrate with 8,000+ apps. To create a public integration, ADSapp must:

1. **Register as a Zapier App** on [developer.zapier.com](https://developer.zapier.com)
2. **Implement OAuth 2.0 authentication** (Authorization Code grant)
3. **Create Triggers** (REST Hook or Polling)
4. **Create Actions** (Create/Update operations)
5. **Submit for Review** and meet publishing requirements

**Sources:**
- [Zapier Platform Documentation](https://docs.zapier.com/platform/build/oauth)
- [Zapier Integration Publishing Requirements](https://docs.zapier.com/platform/publish/integration-publishing-requirements)

### 1.2 Authentication Requirements

Zapier requires OAuth 2.0 with Authorization Code grant type:

| Requirement | Description |
|-------------|-------------|
| Authorization URL | Where users authenticate with ADSapp |
| Token URL | Where Zapier exchanges code for access token |
| Refresh Token URL | Optional but recommended for long-lived connections |
| Client ID & Secret | ADSapp generates these for Zapier |
| HTTPS Only | All endpoints must use HTTPS |
| State Parameter | Zapier generates; ADSapp must validate |

**Key Points:**
- Zapier does NOT generate Client ID/Secret - ADSapp must create these
- State parameter validation is mandatory and cannot be disabled
- PKCE support is optional but enhances security

### 1.3 Trigger Requirements

Zapier supports two trigger types:

| Type | Description | Latency | Public Apps |
|------|-------------|---------|-------------|
| **REST Hook** | Webhook-based, real-time | Instant | Required |
| **Polling** | API-based, periodic | 1-15 min | Allowed |

**For Public Integration:** REST Hook triggers are required. Static webhooks (where user manually enters webhook URL) are not accepted for public apps.

REST Hook Requirements:
- Subscribe endpoint: Creates webhook subscription when Zap is enabled
- Unsubscribe endpoint: Removes subscription when Zap is disabled
- Perform list endpoint: Returns sample data for Zap testing

### 1.4 Action Requirements

Actions allow Zapier to create or update data in ADSapp:

| Action Type | Description | HTTP Method |
|-------------|-------------|-------------|
| Create | Add new records | POST |
| Search | Find existing records | GET |
| Update | Modify existing records | PUT/PATCH |

**For ZAP-04:** We need three actions:
- `sendMessage` (Create)
- `createContact` (Create)
- `updateContact` (Update)

### 1.5 Publishing Requirements

To publish ADSapp on Zapier:

| Category | Requirements |
|----------|--------------|
| **Security** | HTTPS only, no hardcoded credentials, proper token handling |
| **Quality** | Fully tested, no unexpected errors, production API only |
| **Documentation** | Complete API docs, clear error messages |
| **Branding** | Cannot use "Zapier" in app name, proper trademark usage |
| **Testing** | Test account at `integration-testing@zapier.com` |
| **Support** | Admin team member from company domain |

**Partner Program Launch Requirements:**
- 10+ Zap templates created
- 50+ active users (can be waived if embedded in-product)

**Sources:**
- [Zapier Publishing Requirements](https://docs.zapier.com/platform/publish/integration-publishing-requirements)
- [Zapier Partner Program](https://zapier.com/developer-platform/partner-program)

---

## Part 2: OAuth 2.0 Provider Design

### 2.1 Architecture Overview

ADSapp must implement a complete OAuth 2.0 Authorization Server:

```
┌─────────────┐     ┌─────────────────────────────────────────────────┐
│   Zapier    │     │                    ADSapp                       │
│  (Client)   │     │                                                 │
│             │     │  ┌─────────────────┐  ┌──────────────────────┐  │
│             │────▶│  │  Authorization  │  │  Token Endpoint      │  │
│             │     │  │  Endpoint       │  │  /api/oauth/token    │  │
│             │     │  │  /api/oauth/    │  │                      │  │
│             │     │  │  authorize      │  │  - Issue tokens      │  │
│             │     │  │                 │  │  - Refresh tokens    │  │
│             │     │  │  - Consent UI   │  │  - Validate grants   │  │
│             │◀────│  │  - Auth code    │  │                      │  │
│             │     │  └─────────────────┘  └──────────────────────┘  │
│             │     │                                                 │
│             │     │  ┌─────────────────┐  ┌──────────────────────┐  │
│             │────▶│  │  API Endpoints  │  │  Token Validation    │  │
│             │     │  │  /api/zapier/*  │  │  Middleware          │  │
│             │◀────│  │                 │  │                      │  │
│             │     │  └─────────────────┘  └──────────────────────┘  │
└─────────────┘     └─────────────────────────────────────────────────┘
```

### 2.2 OAuth 2.0 Flow (Authorization Code Grant)

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Zapier  │         │   User   │         │ ADSapp   │         │ ADSapp   │
│  (Client)│         │ Browser  │         │   Auth   │         │  Token   │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │  1. User connects  │                    │                    │
     │    ADSapp in Zap   │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │  2. Redirect to    │                    │                    │
     │    /api/oauth/authorize                 │                    │
     │    ?client_id=...  │                    │                    │
     │    &redirect_uri=..│                    │                    │
     │    &response_type=code                  │                    │
     │    &state=...      │                    │                    │
     │───────────────────▶│───────────────────▶│                    │
     │                    │                    │                    │
     │                    │  3. Login page     │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │  4. User login     │                    │
     │                    │   + consent        │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │  5. Redirect to    │                    │
     │                    │    Zapier callback │                    │
     │                    │    ?code=...       │                    │
     │                    │    &state=...      │                    │
     │◀───────────────────│◀───────────────────│                    │
     │                    │                    │                    │
     │  6. POST /api/oauth/token               │                    │
     │    grant_type=authorization_code        │                    │
     │    code=...                             │                    │
     │    client_id=...                        │                    │
     │    client_secret=...                    │                    │
     │─────────────────────────────────────────────────────────────▶│
     │                                                              │
     │  7. Return access_token, refresh_token, expires_in          │
     │◀─────────────────────────────────────────────────────────────│
     │                    │                    │                    │
```

### 2.3 Token Design

| Token Type | Lifespan | Storage | Format |
|------------|----------|---------|--------|
| Authorization Code | 10 minutes | Database | Random UUID |
| Access Token | 1 hour | Database | JWT (signed) |
| Refresh Token | 30 days | Database | Random UUID + hash |

**Access Token JWT Claims:**
```json
{
  "sub": "user_uuid",
  "org": "organization_uuid",
  "scope": "messages:read messages:write contacts:read contacts:write",
  "iat": 1706140800,
  "exp": 1706144400,
  "iss": "adsapp",
  "aud": "zapier",
  "jti": "unique_token_id"
}
```

### 2.4 Token Refresh Strategy (ZAP-08)

**Proactive Refresh at 80% Expiration:**

For a 1-hour (3600s) access token:
- Token issued at T=0
- 80% expiration = 48 minutes (2880s)
- Refresh should occur between 48-60 minutes

**Implementation Options:**

1. **Client-side (Zapier handles):** Return `expires_in` in token response; Zapier auto-refreshes
2. **Server-side hint:** Include `refresh_before` timestamp in response
3. **Sliding window:** Extend token on each API call (not recommended for security)

**Recommendation:** Zapier handles refresh automatically if `refresh_token` is provided and `expires_in` is accurate.

### 2.5 Scope Definitions

| Scope | Description | Required For |
|-------|-------------|--------------|
| `messages:read` | Read message content and status | New message trigger |
| `messages:write` | Send messages | Send message action |
| `contacts:read` | Read contact information | New contact trigger |
| `contacts:write` | Create/update contacts | Create/update contact actions |
| `webhooks:manage` | Subscribe/unsubscribe webhooks | REST Hook triggers |

### 2.6 Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/oauth/authorize` | GET | Authorization page (consent UI) |
| `/api/oauth/token` | POST | Token issuance and refresh |
| `/api/oauth/revoke` | POST | Token revocation |
| `/api/oauth/clients` | POST | Create OAuth client (admin) |

---

## Part 3: Webhook Subscription System (REST Hooks)

### 3.1 REST Hook Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ADSapp                                      │
│                                                                         │
│  ┌───────────────┐     ┌────────────────┐     ┌────────────────────┐   │
│  │  Event Source │     │  Event Router  │     │  Webhook Dispatcher │   │
│  │               │────▶│                │────▶│                    │   │
│  │  - Messages   │     │  - Filter by   │     │  - HTTP POST to    │   │
│  │  - Contacts   │     │    event type  │     │    target_url      │   │
│  │  - Status     │     │  - Match subs  │     │  - Retry logic     │   │
│  │    changes    │     │    by org_id   │     │  - 410 handling    │   │
│  └───────────────┘     └────────────────┘     └────────────────────┘   │
│                                                        │                │
│                                                        ▼                │
│                               ┌────────────────────────────────────┐    │
│                               │   zapier_subscriptions table       │    │
│                               │                                    │    │
│                               │   - subscription_id                │    │
│                               │   - organization_id (RLS)          │    │
│                               │   - event_type                     │    │
│                               │   - target_url                     │    │
│                               │   - filters (tags, segments)       │    │
│                               │   - created_at                     │    │
│                               │   - active                         │    │
│                               └────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                                    ┌─────────┐
                                    │  Zapier │
                                    │ Webhook │
                                    │Receiver │
                                    └─────────┘
```

### 3.2 Subscribe/Unsubscribe Flow

**Subscribe (Zap Enabled):**
```
POST /api/zapier/hooks/subscribe
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "event": "new_message",
  "hookUrl": "https://hooks.zapier.com/hooks/standard/123456/abc...",
  "filters": {
    "tags": ["vip", "urgent"],
    "segments": ["active_customers"]
  }
}

Response 201:
{
  "id": "sub_uuid_123",
  "event": "new_message",
  "hookUrl": "https://hooks.zapier.com/...",
  "active": true,
  "createdAt": "2026-01-24T12:00:00Z"
}
```

**Unsubscribe (Zap Disabled):**
```
DELETE /api/zapier/hooks/{subscription_id}
Authorization: Bearer {access_token}

Response 204: No Content
```

### 3.3 Event Types (ZAP-02, ZAP-03)

| Event | Trigger Name | Payload |
|-------|--------------|---------|
| `message.received` | New Message Received | `{ message_id, contact_id, content, channel, timestamp }` |
| `message.status_changed` | Message Status Changed | `{ message_id, old_status, new_status, timestamp }` |
| `contact.created` | New Contact Created | `{ contact_id, name, phone, email, tags, created_at }` |
| `contact.updated` | Contact Updated | `{ contact_id, changes: {...}, updated_at }` |

### 3.4 Webhook Payload Format

```json
{
  "id": "evt_uuid_123",
  "event": "message.received",
  "timestamp": "2026-01-24T12:34:56Z",
  "organization_id": "org_uuid",
  "data": {
    "message_id": "msg_uuid",
    "conversation_id": "conv_uuid",
    "contact": {
      "id": "contact_uuid",
      "name": "John Doe",
      "phone": "+31612345678"
    },
    "content": {
      "type": "text",
      "text": "Hello, I have a question..."
    },
    "channel": "whatsapp",
    "received_at": "2026-01-24T12:34:55Z"
  }
}
```

### 3.5 Trigger Filtering (ZAP-06)

Users can filter triggers by:

**Tag Filtering:**
```json
{
  "filters": {
    "tags": {
      "operator": "any_of",  // or "all_of", "none_of"
      "values": ["vip", "high-priority"]
    }
  }
}
```

**Segment Filtering:**
```json
{
  "filters": {
    "segments": ["active_customers", "newsletter_subscribers"]
  }
}
```

**Implementation:** Apply filters during event routing, before sending webhook.

### 3.6 Webhook Reliability

**Delivery Requirements (ZAP-03):**
- Webhook sent within 5 seconds of event
- Retry on failure: 1s, 5s, 30s, 5m, 30m (then give up)
- Handle 410 responses: Remove subscription, stop retrying

**Retry Strategy:**
```typescript
const RETRY_DELAYS = [1000, 5000, 30000, 300000, 1800000]; // ms

async function deliverWebhook(subscription: Subscription, payload: object) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(subscription.target_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 410) {
        // Subscription no longer valid
        await deactivateSubscription(subscription.id);
        return;
      }

      if (response.ok) return;

    } catch (error) {
      // Network error, will retry
    }

    if (attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  // All retries exhausted - log for monitoring
  await logWebhookFailure(subscription.id, payload);
}
```

### 3.7 Perform List Endpoint

Zapier requires a "perform list" endpoint that returns sample data for testing:

```
GET /api/zapier/triggers/new-message/sample
Authorization: Bearer {access_token}

Response 200:
[
  {
    "id": "msg_sample_1",
    "message_id": "msg_uuid_1",
    "contact": { "name": "Sample User", "phone": "+31600000000" },
    "content": { "type": "text", "text": "Sample message 1" },
    "channel": "whatsapp",
    "received_at": "2026-01-24T12:00:00Z"
  },
  {
    "id": "msg_sample_2",
    ...
  }
]
```

**Important:** Response must be an array, even if empty.

---

## Part 4: Action API Design

### 4.1 Action Endpoints (ZAP-04)

| Action | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| Send Message | `/api/zapier/actions/send-message` | POST | Send message to contact |
| Create Contact | `/api/zapier/actions/contacts` | POST | Create new contact |
| Update Contact | `/api/zapier/actions/contacts/{id}` | PUT | Update existing contact |

### 4.2 Send Message Action

**Request:**
```json
POST /api/zapier/actions/send-message
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "to": "+31612345678",
  "channel": "whatsapp",  // optional, defaults to whatsapp
  "message": {
    "type": "text",
    "text": "Hello from Zapier!"
  }
}
```

**Alternative with Template:**
```json
{
  "to": "+31612345678",
  "template": {
    "name": "order_confirmation",
    "language": "en",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "John" },
          { "type": "text", "text": "#12345" }
        ]
      }
    ]
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "message_id": "msg_uuid_123",
  "status": "sent",
  "sent_at": "2026-01-24T12:34:56Z"
}
```

### 4.3 Create Contact Action

**Request:**
```json
POST /api/zapier/actions/contacts
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+31612345678",
  "email": "john@example.com",
  "tags": ["customer", "vip"],
  "custom_fields": {
    "company": "Acme Inc",
    "role": "CEO"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "contact": {
    "id": "contact_uuid_123",
    "name": "John Doe",
    "phone": "+31612345678",
    "email": "john@example.com",
    "tags": ["customer", "vip"],
    "custom_fields": { ... },
    "created_at": "2026-01-24T12:34:56Z"
  }
}
```

### 4.4 Update Contact Action

**Request:**
```json
PUT /api/zapier/actions/contacts/{contact_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "John Smith",
  "tags": ["customer", "vip", "gold"],
  "custom_fields": {
    "company": "Acme Corp"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "contact": {
    "id": "contact_uuid_123",
    "name": "John Smith",
    ...
    "updated_at": "2026-01-24T12:35:00Z"
  }
}
```

### 4.5 Error Responses

All actions should return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with ID 'xyz' not found",
    "field": "contact_id"
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Validation error |
| `UNAUTHORIZED` | 401 | Invalid/expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Part 5: Rate Limiting (ZAP-07)

### 5.1 Rate Limit Strategy

| Endpoint Type | Limit | Window | Scope |
|---------------|-------|--------|-------|
| OAuth Endpoints | 20 req/min | Rolling | Per IP |
| Trigger Webhooks | 20,000 req/5min | Rolling | Per user |
| Action APIs | 100 req/min | Rolling | Per token |
| Subscribe/Unsubscribe | 10 req/min | Rolling | Per token |

### 5.2 Response Headers

All Zapier API responses should include rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706141460
```

### 5.3 429 Response with Retry-After

When rate limited:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry after 30 seconds.",
    "retry_after": 30
  }
}
```

### 5.4 ThrottledError Implementation

For Zapier CLI integrations, implement ThrottledError with jitter:

```typescript
// In Zapier integration code (zapier-platform-cli)
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
  const jitter = Math.floor(Math.random() * 30); // 0-30s jitter
  throw new z.errors.ThrottledError(
    'Rate limit exceeded',
    retryAfter + jitter
  );
}
```

### 5.5 Rate Limiter Middleware

```typescript
// src/lib/integrations/zapier/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'zapier_api',
});

export async function zapierRateLimiter(
  identifier: string,
  limit?: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: Math.floor(result.reset / 1000),
  };
}
```

**Sources:**
- [Zapier Throttle Troubleshooting](https://docs.zapier.com/platform/build/troubleshoot-throttles)

---

## Part 6: Database Schema

### 6.1 OAuth Tables

```sql
-- OAuth Clients (for Zapier and future integrations)
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_secret_hash TEXT NOT NULL,  -- bcrypt hash
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['messages:read', 'messages:write', 'contacts:read', 'contacts:write', 'webhooks:manage'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Authorization Codes (short-lived)
CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  code_challenge TEXT,  -- PKCE
  code_challenge_method TEXT,  -- 'S256' or 'plain'
  state TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Access Tokens
CREATE TABLE oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,  -- SHA256 hash of JWT
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Refresh Tokens
CREATE TABLE oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,  -- SHA256 hash
  access_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_oauth_codes_code ON oauth_authorization_codes(code) WHERE used_at IS NULL;
CREATE INDEX idx_oauth_codes_expires ON oauth_authorization_codes(expires_at);
CREATE INDEX idx_oauth_access_tokens_hash ON oauth_access_tokens(token_hash);
CREATE INDEX idx_oauth_access_tokens_expires ON oauth_access_tokens(expires_at);
CREATE INDEX idx_oauth_refresh_tokens_hash ON oauth_refresh_tokens(token_hash);
```

### 6.2 Webhook Subscription Tables

```sql
-- Zapier Webhook Subscriptions
CREATE TABLE zapier_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,  -- 'message.received', 'contact.created', etc.
  target_url TEXT NOT NULL,

  -- Filtering (ZAP-06)
  filter_tags TEXT[],
  filter_segments TEXT[],
  filter_operator TEXT DEFAULT 'any_of',  -- 'any_of', 'all_of', 'none_of'

  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Delivery Log (for debugging and analytics)
CREATE TABLE zapier_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES zapier_subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,  -- Original event ID
  payload JSONB NOT NULL,

  attempt_count INTEGER DEFAULT 1,
  status TEXT NOT NULL,  -- 'pending', 'delivered', 'failed', 'abandoned'
  response_status INTEGER,
  response_body TEXT,

  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_zapier_subs_org ON zapier_subscriptions(organization_id);
CREATE INDEX idx_zapier_subs_event ON zapier_subscriptions(event_type);
CREATE INDEX idx_zapier_subs_active ON zapier_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_zapier_deliveries_sub ON zapier_webhook_deliveries(subscription_id);
CREATE INDEX idx_zapier_deliveries_pending ON zapier_webhook_deliveries(next_retry_at)
  WHERE status = 'pending';
```

### 6.3 RLS Policies

```sql
-- Enable RLS
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- OAuth clients are managed by super admins only
CREATE POLICY "Super admins can manage OAuth clients"
  ON oauth_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Users can view their own authorization codes
CREATE POLICY "Users can view own auth codes"
  ON oauth_authorization_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own access tokens
CREATE POLICY "Users can view own access tokens"
  ON oauth_access_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Organization-based RLS for subscriptions
CREATE POLICY "Organization members can view subscriptions"
  ON zapier_subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage subscriptions"
  ON zapier_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = zapier_subscriptions.organization_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Webhook deliveries follow subscription access
CREATE POLICY "Organization members can view deliveries"
  ON zapier_webhook_deliveries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### 6.4 Database Functions

```sql
-- Clean up expired tokens (run daily via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < now() - INTERVAL '1 hour';

  -- Delete expired and revoked access tokens (keep 7 days for audit)
  DELETE FROM oauth_access_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at < now() - INTERVAL '7 days');

  -- Delete expired and used refresh tokens
  DELETE FROM oauth_refresh_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');

  -- Delete old webhook deliveries (keep 30 days)
  DELETE FROM zapier_webhook_deliveries
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track token usage for analytics
CREATE OR REPLACE FUNCTION log_token_usage()
RETURNS trigger AS $$
BEGIN
  -- Update last used timestamp (for proactive refresh monitoring)
  UPDATE oauth_access_tokens
  SET updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Part 7: Implementation Plan

### 7.1 Wave Structure

The implementation is divided into 4 waves with 6 plans total:

| Wave | Plans | Focus | Parallel |
|------|-------|-------|----------|
| Wave 1 | 10-01, 10-02 | OAuth + Database | No |
| Wave 2 | 10-03, 10-04 | Webhooks + Actions | Yes |
| Wave 3 | 10-05 | Rate Limiting + Templates | No |
| Wave 4 | 10-06 | Zapier App Registration | No |

### 7.2 Plan Overview

#### Plan 10-01: OAuth 2.0 Provider Core
**Duration:** 1-2 days
**Files:**
- `src/lib/integrations/zapier/oauth-provider.ts`
- `src/lib/integrations/zapier/token-manager.ts`
- `src/lib/integrations/zapier/types.ts`
- `src/app/api/oauth/authorize/route.ts`
- `src/app/api/oauth/token/route.ts`
- `src/app/api/oauth/revoke/route.ts`
- `src/app/(auth)/oauth/consent/page.tsx`

**Tasks:**
1. Create OAuth provider core library
2. Implement authorization endpoint with consent UI
3. Implement token endpoint (code exchange, refresh)
4. Implement token revocation
5. Add PKCE support
6. Write unit tests

**Verification:**
- OAuth flow completes successfully with Zapier test client
- Tokens are properly signed and validated
- Refresh tokens work correctly

---

#### Plan 10-02: Database Schema + Migrations
**Duration:** 0.5-1 day
**Files:**
- `supabase/migrations/XXX_zapier_integration_oauth.sql`
- `supabase/migrations/XXX_zapier_integration_webhooks.sql`
- `src/types/database.ts` (regenerate)

**Tasks:**
1. Create OAuth tables migration
2. Create webhook subscription tables migration
3. Add RLS policies
4. Add cleanup functions
5. Regenerate TypeScript types
6. Write migration tests

**Verification:**
- All tables created with correct schema
- RLS policies enforced
- Types match database schema

---

#### Plan 10-03: Webhook Subscription System (REST Hooks)
**Duration:** 1-2 days
**Files:**
- `src/lib/integrations/zapier/webhook-manager.ts`
- `src/lib/integrations/zapier/event-router.ts`
- `src/lib/integrations/zapier/webhook-dispatcher.ts`
- `src/app/api/zapier/hooks/subscribe/route.ts`
- `src/app/api/zapier/hooks/[id]/route.ts`
- `src/app/api/zapier/triggers/[trigger]/sample/route.ts`

**Tasks:**
1. Implement subscription management (subscribe/unsubscribe)
2. Create event router with filter matching
3. Implement webhook dispatcher with retry logic
4. Add 410 response handling
5. Create perform list endpoints for triggers
6. Integrate with message/contact events
7. Write integration tests

**Verification:**
- Subscriptions created/deleted correctly
- Webhooks fire within 5s of events
- Filters work for tags and segments
- 410 responses deactivate subscriptions

---

#### Plan 10-04: Action APIs
**Duration:** 1 day
**Files:**
- `src/app/api/zapier/actions/send-message/route.ts`
- `src/app/api/zapier/actions/contacts/route.ts`
- `src/app/api/zapier/actions/contacts/[id]/route.ts`
- `src/lib/integrations/zapier/action-handlers.ts`

**Tasks:**
1. Implement send message action
2. Implement create contact action
3. Implement update contact action
4. Add input validation
5. Add consistent error responses
6. Write integration tests

**Verification:**
- All three actions work correctly
- Proper error handling
- RLS enforced (org isolation)

---

#### Plan 10-05: Rate Limiting + Zap Templates
**Duration:** 1 day
**Files:**
- `src/lib/integrations/zapier/rate-limiter.ts`
- `src/middleware/zapier-rate-limit.ts`
- `docs/zapier-templates/` (5 template definitions)

**Tasks:**
1. Implement rate limiter middleware
2. Add rate limit headers to responses
3. Implement 429 responses with Retry-After
4. Create 5 Zap template definitions:
   - CRM sync (Salesforce/HubSpot)
   - Slack notification on new message
   - Google Sheets message logging
   - Email alert on urgent messages
   - Asana/Todoist task creation
5. Write rate limit tests

**Verification:**
- Rate limits enforced correctly
- Retry-After header present on 429
- Template definitions ready for Zapier submission

---

#### Plan 10-06: Zapier Platform Registration
**Duration:** 0.5-1 day
**Files:**
- `docs/zapier-integration/` (integration guide)
- Zapier Platform configuration

**Tasks:**
1. Register ADSapp on Zapier Developer Platform
2. Configure OAuth 2.0 settings
3. Define triggers and actions in Zapier UI
4. Create test user account (integration-testing@zapier.com)
5. Submit initial build for testing
6. Document integration for users

**Verification:**
- Zapier app registered and testable
- OAuth flow works end-to-end
- Triggers and actions visible in Zapier

---

### 7.3 Dependency Graph

```
┌─────────────────┐
│   Plan 10-01    │
│  OAuth Provider │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Plan 10-02    │
│    Database     │
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   Plan 10-03    │       │   Plan 10-04    │
│    Webhooks     │       │    Actions      │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └──────────┬──────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   Plan 10-05    │
           │  Rate Limiting  │
           │  + Templates    │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   Plan 10-06    │
           │    Zapier       │
           │  Registration   │
           └─────────────────┘
```

### 7.4 File Structure

```
src/lib/integrations/zapier/
├── index.ts                  # Main exports
├── types.ts                  # TypeScript types
├── oauth-provider.ts         # OAuth 2.0 implementation
├── token-manager.ts          # Token generation/validation
├── webhook-manager.ts        # Subscription management
├── event-router.ts           # Event filtering and routing
├── webhook-dispatcher.ts     # HTTP delivery with retries
├── action-handlers.ts        # Action implementations
└── rate-limiter.ts           # Rate limiting middleware

src/app/api/oauth/
├── authorize/route.ts        # Authorization endpoint
├── token/route.ts            # Token endpoint
└── revoke/route.ts           # Revocation endpoint

src/app/api/zapier/
├── hooks/
│   ├── subscribe/route.ts    # Subscribe endpoint
│   └── [id]/route.ts         # Unsubscribe endpoint
├── triggers/
│   └── [trigger]/
│       └── sample/route.ts   # Perform list
└── actions/
    ├── send-message/route.ts
    └── contacts/
        ├── route.ts          # Create
        └── [id]/route.ts     # Update

src/app/(auth)/oauth/
└── consent/page.tsx          # OAuth consent UI

supabase/migrations/
├── XXX_zapier_oauth.sql
└── XXX_zapier_webhooks.sql
```

### 7.5 Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Plan 10-01 (OAuth) | 1.5 days | 1.5 days |
| Plan 10-02 (Database) | 0.5 days | 2 days |
| Plan 10-03 + 10-04 (parallel) | 1.5 days | 3.5 days |
| Plan 10-05 (Rate Limiting) | 1 day | 4.5 days |
| Plan 10-06 (Registration) | 0.5 days | 5 days |

**Total Estimated Duration:** 5 days

---

## Part 8: Risk Assessment

### 8.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth complexity | Medium | High | Use established patterns, extensive testing |
| Webhook reliability | Medium | Medium | Implement robust retry logic, monitoring |
| Rate limit tuning | Low | Medium | Start conservative, adjust based on usage |
| Token security | Low | High | Use industry standards (JWT, bcrypt, HTTPS) |

### 8.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Zapier review delays | Medium | Low | Prepare thorough documentation |
| Partner program requirements | Low | Medium | Plan for 50 users, create quality templates |
| API breaking changes | Low | High | Version API, maintain backwards compatibility |

### 8.3 Security Considerations

1. **Token Storage:** Hash all tokens in database, never store plaintext
2. **Client Secrets:** Use bcrypt for client secret hashing
3. **HTTPS Only:** Reject any non-HTTPS requests
4. **State Validation:** Always validate state parameter
5. **Scope Enforcement:** Validate scopes on every API call
6. **Rate Limiting:** Prevent abuse and DoS attacks
7. **Audit Logging:** Log all OAuth and API operations

---

## Sources

### Official Zapier Documentation
- [Add authentication with OAuth v2](https://docs.zapier.com/platform/build/oauth)
- [Add a REST Hook trigger](https://docs.zapier.com/platform/build/hook-trigger)
- [Troubleshoot throttles](https://docs.zapier.com/platform/build/troubleshoot-throttles)
- [Integration publishing requirements](https://docs.zapier.com/platform/publish/integration-publishing-requirements)
- [Zapier Partner Program](https://zapier.com/developer-platform/partner-program)

### Example Repositories
- [zapier-platform-example-app-oauth2](https://github.com/zapier/zapier-platform-example-app-oauth2)
- [zapier-platform-example-app-rest-hooks](https://github.com/zapier/zapier-platform-example-app-rest-hooks)
- [django-rest-hooks](https://github.com/zapier/django-rest-hooks)

### Additional Resources
- [Zapier Developer Platform](https://zapier.com/developer-platform)
- [Build on Zapier's Developer Platform](https://zapier.com/developer-platform/integrations)

---

*Research completed: 2026-01-24*
*Ready for plan creation*
