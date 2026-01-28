# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
C:\Ai Projecten\ADSapp/
├── .github/                    # GitHub workflows (CI/CD)
├── .planning/                  # GSD planning documents
├── .agent/                     # Agent skill definitions
├── middleware.ts               # Next.js middleware (auth, i18n, tenant routing)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.ts              # Jest test configuration
├── playwright.config.ts         # Playwright E2E configuration
├── package.json                # Dependencies and scripts
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, API routes)
│   │   ├── (auth)/             # Authentication group (hidden in URL)
│   │   │   └── oauth/          # OAuth consent page
│   │   ├── admin/              # Super-admin dashboard (role-gated)
│   │   ├── admin-setup/        # Initial admin setup
│   │   ├── auth/               # Authentication pages (login, signup)
│   │   ├── dashboard/          # Main application (protected)
│   │   │   ├── inbox/          # Conversation inbox
│   │   │   ├── conversations/  # Conversation detail view
│   │   │   ├── contacts/       # Contact management
│   │   │   ├── analytics/      # Analytics dashboard
│   │   │   ├── automation/     # Workflow/automation builder
│   │   │   ├── billing/        # Subscription management
│   │   │   ├── templates/      # Message templates
│   │   │   ├── settings/       # Organization settings
│   │   │   └── ...             # Other dashboard sections
│   │   ├── api/                # REST API endpoints
│   │   │   ├── admin/          # Super-admin endpoints (bypass RLS)
│   │   │   ├── webhooks/       # Incoming webhooks (WhatsApp, Stripe)
│   │   │   ├── conversations/  # Conversation CRUD
│   │   │   ├── contacts/       # Contact CRUD
│   │   │   ├── ai/             # AI features (drafts, sentiment, etc.)
│   │   │   ├── messages/       # Message CRUD
│   │   │   ├── analytics/      # Analytics data
│   │   │   ├── billing/        # Payment/subscription endpoints
│   │   │   ├── automation/     # Workflow endpoints
│   │   │   ├── whatsapp/       # WhatsApp API endpoints
│   │   │   ├── media/          # Media upload/download
│   │   │   ├── auth/           # Auth endpoints (login, logout, callbacks)
│   │   │   ├── templates/      # Template management
│   │   │   ├── cron/           # Scheduled tasks
│   │   │   ├── health/         # Health check endpoint
│   │   │   └── ...             # Other feature APIs (50+ total)
│   │   ├── demo/               # Demo mode pages (unprotected)
│   │   ├── features/           # Feature showcase pages
│   │   ├── faq/                # FAQ pages
│   │   ├── onboarding/         # Onboarding flows
│   │   ├── layout.tsx          # Root layout (providers, global styles)
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components (button, input, modal, etc.)
│   │   ├── dashboard/          # Dashboard layout components
│   │   ├── inbox/              # Conversation inbox UI
│   │   ├── messaging/          # Message/chat UI
│   │   ├── contacts/           # Contact management UI
│   │   ├── analytics/          # Analytics charts and dashboards
│   │   ├── automation/         # Workflow builder UI
│   │   ├── billing/            # Billing/payment UI
│   │   ├── ai/                 # AI feature components
│   │   ├── admin/              # Admin panel components
│   │   ├── auth/               # Auth form components
│   │   ├── accessibility/      # WCAG compliance and a11y components
│   │   ├── performance/        # Performance monitoring (Web Vitals)
│   │   └── ...                 # Other feature components
│   │
│   ├── lib/                    # Business logic and utilities
│   │   ├── supabase/           # Database client factories
│   │   │   ├── server.ts       # Server-side Supabase client
│   │   │   ├── client.ts       # Browser-side Supabase client
│   │   │   └── middleware.ts   # Supabase session middleware
│   │   │
│   │   ├── whatsapp/           # WhatsApp integration
│   │   │   ├── enhanced-client.ts
│   │   │   ├── order-handler.ts
│   │   │   └── ...
│   │   │
│   │   ├── ai/                 # AI features
│   │   │   ├── drafts.ts       # Draft suggestion
│   │   │   ├── sentiment.ts    # Sentiment analysis
│   │   │   ├── auto-response.ts
│   │   │   ├── openrouter.ts   # LLM provider integration
│   │   │   └── ...
│   │   │
│   │   ├── channels/           # Multi-channel abstraction
│   │   │   ├── router.ts       # Unified message router
│   │   │   ├── adapters/       # Channel-specific adapters (WhatsApp, SMS, email future)
│   │   │   ├── contact-dedup.ts
│   │   │   └── ...
│   │   │
│   │   ├── security/           # Security utilities
│   │   │   ├── input-validation.ts
│   │   │   ├── audit-service.ts
│   │   │   ├── encryption.ts
│   │   │   ├── logger.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── ...
│   │   │
│   │   ├── billing/            # Stripe integration
│   │   │   ├── stripe.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── ...
│   │   │
│   │   ├── automation/         # Workflow engine
│   │   ├── queue/              # Job queue (BullMQ)
│   │   ├── jobs/               # Background job handlers
│   │   ├── cache/              # Redis caching
│   │   ├── media/              # Media storage and handling
│   │   ├── crm/                # CRM integrations (Salesforce, HubSpot, etc.)
│   │   ├── contacts/           # Contact management
│   │   ├── i18n/               # Localization
│   │   ├── email/              # Email templates and sending
│   │   ├── telemetry/          # OpenTelemetry instrumentation
│   │   ├── auth/               # Authentication utilities
│   │   ├── middleware/         # API middleware
│   │   ├── api/                # API utilities
│   │   ├── utils/              # General utilities
│   │   └── ...                 # Other domain-specific libraries
│   │
│   ├── stores/                 # Zustand state management
│   │   └── workflow-store.ts   # Workflow builder state
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── database.ts         # Supabase-generated database types
│   │   ├── index.ts            # Re-exported common types
│   │   ├── ai.ts               # AI-related types
│   │   ├── workflow.ts         # Workflow types
│   │   ├── whatsapp-catalog.ts # WhatsApp catalog types
│   │   └── ...                 # Other domain types
│   │
│   ├── contexts/               # React context providers
│   │   └── demo-context.tsx    # Demo mode context
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── usePresence.ts      # Real-time presence tracking
│   │
│   ├── styles/                 # Global and component styles
│   │   └── accessibility.css   # Accessibility styles
│   │
│   ├── locales/                # i18n translation files
│   │   ├── en/                 # English translations
│   │   └── nl/                 # Dutch translations
│   │
│   └── middleware.ts           # (Some middleware in src/)
│
├── tests/                      # Test files
│   ├── unit/                   # Jest unit tests
│   ├── integration/            # Integration tests
│   ├── e2e/                    # Playwright E2E tests
│   ├── components/             # React component tests
│   ├── fixtures/               # Test data and mocks
│   ├── helpers/                # Test utilities
│   ├── load/                   # Load testing (k6, Artillery)
│   ├── mocks/                  # Mock data and handlers
│   └── setup.ts                # Test configuration
│
├── supabase/                   # Supabase migrations
│   └── migrations/             # SQL migration files
│
├── scripts/                    # Utility scripts
│   ├── generate-encryption-key.ts
│   ├── migrate-encryption.ts
│   └── ...
│
└── public/                     # Static assets
    ├── images/
    └── ...
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js 15 App Router - pages, layouts, API routes
- Contains: Page components, layout providers, API route handlers
- Key files: `layout.tsx` (root provider), `page.tsx` (landing), `middleware.ts`

**`src/app/api/`:**
- Purpose: REST API endpoints organized by feature domain
- Contains: 50+ route handlers for conversations, contacts, webhooks, AI, billing, etc.
- Pattern: Each feature in subdirectory with `route.ts` handler

**`src/components/`:**
- Purpose: React UI component library organized by domain
- Contains: UI building blocks and feature-specific components
- Pattern: Folder-per-feature with index.ts barrel exports

**`src/lib/`:**
- Purpose: Business logic, service layer, integrations, utilities
- Contains: Domain-specific services (WhatsApp, AI, Billing), security, utilities
- Pattern: Folder-per-domain with main service file + supporting utilities

**`src/lib/supabase/`:**
- Purpose: Database client abstraction for multi-tenant isolation
- Contains: Server client factory (async), service role client, middleware
- Key files: `server.ts` (RLS-enforced), `client.ts` (browser), `middleware.ts`

**`src/lib/security/`:**
- Purpose: Security utilities (validation, encryption, audit logging)
- Contains: Input validators, encryption, rate limiting, audit service, secure RPC wrapper
- Key files: `input-validation.ts`, `encryption.ts`, `logger.ts`

**`src/types/`:**
- Purpose: TypeScript type definitions and interfaces
- Contains: Supabase database schema types, domain types, shared interfaces
- Key files: `database.ts` (auto-generated from Supabase), `index.ts` (re-exports)

**`tests/`:**
- Purpose: All test files (unit, integration, E2E, load testing)
- Contains: Jest tests, Playwright tests, test fixtures, mocks, helpers
- Pattern: Mirror `src/` structure in `tests/unit/`, domain-based in `tests/integration/`

**`supabase/migrations/`:**
- Purpose: Database migration files (SQL)
- Contains: Incremental schema changes, RLS policies, triggers
- Pattern: Numbered migration files with descriptive names

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Landing page (public, unauthenticated)
- `src/app/layout.tsx`: Root layout with providers and global setup
- `src/app/dashboard/layout.tsx`: Protected dashboard layout with role checks
- `src/app/admin/layout.tsx`: Super-admin dashboard (service role context)
- `middleware.ts` (project root): Next.js middleware for auth, i18n, tenant routing

**Authentication:**
- `src/app/auth/signin/page.tsx`: Login page
- `src/app/auth/signup/page.tsx`: Registration page
- `src/lib/auth.ts`: Auth utilities and helpers
- `src/lib/supabase/server.ts`: Session management via Supabase Auth

**Core APIs:**
- `src/app/api/conversations/[id]/route.ts`: Conversation CRUD
- `src/app/api/contacts/route.ts`: Contact management
- `src/app/api/messages/route.ts`: Message handling
- `src/app/api/webhooks/whatsapp/route.ts`: WhatsApp webhook entry point
- `src/app/api/webhooks/stripe/route.ts`: Stripe webhook entry point

**Database Layer:**
- `src/lib/supabase/server.ts`: Server-side client with RLS enforcement
- `src/lib/supabase/client.ts`: Browser-side client
- `src/types/database.ts`: Auto-generated database types from Supabase

**Services:**
- `src/lib/whatsapp/enhanced-client.ts`: WhatsApp API wrapper
- `src/lib/ai/openrouter.ts`: LLM integration (AI features)
- `src/lib/billing/stripe.ts`: Stripe payment integration
- `src/lib/automation/workflow-engine.ts`: Automation rule execution

**UI Components:**
- `src/components/ui/`: Base components (button, input, modal, etc.)
- `src/components/inbox/whatsapp-inbox.tsx`: Main conversation inbox
- `src/components/messaging/`: Chat interface components
- `src/components/analytics/`: Dashboard charts

**Configuration:**
- `package.json`: Dependencies and npm scripts
- `next.config.ts`: Next.js configuration
- `tsconfig.json`: TypeScript configuration
- `jest.config.ts`: Jest configuration
- `.env.local`: Environment variables (not committed)

**Testing:**
- `tests/e2e/`: Playwright end-to-end tests
- `tests/unit/`: Jest unit tests
- `tests/fixtures/`: Test data and mocks
- `tests/setup.ts`: Global test configuration

## Naming Conventions

**Files:**
- Page files: `page.tsx` (Next.js convention)
- Route handlers: `route.ts` (Next.js convention)
- Components: `ComponentName.tsx` (PascalCase)
- Utilities: `kebab-case.ts` (lowercase with hyphens)
- Migrations: `YYYYMMDDHHMMSS_description.sql` (timestamp + description)
- Tests: `name.test.ts` or `name.spec.ts` (Jest convention)

**Directories:**
- Feature folders: `kebab-case` (lowercase with hyphens)
- API route folders: `[param]` for dynamic routes, `$slug` forbidden (Next.js)
- Grouped routes: `(group)` for hidden route groups (Next.js)

**Functions & Variables:**
- Functions: `camelCase` (e.g., `createClient`, `fetchConversations`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RATE_LIMIT`, `API_TIMEOUT`)
- Types/Interfaces: `PascalCase` (e.g., `Conversation`, `Organization`)
- Store state: `camelCase` properties in Zustand stores

**Import Organization:**
- Order: React/Next → Third-party → Internal `@/components/` → Internal `@/lib/` → Types → Styles
- Example:
  ```typescript
  import React, { useState } from 'react'
  import { createClient } from '@supabase/supabase-js'
  import { Button } from '@/components/ui/button'
  import { fetchConversations } from '@/lib/conversations'
  import type { Conversation } from '@/types'
  import './styles.css'
  ```

## Where to Add New Code

**New Feature (End-to-End):**
1. **API Endpoint:** `src/app/api/feature-name/route.ts`
2. **Service Logic:** `src/lib/feature-name/` (create folder with main service file)
3. **Components:** `src/components/feature-name/` (create folder with components)
4. **Types:** Add to `src/types/feature-name.ts` or `src/types/index.ts`
5. **Tests:**
   - Unit: `tests/unit/lib/feature-name.test.ts`
   - E2E: `tests/e2e/feature-name.spec.ts`
   - Integration: `tests/integration/api/feature-name.test.ts`
6. **Database:** If new tables needed, create migration in `supabase/migrations/`

**New Component/Module:**
- Implementation: `src/components/domain/ComponentName.tsx`
- Tests: `tests/components/ComponentName.test.tsx`
- Export: Add to `src/components/domain/index.ts` for barrel export

**Utilities/Helpers:**
- Shared helpers: `src/lib/utils/` (general utilities)
- Domain-specific: `src/lib/domain/utils.ts` (within domain folder)
- Test helpers: `tests/helpers/` (reusable test utilities)

**Adding to Existing Features:**
- New route handler: Add file in existing `src/app/api/feature/route.ts` or subdirectory
- New component: Add to `src/components/feature/NewComponent.tsx`
- New service: Add file to `src/lib/feature/new-service.ts`
- New validation: Add to `src/lib/security/input-validation.ts`

## Special Directories

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Generated: Via `npm run migration:generate`
- Committed: Yes (tracked in Git)
- Pattern: SQL files with timestamp prefix, applied sequentially

**`tests/`:**
- Purpose: Test files (not shipped to production)
- Generated: Via `npm run test` or manually created
- Committed: Yes (test files are part of codebase)
- Pattern: Mirrors source structure with `.test.ts` or `.spec.ts` suffix

**`public/`:**
- Purpose: Static assets served by CDN/web server
- Generated: No
- Committed: Yes (static assets)
- Pattern: Organized by type (images/, fonts/, etc.)

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Via `npm run build`
- Committed: No (in .gitignore)
- Pattern: Auto-managed by Next.js

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Via `npm install`
- Committed: No (in .gitignore)
- Pattern: Auto-managed by npm

**`.env.local`:**
- Purpose: Environment variables (secrets)
- Generated: Manual creation
- Committed: No (in .gitignore)
- Pattern: Key=value pairs, never commit

---

*Structure analysis: 2026-01-28*
