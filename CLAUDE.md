# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADSapp is a **Multi-Tenant WhatsApp Business Inbox SaaS platform** built with Next.js 15, TypeScript, Supabase, and Stripe. The platform enables businesses to manage WhatsApp communication with features including real-time messaging, AI automation, analytics, and subscription billing.

**Tech Stack:**
- **Frontend**: Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Next.js API Routes + Supabase PostgreSQL + Row Level Security (RLS)
- **Integrations**: WhatsApp Business Cloud API + Stripe Payments + Resend Email
- **State**: Zustand for client state management

## Essential Commands

```bash
# Development
npm run dev              # Start dev server (standard)
npm run dev:turbo        # Start with Turbopack (faster)
npm run build            # Production build
npm run type-check       # TypeScript checking
npm run lint             # ESLint
npm run lint:fix         # Auto-fix lint issues

# Testing
npm run test             # Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI inspector

# Run specific test file
npm run test -- path/to/test.test.ts
npm run test -- --testNamePattern="pattern"
npm run test:e2e -- tests/e2e/specific.spec.ts

# Route auditing (uses Playwright)
npm run test:routes:owner   # Test owner role routes
npm run test:routes:admin   # Test admin role routes
npm run test:routes:agent   # Test agent role routes
npm run test:routes:404     # Check for 404s
npm run test:routes:audit   # Full route audit

# Database
npm run migration:generate  # Generate migration from schema diff
npm run migration:apply     # Apply pending migrations
npx supabase db reset       # Reset to initial state (requires Supabase CLI)

# Security & Performance
npm run test:security       # npm audit
npm run test:performance    # Lighthouse CI
npm run analyze             # Bundle analyzer

# Load Testing
npm run load:generate-data  # Generate test data
npm run load:k6             # Run k6 load tests
npm run load:artillery      # Run Artillery tests
```

## Architecture: Multi-Tenant Data Isolation

**Critical**: All database operations MUST respect tenant boundaries via Row Level Security (RLS).

```typescript
// Server-side: RLS-enabled client (ALWAYS use this for user data)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // Note: must be awaited
const { data } = await supabase.from('contacts').select()  // Auto-filtered by org

// Client-side: Browser client
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // Synchronous

// Service role: ONLY for admin operations (bypasses RLS)
import { createServiceRoleClient } from '@/lib/supabase/server'
const serviceSupabase = createServiceRoleClient()  // Use in /api/admin/* only
```

**Service Role Client is ONLY for:**
- Super admin operations in `/api/admin/*`
- Cross-tenant analytics
- Organization creation/deletion
- System maintenance

## Input Validation (Required for API Routes)

All API routes must validate user inputs using `QueryValidators`:

```typescript
import { QueryValidators, detectSQLInjection, validateSearchQuery } from '@/lib/supabase/server'

// Validate parameters
const orgValidation = QueryValidators.uuid(organizationId)
if (!orgValidation.isValid) {
  return Response.json({ error: 'Invalid organization ID' }, { status: 400 })
}

// Other validators
QueryValidators.text(name, 255)
QueryValidators.email(email)
QueryValidators.enum(status, ['active', 'suspended'])
QueryValidators.integer(limit, 1, 100)
QueryValidators.date(startDate)
QueryValidators.boolean(isActive)

// Sanitize search queries
const sanitizedQuery = validateSearchQuery(userInput)

// Detect injection attempts
if (detectSQLInjection(input)) {
  return Response.json({ error: 'Invalid input' }, { status: 400 })
}
```

## Database Schema (Key Tables)

```
organizations (tenant root)
├── profiles (users within organization)
├── contacts (WhatsApp contacts)
├── conversations (chat threads)
│   └── messages (individual messages)
├── message_templates (reusable templates)
├── automation_rules (workflow automation)
├── ai_settings (AI configuration per org)
└── ai_responses (AI usage tracking)
```

Every table with `organization_id` has RLS policies enforcing tenant isolation.

## API Route Pattern

```typescript
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization context
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // 3. Validate inputs (if applicable)
    // 4. Execute query (RLS auto-filters by organization)
    // 5. Return response

    return Response.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Real-Time Subscriptions

```typescript
// Client component pattern
'use client'
import { createClient } from '@/lib/supabase/client'

useEffect(() => {
  const supabase = createClient()

  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', {
      event: '*',  // or 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: 'table_name',
      filter: 'column=eq.value',  // optional
    }, (payload) => {
      // Handle change
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}, [])
```

## Key Libraries & Integrations

| Feature | Location | Notes |
|---------|----------|-------|
| WhatsApp API | `src/lib/whatsapp/` | Message sending, webhooks |
| Stripe Billing | `src/lib/billing/`, `src/lib/stripe/` | Subscriptions, payments |
| AI Features | `src/lib/ai/` | Drafts, sentiment, auto-response |
| Workflow Engine | `src/lib/automation/` | Load balancing, smart assignment |
| CRM Sync | `src/lib/crm/` | Salesforce, HubSpot, Pipedrive |
| Security | `src/lib/security/` | Input validation, encryption, RPC |

## User Roles & Permissions

- **Owner**: Full platform access, billing, organization settings
- **Admin**: Team management, workflows, templates, analytics
- **Agent**: Inbox access, conversation handling, contact management
- **Viewer**: Read-only analytics access

Role checks are typically done via `profile.role` after authentication.

## Environment Variables

Required:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional:
```env
RESEND_API_KEY=re_...
OPENROUTER_API_KEY=sk-or-...  # For AI features
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── admin/        # Super admin (service role client)
│   │   ├── webhooks/     # WhatsApp & Stripe webhooks
│   │   └── ...           # Feature APIs (conversations, contacts, etc.)
│   ├── dashboard/        # Protected app pages
│   ├── admin/            # Super admin interface
│   └── auth/             # Login/signup pages
├── components/
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard-specific
│   ├── messaging/        # Chat interface
│   └── analytics/        # Charts & metrics
├── lib/
│   ├── supabase/         # Database clients (server.ts, client.ts)
│   ├── whatsapp/         # WhatsApp API integration
│   ├── billing/          # Stripe integration
│   ├── ai/               # AI features
│   ├── automation/       # Workflow engine
│   └── security/         # Validation, encryption
├── stores/               # Zustand stores
└── types/
    └── database.ts       # TypeScript database types

tests/
├── e2e/                  # Playwright E2E tests
├── unit/                 # Jest unit tests
├── integration/          # Integration tests
├── components/           # React component tests
└── fixtures/             # Test data

supabase/
└── migrations/           # Database migrations
```

## Troubleshooting

**TypeScript errors**: Regenerate types from Supabase
```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

**RLS debugging**: Check user's organization context
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()
console.log('User org:', profile?.organization_id)
```

**Webhook testing locally**:
```bash
# WhatsApp (requires ngrok)
ngrok http 3000
# Update webhook URL to: https://xxx.ngrok.io/api/webhooks/whatsapp

# Stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `OnboardingForm.tsx` |
| Pages/Routes | kebab-case | `forgot-password/page.tsx` |
| Utilities | camelCase | `api-middleware.ts` |
| Functions | camelCase | `createClient` |
| Constants | UPPER_SNAKE | `RATE_LIMIT_MAX` |
| Types/Interfaces | PascalCase | `Organization` |

**Import order**: React/Next → Third-party → Internal components (`@/components/`) → Internal lib (`@/lib/`) → Types

## Known Configuration Notes

- TypeScript strict mode is disabled (`strict: false` in tsconfig.json)
- ESLint and TypeScript errors are ignored during builds (see `next.config.ts`)
- The project uses path aliases: `@/*` maps to `./src/*`

## Current Tech Debt

**Be aware when working in this codebase:**

- **200+ files** have `@ts-nocheck` - primarily due to database types being out of sync
- **Duplicate React Flow deps**: Both `@xyflow/react` and `reactflow` are installed (prefer `@xyflow/react`)
- **Root cause**: Run `npx supabase gen types typescript --linked > src/types/database.ts` to fix type mismatches

See `.planning/codebase/CONCERNS.md` for full technical debt tracking.
