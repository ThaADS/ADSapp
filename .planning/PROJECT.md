# ADSapp - Multi-Tenant WhatsApp Business Inbox SaaS

## What This Is

ADSapp is a Multi-Tenant WhatsApp Business Inbox SaaS platform built with Next.js 15, TypeScript, Supabase, and Stripe. It enables businesses to manage WhatsApp communication with features including real-time messaging, AI automation, analytics, and subscription billing.

## Core Value

**Businesses can efficiently manage all WhatsApp customer communications in one secure, multi-tenant inbox with AI assistance.**

## Requirements

### Validated (v1.0)

- Multi-tenant architecture with RLS isolation
- WhatsApp Business Cloud API integration
- Real-time messaging with Supabase Realtime
- Stripe subscription billing
- AI features (drafts, sentiment, auto-response)
- CRM integrations (Salesforce, HubSpot, Pipedrive)
- SSO support (SAML 2.0, OAuth 2.0/OIDC)
- Workflow automation engine
- Role-based access control (Owner, Admin, Agent, Viewer)

### Active (v2.0)

See: `.planning/REQUIREMENTS-v2.md` for complete list (73 requirements)

**Summary by category:**
- Foundation Layer (5): Unified message router, channel abstraction
- Integration Platform (8): Zapier OAuth, triggers, actions
- WhatsApp Commerce (6): Catalog sync, product messaging
- Team Collaboration (6): @mentions, notifications
- Mobile Applications (9): iOS/Android apps, push notifications
- E-commerce (7): Shopify integration, order notifications
- Instagram DM (7): DM channel, comment-to-DM automation
- Facebook Messenger (6): Messenger channel, handover protocol
- SMS Channel (7): Twilio integration, compliance features
- WhatsApp Calling (7): Voice calls, recording, transfer
- Knowledge Base AI (8): RAG, document upload, vector search

### Out of Scope

- New feature development during v1.0 debt cleanup
- Video calling (WhatsApp Calling API is voice-only)
- Desktop app (web + mobile sufficient)
- White-label reseller (separate product)
- On-premise deployment (SaaS-only)
- Telegram/LINE/Viber (focus on Meta ecosystem + SMS first)

## Current Milestone: v2.3 Twilio WhatsApp Integration

**Goal:** Add Twilio as alternative WhatsApp provider with full feature parity to Cloud API

**Target features:**
- Twilio WhatsApp webhook handler and message processing
- Send/receive text, media, and template messages via Twilio
- Conversation sync and real-time updates
- Status tracking (sent, delivered, read, failed)
- Full integration with existing ChannelAdapter architecture

**Phases:** 21-24 (4 phases)
**Requirements:** 12
**Status:** Defining requirements

---

## Previous Milestone: v2.0 Feature Gap Implementation

**Goal:** Expand ADSapp from WhatsApp-only to full omnichannel messaging platform

**Phases:** 8-19 (12 phases total)
**Requirements:** 73
**Status:** Complete (97%)

### Phase Summary

| Phase | Name | Requirements | Key Deliverable |
|-------|------|--------------|-----------------|
| 8 | Foundation Layer | 5 | UnifiedMessageRouter, ChannelAdapter |
| 9 | WhatsApp Catalog | 4 | Product messaging |
| 10 | Zapier Integration | 8 | OAuth provider, triggers, actions |
| 11 | Team Collaboration | 6 | @mentions with Tiptap |
| 12 | Shopify Integration | 9 | Order sync, cart recovery |
| 13 | Instagram DM | 7 | Instagram channel adapter |
| 14 | Facebook Messenger | 6 | Messenger channel adapter |
| 15 | SMS Channel | 7 | Twilio SMS integration |
| 16 | Mobile Backend | 2 | Push notifications, API v2 |
| 17 | Mobile Applications | 7 | iOS/Android apps |
| 18 | WhatsApp Calling | 7 | Voice call handling |
| 19 | Knowledge Base AI | 8 | RAG with pgvector |

### Parallel Execution Streams

After Phase 8 completes:
- **Stream A (E-commerce):** 9 -> 12
- **Stream B (Integrations):** 10, 11 (parallel)
- **Stream C (Meta):** 13 -> 14
- **Stream D (SMS):** 15
- **Stream E (Mobile):** 16 -> 17
- **Stream F (Advanced):** 18, 19

## Previous Milestone: v1.0 Technical Debt Cleanup

**Goal:** Fix accumulated technical debt from rapid feature development

**Phases:** 1-7
**Status:** In progress (Phase 1 complete)

See: `.planning/ROADMAP.md` for v1.0 details

## Context

The platform has 200+ files with `@ts-nocheck`, TypeScript strict mode disabled, and build ignoring errors. v1.0 milestone addresses this debt before v2.0 feature work.

## Constraints

- **Tech stack**: Must remain Next.js 15 + Supabase + TypeScript
- **Compatibility**: No breaking changes to existing API contracts
- **Testing**: All existing tests must continue to pass
- **Incremental**: Changes must be deployable incrementally
- **Multi-tenant**: All new features must respect RLS organization isolation

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Twilio WhatsApp as alternative provider | User already connected via Twilio, full parity with Cloud API | 2026-02-03 |
| Build UnifiedMessageRouter FIRST | All channels depend on unified routing | 2026-01-23 |
| ADSapp as OAuth PROVIDER for Zapier | Zapier needs to authorize against ADSapp | 2026-01-23 |
| Single Meta webhook with page_id routing | Simpler than per-page webhooks | 2026-01-23 |
| pgvector over external vector DB | Same infra, RLS works, no extra cost | 2026-01-23 |
| Twilio for SMS AND WhatsApp Calling | Single vendor, single SDK | 2026-01-23 |
| Expo + Solito for mobile | Share 90% code with Next.js | 2026-01-23 |
| Fix types before strict mode | Type errors block strict mode | 2026-01-21 |
| Target 70% coverage first | Realistic improvement | 2026-01-21 |
| Incremental strict mode | Avoid big-bang migration | 2026-01-21 |

---
*Last updated: 2026-02-03 after v2.3 milestone start*
