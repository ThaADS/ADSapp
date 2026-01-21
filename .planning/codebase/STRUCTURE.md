# Directory Structure

**Generated:** 2026-01-21

## Root Layout

```
ADSapp/
├── .planning/              # GSD planning documents (new)
│   └── codebase/           # Codebase mapping documents
├── public/                 # Static assets
├── src/                    # Source code
├── supabase/               # Database migrations
├── tests/                  # Test suites
├── scripts/                # Utility scripts
├── .github/                # GitHub workflows
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js config
├── tailwind.config.ts      # Tailwind config
├── jest.config.js          # Jest config
├── playwright.config.ts    # E2E config
└── docker-compose.yml      # Docker setup
```

## Source Code (`src/`)

### App Router (`src/app/`)

```
src/app/
├── page.tsx                # Landing page
├── layout.tsx              # Root layout
├── globals.css             # Global styles
│
├── auth/                   # Authentication pages
│   ├── login/
│   ├── signup/
│   ├── forgot-password/
│   └── callback/
│
├── dashboard/              # Protected dashboard
│   ├── layout.tsx          # Dashboard layout
│   ├── page.tsx            # Dashboard home
│   ├── inbox/              # Team inbox
│   ├── contacts/           # Contact management
│   ├── templates/          # Message templates
│   ├── workflows/          # Workflow builder
│   │   └── [id]/
│   │       └── analytics/
│   ├── analytics/          # Analytics dashboard
│   ├── team/               # Team management
│   ├── settings/           # Organization settings
│   │   ├── crm/
│   │   └── billing/
│   └── broadcast/          # Bulk messaging
│
├── admin/                  # Super admin interface
│   ├── analytics/
│   ├── audit-logs/
│   ├── billing/
│   ├── organizations/
│   ├── security/
│   ├── settings/
│   ├── users/
│   └── webhooks/
│
├── onboarding/             # New user onboarding
├── demo/                   # Demo mode
├── debug-profile/          # Debug utilities
│
└── api/                    # API Routes
    ├── admin/              # Admin APIs (service role)
    │   ├── analytics/
    │   ├── audit-logs/
    │   ├── billing/
    │   ├── organizations/
    │   ├── security/
    │   ├── users/
    │   └── webhooks/
    │
    ├── ai/                 # AI endpoints
    │   ├── auto-response/
    │   ├── drafts/
    │   ├── feedback/
    │   └── sentiment/
    │
    ├── analytics/          # Analytics endpoints
    │   ├── advanced/
    │   └── export/
    │
    ├── billing/            # Billing endpoints
    │   ├── analytics/
    │   ├── checkout/
    │   ├── plans/
    │   └── portal/
    │
    ├── contacts/           # Contact CRUD
    ├── conversations/      # Conversation management
    ├── crm/                # CRM integration
    │   ├── sync/
    │   └── webhooks/
    │
    ├── drip-campaigns/     # Drip campaigns
    │   └── [id]/
    │
    ├── messages/           # Message sending
    ├── onboarding/         # Onboarding flow
    ├── payments/           # Payment links
    ├── templates/          # Message templates
    │
    ├── webhooks/           # External webhooks
    │   ├── whatsapp/
    │   └── stripe/
    │
    ├── widget/             # Embeddable widget
    │   └── embed/[organizationId]/
    │
    └── workflows/          # Workflow engine
        └── [id]/
            ├── analytics/
            └── execute/
```

### Components (`src/components/`)

```
src/components/
├── ui/                     # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
│
├── dashboard/              # Dashboard-specific
│   ├── header.tsx
│   ├── nav.tsx
│   ├── layout-client.tsx
│   └── charts/
│
├── messaging/              # Chat interface
│   ├── rich-text-editor.tsx
│   └── ...
│
├── analytics/              # Analytics components
│   ├── advanced-analytics-dashboard.tsx
│   ├── charts.tsx
│   └── exporter.tsx
│
├── automation/             # Workflow components
│   └── workflow-canvas.tsx
│
├── broadcast/              # Bulk messaging UI
│
├── contacts/               # Contact components
│   └── csv-importer.tsx
│
├── drip-campaigns/         # Campaign UI
│
├── onboarding/             # Onboarding flow
│   ├── OnboardingForm.tsx
│   └── ProviderSelector.tsx
│
├── settings/               # Settings panels
│   ├── ai-settings.tsx
│   └── billing-panel.tsx
│
├── templates/              # Template editor
│   └── template-editor.tsx
│
├── workflow/               # Workflow builder
│   └── workflow-canvas.tsx
│
└── error-boundary.tsx      # Error handling
```

### Library Code (`src/lib/`)

```
src/lib/
├── supabase/               # Database layer
│   ├── server.ts           # Server client + validators
│   ├── client.ts           # Browser client
│   └── rpc-functions.ts    # Secure RPCs
│
├── whatsapp/               # WhatsApp integration
│   ├── enhanced-client.ts
│   ├── service.ts
│   ├── media-handler.ts
│   ├── bulk-messaging.ts
│   ├── drip-campaigns.ts
│   └── webhooks.ts
│
├── billing/                # Stripe integration
│   ├── stripe.ts
│   └── usage.ts
│
├── stripe/                 # Payment features
│   └── payment-links.ts
│
├── ai/                     # AI features
│   ├── openrouter.ts
│   ├── drafts.ts
│   ├── sentiment.ts
│   └── auto-response.ts
│
├── automation/             # Workflow engine
│   ├── load-balancer.ts
│   └── smart-assignment.ts
│
├── workflow/               # Workflow logic
│   ├── execution-engine.ts
│   └── templates.ts
│
├── crm/                    # CRM integration
│   └── sync-manager.ts
│
├── auth/                   # Authentication
│   ├── sso/
│   │   ├── saml.ts
│   │   └── oauth.ts
│   └── ...
│
├── auth.ts                 # Auth utilities
├── auth-optimized.ts       # Optimized auth
│
├── contacts/               # Contact logic
│   ├── scoring.ts
│   └── segmentation.ts
│
├── security/               # Security utilities
│   └── encryption.ts
│
├── middleware/             # Middleware utilities
│   └── whatsapp-webhook-validator.ts
│
├── jobs/                   # Background jobs
│   └── crm-sync.ts
│
├── demo/                   # Demo mode
│
├── api-middleware.ts       # API middleware stack
├── lazy-imports.tsx        # Dynamic imports
└── utils.ts                # Shared utilities
```

### State Management (`src/stores/`)

```
src/stores/
├── workflow-store.ts       # Workflow builder state
├── usePresence.ts          # Online presence
└── demo-context.tsx        # Demo mode context
```

### Types (`src/types/`)

```
src/types/
├── database.ts             # Database types (Supabase)
└── workflow.ts             # Workflow types
```

## Tests (`tests/`)

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── 01-landing-page.spec.ts
│   └── ...
│
├── unit/                   # Jest unit tests
│   └── encryption.test.ts
│
├── integration/            # Integration tests
│   └── encryption-flow.test.ts
│
├── components/             # Component tests
│
├── load/                   # Load testing
│   ├── k6-scenarios.js
│   ├── artillery-config.yml
│   └── data/
│
├── fixtures/               # Test data
└── README.md               # Test documentation
```

## Database (`supabase/`)

```
supabase/
├── migrations/             # SQL migrations
│   ├── 20251203_security_hardening.sql
│   ├── 20251204_fix_profiles_rls_recursion.sql
│   └── step*_*.sql         # Sequential fixes
│
└── .temp/                  # Supabase CLI temp files
```

## Key File Locations

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.ts` | Next.js settings |
| `tailwind.config.ts` | Tailwind CSS config |
| `jest.config.js` | Jest test config |
| `playwright.config.ts` | E2E test config |
| `.env.local` | Environment variables |

### Entry Points
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Landing page |
| `src/app/layout.tsx` | Root layout |
| `src/middleware.ts` | Next.js middleware |
| `src/app/dashboard/layout.tsx` | Dashboard shell |

### Core Logic
| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Database client + validators |
| `src/lib/whatsapp/enhanced-client.ts` | WhatsApp client |
| `src/lib/api-middleware.ts` | API middleware stack |
| `src/lib/auth.ts` | Authentication utilities |

---
*Structure mapped: 2026-01-21*
