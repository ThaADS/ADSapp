# Architecture

**Generated:** 2026-01-21

## Overview

ADSapp is a **Multi-Tenant WhatsApp Business Inbox SaaS** built with Next.js 15 App Router. The architecture follows a layered approach with strict tenant isolation via Supabase Row Level Security (RLS).

## Architectural Pattern

**Pattern:** Layered Architecture with Multi-Tenant Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (Next.js App Router, React Components, Zustand State)       │
├─────────────────────────────────────────────────────────────┤
│                    API Layer                                 │
│  (Next.js API Routes, Middleware, Input Validation)          │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                      │
│  (lib/whatsapp, lib/billing, lib/automation, lib/ai)        │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                         │
│  (Supabase Client with RLS, Redis Cache)                    │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  (WhatsApp API, Stripe, Resend, OpenRouter, CRM APIs)       │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Data Model

### Tenant Hierarchy
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

### RLS Enforcement
Every table with `organization_id` has Row Level Security policies:
```sql
-- Example policy pattern
CREATE POLICY "Users can only see own org data"
ON contacts FOR SELECT
USING (organization_id = auth.jwt()->>'organization_id');
```

## Entry Points

### Web Application
| Entry Point | Purpose |
|-------------|---------|
| `src/app/page.tsx` | Landing page |
| `src/app/dashboard/` | Protected dashboard |
| `src/app/admin/` | Super admin interface |
| `src/app/auth/` | Authentication flows |

### API Routes
| Route | Purpose |
|-------|---------|
| `src/app/api/webhooks/whatsapp/` | WhatsApp webhook handler |
| `src/app/api/webhooks/stripe/` | Stripe webhook handler |
| `src/app/api/conversations/` | Conversation CRUD |
| `src/app/api/contacts/` | Contact management |
| `src/app/api/admin/` | Super admin operations |

### Middleware
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Next.js middleware (session, routing) |
| `src/lib/api-middleware.ts` | API middleware (auth, rate limiting, CORS) |

## Data Flow Patterns

### Inbound Message Flow
```
WhatsApp Cloud API
       │
       ▼
Webhook Route (POST /api/webhooks/whatsapp)
       │
       ├── Signature Validation
       │
       ▼
Message Parser
       │
       ▼
Database Insert (conversations, messages)
       │
       ▼
Real-time Broadcast (Supabase Realtime)
       │
       ▼
Client Subscription Update
```

### Outbound Message Flow
```
User Action (Dashboard)
       │
       ▼
API Route (POST /api/messages)
       │
       ├── Auth Check
       ├── RLS Validation
       │
       ▼
WhatsApp Service (src/lib/whatsapp/)
       │
       ▼
WhatsApp Cloud API
       │
       ▼
Status Webhook → Update Message Status
```

### Automation Flow
```
Trigger Event (new message, contact created, etc.)
       │
       ▼
Automation Engine (src/lib/automation/)
       │
       ├── Load Balancer (smart-assignment.ts)
       ├── Rule Matcher (automation_rules table)
       │
       ▼
Action Executor
       │
       ├── Send Message
       ├── Assign Agent
       ├── Update Contact
       └── Trigger Workflow
```

## Key Abstractions

### Database Clients
```typescript
// Server-side with RLS (use for user data)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client-side (browser)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Service role (admin only, bypasses RLS)
import { createServiceRoleClient } from '@/lib/supabase/server'
const serviceSupabase = createServiceRoleClient()
```

### API Middleware Stack
```typescript
// src/lib/api-middleware.ts
export function withAuth(handler) { /* ... */ }
export function withRateLimit(handler) { /* ... */ }
export function withCORS(handler) { /* ... */ }
```

### Input Validation
```typescript
// src/lib/supabase/server.ts
import { QueryValidators, detectSQLInjection } from '@/lib/supabase/server'

QueryValidators.uuid(id)
QueryValidators.email(email)
QueryValidators.text(name, maxLength)
```

### State Management
```typescript
// Zustand stores in src/stores/
import { useWorkflowStore } from '@/stores/workflow-store'
```

## Authentication & Authorization

### Auth Flow
```
Login Request
     │
     ▼
Supabase Auth
     │
     ├── Email/Password
     ├── Magic Link
     ├── OAuth (Google, etc.)
     └── SSO (SAML/OIDC)
     │
     ▼
Session Created
     │
     ▼
Middleware Validates Session
     │
     ▼
Profile Loaded (organization_id, role)
     │
     ▼
RLS Policies Applied
```

### Role-Based Access
| Role | Permissions |
|------|-------------|
| Owner | Full access, billing, org settings |
| Admin | Team management, workflows, templates |
| Agent | Inbox, conversations, contacts |
| Viewer | Read-only analytics |

## Real-Time Architecture

### Supabase Realtime Subscriptions
```typescript
const channel = supabase
  .channel('conversations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleChange)
  .subscribe()
```

### Presence System
- `src/stores/usePresence.ts` - Online status tracking
- Real-time typing indicators
- Agent availability status

## Security Layers

1. **Network:** HTTPS, webhook signature validation
2. **Authentication:** Supabase Auth, session management
3. **Authorization:** RLS policies, role checks
4. **Input:** Zod validation, SQL injection detection
5. **Output:** DOMPurify sanitization
6. **Encryption:** AWS KMS for sensitive fields

## Performance Patterns

### Caching Strategy
- Redis (Upstash) for session/rate limiting
- Supabase query caching
- Next.js route caching

### Background Jobs
- BullMQ for async processing
- Webhook handlers return quickly, queue processing

### Database Optimization
- RLS-optimized queries
- Indexed columns for frequent filters
- Paginated results

---
*Architecture mapped: 2026-01-21*
