# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Multi-tenant SaaS platform with event-driven messaging and API-first design

**Key Characteristics:**
- **Multi-tenant isolation:** Row-level security (RLS) enforces tenant boundaries at database level
- **Webhook-driven:** Real-time integration with WhatsApp Business Cloud API via incoming webhooks
- **Distributed processing:** Message queuing with BullMQ and job scheduling with Upstash Redis
- **Channel abstraction:** Unified adapter pattern for future multi-channel support (WhatsApp, SMS, email)
- **Security-first:** Encryption at rest, signature validation, input validation, audit logging

## Layers

**Presentation Layer:**
- Purpose: Server-rendered and client-side UI using Next.js 15 App Router
- Location: `src/app/` (pages, layouts, not-found boundaries) + `src/components/`
- Contains: React components, page layouts, error boundaries
- Depends on: API routes, context providers, Zustand stores
- Used by: Web browsers, demo/debug interfaces

**API Layer:**
- Purpose: RESTful endpoints for frontend and external webhooks
- Location: `src/app/api/`
- Contains: Route handlers organized by feature (`conversations/`, `contacts/`, `webhooks/`, `ai/`, etc.)
- Depends on: Database clients, services, middleware
- Used by: Frontend (fetch requests), WhatsApp webhooks, Stripe webhooks

**Service/Business Logic Layer:**
- Purpose: Core application logic, external API integrations, domain operations
- Location: `src/lib/` (organized by domain: `whatsapp/`, `ai/`, `billing/`, `automation/`, etc.)
- Contains: Service classes, integration clients, business logic
- Depends on: Database layer, external APIs, utilities
- Used by: API routes, background jobs, webhooks

**Data Access Layer:**
- Purpose: Supabase client instantiation and RLS-enforced database access
- Location: `src/lib/supabase/` (server.ts, client.ts, middleware.ts)
- Contains: Server client factory, service role client factory, middleware integration
- Depends on: Supabase SDKs, environment variables
- Used by: All services, API routes, server components

**Security Layer:**
- Purpose: Input validation, encryption, authentication, audit logging
- Location: `src/lib/security/`
- Contains: Validators, encryption utilities, audit service, RPC security wrapper
- Depends on: AWS KMS, key management, logging
- Used by: API routes, services, middleware

**Supporting Layers:**
- **Channels Layer** (`src/lib/channels/`): Abstraction for multi-channel messaging (WhatsApp adapter, unified router)
- **Cache Layer** (`src/lib/cache/`): Redis-based caching for performance
- **Queue Layer** (`src/lib/queue/` + BullMQ): Distributed job processing
- **Telemetry** (`src/lib/telemetry/`): OpenTelemetry instrumentation and metrics
- **i18n** (`src/lib/i18n/`): Localization support (Dutch/English)

## Data Flow

**Incoming WhatsApp Message Flow:**

1. **Webhook Entry** (`src/app/api/webhooks/whatsapp/route.ts`)
   - WhatsApp Cloud API sends POST request
   - Signature validation via HMAC
   - Request throttling with rate limits

2. **Message Processing**
   - Extract contact info (phone number, name)
   - Normalize phone (deduplicate contacts)
   - Find or create contact record in database
   - Find or create conversation thread

3. **Media Handling** (`src/lib/media/storage.ts`)
   - Store media URLs in database
   - Optional: Download and store in cloud storage

4. **Channel Abstraction** (`src/lib/channels/`)
   - Convert WhatsApp message to unified format
   - Route to WhatsApp adapter for channel-specific processing

5. **Database Persistence**
   - Insert message with RLS tenant check
   - Update conversation last_message_at
   - Store message status for tracking

6. **Real-time Updates** (Future: Supabase Realtime)
   - Broadcast message to connected clients via WebSocket
   - Update UI in real-time for all agents viewing conversation

**Outgoing Message Flow:**

1. **User Sends Message** (Dashboard UI)
   - Frontend sends POST to `src/app/api/conversations/[id]/messages` or similar

2. **API Route Processing**
   - Authenticate user (Supabase auth)
   - Validate input
   - Create message record in database
   - Update conversation status

3. **WhatsApp Client** (`src/lib/whatsapp/enhanced-client.ts`)
   - Call WhatsApp Business Cloud API
   - Send message to contact's phone number
   - Store message ID for status tracking

4. **Status Tracking**
   - WhatsApp webhook reports delivery/read status
   - Update message status in database
   - Real-time UI update for sender

**Webhook Processing Flow:**

1. **Entry Points:**
   - WhatsApp: `src/app/api/webhooks/whatsapp/route.ts`
   - Stripe: `src/app/api/webhooks/stripe/route.ts`

2. **Validation & Authorization**
   - Signature verification
   - Rate limiting
   - Input sanitization

3. **Event Routing**
   - Webhook type detection
   - Delegate to appropriate handler
   - Queue for async processing if needed

4. **State Management:**
   - Atomic database updates
   - Idempotency handling for retries
   - Transaction rollback on failure

## Key Abstractions

**Supabase Client Abstraction:**
- Purpose: Encapsulate multi-tenant authentication and RLS enforcement
- Examples: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Pattern: Factory pattern with async initialization for server client

**Unified Message Router:**
- Purpose: Abstract channel-specific details for multi-channel future expansion
- Examples: `src/lib/channels/router.ts`, `src/lib/channels/adapters/whatsapp.ts`
- Pattern: Adapter pattern with unified internal message format

**WhatsApp Client:**
- Purpose: Encapsulate WhatsApp Business Cloud API interactions
- Examples: `src/lib/whatsapp/enhanced-client.ts`, `src/lib/whatsapp/order-handler.ts`
- Pattern: Wrapper around WhatsApp SDK with retry logic and error handling

**AI Service:**
- Purpose: Provide AI capabilities (drafts, sentiment, auto-response) with provider abstraction
- Examples: `src/lib/ai/drafts.ts`, `src/lib/ai/sentiment.ts`, `src/lib/ai/openrouter.ts`
- Pattern: Service layer with provider interface for OpenRouter/LLM integration

**Job Queue:**
- Purpose: Async processing of long-running operations (CRM sync, drip campaigns)
- Examples: `src/lib/queue/`, `src/lib/jobs/crm-sync.ts`
- Pattern: BullMQ with worker processes, Redis backend

**Input Validator:**
- Purpose: Type-safe validation of API inputs with SQL injection detection
- Examples: `src/lib/security/input-validation.ts`
- Pattern: Static validators for common types (UUID, text, email, enum)

**Encryption Layer:**
- Purpose: Secure sensitive data at rest (payment methods, API keys)
- Examples: `src/lib/crypto/encryption.ts`
- Pattern: Symmetric encryption with key management via AWS KMS or Azure Key Vault

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx` (landing page)
- Triggers: Browser navigation to `/`
- Responsibilities: Landing page, redirects authenticated users to dashboard

**Dashboard:**
- Location: `src/app/dashboard/layout.tsx` and nested pages
- Triggers: `/dashboard/*` routes for authenticated users
- Responsibilities: Protected routes with role-based access control (owner, admin, agent, viewer)

**Authentication:**
- Location: `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx`
- Triggers: `/auth/signin`, `/auth/signup` routes
- Responsibilities: User registration, login via Supabase Auth

**API Routes:**
- Location: `src/app/api/*/route.ts` (50+ endpoints)
- Triggers: HTTP requests to `/api/*` paths
- Responsibilities: REST endpoints for all application features

**Webhooks:**
- Location: `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/webhooks/stripe/route.ts`
- Triggers: External POST requests from WhatsApp and Stripe
- Responsibilities: Ingest external events, trigger internal processing

**Admin Panel:**
- Location: `src/app/admin/` (super-admin only)
- Triggers: `/admin/*` routes for super-admin users
- Responsibilities: Organization management, billing, audit logs, security settings

**Cron Jobs:**
- Location: `src/app/api/cron/`
- Triggers: Scheduled HTTP requests (external cron service or Vercel Cron)
- Responsibilities: Background tasks (drip campaigns, subscription renewal, cleanup)

## Error Handling

**Strategy:** Three-tier error handling with user-friendly responses and detailed logging

**Patterns:**

1. **API Route Error Handling:**
   ```typescript
   try {
     // Protected operation
   } catch (error) {
     console.error('Detailed error for debugging:', error)
     return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
   }
   ```

2. **Validation Errors:**
   - Input validation returns 400 with validation details
   - SQL injection detection returns 400 with generic error message
   - Uses `QueryValidators` for type-safe validation

3. **Authentication Errors:**
   - Missing auth returns 401 Unauthorized
   - Invalid/expired session triggers re-authentication
   - Uses Supabase Auth SDK error handling

4. **Authorization Errors:**
   - Insufficient permissions returns 403 Forbidden
   - RLS policy violations silently return 0 rows (Supabase default)
   - Role checks via `profile.role` after auth

5. **Resource Not Found:**
   - Missing resource returns 404 Not Found
   - Client-side uses `notFound()` to trigger 404 boundary

6. **External Service Errors:**
   - WhatsApp API failures logged and queued for retry
   - Stripe failures trigger webhook retry mechanism
   - Graceful degradation with fallback states

## Cross-Cutting Concerns

**Logging:**
- Framework: Custom logger in `src/lib/security/logger.ts`
- Approach: Structured logging with context, audit trails for security events

**Validation:**
- Framework: Input validators in `src/lib/security/input-validation.ts`
- Approach: Synchronous validation before database queries, type-safe enums

**Authentication:**
- Framework: Supabase Auth + NextAuth for multi-tenant context
- Approach: Session stored in cookies, validated on each request via middleware

**Authorization (RBAC):**
- Framework: Role-based access control via `profile.role` field
- Approach: Role checks in API routes, RLS policies in database for data access

**Audit Logging:**
- Framework: `src/lib/security/audit-service.ts`
- Approach: Log all security-relevant events (login, data access, changes) with user/org context

**Rate Limiting:**
- Framework: Token bucket via Upstash Redis in `src/lib/security/rate-limit.ts`
- Approach: Per-user/per-IP limits on API endpoints

**Multi-tenancy:**
- Framework: RLS policies at database level
- Approach: Every table has `organization_id` column, RLS enforces user's organization context

---

*Architecture analysis: 2026-01-28*
