# Roadmap: ADSapp

**Created:** 2026-01-21
**Updated:** 2026-01-25

## Milestones

- [x] **v1.0 Technical Debt Cleanup** - Phases 1-7 (complete)
- [x] **v2.0 Feature Gap Implementation** - Phases 8-19 (complete)
- [ ] **v2.1 International Expansion (i18n + SEO)** - Phase 20 (planned)
- [ ] **v2.2 Mobile & Calling** - Phases 17-18 (pending)
- [ ] **v2.3 Twilio WhatsApp Integration** - Phases 21-24 (active)

## Phases

<details>
<summary>v1.0 Technical Debt Cleanup (Phases 1-7)</summary>

### Phase 1: Database Types Regeneration
**Goal:** Fix the root cause - regenerate types from Supabase schema
**Status:** Complete

### Phase 2: Core Library @ts-nocheck Removal
**Goal:** Remove type suppression from critical library code
**Status:** Complete

### Phase 3: API & Components @ts-nocheck Removal
**Goal:** Remove type suppression from API routes and components
**Status:** Complete

### Phase 4: TypeScript Strict Mode
**Goal:** Incrementally enable strict mode options
**Status:** Complete

### Phase 5: Build Quality Enforcement
**Goal:** Enable error checking in production builds
**Status:** Complete

### Phase 6: Test Coverage Improvement
**Goal:** Establish stable test baseline, incrementally improve coverage
**Status:** Complete (baseline established)

### Phase 7: Dependency Cleanup
**Goal:** Remove duplicate and unused dependencies
**Status:** Complete

</details>

---

## v2.0 Feature Gap Implementation

**Milestone Goal:** Expand ADSapp from WhatsApp-only to full omnichannel messaging platform with advanced integrations

**Total Requirements:** 73
**Total Phases:** 12 (Phases 8-19)

### Phase Overview

| Phase | Name | Requirements | Dependency |
|-------|------|--------------|------------|
| 8 | Foundation Layer | 5 | None (first v2 phase) |
| 9 | WhatsApp Catalog | 4 | Phase 8 |
| 10 | Zapier Integration | 8 | Phase 8 |
| 11 | Team Collaboration | 6 | Phase 8 |
| 12 | Shopify Integration | 9 | Phase 9 |
| 13 | Instagram DM Channel | 7 | Phase 8 |
| 14 | Facebook Messenger Channel | 6 | Phase 13 |
| 15 | SMS Channel | 7 | Phase 8 |
| 16 | Mobile Backend | 2 | Phase 8 |
| 17 | Mobile Applications | 7 | Phase 16 |
| 18 | WhatsApp Calling | 7 | Phase 8 |
| 19 | Knowledge Base AI (RAG) | 8 | Phase 8 |

### Parallel Execution Notes

The following phases can execute in parallel after Phase 8 completes:
- **Stream A (E-commerce):** Phase 9 -> Phase 12
- **Stream B (Integrations):** Phase 10, Phase 11 (parallel)
- **Stream C (Meta Channels):** Phase 13 -> Phase 14
- **Stream D (Additional Channels):** Phase 15
- **Stream E (Mobile):** Phase 16 -> Phase 17
- **Stream F (Advanced):** Phase 18, Phase 19 (parallel, but consider last)

---

## Phase Details

### Phase 8: Foundation Layer
**Goal:** Build unified message router and channel abstraction layer that all future channels depend on
**Depends on:** Phase 7 (v1.0 Technical Debt Cleanup complete)
**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Plans:** 5 (08-01 to 08-05)

**Success Criteria** (what must be TRUE when phase completes):
1. Messages from any channel route through UnifiedMessageRouter with consistent handling
2. New channels can be added by implementing ChannelAdapter interface without modifying core code
3. Conversations display messages from multiple channels in unified thread view
4. All new database tables have RLS policies enforcing organization isolation
5. Canonical message format is documented and all adapters normalize to it

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FOUND-01 | Unified Message Router handles messages from all channels | Router accepts WhatsApp messages today, interface supports Instagram/FB/SMS |
| FOUND-02 | Channel abstraction layer with consistent interface | ChannelAdapter interface defined with send(), receive(), getStatus() methods |
| FOUND-03 | Message normalization across channel-specific formats | Canonical message type with content, media, metadata; adapters convert to/from |
| FOUND-04 | Conversation threading works across channels | Messages from same contact on different channels appear in same conversation |
| FOUND-05 | RLS policies extend to all new tables | channel_connections, channel_messages tables have organization_id RLS |

**Technical Notes:**
- Create `src/lib/channels/` directory structure
- UnifiedMessageRouter in `src/lib/channels/router.ts`
- Base ChannelAdapter in `src/lib/channels/adapters/base.ts`
- Migrate existing WhatsApp to WhatsAppAdapter pattern
- Schema: `channel_connections`, `channel_identifiers` JSONB on contacts

---

### Phase 9: WhatsApp Catalog
**Goal:** Enable e-commerce product catalog sync and product messaging through WhatsApp
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** CAT-01, CAT-02, CAT-03, CAT-06
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. User can view their WhatsApp Business product catalog in ADSapp
2. User can select a single product and send it in a message to a contact
3. User can select multiple products (up to 30) and send as product list message
4. User can see catalog sync status and any sync errors in settings

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| CAT-01 | Organization can sync product catalog to WhatsApp | Catalog appears in UI after sync, products show name/price/image |
| CAT-02 | User can send single product messages | Product picker in composer, message renders as interactive product card |
| CAT-03 | User can send multi-product messages (up to 30 items) | Multi-select up to 30, sends as product list message type |
| CAT-06 | Catalog status and sync errors are visible | Settings page shows last sync time, sync button, error messages |

**Technical Notes:**
- Extend existing WhatsApp client with catalog API methods
- New component: `ProductPicker` for message composer
- Store catalog cache in `whatsapp_catalogs` table
- Use WhatsApp Business API catalog endpoints

---

### Phase 10: Zapier Integration
**Goal:** Enable workflow automation through Zapier with OAuth 2.0 authentication, triggers, and actions
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** ZAP-01, ZAP-02, ZAP-03, ZAP-04, ZAP-05, ZAP-06, ZAP-07, ZAP-08
**Plans:** 6 plans

Plans:
- [x] 10-01-PLAN.md — Database schema + TypeScript types (OAuth, webhooks)
- [x] 10-02-PLAN.md — OAuth Authorization Server (token manager, endpoints, consent UI)
- [x] 10-03-PLAN.md — Rate limiting + authentication middleware
- [x] 10-04-PLAN.md — REST Hook trigger endpoints + webhook delivery service
- [x] 10-05-PLAN.md — Action endpoints (send message, create/update contact)
- [x] 10-06-PLAN.md — Zapier CLI app definition + templates

**Success Criteria** (what must be TRUE when phase completes):
1. User can connect ADSapp to Zapier using OAuth 2.0 authorization flow
2. User can create Zaps triggered by new messages or new contacts in ADSapp
3. User can create Zaps that send messages, create contacts, or update contacts in ADSapp
4. Pre-built Zap templates are available in Zapier's template gallery
5. API calls from Zapier respect rate limits with proper error responses

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| ZAP-01 | OAuth 2.0 authentication flow for Zapier connection | ADSapp issues access tokens, Zapier can authorize and receive token |
| ZAP-02 | User can configure Zapier triggers (new message, new contact) | Triggers appear in Zapier trigger list after connection |
| ZAP-03 | Webhook triggers fire on message received/status changed | Webhook sent to Zapier subscription URL within 5s of event |
| ZAP-04 | Actions available: send message, create contact, update contact | All three actions work via Zapier action step |
| ZAP-05 | Pre-built Zap templates for common workflows | At least 5 templates: CRM sync, Slack notification, Sheets logging, email alert, task creation |
| ZAP-06 | Trigger filtering by tags and segments | Filter options in trigger configuration for tags, segments |
| ZAP-07 | Rate limiting and exponential backoff for API calls | 429 responses with Retry-After header, Zapier respects backoff |
| ZAP-08 | Token refresh happens proactively (80% expiration) | Refresh token flow works, tokens refreshed before expiration |

**Technical Notes:**
- ADSapp is OAuth PROVIDER (issues tokens), not consumer
- Create `src/lib/integrations/zapier/` with oauth-provider.ts
- Webhook subscriptions in `zapier_subscriptions` table
- Rate limiter middleware for Zapier API routes
- Register ADSapp on Zapier Developer Platform

---

### Phase 11: Team Collaboration (@Mentions) ✅ Complete
**Goal:** Enable team members to @mention each other in conversation notes with real-time notifications
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** MENT-01, MENT-02, MENT-03, MENT-04, MENT-05, MENT-06
**Status:** Complete
**Plans:** 6 plans

Plans:
- [x] 11-01-PLAN.md — Database schema (conversation_notes, mentions tables) + TypeScript types
- [x] 11-02-PLAN.md — Tiptap editor with @mention extension + accessible suggestion dropdown
- [x] 11-03-PLAN.md — Notes API migration to relational tables + mention record creation
- [x] 11-04-PLAN.md — Real-time notifications via Supabase Realtime + notification badge
- [x] 11-05-PLAN.md — Notification panel UI + profile sidebar
- [x] 11-06-PLAN.md — UI integration + clickable mention links to user profiles

**Success Criteria** (what must be TRUE when phase completes):
1. User can type @ in internal notes and see team member suggestions
2. Mentioned user sees notification badge in real-time without page refresh
3. Mentioned user receives email notification if they haven't viewed within 5 minutes
4. Mention dropdown is keyboard navigable and screen reader accessible
5. Clicking a mention in a note navigates to that user's profile

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MENT-01 | User can @mention team members in conversation notes | Type @, see autocomplete, select team member, mention is saved |
| MENT-02 | Mentioned user receives real-time in-app notification | Notification badge updates via Supabase Realtime within 2s |
| MENT-03 | Mentioned user receives email if offline | Email sent if no activity in 5 minutes, includes note preview and link |
| MENT-04 | Mention suggestions show avatar and name | Dropdown shows profile picture, full name, and role |
| MENT-05 | Mention dropdown follows WAI-ARIA combobox pattern | Keyboard navigation, aria-activedescendant, screen reader announces |
| MENT-06 | Mentions link to user profile on click | Click on rendered @mention opens user profile sidebar |

**Technical Notes:**
- Add Tiptap editor with @mention extension
- New table: `mentions` with user_id, mentioned_user_id, note_id
- Supabase Realtime subscription for mention notifications
- Email via Resend with rate limiting (max 1 email per conversation per hour)

---

### Phase 12: Shopify Integration
**Goal:** Full e-commerce integration with Shopify including order notifications and catalog sync
**Depends on:** Phase 9 (WhatsApp Catalog for catalog patterns)
**Requirements:** SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07, CAT-04, CAT-05
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. User can connect their Shopify store via OAuth authorization flow
2. Customers automatically receive WhatsApp messages when order status changes
3. Customers receive shipping updates with tracking information
4. Abandoned cart recovery messages are sent automatically after configurable delay
5. User can see customer's Shopify order history in contact profile
6. Shopify products sync to WhatsApp Business catalog

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SHOP-01 | OAuth connection flow to Shopify store | User authorizes in Shopify, redirect back with access token stored |
| SHOP-02 | Order status notifications sent automatically | Order confirmed, shipped, delivered messages sent via template |
| SHOP-03 | Shipping update messages sent on fulfillment | Tracking number and carrier included in message |
| SHOP-04 | Abandoned cart recovery messages after X hours | Configurable delay (1-72h), message includes cart contents link |
| SHOP-05 | Product recommendations in messages | Agent can send personalized product suggestions from catalog |
| SHOP-06 | Order history visible in contact profile | Orders tab in contact sidebar shows recent orders with status |
| SHOP-07 | Webhook handling for Shopify events | orders/create, orders/updated, carts/create webhooks processed |
| CAT-04 | Shopify products sync to WhatsApp catalog | Products sync from Shopify to WhatsApp Business catalog |
| CAT-05 | Cart recovery messages trigger on abandoned carts | Webhook on cart/create, message sent after delay if not converted |

**Technical Notes:**
- Use @shopify/shopify-api v12
- Shopify webhooks in `src/app/api/webhooks/shopify/route.ts`
- Store connection in `shopify_connections` table
- BullMQ job for delayed cart recovery messages
- Contact matching by email/phone from Shopify order

---

### Phase 13: Instagram DM Channel ✅ Complete
**Goal:** Add Instagram Direct Messages as a communication channel in the unified inbox
**Depends on:** Phase 8 (Foundation Layer for channel abstraction)
**Requirements:** INSTA-01, INSTA-02, INSTA-03, INSTA-04, INSTA-05, INSTA-06, INSTA-07
**Status:** Complete
**Plans:** 6 plans

Plans:
- [x] 13-01 — Database schema (instagram_connections, instagram_messages, etc.)
- [x] 13-02 — Meta OAuth extension for Instagram Business accounts
- [x] 13-03 — Instagram webhook handler with idempotency
- [x] 13-04 — InstagramAdapter implementing ChannelAdapter interface
- [x] 13-05 — Comment-to-DM automation rules and processing
- [x] 13-06 — API routes (connect, callback, status, rules management)

**Success Criteria** (what must be TRUE when phase completes):
1. User can connect Instagram Business account through Meta OAuth flow
2. Instagram DMs appear in unified inbox alongside WhatsApp messages
3. User can reply to Instagram DMs from ADSapp with responses delivered to Instagram
4. Message delivery and read status is tracked and displayed
5. Comments on posts can automatically trigger DM conversations
6. Story mentions create notification and enable direct response

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| INSTA-01 | Connect Instagram Business account via Meta OAuth | OAuth flow completes, Instagram account ID stored, permissions granted |
| INSTA-02 | Receive Instagram DMs in unified inbox | DMs appear in inbox within 30s of receipt, shows sender profile |
| INSTA-03 | Reply to Instagram DMs from inbox | Compose reply, send, message delivered to Instagram user |
| INSTA-04 | Message status tracking (delivered, read) | Status icons update as message progresses through delivery states |
| INSTA-05 | Comment-to-DM automation on posts | Rule: when post receives comment with keyword, send automated DM |
| INSTA-06 | Story mention handling and replies | Story mentions create conversation, user can reply via DM |
| INSTA-07 | Rate limiting respects 200 messages/hour limit | Outbound queue respects limit, shows warning when approaching limit |

**Technical Notes:**
- Extend Meta OAuth flow (same app as WhatsApp)
- InstagramAdapter implements ChannelAdapter
- Single webhook endpoint `/api/webhooks/meta` with routing by platform
- Store page_id to organization mapping for webhook routing
- Rate limiter with sliding window per organization

---

### Phase 14: Facebook Messenger Channel ✅ Complete
**Goal:** Add Facebook Messenger as a communication channel supporting multi-page organizations
**Depends on:** Phase 13 (Instagram for shared Meta patterns)
**Requirements:** FB-01, FB-02, FB-03, FB-04, FB-05, FB-06
**Status:** Complete
**Plans:** 6 plans

Plans:
- [x] 14-01 — Database schema (facebook_connections, facebook_messages, messenger_templates, thread_control_log)
- [x] 14-02 — FacebookAdapter implementing ChannelAdapter interface
- [x] 14-03 — Facebook webhook handler with idempotency and handover protocol events
- [x] 14-04 — Messenger templates management (create, update, delete)
- [x] 14-05 — Handover protocol API (pass/take thread control for bot-to-human escalation)
- [x] 14-06 — API routes (connect, callback, status, send, templates, handover)

**Success Criteria** (what must be TRUE when phase completes):
1. User can connect Facebook Page through Meta OAuth flow
2. Messenger messages appear in unified inbox alongside other channels
3. User can reply to Messenger conversations from ADSapp
4. Organization can use approved message templates in Messenger
5. Multiple Facebook Pages route to correct organization via single webhook
6. Bot conversations can be escalated to human agents with handover protocol

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FB-01 | Connect Facebook Page via Meta OAuth | Page selected during OAuth, page access token stored encrypted |
| FB-02 | Receive Messenger messages in unified inbox | Messages appear in inbox, sender shows FB profile name/picture |
| FB-03 | Reply to Messenger from inbox | Reply sent, delivered to Facebook user, appears in their Messenger |
| FB-04 | Message templates for Messenger | Templates work in 24h+ window, template picker in composer |
| FB-05 | Page-based webhook routing for multi-page support | Single webhook handles all pages, routes by page_id to org |
| FB-06 | Handover protocol for bot-to-human escalation | Bot can pass thread control to human, human can pass back to bot |

**Technical Notes:**
- FacebookAdapter implements ChannelAdapter
- Reuse Meta OAuth infrastructure from Instagram
- Handover protocol requires Meta app configuration
- Templates stored in `messenger_templates` table
- Thread control state tracked per conversation

---

### Phase 15: SMS Channel ✅ Complete
**Goal:** Add SMS as a communication channel with Twilio integration and compliance features
**Depends on:** Phase 8 (Foundation Layer for channel abstraction)
**Requirements:** SMS-01, SMS-02, SMS-03, SMS-04, SMS-05, SMS-06, SMS-07
**Status:** Complete
**Plans:** 6 plans

Plans:
- [x] 15-01 — Database schema (sms_connections, sms_conversations, sms_messages, sms_opt_outs, sms_templates)
- [x] 15-02 — Twilio integration client (auth, phone numbers, messaging, bulk send)
- [x] 15-03 — SMSAdapter implementing ChannelAdapter interface
- [x] 15-04 — SMS webhook handler with idempotency and status callbacks
- [x] 15-05 — Opt-out management (STOP, START, HELP keyword processing, TCPA compliance)
- [x] 15-06 — API routes (connect, disconnect, send, templates, opt-outs, phone-numbers)

**Success Criteria** (what must be TRUE when phase completes):
1. User can send and receive SMS messages through Twilio integration
2. SMS is automatically used as fallback when WhatsApp delivery fails
3. Users who reply STOP are automatically opted out and cannot receive messages
4. Images can be sent via MMS in supported regions
5. Links in messages are shortened with click tracking analytics
6. User sees cost per message and total messaging costs in analytics

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SMS-01 | Twilio integration for SMS send/receive | SMS sent via Twilio API, inbound SMS received via webhook |
| SMS-02 | SMS fallback when WhatsApp unavailable | If WhatsApp fails after 24h window, prompt to send via SMS |
| SMS-03 | Opt-out management (STOP keyword) | STOP/UNSUBSCRIBE keywords auto-opt-out, HELP returns instructions |
| SMS-04 | MMS support for images | Images attach to SMS as MMS, graceful fallback to link if unsupported |
| SMS-05 | Link shortening with click tracking | Links auto-shortened, clicks tracked, analytics show CTR |
| SMS-06 | A2P 10DLC registration guidance | Settings page guides US users through 10DLC registration |
| SMS-07 | Per-message cost tracking | Cost recorded per message, dashboard shows spend by period |

**Technical Notes:**
- Twilio SDK v5 for SMS
- SMSAdapter implements ChannelAdapter with provider abstraction
- Opt-out status stored in contact preferences
- Link shortener in `src/lib/utils/url-shortener.ts`
- Cost tracking from Twilio API callbacks

---

### Phase 16: Mobile Backend ✅ Complete
**Goal:** Build backend infrastructure for mobile apps including push notifications and API versioning
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** MOB-03, MOB-09
**Status:** Complete
**Plans:** 6 plans

Plans:
- [x] 16-01 — Database schema (device_registrations, push_notifications, push_queue, mobile_sessions)
- [x] 16-02 — TypeScript types for mobile (devices, push, offline sync)
- [x] 16-03 — Firebase Cloud Messaging client (OAuth, send, batch, topics)
- [x] 16-04 — Push notification service (queue processing, message/mention/assignment notifications)
- [x] 16-05 — Device registration API (register, update, unregister)
- [x] 16-06 — Push test API endpoint

**Success Criteria** (what must be TRUE when phase completes):
1. Mobile devices can register for push notifications with Firebase tokens
2. Push notifications are sent for new messages when app is in background
3. API v2 endpoints exist at `/api/v2/` path with versioned contracts
4. Breaking changes are isolated to new API version without affecting web

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MOB-03 | Push notifications for new messages | FCM token registered, push sent on new message, contains preview |
| MOB-09 | API versioning (/api/v2/) prevents mobile breakage | New routes at /api/v2/, old routes unchanged, version in response headers |

**Technical Notes:**
- Firebase Admin SDK for push notifications
- FCM tokens stored in `device_tokens` table with platform
- PushNotificationService in `src/lib/notifications/push.ts`
- API v2 routes copy of v1 with versioned types
- Middleware checks API version header

---

### Phase 17: Mobile Applications
**Goal:** Ship iOS and Android mobile apps with full conversation access and offline support
**Depends on:** Phase 16 (Mobile Backend for push and API)
**Requirements:** MOB-01, MOB-02, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. iOS app is downloadable from Apple App Store
2. Android app is downloadable from Google Play Store
3. User can view all conversations and send replies from mobile app
4. Messages composed offline are queued and sent when connection restores
5. User can authenticate with Face ID, Touch ID, or fingerprint
6. User can reply directly from push notification without opening app
7. Read status syncs between mobile and web in real-time

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MOB-01 | iOS app available in App Store | App approved and published, downloadable on iPhone/iPad |
| MOB-02 | Android app available in Play Store | App approved and published, downloadable on Android devices |
| MOB-04 | User can view conversations and reply | Conversation list, chat view, message input all functional |
| MOB-05 | Offline message queue syncs when online | Draft stored locally, sent on reconnect, confirmed in UI |
| MOB-06 | Biometric authentication (Face ID, fingerprint) | Biometric prompt on app open, fallback to PIN |
| MOB-07 | Quick reply from push notification | Inline reply action on notification, sends without opening app |
| MOB-08 | Message read status syncs between mobile and web | Mark as read on mobile reflects on web within 5s |

**Technical Notes:**
- Expo SDK 54 + Solito 5 in Turborepo monorepo
- Share 90% of business logic with Next.js web
- Local SQLite for offline queue
- Expo SecureStore for biometric auth
- NotificationContent extension for iOS quick reply

---

### Phase 18: WhatsApp Calling
**Goal:** Enable receiving and managing WhatsApp voice calls within the platform
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** CALL-01, CALL-02, CALL-03, CALL-04, CALL-05, CALL-06, CALL-07
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. Incoming WhatsApp calls create notification and can be answered in-app
2. Call events (ringing, answered, ended) update UI in real-time
3. Call duration is tracked and displayed in call history
4. Calls can be recorded with consent banner shown to both parties
5. Agent can set themselves as available/unavailable for calls
6. Active call can be transferred to another available agent
7. All calls appear in conversation timeline with duration and recording link

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| CALL-01 | Incoming WhatsApp call handling | Call webhook creates call record, UI shows incoming call modal |
| CALL-02 | Call status events (ringing, answered, ended) | Status updates via Supabase Realtime, UI reflects current state |
| CALL-03 | Call duration tracking | Duration calculated from answered to ended, stored in seconds |
| CALL-04 | Call recording with consent banner | Recording enabled per call, consent announced, audio file stored |
| CALL-05 | Agent availability status for calls | Toggle in header, only available agents receive call routing |
| CALL-06 | Call transfer between agents | Transfer button during call, target agent receives, original disconnects |
| CALL-07 | Call history in conversation timeline | Calls appear as timeline events with duration, status, recording link |

**Technical Notes:**
- Twilio WhatsApp Business Calling API
- Call records in `whatsapp_calls` table
- WebRTC or Twilio Client SDK for browser audio
- Recording storage in Supabase Storage
- Legal review needed for consent requirements by region

---

### Phase 19: Knowledge Base AI (RAG) ✅ Complete
**Goal:** Build AI knowledge base with document upload, URL crawling, and context-aware responses
**Depends on:** Phase 8 (Foundation Layer)
**Requirements:** RAG-01, RAG-02, RAG-03, RAG-04, RAG-05, RAG-06, RAG-07, RAG-08
**Status:** Complete
**Plans:** 8 plans

Plans:
- [x] 19-01 — Database schema (knowledge_documents, knowledge_chunks, knowledge_queries, knowledge_settings with pgvector)
- [x] 19-02 — TypeScript types (KnowledgeDocument, KnowledgeChunk, SearchKnowledgeRequest, RAGContext)
- [x] 19-03 — OpenAI embeddings client (generate, batch, retry with backoff)
- [x] 19-04 — Document chunker (sentences, paragraphs, tokens, markdown-aware strategies)
- [x] 19-05 — Document processor (extract, chunk, embed, store pipeline)
- [x] 19-06 — RAG query service (semantic search, AI response generation, citations)
- [x] 19-07 — Documents API (CRUD, reprocess)
- [x] 19-08 — Search, settings, stats, similar documents APIs

**Success Criteria** (what must be TRUE when phase completes):
1. User can upload PDF, DOCX, and TXT documents to organization knowledge base
2. User can add URLs to crawl and extract knowledge from web pages
3. AI responses incorporate relevant knowledge from the knowledge base
4. Each organization's knowledge base is isolated and inaccessible to others
5. AI responses include citations showing which document provided the information
6. User can view, edit, and delete knowledge base entries in management UI
7. Documents are chunked and embedded for efficient semantic search

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| RAG-01 | Upload documents (PDF, DOCX, TXT) | File upload UI, document parsed, content extracted |
| RAG-02 | Crawl URLs for knowledge extraction | URL input, page crawled, content extracted and stored |
| RAG-03 | AI answers queries from knowledge base | AI response uses relevant knowledge chunks as context |
| RAG-04 | Per-organization knowledge isolation | RLS on knowledge tables, vector search filtered by org_id |
| RAG-05 | Source citation in AI responses | Response includes "[Source: document_name]" references |
| RAG-06 | Knowledge base management UI | List view, search, edit metadata, delete entries |
| RAG-07 | Chunking and embedding pipeline | Documents split into 500-token chunks, embeddings generated |
| RAG-08 | Vector search with pgvector | Semantic search returns top-K relevant chunks by cosine similarity |

**Technical Notes:**
- Enable pgvector extension in Supabase
- Embeddings via OpenAI text-embedding-ada-002
- Knowledge tables: `knowledge_documents`, `knowledge_chunks`
- Chunk size: 500 tokens with 50 token overlap
- RAG pipeline: query -> embed -> vector search -> context -> LLM

---

## v2.3 Twilio WhatsApp Integration

**Milestone Goal:** Add Twilio as alternative WhatsApp provider with full Cloud API parity

**Total Requirements:** 12
**Total Phases:** 4 (Phases 21-24)

### Phase Overview

| Phase | Name | Requirements | Dependency |
|-------|------|--------------|------------|
| 21 | Twilio WhatsApp Core | 4 | Phase 8 (Foundation Layer) |
| 22 | Twilio Templates | 3 | Phase 21 |
| 23 | Status & Delivery | 3 | Phase 21 |
| 24 | Integration & Settings | 2 | Phase 21, 22, 23 |

---

### Phase 21: Twilio WhatsApp Core
**Goal:** Implement core Twilio WhatsApp messaging - send/receive text and media
**Depends on:** Phase 8 (Foundation Layer for ChannelAdapter interface)
**Requirements:** TWWA-01, TWWA-02, TWWA-03, TWWA-04
**Plans:** 5 plans

Plans:
- [ ] 21-01-PLAN.md — Database schema migration (twilio_whatsapp_connections, webhook_events)
- [ ] 21-02-PLAN.md — Twilio WhatsApp client library (encryption, send, verify)
- [ ] 21-03-PLAN.md — Webhook handler (incoming messages, status callbacks, idempotency)
- [ ] 21-04-PLAN.md — TwilioWhatsAppAdapter implementing ChannelAdapter interface
- [ ] 21-05-PLAN.md — API routes (webhook, connect, verify, status)

**Success Criteria** (what must be TRUE when phase completes):
1. User can connect Twilio account via Account SID and Auth Token in settings
2. Incoming WhatsApp messages via Twilio appear in unified inbox within 30 seconds
3. User can send text messages via Twilio WhatsApp to contacts
4. User can send media (image, video, audio, document) via Twilio WhatsApp

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TWWA-01 | Connect Twilio WhatsApp account | Settings UI for SID/token, connection test, credentials stored encrypted |
| TWWA-02 | Receive WhatsApp messages via Twilio | Webhook handler processes incoming messages, creates/updates conversations |
| TWWA-03 | Send text messages via Twilio | Compose and send text, message appears in conversation with status |
| TWWA-04 | Send media via Twilio | Upload and send image/video/audio/document, media displayed in conversation |

**Technical Notes:**
- Reuse existing Twilio client from Phase 15 (SMS)
- Create TwilioWhatsAppAdapter extending BaseChannelAdapter
- Webhook endpoint: `/api/webhooks/twilio/whatsapp`
- Store Twilio credentials in `twilio_connections` table with encryption
- Media upload to Supabase Storage, send URL to Twilio

---

### Phase 22: Twilio Templates
**Goal:** Support WhatsApp message templates via Twilio Content API
**Depends on:** Phase 21 (Core messaging must work first)
**Requirements:** TWWT-01, TWWT-02, TWWT-03
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. User can view approved WhatsApp templates from Twilio Content API in template picker
2. User can send template messages to contacts outside 24-hour window
3. Template variables are automatically populated from contact data

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TWWT-01 | View Twilio Content API templates | Template list shows name, category, language, preview |
| TWWT-02 | Send template messages | Template picker in composer, send with variables, message delivered |
| TWWT-03 | Auto-populate template variables | Contact name, phone, custom fields auto-fill template placeholders |

**Technical Notes:**
- Use Twilio Content API for template management
- Sync templates on connect and periodically (1 hour)
- Store template cache in `twilio_whatsapp_templates` table
- Variable mapping: {{1}} -> contact.name, {{2}} -> contact.phone, etc.

---

### Phase 23: Status & Delivery
**Goal:** Implement message status tracking via Twilio status callbacks
**Depends on:** Phase 21 (Core messaging must work first)
**Requirements:** TWWS-01, TWWS-02, TWWS-03
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. Message status updates (sent, delivered, read, failed) appear in real-time
2. Failed messages display clear error reason with guidance
3. Message timestamps reflect actual Twilio delivery times

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TWWS-01 | Status callbacks from Twilio | Webhook receives status updates, UI reflects current state via Realtime |
| TWWS-02 | Failed message error display | Error reason shown in message bubble, retry option available |
| TWWS-03 | Accurate timestamps | Sent/delivered/read times from Twilio stored and displayed |

**Technical Notes:**
- Status callback URL: `/api/webhooks/twilio/whatsapp/status`
- Map Twilio statuses: queued, sent, delivered, read, failed, undelivered
- Error codes: 63001 (invalid number), 63003 (rate limit), etc.
- Store status history for audit trail

---

### Phase 24: Integration & Settings
**Goal:** Full ChannelAdapter integration and provider switching in settings
**Depends on:** Phases 21, 22, 23 (all core features must work)
**Requirements:** TWWI-01, TWWI-02
**Plans:** TBD

**Success Criteria** (what must be TRUE when phase completes):
1. TwilioWhatsAppAdapter passes all ChannelAdapter interface tests
2. User can switch between Cloud API and Twilio in organization WhatsApp settings
3. Existing conversations work regardless of provider (message routing based on connection)

**Detailed Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TWWI-01 | ChannelAdapter compliance | Adapter implements all interface methods, passes adapter test suite |
| TWWI-02 | Provider switching UI | Settings toggle between Cloud API and Twilio, seamless transition |

**Technical Notes:**
- TwilioWhatsAppAdapter in `src/lib/channels/adapters/twilio-whatsapp.ts`
- Provider selection stored in `whatsapp_settings.provider` column
- UnifiedMessageRouter routes based on active provider
- Migration path: both providers can coexist during transition

---

## Progress

**Execution Order:**
Phase 8 must complete first. Then streams can execute in parallel.

| Phase | Name | Milestone | Plans | Status | Completed |
|-------|------|-----------|-------|--------|-----------|
| 1 | Database Types | v1.0 | 1/1 | Complete | 2026-01-21 |
| 2 | Core Library @ts-nocheck | v1.0 | 1/1 | Complete | 2026-01-23 |
| 3 | API Components @ts-nocheck | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4 | TypeScript Strict Mode | v1.0 | 1/1 | Complete | 2026-01-23 |
| 5 | Build Quality | v1.0 | 1/1 | Complete | 2026-01-23 |
| 6 | Test Coverage | v1.0 | 1/1 | Complete | 2026-01-24 |
| 7 | Dependency Cleanup | v1.0 | 1/1 | Complete | 2026-01-23 |
| 8 | Foundation Layer | v2.0 | 5/5 | Complete | 2026-01-24 |
| 9 | WhatsApp Catalog | v2.0 | 6/6 | Complete | 2026-01-24 |
| 10 | Zapier Integration | v2.0 | 6/6 | Complete | 2026-01-25 |
| 10.5 | i18n Completion | v2.0 | 5/5 | Complete | 2026-01-28 |
| 10.6 | Inbox UI Compactness | v2.0 | 4/4 | Complete | 2026-01-28 |
| 11 | Team Collaboration | v2.0 | 6/6 | Complete | 2026-01-28 |
| 12 | Shopify Integration | v2.0 | 6/6 | Complete | 2026-01-28 |
| 13 | Instagram DM Channel | v2.0 | 6/6 | Complete | 2026-01-28 |
| 14 | Facebook Messenger | v2.0 | 6/6 | Complete | 2026-01-28 |
| 15 | SMS Channel | v2.0 | 6/6 | Complete | 2026-01-28 |
| 16 | Mobile Backend | v2.0 | 6/6 | Complete | 2026-01-28 |
| 17 | Mobile Applications | v2.0 | 0/TBD | Not started | - |
| 18 | WhatsApp Calling | v2.0 | 0/TBD | Not started | - |
| 19 | Knowledge Base AI | v2.0 | 8/8 | Complete | 2026-01-28 |
| 21 | Twilio WhatsApp Core | v2.3 | 0/5 | Planned | - |
| 22 | Twilio Templates | v2.3 | 0/TBD | Not started | - |
| 23 | Status & Delivery | v2.3 | 0/TBD | Not started | - |
| 24 | Integration & Settings | v2.3 | 0/TBD | Not started | - |

**v1.0 Progress:** [##########] 100% (7/7 phases) COMPLETE
**v2.0 Progress:** [##########] 100% (12/12 phases) COMPLETE
**v2.3 Progress:** [----------] 0% (0/4 phases)
**Overall Progress:** [########--] 76% (19/25 phases)

---

## Dependency Graph

```
v1.0 Phases 1-7 (sequential)
        |
        v
    Phase 8: Foundation Layer (MUST be first)
        |
        +---> Phase 9: WhatsApp Catalog ---> Phase 12: Shopify Integration
        |
        +---> Phase 10: Zapier Integration
        |
        +---> Phase 11: Team Collaboration (@Mentions)
        |
        +---> Phase 13: Instagram DM ---> Phase 14: Facebook Messenger
        |
        +---> Phase 15: SMS Channel
        |
        +---> Phase 16: Mobile Backend ---> Phase 17: Mobile Applications
        |
        +---> Phase 18: WhatsApp Calling
        |
        +---> Phase 19: Knowledge Base AI (RAG)
        |
        +---> Phase 21: Twilio WhatsApp Core
                |
                +---> Phase 22: Twilio Templates ----+
                |                                    |
                +---> Phase 23: Status & Delivery ---+--> Phase 24: Integration & Settings
```

## Coverage Summary

**v2.0 Requirements by Category:**

| Category | Total | Phases | Coverage |
|----------|-------|--------|----------|
| Foundation Layer | 5 | Phase 8 | 100% |
| WhatsApp Catalog | 6 | Phase 9, 12 | 100% |
| Zapier Integration | 8 | Phase 10 | 100% |
| Team Collaboration | 6 | Phase 11 | 100% |
| Shopify Integration | 7 | Phase 12 | 100% |
| Instagram DM | 7 | Phase 13 | 100% |
| Facebook Messenger | 6 | Phase 14 | 100% |
| SMS Channel | 7 | Phase 15 | 100% |
| Mobile Applications | 9 | Phase 16, 17 | 100% |
| WhatsApp Calling | 7 | Phase 18 | 100% |
| Knowledge Base AI | 8 | Phase 19 | 100% |

**Total v2.0:** 76 requirements mapped (73 unique + 3 CAT requirements split across phases)

**v2.3 Requirements by Category:**

| Category | Total | Phases | Coverage |
|----------|-------|--------|----------|
| Twilio WhatsApp Core | 4 | Phase 21 | 100% |
| Twilio Templates | 3 | Phase 22 | 100% |
| Status & Delivery | 3 | Phase 23 | 100% |
| Integration & Settings | 2 | Phase 24 | 100% |

**Total v2.3:** 12 requirements mapped

---

## Phase 10.5: i18n Completion (Urgent)

**Goal:** Complete the existing i18n infrastructure so all user-facing text displays correctly in Dutch or English based on user preference
**Depends on:** Phase 10 (Zapier Integration complete)
**Type:** Urgent maintenance phase inserted to fix production bug ("ik zie de sleutels")
**Plans:** 5 plans

Plans:
- [x] 10.5-01-PLAN.md — Onboarding TranslationProvider + database migration for preferred_language
- [x] 10.5-02-PLAN.md — Middleware/server locale detection with database priority
- [x] 10.5-03-PLAN.md — Email translation files (EN/NL) + namespace registration
- [x] 10.5-04-PLAN.md — Localized auth email templates via Resend
- [x] 10.5-05-PLAN.md — Language preference settings UI

**Success Criteria:**
1. Onboarding pages display translated text (not translation keys)
2. Language preference persists to database for logged-in users
3. Priority chain: Database > Cookie > Browser detection
4. Auth emails (confirmation, reset, magic link) sent in user's preferred language
5. User can change language preference in profile settings

**NOT in scope:** Additional languages beyond NL/EN (Phase 20), SEO landing pages (Phase 20), translation of user-generated content.

---

## Phase 10.6: Inbox UI Compactness & Customization ✅ Complete

**Goal:** Optimize WhatsApp inbox for 1920x1080 displays with compact conversation list, fixed chat input, resizable panels, and background customization
**Depends on:** Phase 10.5 (i18n Completion)
**Type:** UX improvement phase - addresses user feedback about oversized UI elements
**Status:** Complete
**Plans:** 4 plans

Plans:
- [x] 10.6-01-PLAN.md — Fixed chat input layout (flex min-h-0 fix)
- [x] 10.6-02-PLAN.md — Compact conversation list (64-72px items)
- [x] 10.6-03-PLAN.md — Resizable panel divider (react-resizable-panels)
- [x] 10.6-04-PLAN.md — Chat background customization (6 presets)

**Success Criteria:**
1. 10-12 conversations visible at 1920x1080 (currently 5-6)
2. Chat input always visible (no scroll required)
3. Resizable conversation list (240-480px, persists to localStorage)
4. Selectable chat backgrounds from 6 presets
5. Mobile responsive design preserved

**Technical Notes:**
- Add `react-resizable-panels` dependency (4KB gzipped)
- Fix flex layout with `min-h-0` for proper scroll containment
- Reduce conversation item padding and avatar size
- localStorage for panel width and background preferences

---

## v2.1 International Expansion (i18n + SEO)

**Milestone Goal:** Expand ADSapp to 11 languages with 550-880 SEO-optimized landing pages targeting niche markets

**Status:** Planned (after v2.0 completion)
**Research:** `.planning/research/i18n-seo-strategy.md` (comprehensive strategy document)

### Phase 20: Multi-Language + SEO Landing Pages
**Goal:** Full i18n infrastructure with 11 languages and industry-specific SEO pages
**Depends on:** v2.0 completion (core features needed for localized marketing)
**Requirements:** I18N-01 through I18N-20

**Languages (11 total):**
- **Tier 1 (Core):** English, Dutch (NL), German, French
- **Tier 2 (European):** Spanish, Polish, Italian
- **Tier 3 (Strategic):** Portuguese (Brazil), Turkish, Arabic (RTL), Hindi

**Landing Pages (~550-880 total):**
- 50-80 base pages per language including:
  - Niche/industry pages (restaurants, e-commerce, healthcare, etc.)
  - Use case pages (customer support, sales, bookings)
  - Client cases and success stories
  - ROI calculators and comparison pages
  - Feature-specific pages

**Technical Stack:**
- **i18n Library:** next-intl (App Router native, RSC compatible)
- **URL Structure:** Subfolder (`/nl/`, `/de/`) for SEO authority inheritance
- **RTL Support:** CSS logical properties for Arabic
- **Generation:** Static Site Generation (SSG) for landing pages
- **Performance:** ISR for dynamic content, edge caching

**Success Criteria:**
1. All 11 languages fully translated with professional localization
2. hreflang tags correctly implemented across all pages
3. 50+ industry-specific landing pages per language
4. RTL layout works correctly for Arabic
5. Core Web Vitals pass on all landing pages
6. Language detection with user preference persistence

**Estimated Plans:** 8-12 (TBD after v2.0 completion)

---
*Roadmap created: 2026-01-21*
*v2.0 phases added: 2026-01-23*
*v2.1 milestone added: 2026-01-24*
*Phase 10.5 (i18n Completion) added: 2026-01-28*
*Phase 10.6 (Inbox UI Compactness) added: 2026-01-28*
*v2.3 Twilio WhatsApp Integration added: 2026-02-03*
*Last updated: 2026-02-03*
