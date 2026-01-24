# Architecture

**Analysis Date:** 2025-01-23

## Pattern Overview

**Overall:** Multi-tenant SaaS with Next.js 15 App Router, server-driven architecture with client-side state management using Zustand. Row-Level Security (RLS) enforced at database layer for tenant isolation.

**Key Characteristics:**
- Server-side rendering with Next.js App Router (React 19)
- Multi-tenant data isolation via Supabase RLS policies
- Middleware composition pattern for request processing
- Layered API routes with standardized error handling
- Event-driven automation engine for workflow execution
- Integration-first design (WhatsApp, Stripe, CRM systems)

## Layers

**Presentation Layer:**
- Purpose: React components and pages served via Next.js App Router
- Location: `src/app/`, `src/components/`
- Contains: Page components, layouts, UI components, Zustand stores
- Depends on: API routes, Supabase client, context providers
- Used by: End users, admin interface

**API Layer:**
- Purpose: Request handling, validation, business logic coordination
- Location: `src/app/api/` organized by domain
- Contains: Route handlers, middleware composition, input validation
- Depends on: Supabase server client, business logic layer
- Used by: Frontend components, webhooks

**Business Logic Layer:**
- Purpose: Domain-specific operations
- Location: `src/lib/automation/`, `src/lib/billing/`, `src/lib/whatsapp/`, `src/lib/crm/`, `src/lib/ai/`
- Contains: WorkflowExecutionEngine, SubscriptionLifecycleManager, CRM clients
- Depends on: Data access, security, queue system
- Used by: API routes, job processors

**Data Access Layer:**
- Purpose: Supabase client management with RLS-enforced tenant isolation
- Location: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Contains: Server client (RLS), browser client, service role client
- Used by: All other layers

**Security & Validation Layer:**
- Purpose: Input validation, authentication, encryption, access control
- Location: `src/lib/security/`, `src/lib/rbac/`, `src/lib/middleware/`
- Contains: Input validators, RLS enforcement, MFA, RBAC
- Used by: API layer, middleware chain

**Infrastructure & Queue Layer:**
- Purpose: Job processing, caching, rate limiting
- Location: `src/lib/queue/`, `src/lib/cache/`, `src/lib/middleware/`
- Contains: BullMQ processors, Redis cache, rate limiters
- Used by: API layer for async operations

## Data Flow

**Message Reception:**
- WhatsApp webhook → `src/app/api/webhooks/whatsapp/route.ts` (signature validation)
- Message stored in Supabase (RLS auto-filters by org)
- Media processed in `src/lib/media/storage.ts`
- Workflow triggered via `src/lib/workflow/execution-engine.ts`
- Real-time update published via Supabase
- UI updates via `src/components/inbox/`

**Conversation Query:**
1. API request: `GET /api/conversations`
2. Middleware: `src/lib/middleware/tenant-validation.ts` validates org
3. Rate limit check: `src/lib/middleware/rate-limiter-redis.ts`
4. Cache lookup: `src/lib/cache/api-cache.ts`
5. Database query with RLS filtering
6. Response cached, sent to frontend

**Workflow Execution:**
- Trigger detected (message, schedule, webhook)
- Workflow loaded: `src/lib/workflow/templates.ts`
- Engine: `src/lib/workflow/execution-engine.ts`
- State machine: trigger → condition → action → delay → AI response
- Result stored in workflow_executions table
- Failures trigger retry with exponential backoff

**Billing/Subscription:**
- Stripe webhook → `src/app/api/webhooks/stripe/route.ts`
- Event handler: `src/lib/billing/webhook-handler.ts`
- Usage tracking: `src/lib/billing/usage-tracking.ts`
- Subscription state machine: `src/lib/billing/subscription-lifecycle.ts`
- Invoice generation, email notifications

**CRM Sync:**
- Trigger: `src/app/api/crm/sync/route.ts`
- CRM client: `src/lib/crm/[platform]/client.ts`
- Sync manager: `src/lib/crm/sync-manager.ts`
- Mapper: `src/lib/crm/[platform]/mapping.ts`
- Bidirectional sync execution

**State Management:**
- Workflow builder: Zustand store (`src/stores/workflow-store.ts`)
- Server caching: React `cache()` for auth, profile, org
- API response caching: Redis with organizationId in key
- Real-time: Supabase subscriptions
- Form state: React local state

## Key Abstractions

**WorkflowExecutionEngine:** `src/lib/workflow/execution-engine.ts`
- State machine for automation workflows
- Sequential node execution with error handling
- Prevents infinite loops (max 100 nodes)

**SubscriptionLifecycleManager:** `src/lib/billing/subscription-lifecycle.ts`
- Plan changes, downgrades, reactivation
- Grace period and dunning logic

**CRM Sync Orchestrator:** `src/lib/crm/base-client.ts`
- Base class with Salesforce, HubSpot, Pipedrive implementations
- Bidirectional sync, authentication, data mapping

**WhatsApp Business Client:** `src/lib/whatsapp/client.ts`, `service.ts`
- Message sending, templates, media handling
- Used by bulk messaging and drip campaigns

**BullMQ Queue System:** `src/lib/queue/processors/`
- Async jobs: bulk messages, contact imports, cleanup
- Redis-backed with configurable retries

## Entry Points

**Web Root:** `src/app/layout.tsx`
- Initialize providers, mount React tree

**Dashboard:** `src/app/dashboard/layout.tsx`
- Auth verification, sidebar render

**API Routes:** `src/app/api/[feature]/route.ts`
- Contacts, conversations, billing, automation, admin

**Webhooks:**
- WhatsApp: `src/app/api/webhooks/whatsapp/route.ts`
- Stripe: `src/app/api/webhooks/stripe/route.ts`

**Admin:** `src/app/admin/layout.tsx`
- Super-admin operations with service role

**Demo:** `src/app/demo/page.tsx`
- Synthetic data generation for demo mode

## Error Handling

**Validation:** `src/lib/security/input-validation.ts`
- QueryValidators for injection detection
- 400 Bad Request for invalid input

**API Errors:** `src/lib/api-utils.ts`
- `throw new ApiException(message, statusCode, code)`
- Standardized JSON responses

**Database RLS:** Supabase migrations
- Policies silently deny
- Code validates user.organization_id

**Queue Processing:** `src/lib/queue/processors/`
- BullMQ retry with exponential backoff
- Dead-letter queue for failed jobs

**External Integration:** Whatsapp, Stripe, CRM
- Try-catch logs to Sentry
- Graceful fallback with retry marks

## Cross-Cutting Concerns

**Logging:** Console in dev, Sentry in production with context

**Validation:** Multi-layer (middleware → route → business logic)

**Authentication:** Supabase Auth, JWT in httpOnly cookies, React cache deduplication

**Authorization:** RLS at database, code-level role checks. Roles: owner, admin, agent, viewer

**Tenant Isolation:** RLS filters by organization_id, service role for /api/admin/* only

**Caching:** React cache (request-scoped), Redis (API responses), per-endpoint TTL, invalidation on writes

**Performance:** Code splitting, lazy loading, image optimization, selected fields queries, bundle analysis

---

*Architecture analysis: 2025-01-23*
