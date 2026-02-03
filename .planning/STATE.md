# Project State: ADSapp

**Updated:** 2026-02-03

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-03)

**Core value:** Businesses can efficiently manage all WhatsApp customer communications in one secure, multi-tenant inbox with AI assistance
**Current focus:** v2.3 Twilio WhatsApp Integration - Adding Twilio as alternative WhatsApp provider

## Current Status

```
Status: ACTIVE DEVELOPMENT
Deployed: Vercel (live)
v1.0 Core: Complete (WhatsApp inbox, billing, automation, AI)
v2.0 Progress: Complete (97% - Phases 8-16, 19 done)
v2.3 Active: Twilio WhatsApp Integration (Phases 21-24)
Current Phase: 21 (Twilio WhatsApp Core) - Not started
```

## Milestone Overview

### v1.0 Technical Debt Cleanup COMPLETE
- **Phases:** 1-7
- **Status:** Complete (7/7 phases)
- **Progress:** 100%
- **Completed:** 2026-01-24

### v2.0 Feature Gap Implementation COMPLETE
- **Phases:** 8-19 (12 phases total)
- **Status:** Complete (97% - 10/12 phases)
- **Progress:** Phases 8-16, 19 complete
- **Remaining:** Phases 17 (Mobile Apps), 18 (WhatsApp Calling)
- **Requirements:** 73 total, all mapped

### v2.3 Twilio WhatsApp Integration ACTIVE
- **Phases:** 21-24 (4 phases total)
- **Status:** Starting Phase 21
- **Progress:** 0% (0/4 phases)
- **Requirements:** 12 total, all mapped
- **Goal:** Add Twilio as alternative WhatsApp provider with full Cloud API parity

### v2.1 International Expansion (Planned)
- **Phases:** 20
- **Status:** Planned (after v2.3)
- **Scope:** 11 languages, 550-880 SEO landing pages
- **Research:** `.planning/research/i18n-seo-strategy.md`

## v1.0 Completion Summary

All 7 phases of v1.0 Technical Debt Cleanup are complete:

| Phase | Description | Key Outcomes |
|-------|-------------|--------------|
| 1 | Database Types | Regenerated types from Supabase |
| 2-3 | @ts-nocheck Removal | Removed from 206 source files, fixed async Supabase client |
| 4 | TypeScript Strict | Enabled strict mode (0 errors) |
| 5 | Build Quality | ESLint + TypeScript checking in builds |
| 6 | Test Coverage | Baseline: 15 suites, 250 tests passing |
| 7 | Dependency Cleanup | Removed duplicate reactflow |

**Test Coverage Notes:**
- Current: ~0.5% coverage with stable baseline
- Tests in `tests/_deferred/` need fixes before re-enabling
- Target: Incrementally improve toward 70% during v2.0

## Phase 8: Foundation Layer ✅ COMPLETE

**Goal:** Build unified message router and channel abstraction layer
**Requirements:** FOUND-01 through FOUND-05
**Dependencies:** Phase 7 (v1.0 complete) SATISFIED
**Completed:** 2026-01-24

**Plans:**
| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 08-01 | 1 | Database schema + TypeScript types | ✅ COMPLETE |
| 08-02 | 2 | WhatsApp adapter implementation | ✅ COMPLETE |
| 08-03 | 2 | UnifiedMessageRouter + health monitor | ✅ COMPLETE |
| 08-04 | 3 | Webhook integration + contact dedup | ✅ COMPLETE |
| 08-05 | 4 | Unit and integration tests | ✅ COMPLETE |

**Progress:** 100% (5/5 plans complete)

**Key Deliverables:**
- ✅ Database migration: 3 tables with RLS, 15 indexes, triggers (8bdb95d)
- ✅ TypeScript types: CanonicalMessage, ChannelAdapter interface (d9b243c)
- ✅ WhatsAppAdapter: Wraps EnhancedWhatsAppClient (f3ac4c2)
- ✅ UnifiedMessageRouter: Message routing + health monitoring (ebed672)
- ✅ Webhook integration: Router + contact deduplication (6ea275d)
- ✅ Tests: 120 tests passing (24ffa26)

**Success Criteria:**
1. ✅ Messages route through UnifiedMessageRouter
2. ✅ ChannelAdapter interface enables new channels
3. ✅ Contact deduplication with E.164 normalization
4. ✅ RLS policies on all new tables
5. ✅ Canonical message format documented

**Next Action:** Plan Phase 10 (Zapier Integration) or parallel phases

## Phase 9: WhatsApp Catalog ✅ COMPLETE

**Goal:** Enable e-commerce product catalog sync and product messaging through WhatsApp
**Requirements:** CAT-01, CAT-02, CAT-03, CAT-06
**Completed:** 2026-01-24

**Plans:**
| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 09-01 | 1 | Database schema + TypeScript types | ✅ COMPLETE |
| 09-02 | 2 | Catalog sync service + API routes | ✅ COMPLETE |
| 09-03 | 2 | Product messaging API | ✅ COMPLETE |
| 09-04 | 3 | Product picker UI components | ✅ COMPLETE |
| 09-05 | 3 | Catalog settings UI | ✅ COMPLETE |
| 09-06 | 4 | Order/cart webhook handling | ✅ COMPLETE |

**Key Deliverables:**
- ✅ Database: whatsapp_catalogs, whatsapp_products, whatsapp_product_messages tables
- ✅ TypeScript: All catalog types defined in src/types/whatsapp-catalog.ts
- ✅ CatalogSyncService: Syncs products from Meta Commerce Manager
- ✅ Product Messaging: Single product and multi-product (30 max) messages
- ✅ Product Picker UI: Search, grid view, single/multi selection
- ✅ Catalog Settings: Sync status, manual sync trigger, configuration
- ✅ Order Webhook: Cart submissions create messages in conversations

**Success Criteria:**
1. ✅ User can view their WhatsApp Business product catalog in ADSapp
2. ✅ User can select a single product and send it in a message to a contact
3. ✅ User can select multiple products (up to 30) and send as product list message
4. ✅ User can see catalog sync status and any sync errors in settings

## Performance Metrics

**Velocity:**
- v1.0 phases completed: 7/7 (100%)
- v2.0 phases completed: 4/12 (Phase 8, 9, 10 complete)
- Total execution time: Multi-session
- Recent: Phase 9 completed in single session (2026-01-24, 6 plans, 4 waves)

**v2.0 Phases:**

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 8 | Foundation Layer | 5/5 | ✅ Complete |
| 9 | WhatsApp Catalog | 6/6 | ✅ Complete |
| 10 | Zapier Integration | 6/6 | ✅ Complete |
| 10.5 | i18n Completion | 3/3 | ✅ Complete |
| 11 | Team Collaboration | TBD | Not started |
| 12 | Shopify Integration | TBD | Not started |
| 13 | Instagram DM | TBD | Not started |
| 14 | Facebook Messenger | TBD | Not started |
| 15 | SMS Channel | TBD | Not started |
| 16 | Mobile Backend | TBD | Not started |
| 17 | Mobile Apps | TBD | Not started |
| 18 | WhatsApp Calling | TBD | Not started |
| 19 | Knowledge Base AI | TBD | Not started |

## Phase 10: Zapier Integration ✅ COMPLETE

**Goal:** Enable Zapier integration with OAuth 2.0 provider and webhook subscriptions
**Requirements:** ZAP-01 through ZAP-08
**Started:** 2026-01-25

**Plans:**
| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 10-01 | 1 | Database schema + TypeScript types | ✅ COMPLETE |
| 10-02 | 2 | OAuth provider + token manager | ✅ COMPLETE |
| 10-03 | 2 | Rate limiting + auth middleware | ✅ COMPLETE |
| 10-04 | 1 | REST Hook triggers + webhook delivery | ✅ COMPLETE |
| 10-05 | 1 | Action endpoints (send message, contacts) | ✅ COMPLETE |
| 10-06 | 2 | Zapier CLI app definition | ✅ COMPLETE |

**Progress:** 100% (6/6 plans complete)

**Key Deliverables:**

**Plan 10-01:**
- ✅ Database migration: oauth_clients, oauth_authorization_codes, oauth_access_tokens, oauth_refresh_tokens
- ✅ Database migration: zapier_subscriptions, zapier_webhook_deliveries
- ✅ TypeScript types: src/types/oauth.ts with JWT payload and OAuth flow types
- ✅ TypeScript types: src/types/zapier.ts with webhook and action types
- ✅ RLS policies: Organization isolation on all OAuth and webhook tables

**Plan 10-02:**
- ✅ Token manager: JWT generation/verification with jose library (236933b)
- ✅ OAuth provider: Authorization Code Grant flow (a77b3a5)
- ✅ Authorization endpoint with client validation (55ca30f)
- ✅ Token endpoint: code exchange and refresh (d0214f1)
- ✅ Revocation endpoint: RFC 7009 compliant (2bcd0b3)
- ✅ Consent UI page with scope display (39b1218)
- ✅ Authorization callback with role checks (a7e52bf)
- ✅ PKCE S256 and plain method support
- ✅ Single-use refresh token rotation

**Plan 10-03:**
- ✅ Sliding window rate limiter with 4 limit types
- ✅ Bearer token authentication middleware
- ✅ Scope validation middleware
- ✅ Combined middleware wrapper (withZapierMiddleware)
- ✅ Rate limit headers (X-RateLimit-*) on all responses

**Plan 10-04:**
- ✅ REST Hook subscribe endpoint: POST /api/integrations/zapier/hooks/subscribe
- ✅ REST Hook unsubscribe endpoint: DELETE /api/integrations/zapier/hooks/{id}
- ✅ WebhookService with retry logic (1s, 5s, 30s, 5m, 30m)
- ✅ Event emitter with tag filtering (any_of, all_of, none_of)
- ✅ 410 Gone handling for subscription cleanup

**Plan 10-05:**
- ✅ POST /api/integrations/zapier/actions/send-message (text + template)
- ✅ POST /api/integrations/zapier/actions/contacts (create)
- ✅ PUT /api/integrations/zapier/actions/contacts/{id} (update)
- ✅ Auto-create contact/conversation on send-message
- ✅ Custom fields merge on update

**Plan 10-06:**
- ✅ Zapier CLI project structure at zapier-app/
- ✅ OAuth 2.0 authentication configuration
- ✅ Triggers: new_message (with tag filtering), new_contact
- ✅ Actions: send_message (text + template), create_contact, update_contact
- ⏳ Zapier Developer Platform registration (deferred for human action)

**Success Criteria (Overall):**
1. ✅ OAuth 2.0 Authorization Code Grant flow works end-to-end
2. ✅ Rate limiting enforced on all endpoints
3. ✅ Zapier can subscribe to webhooks for real-time events
4. ✅ Zapier actions (send message, create/update contact) function correctly
5. ✅ Zapier CLI app ready for deployment

**Next Action:** Phase 10 complete. Ready for Phase 11 (Team Collaboration).

## Phase 10.5: i18n Completion ✅ COMPLETE

**Goal:** Complete internationalization system with language preferences and missing translations
**Requirements:** Fix onboarding translation keys bug, add language settings UI, implement server-side detection
**Started:** 2026-01-28

**Plans:**
| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 10.5-01 | 1 | TranslationProvider gap fix + database schema | ✅ COMPLETE |
| 10.5-02 | 2 | Database-backed locale detection | ✅ COMPLETE |
| 10.5-03 | 2 | Email translations (EN and NL) | ✅ COMPLETE |
| 10.5-04 | 3 | Localized auth email templates | ✅ COMPLETE |
| 10.5-05 | 3 | Language preference settings UI | ✅ COMPLETE |

**Progress:** 100% (5/5 plans complete)

**Key Deliverables:**

**Plan 10.5-01 (Complete):**
- ✅ Onboarding layout with TranslationProvider (3489ffe)
- ✅ Database migration: preferred_language column with CHECK constraint (9bf5804)
- ✅ TypeScript types: preferred_language in profiles table (7178166)
- ✅ Fixes "ik zie de sleutels" bug (translation keys showing)

**Plan 10.5-02 (Complete):**
- ✅ getServerLocaleWithUser function with database priority (3a46937)
- ✅ Middleware database preference check for authenticated users (7ddc769)
- ✅ Language priority chain: DB > Cookie > Browser > Default
- ✅ Graceful fallback for database query failures

**Plan 10.5-03 (Complete):**
- ✅ English email translations: src/locales/en/emails.json (7d268c2)
- ✅ Dutch email translations: src/locales/nl/emails.json (b5cfa47)
- ✅ emails namespace registered in i18n system (371b1d1)
- ✅ All auth email types: confirmation, password reset, magic link, invitation
- ✅ Parameterized strings with {param} syntax for dynamic content

**Plan 10.5-04 (Complete - Gaps Resolved):**
- ✅ Email template components: generateConfirmationEmail, generatePasswordResetEmail, generateMagicLinkEmail (acc0399)
- ✅ Email sending functions: sendConfirmationEmail, sendPasswordResetEmail, sendMagicLinkEmail (bb1e5fa)
- ✅ Dynamic translation loading with locale fallback
- ✅ Branded HTML with ADSapp logo and colors
- ✅ Resend integration with email tags (category, locale)
- ✅ getUserLocale and getLocaleForNewUser utilities
- ✅ Signup route now uses admin.generateLink + sendConfirmationEmail (gap resolved)
- ✅ Password reset route created with sendPasswordResetEmail (gap resolved)
- ✅ Forgot password form updated to use API route

**Plan 10.5-05 (Complete):**
- ✅ LanguageSettings component: Client component with radio buttons and database save (4f48bcf)
- ✅ Language settings translations: EN and NL settings.language namespace (9aea957)
- ✅ Profile page integration: LanguageSettings section added to profile settings (1c0f7bf)
- ✅ Page reload on language change: Ensures full UI refresh with new locale
- ✅ Database update: profiles.preferred_language via Supabase client

**Success Criteria:**
1. ✅ Onboarding pages display translated text (not keys)
2. ✅ Email translations available for auth emails
3. ✅ Server-side locale detection checks database preference
4. ✅ Auth email templates generate branded HTML with translations
5. ✅ Email sending functions load locale-specific translations
6. ✅ Resend integration with proper tags
7. ✅ Language preference UI in profile settings
8. ✅ User can change language preference and see immediate effect

**Next Action:** Phase 10.5 complete (all 5 plans). Ready for Phase 11 (Team Collaboration).

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Recent decisions affecting v2.0 work:

- [2026-01-28]: Page reload after language change for full UI refresh (guarantees consistency)
- [2026-01-28]: Language settings placed in profile page (natural UX location)
- [2026-01-28]: Use inline HTML strings instead of react-email library for email templates (avoid dependencies)
- [2026-01-28]: Email domain heuristic for new user locale (.nl domains get Dutch, else English)
- [2026-01-28]: Auth emails now use admin.generateLink + localized email functions (gap resolved)
- [2026-01-28]: Middleware refactored with SessionResult interface for proper variable scoping
- [2026-01-28]: Email translations use nested JSON structure with common reusable elements
- [2026-01-28]: Parameterized strings use {param} syntax for dynamic content injection
- [2026-01-28]: Role translations included in emails namespace for self-contained email context
- [2026-01-28]: Always set locale cookie even for DB-preference users to keep cookie in sync
- [2026-01-28]: Reuse existing Supabase client in middleware to avoid new connections
- [2026-01-28]: Graceful error handling with fallback to cookie/browser detection for locale
- [2026-01-28]: Nullable preferred_language column (NULL = fallback to cookie/browser detection)
- [2026-01-28]: Database-level CHECK constraint for language values ('nl' or 'en')
- [2026-01-28]: Partial index on preferred_language (non-null values only)
- [2026-01-25]: Zapier CLI app registration deferred for human action (requires developer.zapier.com account)
- [2026-01-25]: Fire-and-forget webhook delivery to avoid blocking event emission
- [2026-01-25]: Auto-create contact/conversation when sending message to unknown phone number
- [2026-01-25]: Merge custom_fields on contact update instead of replace
- [2026-01-25]: In-memory rate limiting acceptable for single-instance (Redis needed for multi-instance)
- [2026-01-25]: Rate limit by token hash for authenticated endpoints, IP for OAuth endpoints
- [2026-01-25]: Rate limit headers on all responses (including errors) per OAuth spec
- [2026-01-25]: OAuth access tokens: JWT format, 1 hour lifespan, SHA256 hash storage
- [2026-01-25]: Refresh tokens: 30 day lifespan with single-use rotation
- [2026-01-25]: Authorization codes: 10 minute expiration with PKCE support
- [2026-01-25]: Webhook deliveries: 5-step retry (1s, 5s, 30s, 5m, 30m) with 410 handling
- [2026-01-24]: Use JSONB for channel_metadata to support channel-specific extensions
- [2026-01-24]: Include comprehensive error tracking (failed_reason, error_code, retry_count)
- [2026-01-24]: Token encryption placeholder with `*_encrypted` suffix (implementation in later plans)
- [2026-01-23]: Build UnifiedMessageRouter FIRST before any channel
- [2026-01-23]: ADSapp is OAuth PROVIDER for Zapier (not consumer)
- [2026-01-23]: Single webhook for Meta platforms with page_id routing
- [2026-01-23]: pgvector over external vector DB for RAG

### Pending Todos

None yet for v2.0.

### Blockers/Concerns

- WhatsApp Calling needs legal review for consent requirements
- pgvector performance needs load testing at scale
- Tests in `tests/_deferred/` need fixes (mocking issues, missing deps)
- Rate limiter uses in-memory storage (single instance only - needs Redis for multi-instance)

## Session Continuity

Last session: 2026-02-03
Stopped at: Milestone v2.3 initialized - Twilio WhatsApp Integration
Resume file: None
Next action: `/gsd:plan-phase 21` to plan Twilio WhatsApp Core

### Gap Resolution Summary (2026-01-28)

**Gap 1: Middleware Scope Bug** ✅ RESOLVED
- Issue: Lines 145-147 referenced `user` and `supabase` outside their declaration scope
- Fix: Created `SessionResult` interface, `updateSession` returns `{ response, user, supabase }`
- Files: `middleware.ts`

**Gap 2: Auth Emails Not Integrated** ✅ RESOLVED
- Issue: Email functions existed but weren't called from auth routes
- Fix:
  - Updated `src/app/api/auth/signup/route.ts` to use `admin.generateLink` + `sendConfirmationEmail`
  - Created `src/app/api/auth/forgot-password/route.ts` with `sendPasswordResetEmail`
  - Updated `src/components/auth/forgot-password-form.tsx` to use API route

### Phase 8 Completion Summary (2026-01-24)

All 5 plans executed across 4 waves:

**Wave 1:**
- 08-01: Database schema + types (8bdb95d, d9b243c)

**Wave 2 (parallel):**
- 08-02: WhatsApp adapter (f3ac4c2)
- 08-03: Router + health monitor (ebed672)

**Wave 3:**
- 08-04: Webhook integration + contact dedup (6ea275d)

**Wave 4:**
- 08-05: 120 tests passing (24ffa26)

**Files Created:**
- `supabase/migrations/20260124_channel_abstraction.sql`
- `src/types/channels.ts`
- `src/lib/channels/adapters/base.ts`
- `src/lib/channels/adapters/whatsapp.ts`
- `src/lib/channels/adapters/index.ts`
- `src/lib/channels/router.ts`
- `src/lib/channels/health.ts`
- `src/lib/channels/index.ts`
- `src/lib/channels/contact-dedup.ts`
- `tests/unit/channels/*.test.ts` (4 files)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `/gsd:plan-phase 21` | Plan Twilio WhatsApp Core phase |
| `/gsd:discuss-phase 21` | Gather context before planning |
| `/gsd:progress` | Check overall progress |

---
*State updated: 2026-02-03*
