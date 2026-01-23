# Architecture Research: Feature Gap Implementation

**Domain:** Multi-channel communication platform integration
**Researched:** 2026-01-23
**Confidence:** HIGH (based on actual codebase analysis)

## Executive Summary

The ADSapp architecture is well-designed for multi-tenant SaaS with strong patterns already in place for webhook handling, OAuth flows, message processing, and job queues. The new features (Zapier, Mobile App, Instagram/Facebook, SMS, WhatsApp Calling, Knowledge Base) can integrate cleanly by extending existing patterns rather than creating new architectural paradigms.

Key insight: The WhatsApp webhook handler (`src/app/api/webhooks/whatsapp/route.ts`) provides an excellent template for unified message handling. The existing OAuth implementation (`src/lib/auth/sso/oauth.ts`) can be extended for Zapier OAuth. The queue system (`src/lib/queue/`) is already BullMQ-based and ready for additional job types.

---

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXISTING ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │   Next.js    │────▶│   Supabase   │◀────│   Realtime   │                     │
│  │  App Router  │     │  PostgreSQL  │     │ Subscriptions│                     │
│  └──────────────┘     └──────────────┘     └──────────────┘                     │
│         │                    │                                                   │
│         ▼                    ▼                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │  API Routes  │     │     RLS      │     │   BullMQ     │                     │
│  │  /api/...    │     │  Policies    │     │   Queues     │                     │
│  └──────────────┘     └──────────────┘     └──────────────┘                     │
│         │                                         │                              │
│         ▼                                         ▼                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │   WhatsApp   │     │    Stripe    │     │   Resend     │                     │
│  │   Webhook    │     │   Webhook    │     │   Email      │                     │
│  └──────────────┘     └──────────────┘     └──────────────┘                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Existing Integration Points

| Component | Location | Purpose |
|-----------|----------|---------|
| WhatsApp Webhook | `src/app/api/webhooks/whatsapp/route.ts` | Message ingestion, status updates |
| Stripe Webhook | `src/app/api/webhooks/stripe/route.ts` | Payment events, subscriptions |
| OAuth Handler | `src/lib/auth/sso/oauth.ts` | OIDC/OAuth 2.0 with PKCE |
| Queue Manager | `src/lib/queue/queue-manager.ts` | BullMQ job orchestration |
| Media Storage | `src/lib/media/storage.ts` | Supabase Storage for files |
| CRM Sync | `src/lib/crm/sync-manager.ts` | Bi-directional sync pattern |
| Event Bus | `src/lib/events/event-bus.ts` | Pub/sub for domain events |
| Workflow Engine | `src/lib/automation/workflow-engine.ts` | Node-based automation |

---

## Integration Points for New Features

### 1. Message Handling Layer (CRITICAL)

**Current:** WhatsApp-only via `EnhancedWhatsAppClient`

**New Architecture: Unified Message Router**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          UNIFIED MESSAGE HANDLING                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  WhatsApp   │ │  Instagram  │ │  Facebook   │ │    SMS      │               │
│  │  Webhook    │ │  Webhook    │ │  Webhook    │ │  Webhook    │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         │               │               │               │                       │
│         ▼               ▼               ▼               ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     UNIFIED MESSAGE ROUTER                               │   │
│  │  src/lib/messaging/unified-router.ts                                    │   │
│  │  - Normalize message format                                              │   │
│  │  - Route to correct channel handler                                      │   │
│  │  - Apply common validation                                               │   │
│  │  - Emit unified events                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     MESSAGE PROCESSOR                                    │   │
│  │  - Contact upsert (existing pattern)                                     │   │
│  │  - Conversation management (existing)                                    │   │
│  │  - Media handling (existing MediaStorageService)                         │   │
│  │  - AI processing (existing auto-response)                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Integration with existing code:**
- Extends `processMessages()` pattern from WhatsApp webhook
- Uses existing `upsertContact()`, `findOrCreateConversation()` helpers
- Leverages `MediaStorageService` for attachments
- Triggers existing `EventBus` for domain events

### 2. Authentication Layer

**Current:** Supabase Auth + SSO (OAuth/OIDC) + Session management

**New Components:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION EXTENSIONS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EXISTING                           NEW                                          │
│  ┌─────────────────┐               ┌─────────────────┐                          │
│  │  Supabase Auth  │               │  Zapier OAuth   │ ◀── OAuth 2.0 Provider   │
│  │  (User login)   │               │  (We issue      │     implementation       │
│  └─────────────────┘               │   tokens)       │                          │
│                                    └─────────────────┘                          │
│  ┌─────────────────┐               ┌─────────────────┐                          │
│  │  SSO OAuth      │               │  Mobile JWT     │ ◀── Long-lived tokens    │
│  │  (We consume    │               │  (API auth)     │     with refresh         │
│  │   tokens)       │               └─────────────────┘                          │
│  └─────────────────┘               ┌─────────────────┐                          │
│                                    │  Meta OAuth     │ ◀── Instagram/Facebook   │
│  ┌─────────────────┐               │  (Channel conn) │     page connection      │
│  │  Session Mgmt   │               └─────────────────┘                          │
│  │  (Redis/Memory) │                                                            │
│  └─────────────────┘                                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Key distinction:**
- **Zapier OAuth:** ADSapp acts as OAuth *provider* (issues tokens to Zapier)
- **Meta OAuth:** ADSapp acts as OAuth *consumer* (connects to FB/IG pages)
- **Mobile JWT:** Extension of existing session management for API access

### 3. Data Layer

**Current:** PostgreSQL with RLS, multi-tenant isolation via `organization_id`

**New Schema Requirements:**

```sql
-- Channel abstraction
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  channel_type TEXT NOT NULL, -- 'whatsapp' | 'instagram' | 'facebook' | 'sms'
  credentials JSONB,  -- Encrypted channel-specific credentials
  status TEXT DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message source tracking
ALTER TABLE messages ADD COLUMN channel_type TEXT DEFAULT 'whatsapp';
ALTER TABLE messages ADD COLUMN channel_connection_id UUID REFERENCES channel_connections(id);

-- Zapier integration
CREATE TABLE zapier_connections (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  access_token TEXT,  -- Encrypted
  refresh_token TEXT, -- Encrypted
  scopes TEXT[],
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zapier_triggers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  trigger_type TEXT NOT NULL,  -- 'new_message' | 'contact_created' | 'conversation_closed'
  webhook_url TEXT NOT NULL,
  filters JSONB,
  active BOOLEAN DEFAULT TRUE
);

-- Mobile push notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call recordings (WhatsApp Calling)
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  conversation_id UUID REFERENCES conversations(id),
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base (RAG)
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- pgvector for RAG
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Real-time Layer

**Current:** Supabase Realtime for message updates

**New Requirements:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME EXTENSIONS                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EXISTING                           NEW                                          │
│  ┌─────────────────┐               ┌─────────────────┐                          │
│  │ Supabase        │               │ Push Notif.     │ ◀── Firebase/APNs        │
│  │ Realtime        │               │ Service         │     for mobile           │
│  │ (Messages)      │               └─────────────────┘                          │
│  └─────────────────┘               ┌─────────────────┐                          │
│                                    │ Zapier Webhook  │ ◀── Outbound trigger     │
│  ┌─────────────────┐               │ Dispatcher      │     events               │
│  │ EventBus        │──────────────▶└─────────────────┘                          │
│  │ (Domain Events) │               ┌─────────────────┐                          │
│  └─────────────────┘               │ Call Events     │ ◀── WebSocket for        │
│                                    │ Stream          │     call signaling       │
│                                    └─────────────────┘                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## New Components Required

| Component | Purpose | Integration Point | Priority |
|-----------|---------|-------------------|----------|
| `UnifiedMessageRouter` | Normalize messages from all channels | `src/lib/messaging/` | P0 |
| `ChannelManager` | Channel connection CRUD, credentials | `src/lib/channels/` | P0 |
| `ZapierOAuthProvider` | OAuth 2.0 token issuance | `src/lib/integrations/zapier/` | P1 |
| `ZapierActionExecutor` | Execute Zapier actions | `src/lib/integrations/zapier/` | P1 |
| `PushNotificationService` | Firebase/APNs integration | `src/lib/notifications/` | P1 |
| `MobileAuthProvider` | JWT issuance for mobile | `src/lib/auth/mobile/` | P1 |
| `MetaChannelHandler` | Instagram/Facebook API client | `src/lib/channels/meta/` | P2 |
| `SMSProviderAdapter` | Twilio/Vonage abstraction | `src/lib/channels/sms/` | P2 |
| `WhatsAppCallHandler` | Call events, recording | `src/lib/whatsapp/calling/` | P2 |
| `KnowledgeBaseService` | Vector storage, RAG pipeline | `src/lib/knowledge/` | P2 |
| `EmbeddingPipeline` | OpenAI embeddings generation | `src/lib/ai/embeddings/` | P2 |

---

## Data Flow Changes

### Message Flow (Current vs New)

**Current:**
```
WhatsApp Webhook → processMessages() → messages table → Realtime → UI
```

**New:**
```
Any Channel Webhook → UnifiedMessageRouter.route()
    → normalize to ChannelMessage
    → ChannelHandler.process()
    → messages table (with channel_type)
    → EventBus.publish('message.received')
        → Realtime (existing)
        → ZapierWebhookDispatcher (if trigger configured)
        → PushNotificationService (if mobile subscribed)
```

### Zapier Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ZAPIER INTEGRATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  TRIGGERS (ADSapp → Zapier)                 ACTIONS (Zapier → ADSapp)           │
│                                                                                  │
│  EventBus.publish()                         POST /api/zapier/actions/:action    │
│       │                                            │                            │
│       ▼                                            ▼                            │
│  ZapierEventHandler                         ZapierActionExecutor                │
│       │                                            │                            │
│       ▼                                            ▼                            │
│  Filter by zapier_triggers                  Validate OAuth token                │
│       │                                            │                            │
│       ▼                                            ▼                            │
│  POST to webhook_url                        Execute action (send_message,       │
│  (with retry logic)                         create_contact, etc.)               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Suggested Build Order

Based on dependency analysis and existing architecture:

### Phase 1: Foundation (Build First)
1. **UnifiedMessageRouter** - All channel features depend on this
   - Extends existing WhatsApp patterns
   - Must be in place before adding new channels

2. **ChannelManager** - Channel connections need management layer
   - CRUD operations for channel_connections table
   - Credentials encryption (use existing crypto patterns)

### Phase 2: Integrations (Parallel Work Possible)
3. **Zapier OAuth Provider** - Independent feature
   - Builds on existing OAuth patterns in `src/lib/auth/sso/`
   - Can be developed alongside other features

4. **Mobile Auth + Push** - Independent feature
   - JWT extension of session management
   - Push notifications via existing queue system

### Phase 3: Channels (After Phase 1 Complete)
5. **Instagram/Facebook Handler** - Depends on UnifiedMessageRouter
   - Meta Graph API integration
   - Single webhook for both platforms (Meta unified API)

6. **SMS Provider** - Depends on UnifiedMessageRouter
   - Twilio/Vonage abstraction layer
   - Similar pattern to WhatsApp client

### Phase 4: Advanced Features
7. **WhatsApp Calling** - Depends on WhatsApp infrastructure
   - Call events via webhook
   - Recording storage via MediaStorageService
   - Transcription via AI service

8. **Knowledge Base/RAG** - Independent but complex
   - pgvector extension required
   - Embedding pipeline via OpenAI
   - Integration with AI auto-response

---

## Database Schema Additions

### Required Tables Summary

| Table | Purpose | RLS Strategy |
|-------|---------|--------------|
| `channel_connections` | Multi-channel credentials | org_id filter |
| `zapier_connections` | Zapier OAuth tokens | org_id filter |
| `zapier_triggers` | Webhook subscriptions | org_id filter |
| `zapier_action_logs` | Audit trail | org_id filter |
| `push_subscriptions` | Mobile device tokens | user_id + org_id |
| `call_recordings` | WhatsApp call storage | org_id filter |
| `knowledge_articles` | RAG content | org_id filter |
| `knowledge_chunks` | Embedded segments | org_id filter |

### Migration Dependencies

```
1. Base tables (channel_connections, zapier_*, push_*)
2. Message table alterations (add channel_type, channel_connection_id)
3. pgvector extension for knowledge_articles
4. Indexes for performance (channel lookups, vector similarity)
```

---

## Risk Mitigation

### Potential Issues

| Risk | Mitigation | Detection |
|------|------------|-----------|
| Message routing complexity | Start with 2 channels, prove pattern | Integration tests |
| OAuth token security | Use existing credential encryption | Security audit |
| Push notification reliability | Queue with retry, delivery confirmation | Monitoring |
| Vector search performance | Proper indexing, HNSW algorithm | Load testing |
| Meta API rate limits | Implement backoff, queue batching | Error tracking |

### Architecture Decisions to Validate

1. **Unified message format** - Ensure it handles all channel-specific features
2. **Vector storage location** - pgvector vs external (Pinecone, Weaviate)
3. **Call recording storage** - Supabase Storage limits, alternative S3
4. **Push notification provider** - Firebase vs APNs direct vs third-party

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Message routing | HIGH | Existing WhatsApp pattern is solid, extensible |
| Zapier integration | HIGH | OAuth patterns already exist, well-documented API |
| Mobile auth | HIGH | JWT is standard, session mgmt in place |
| Meta channels | MEDIUM | Meta API complexity, need verification |
| SMS integration | HIGH | Standard patterns, well-documented providers |
| WhatsApp Calling | MEDIUM | Beta API, limited documentation |
| Knowledge Base/RAG | MEDIUM | pgvector setup, embedding costs need validation |

---

## Sources

- Codebase analysis: `src/app/api/webhooks/whatsapp/route.ts`
- Codebase analysis: `src/lib/auth/sso/oauth.ts`
- Codebase analysis: `src/lib/queue/queue-manager.ts`
- Codebase analysis: `src/lib/crm/sync-manager.ts`
- Codebase analysis: `src/lib/media/storage.ts`
- Supabase migrations in `supabase/migrations/`
- Database types in `src/types/database.ts`
