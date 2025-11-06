# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADSapp is a production-ready **Multi-Tenant WhatsApp Business Inbox SaaS platform** built with Next.js 15, TypeScript 5, Supabase, and Stripe. The platform enables businesses to manage WhatsApp communication professionally with enterprise-level features including real-time messaging, intelligent automation, analytics, and subscription billing.

**Key Tech Stack:**

- **Frontend**: Next.js 15 App Router + React 19 + TypeScript 5 + Tailwind CSS 4
- **Backend**: Next.js API Routes + Supabase PostgreSQL + Row Level Security (RLS)
- **Integrations**: WhatsApp Business Cloud API + Stripe Payments + Resend Email
- **Deployment**: Vercel (frontend) + Supabase (database) + global CDN

## Essential Commands

### Development Workflow

```bash
# Start development server with Turbopack (fast compilation)
npm run dev

# Build for production (validates entire codebase)
npm run build

# Start production server (test production build locally)
npm run start

# Type checking (run before committing)
npm run type-check

# Linting (run before committing)
npm run lint
npm run lint:fix  # Auto-fix issues

# Code formatting
npm run format
npm run format:check
```

### Testing Commands

```bash
# Unit tests with Jest
npm run test              # Run all unit tests
npm run test:watch        # Watch mode for TDD
npm run test:coverage     # Coverage report
npm run test:ci           # CI pipeline testing

# End-to-end tests with Playwright
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run with UI inspector

# Security and performance
npm run test:security     # Security audit
npm run test:performance  # Lighthouse CI
```

### Database Operations

```bash
# Supabase migrations
npm run migration:generate  # Create new migration from schema changes
npm run migration:apply     # Apply pending migrations

# Direct Supabase commands (requires Supabase CLI)
npx supabase db reset      # Reset database to initial state
npx supabase db push       # Push local schema changes
npx supabase db pull       # Pull remote schema changes
```

### Deployment

```bash
# Production build analysis
npm run analyze  # Analyze bundle size

# Docker deployment
npm run docker:build
npm run docker:run
npm run docker:prod  # Production Docker compose

# Vercel deployment (recommended)
npx vercel --prod
```

## Architecture Overview

### Multi-Tenant Data Isolation

**Critical**: All database operations MUST respect tenant boundaries via Row Level Security (RLS).

**Pattern for data access:**

```typescript
// ✅ CORRECT: Uses RLS-enabled client (filters by organization_id automatically)
const supabase = await createClient()
const { data } = await supabase.from('contacts').select()

// ❌ WRONG: Service role bypasses RLS (only use for admin operations)
const serviceSupabase = createServiceRoleClient()
const { data } = await serviceSupabase.from('contacts').select()
```

**When to use Service Role Client:**

- Super admin operations in `/api/admin/*`
- Cross-tenant analytics
- Organization creation/deletion
- System maintenance tasks

### API Route Structure

All API routes follow RESTful conventions with consistent error handling:

```typescript
// Pattern for API routes
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization (multi-tenant context)
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Your business logic here (RLS automatically filters by organization)
    const { data, error } = await supabase.from('contacts').select()

    if (error) throw error

    return Response.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Component Patterns

**Server Components (Default):**

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('conversations').select();

  return <DashboardUI conversations={data} />;
}
```

**Client Components (Interactive UI):**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ConversationList() {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase.from('conversations').select().then(/* ... */);

    // Real-time subscription
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        // Handle real-time updates
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  return <div>{/* UI */}</div>;
}
```

### Database Schema Conventions

**Key Tables and Relationships:**

```
organizations (tenant root)
├── profiles (users within organization)
├── contacts (WhatsApp contacts)
├── conversations (chat threads)
│   └── messages (individual messages)
├── message_templates (reusable templates)
└── automation_rules (workflow automation)
```

**RLS Policy Pattern:**
Every table with `organization_id` has RLS policies enforcing tenant isolation:

```sql
CREATE POLICY tenant_isolation ON table_name
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

### Security Best Practices

**Input Validation (REQUIRED for all user inputs):**

```typescript
import { QueryValidators } from '@/lib/supabase/server'

// Validate UUID parameters
const orgValidation = QueryValidators.uuid(organizationId)
if (!orgValidation.isValid) {
  return Response.json({ error: 'Invalid organization ID' }, { status: 400 })
}

// Validate text inputs
const nameValidation = QueryValidators.text(name, 255)

// Validate enums
const statusValidation = QueryValidators.enum(status, ['active', 'suspended'])
```

**SQL Injection Prevention:**

```typescript
import { detectSQLInjection, validateSearchQuery } from '@/lib/supabase/server'

// ✅ CORRECT: Use query builders (Supabase client)
const { data } = await supabase.from('contacts').select().eq('organization_id', orgId)

// ✅ CORRECT: Sanitize search queries
const sanitizedQuery = validateSearchQuery(userInput)

// ❌ WRONG: Never use raw SQL with user input
// await supabase.rpc('raw_sql', { query: userInput })
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file: `src/app/api/your-endpoint/route.ts`
2. Implement HTTP methods (GET, POST, PUT, DELETE)
3. Add authentication check
4. Validate inputs with `QueryValidators`
5. Use RLS-enabled Supabase client
6. Add error handling
7. Write unit tests in `tests/unit/api/`
8. Test with `npm run test`

### Adding a New Database Table

1. Create migration: `npm run migration:generate`
2. Edit generated SQL file in `supabase/migrations/`
3. Add RLS policies for tenant isolation
4. Update TypeScript types in `src/types/database.ts`
5. Apply migration: `npm run migration:apply`
6. Test RLS policies thoroughly

### Adding Real-Time Features

```typescript
// Subscribe to table changes
const channel = supabase
  .channel('custom-channel-name')
  .on(
    'postgres_changes',
    {
      event: 'INSERT', // or 'UPDATE', 'DELETE', '*'
      schema: 'public',
      table: 'table_name',
      filter: 'column=eq.value', // Optional filter
    },
    payload => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup
return () => {
  channel.unsubscribe()
}
```

### Implementing WhatsApp Features

WhatsApp integration is centralized in `src/lib/whatsapp/`:

```typescript
import { WhatsAppClient } from '@/lib/whatsapp/client'

const client = new WhatsAppClient()

// Send message
await client.sendMessage({
  to: phoneNumber,
  message: text,
  organizationId: orgId,
})

// Process incoming webhook
// Handled in /api/webhooks/whatsapp/route.ts
```

## Testing Guidelines

### Unit Tests (Jest)

```typescript
// tests/unit/lib/your-module.test.ts
import { describe, it, expect } from '@jest/globals'

describe('YourModule', () => {
  it('should handle valid input', () => {
    const result = yourFunction(validInput)
    expect(result).toBe(expectedOutput)
  })

  it('should reject invalid input', () => {
    expect(() => yourFunction(invalidInput)).toThrow()
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test'

test('user can complete workflow', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="action-button"]')
  await expect(page.locator('.success-message')).toBeVisible()
})
```

**Running specific tests:**

```bash
# Run single test file
npm run test -- path/to/test.test.ts

# Run tests matching pattern
npm run test -- --testNamePattern="authentication"

# Run E2E for specific feature
npm run test:e2e -- tests/e2e/inbox.spec.ts
```

## Project Structure Quick Reference

```
src/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API routes (backend)
│   │   ├── admin/               # Super admin APIs
│   │   ├── auth/                # Authentication endpoints
│   │   ├── billing/             # Stripe integration
│   │   ├── conversations/       # Chat management
│   │   ├── contacts/            # Contact CRUD
│   │   ├── templates/           # Message templates
│   │   ├── analytics/           # Metrics & reporting
│   │   └── webhooks/            # WhatsApp & Stripe webhooks
│   ├── dashboard/               # Main app UI (protected)
│   │   ├── inbox/              # WhatsApp inbox interface
│   │   ├── contacts/           # Contact management
│   │   ├── automation/         # Workflow builder
│   │   ├── settings/           # User settings
│   │   └── analytics/          # Analytics dashboard
│   ├── admin/                   # Super admin interface
│   └── auth/                    # Login/signup pages
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   ├── dashboard/               # Dashboard-specific
│   ├── messaging/               # Chat interface
│   └── analytics/               # Charts & metrics
├── lib/                          # Utility libraries
│   ├── supabase/                # Database client
│   │   ├── server.ts           # Server-side client
│   │   └── client.ts           # Client-side client
│   ├── whatsapp/                # WhatsApp API integration
│   ├── billing/                 # Stripe integration
│   ├── security/                # Input validation, RPC
│   └── api-middleware.ts        # Request/response utilities
└── types/
    └── database.ts              # TypeScript database types

supabase/
└── migrations/                   # Database migrations
    ├── 001_initial_schema.sql
    ├── 002_super_admin_system.sql
    └── ...

tests/
├── unit/                         # Jest unit tests
├── integration/                  # Integration tests
└── e2e/                          # Playwright E2E tests
```

## Environment Variables

**Required for Development:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAb...your-token
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Stripe
STRIPE_SECRET_KEY=sk_test_...your-secret-key
STRIPE_PUBLIC_KEY=pk_test_...your-public-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret

# Optional
RESEND_API_KEY=re_...your-api-key
NEXTAUTH_SECRET=your-random-secret-256-bit
```

## Known Patterns & Conventions

### Import Aliases

Use TypeScript path aliases for clean imports:

```typescript
import { Component } from '@/components/ui/component'
import { helper } from '@/lib/helpers'
import type { User } from '@/types/database'
```

### Error Handling

Consistent error response format:

```typescript
return Response.json(
  {
    error: 'User-friendly message',
    code: 'ERROR_CODE',
    details: process.env.NODE_ENV === 'development' ? error : undefined,
  },
  { status: 400 }
)
```

### Authentication Flow

1. User signs in via `/api/auth/signin`
2. Supabase sets auth cookies
3. Middleware validates session on protected routes
4. `createClient()` automatically includes user context
5. RLS policies enforce data access based on user's organization

### File Upload Pattern

```typescript
// Client-side upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('media')
  .upload(`${organizationId}/${fileName}`, file)

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('media').getPublicUrl(path)
```

## Troubleshooting Common Issues

### TypeScript Errors During Build

```bash
# Check specific errors
npm run type-check

# Common fix: Regenerate types from Supabase
npx supabase gen types typescript --linked > src/types/database.ts
```

### Database Connection Issues

```bash
# Verify Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Check Supabase status
npx supabase status --linked
```

### RLS Policy Debugging

```typescript
// Temporarily disable RLS to test (DEV ONLY)
const { data } = await serviceSupabase.from('table').select()

// Check user's organization context
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()
console.log('User org:', profile?.organization_id)
```

### Webhook Testing

```bash
# Test WhatsApp webhook locally with ngrok
ngrok http 3000
# Update WhatsApp webhook URL to: https://your-ngrok-url.ngrok.io/api/webhooks/whatsapp

# Test Stripe webhook with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Performance Considerations

1. **Use Server Components** by default - they're faster and reduce client bundle
2. **Parallel data fetching** in Server Components:
   ```typescript
   const [users, conversations, analytics] = await Promise.all([
     supabase.from('users').select(),
     supabase.from('conversations').select(),
     supabase.from('analytics').select(),
   ])
   ```
3. **Cache Supabase queries** where appropriate using Next.js cache helpers
4. **Optimize images** - Next.js Image component handles this automatically
5. **Monitor bundle size** - Run `npm run analyze` to identify large dependencies

## Git Workflow

This project uses conventional commits and has quality gates:

```bash
# Commit format
git commit -m "feat: add contact export feature"
git commit -m "fix: resolve authentication bug"
git commit -m "docs: update API documentation"

# Pre-commit hooks run automatically:
# - Linting (ESLint)
# - Formatting (Prettier)
# - Type checking (TypeScript)
```

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass: `npm run test:ci`
- [ ] Build succeeds: `npm run build`
- [ ] Type checking passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Security audit clean: `npm run test:security`
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied to production
- [ ] Webhook URLs updated (WhatsApp, Stripe)
- [ ] Supabase RLS policies verified
- [ ] Stripe webhook endpoint verified

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js 15 Docs**: https://nextjs.org/docs
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Stripe Docs**: https://stripe.com/docs
- **Playwright Docs**: https://playwright.dev
