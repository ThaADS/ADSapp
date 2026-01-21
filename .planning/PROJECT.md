# ADSapp - Technical Debt Cleanup

## What This Is

ADSapp is a Multi-Tenant WhatsApp Business Inbox SaaS platform built with Next.js 15, TypeScript, Supabase, and Stripe. It enables businesses to manage WhatsApp communication with features including real-time messaging, AI automation, analytics, and subscription billing.

## Core Value

**Businesses can efficiently manage all WhatsApp customer communications in one secure, multi-tenant inbox with AI assistance.**

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Multi-tenant architecture with RLS isolation
- ✓ WhatsApp Business Cloud API integration
- ✓ Real-time messaging with Supabase Realtime
- ✓ Stripe subscription billing
- ✓ AI features (drafts, sentiment, auto-response)
- ✓ CRM integrations (Salesforce, HubSpot, Pipedrive)
- ✓ SSO support (SAML 2.0, OAuth 2.0/OIDC)
- ✓ Workflow automation engine
- ✓ Role-based access control (Owner, Admin, Agent, Viewer)

### Active

<!-- Current scope. Building toward these. -->

- [ ] **DEBT-01**: Regenerate database types from Supabase schema
- [ ] **DEBT-02**: Remove @ts-nocheck from critical files systematically
- [ ] **DEBT-03**: Enable TypeScript strict mode incrementally
- [ ] **DEBT-04**: Enable build-time TypeScript checking
- [ ] **DEBT-05**: Improve test coverage to 70%+
- [ ] **DEBT-06**: Clean up duplicate React Flow dependencies

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- New feature development — focus is stability and quality
- UI/UX changes — no visual changes this milestone
- Database schema changes — types regeneration only
- Performance optimization — separate milestone

## Context

The codebase has accumulated technical debt during rapid feature development:

- **200+ files** have `@ts-nocheck` directive
- **TypeScript strict mode** is disabled globally
- **Build ignores** TypeScript and ESLint errors
- **Test coverage** is at 60% threshold
- **Duplicate dependencies**: both `@xyflow/react` and `reactflow`

Root cause: Database types (`src/types/database.ts`) are out of sync with Supabase schema, causing cascading type errors.

## Constraints

- **Tech stack**: Must remain Next.js 15 + Supabase + TypeScript
- **Compatibility**: No breaking changes to existing API contracts
- **Testing**: All existing tests must continue to pass
- **Incremental**: Changes must be deployable incrementally

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix types before strict mode | Type errors block strict mode | — Pending |
| Target 70% coverage first | Realistic improvement | — Pending |
| Incremental strict mode | Avoid big-bang migration | — Pending |

---
*Last updated: 2026-01-21 after project initialization*
