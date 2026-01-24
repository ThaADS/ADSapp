# Codebase Structure

**Analysis Date:** 2025-01-23

## Directory Layout

```
src/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API routes by domain
│   │   ├── admin/            # Super-admin (service role)
│   │   ├── auth/             # Authentication, MFA
│   │   ├── webhooks/         # WhatsApp, Stripe webhooks
│   │   ├── contacts/         # Contact operations
│   │   ├── conversations/    # Conversation operations
│   │   ├── billing/          # Subscriptions, invoices
│   │   ├── automation/       # Workflow rules
│   │   ├── ai/               # AI features
│   │   ├── crm/              # CRM sync
│   │   └── [other domains]/
│   ├── dashboard/            # Protected user pages
│   │   ├── layout.tsx        # Dashboard sidebar
│   │   ├── inbox/            # Messages
│   │   ├── contacts/         # Contact management
│   │   ├── automation/       # Workflow builder
│   │   ├── billing/          # Subscription mgmt
│   │   └── [other pages]/
│   ├── admin/                # Super-admin interface
│   │   ├── organizations/    # Tenant management
│   │   ├── users/            # User management
│   │   ├── billing/          # Billing overview
│   │   └── [other pages]/
│   ├── auth/                 # Auth pages
│   │   ├── signin/
│   │   ├── signup/
│   │   └── [other auth]/
│   └── demo/                 # Demo pages
│
├── components/               # React components
│   ├── ui/                   # Base UI components
│   ├── auth/                 # Auth components
│   ├── dashboard/            # Dashboard components
│   ├── inbox/                # Messaging UI
│   ├── contacts/             # Contact UI
│   ├── automation/           # Workflow UI
│   ├── billing/              # Billing UI
│   ├── analytics/            # Analytics UI
│   └── [other features]/
│
├── lib/                      # Business logic
│   ├── supabase/             # Database clients
│   │   ├── server.ts         # RLS-enabled server
│   │   └── client.ts         # Browser client
│   ├── api/                  # API helpers
│   ├── auth/                 # Auth logic
│   ├── automation/           # Workflow engine
│   ├── whatsapp/             # WhatsApp API
│   ├── billing/              # Stripe integration
│   ├── crm/                  # CRM sync
│   ├── ai/                   # AI features
│   ├── security/             # Validation, encryption
│   ├── rbac/                 # Role-based access
│   ├── middleware/           # Request processing
│   ├── cache/                # Caching (Redis)
│   ├── queue/                # Job queues (BullMQ)
│   ├── gdpr/                 # Data privacy
│   ├── workflow/             # Workflow utilities
│   ├── media/                # File handling
│   ├── monitoring/           # Observability
│   ├── demo/                 # Demo utilities
│   └── [other utilities]/
│
├── stores/                   # Zustand state
│   └── workflow-store.ts     # Workflow state
│
├── types/                    # TypeScript defs
│   └── database.ts           # Auto-generated
│
├── contexts/                 # React contexts
│   └── demo-context.tsx
│
└── styles/                   # CSS
    └── globals.css
```

## Directory Purposes

**`src/app/api/`** - API routes organized by domain
- Each domain folder contains feature-related endpoints
- Dynamic routes use `[id]` naming
- `route.ts` defines HTTP handlers (GET, POST, PUT, DELETE)

**`src/app/dashboard/`** - Protected user dashboard
- Requires authentication
- Nested routes for features (inbox, contacts, etc.)
- `layout.tsx` provides sidebar navigation

**`src/app/admin/`** - Super-admin interface
- Restricted to super-admin role
- System management (organizations, users, billing)
- Uses service role client (bypasses RLS)

**`src/components/`** - React components
- Feature-organized (not file-type organized)
- UI base components in `ui/`
- Props-based data (no API calls)
- Client components for interactivity

**`src/lib/supabase/`** - Database client factories
- `server.ts`: RLS-enforced server client (must be awaited)
- `client.ts`: Browser-safe client

**`src/lib/auth/`** - Authentication logic
- Supabase Auth integration
- MFA (TOTP) support
- SSO (OAuth, SAML)

**`src/lib/automation/`** - Workflow automation
- WorkflowExecutionEngine: State machine for automation
- Load balancing: Capacity management
- Smart assignment: Task routing

**`src/lib/whatsapp/`** - WhatsApp Cloud API
- Client: API wrapper
- Service: High-level interface
- Bulk messaging and drip campaigns

**`src/lib/billing/`** - Stripe integration
- Subscription lifecycle management
- Usage tracking and metering
- Invoice generation
- Payment method management

**`src/lib/crm/`** - CRM integrations
- base-client.ts: Abstract interface
- Salesforce, HubSpot, Pipedrive: Platform implementations
- sync-manager.ts: Orchestrates bidirectional sync

**`src/lib/security/`** - Security utilities
- input-validation.ts: SQL injection detection, validators
- encryption.ts: Data encryption/decryption
- kms-client.ts: Key management
- RLS policy enforcement

**`src/lib/rbac/`** - Role-based access control
- Roles: owner, admin, agent, viewer
- Permission matrix
- Role checking and middleware

**`src/lib/middleware/`** - Request processing
- tenant-validation.ts: Multi-tenant isolation
- rate-limiter-redis.ts: Rate limiting
- cache-middleware.ts: Response caching
- session.ts: Session management

**`src/lib/cache/`** - Caching layer
- api-cache.ts: API response caching
- redis-client.ts: Redis connection
- l1-cache.ts: In-memory cache
- Cache keys include organizationId

**`src/lib/queue/`** - Async job processing
- bull-config.ts: BullMQ configuration
- processors/: Job processors (bulk message, contact import, etc.)
- queue-manager.ts: Queue orchestration

**`src/lib/gdpr/`** - Data privacy
- data-deletion.ts: Right to be forgotten
- data-export.ts: Data portability
- retention-policies.ts: Data retention
- anonymization.ts: Data anonymization

**`src/lib/workflow/`** - Workflow utilities
- execution-engine.ts: State machine
- templates.ts: Template loading and caching

**`src/lib/demo/`** - Demo mode utilities
- seed-*.ts: Data generators (contacts, conversations, workflows)
- demo.ts: Demo configuration

**`src/stores/`** - Global state management
- workflow-store.ts: Zustand store with persistence

**`supabase/migrations/`** - Database schema
- Step-numbered SQL files
- RLS policies for tenant isolation
- Table creation and indexes

**`tests/`** - Test suites
- e2e/: Playwright browser tests
- unit/: Jest component and utility tests
- integration/: Multi-component integration tests

## Key File Locations

**Authentication:**
- `src/lib/auth.ts`: getUser(), requireOrganization() with caching
- `src/lib/auth-optimized.ts`: Performance-optimized versions
- `src/app/api/auth/`: Login, MFA, session endpoints

**Database:**
- `src/lib/supabase/server.ts`: RLS-enabled server client (MUST be awaited)
- `src/lib/supabase/client.ts`: Browser client (synchronous)
- `src/types/database.ts`: Auto-generated from Supabase schema
- `supabase/migrations/`: RLS policies and schema

**Messaging:**
- `src/app/api/webhooks/whatsapp/route.ts`: WhatsApp webhook receiver
- `src/lib/whatsapp/client.ts`: WhatsApp API client
- `src/lib/whatsapp/service.ts`: High-level service
- `src/components/inbox/`: Inbox UI (conversation list, message input)

**Billing:**
- `src/app/api/webhooks/stripe/route.ts`: Stripe webhook receiver
- `src/lib/billing/subscription-lifecycle.ts`: State machine
- `src/lib/stripe/client.ts`, `server.ts`: Stripe utilities
- `src/components/billing/`: Billing UI (pricing, invoices, methods)

**Workflows:**
- `src/lib/workflow/execution-engine.ts`: Automation execution engine
- `src/lib/automation/load-balancer.ts`: Capacity management
- `src/lib/automation/smart-assignment.ts`: Task routing
- `src/components/automation/workflow-builder/`: Workflow canvas UI

**CRM Sync:**
- `src/lib/crm/sync-manager.ts`: Main orchestrator
- `src/lib/crm/[platform]/client.ts`: Platform-specific clients
- `src/lib/crm/[platform]/mapping.ts`: Data transformation
- `src/app/api/crm/sync/route.ts`: Sync trigger endpoint

**Security:**
- `src/lib/security/input-validation.ts`: Validators, injection detection
- `src/lib/security/encryption.ts`: Field-level encryption
- `src/lib/rbac/middleware.ts`: Role-based middleware
- `supabase/migrations/`: RLS policy definitions

**Caching:**
- `src/lib/cache/api-cache.ts`: API response cache with Redis backend
- `src/lib/middleware/cache-middleware.ts`: Caching middleware
- `src/lib/auth.ts`: React cache() for auth requests

**Rate Limiting:**
- `src/lib/middleware/rate-limiter-redis.ts`: Redis-backed limiter
- `src/lib/security/rate-limit.ts`: Rate limit utilities

**Job Processing:**
- `src/lib/queue/bull-config.ts`: BullMQ configuration
- `src/lib/queue/processors/bulk-message-processor.ts`: Bulk messaging
- `src/lib/queue/processors/contact-import-processor.ts`: Contact import
- `src/lib/queue/queue-manager.ts`: Queue orchestration

## Naming Conventions

**File Names:**
- Routes: `route.ts` (Next.js convention)
- Components: `ComponentName.tsx` (PascalCase)
- Utilities: `utility-name.ts` (kebab-case)
- Tests: `*.test.ts`, `*.spec.ts` (Jest)
- Migrations: `stepN_description.sql` or `YYYYMMDD_description.sql`

**Directory Names:**
- Feature domains: `kebab-case` (e.g., `workflow-builder`, `drip-campaigns`)
- Dynamic routes: `[brackets]` (e.g., `[id]`, `[organizationId]`)

**TypeScript:**
- Types/Interfaces: `PascalCase` (e.g., `WorkflowNode`, `ApiResponse`)
- Functions: `camelCase` (e.g., `getUser()`, `executeWorkflow()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_TTL`)
- Variables: `camelCase` (e.g., `userId`, `organizationId`)
- Booleans: `isX` or `hasX` prefix (e.g., `isDirty`, `hasError`)

**Database:**
- Tables: `snake_case` (e.g., `workflow_executions`, `contact_segments`)
- Columns: `snake_case` (e.g., `created_at`, `organization_id`)
- Foreign keys: `table_id` pattern (e.g., `organization_id`, `workflow_id`)
- Boolean columns: `is_active`, `has_error`

**API Routes:**
- GET: `/api/resource` (list), `/api/resource/[id]` (detail)
- POST: `/api/resource` (create)
- PUT: `/api/resource/[id]` (update)
- DELETE: `/api/resource/[id]` (delete)
- Custom: `/api/resource/[id]/action` (e.g., `/conversations/[id]/notes`)

## Where to Add New Code

**New API Feature:**
1. Create domain folder: `src/app/api/[feature]/`
2. Create service class: `src/lib/[feature]/`
3. API route: `src/app/api/[feature]/route.ts`
4. Add middleware if tenant isolation needed

**New React Component:**
1. File: `src/components/[feature]/ComponentName.tsx`
2. Mark with `'use client'` if interactive
3. Accept data via props (no API calls)
4. Use TypeScript for prop types

**New Database Table:**
1. Create migration: `supabase/migrations/stepN_*.sql`
2. Define RLS policies in migration
3. Generate types: `npx supabase gen types typescript`
4. Update `src/types/database.ts`

**New Background Job:**
1. Processor: `src/lib/queue/processors/job-processor.ts`
2. Register in `src/lib/queue/queue-manager.ts`
3. Trigger from API: `queueManager.add('jobType', jobData)`

**New CRM Integration:**
1. Platform folder: `src/lib/crm/platform-name/`
2. Implement `client.ts` and `mapping.ts`
3. Extend `src/lib/crm/base-client.ts`
4. Register in `src/lib/crm/sync-manager.ts`

**Tests:**
- Unit: `tests/unit/[feature].test.ts`
- E2E: `tests/e2e/[feature].spec.ts`
- Integration: `tests/integration/[feature].test.ts`
- Run: `npm run test`, `npm run test:e2e`

## Special Directories

**`src/app/admin/`** - Super-admin only
- Service role client enabled (bypasses RLS)
- System-wide operations
- Not for regular users

**`src/lib/demo/`** - Demo utilities
- Synthetic data generation
- Demo organization seeders
- Checked into version control

**`.next/`** - Build output
- Generated by `next build`
- Not committed to version control
- Deleted on clean builds

**`.planning/codebase/`** - Analysis documents
- ARCH.md: Architecture patterns
- STRUCT.md: Structure reference
- Used for code generation planning

---

*Structure analysis: 2025-01-23*
