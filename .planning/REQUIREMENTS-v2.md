# Requirements: ADSapp Feature Gap Implementation

**Defined:** 2026-01-23
**Core Value:** Expand ADSapp from WhatsApp-only to full omnichannel messaging platform with advanced integrations

## v2 Requirements

Requirements for milestone v2.0 Feature Gap Implementation. Each maps to roadmap phases.

### Foundation Layer

- [ ] **FOUND-01**: Unified Message Router handles messages from all channels
- [ ] **FOUND-02**: Channel abstraction layer with consistent interface
- [ ] **FOUND-03**: Message normalization across channel-specific formats
- [ ] **FOUND-04**: Conversation threading works across channels
- [ ] **FOUND-05**: RLS policies extend to all new tables

### Integration Platform (Zapier)

- [ ] **ZAP-01**: OAuth 2.0 authentication flow for Zapier connection
- [ ] **ZAP-02**: User can configure Zapier triggers (new message, new contact)
- [ ] **ZAP-03**: Webhook triggers fire on message received/status changed
- [ ] **ZAP-04**: Actions available: send message, create contact, update contact
- [ ] **ZAP-05**: Pre-built Zap templates for common workflows
- [ ] **ZAP-06**: Trigger filtering by tags and segments
- [ ] **ZAP-07**: Rate limiting and exponential backoff for API calls
- [ ] **ZAP-08**: Token refresh happens proactively (80% expiration)

### WhatsApp Commerce (Catalog)

- [ ] **CAT-01**: Organization can sync product catalog to WhatsApp
- [ ] **CAT-02**: User can send single product messages
- [ ] **CAT-03**: User can send multi-product messages (up to 30 items)
- [ ] **CAT-04**: Shopify products sync to WhatsApp catalog
- [ ] **CAT-05**: Cart recovery messages trigger on abandoned carts
- [ ] **CAT-06**: Catalog status and sync errors are visible

### Team Collaboration (@Mentions)

- [ ] **MENT-01**: User can @mention team members in conversation notes
- [ ] **MENT-02**: Mentioned user receives real-time in-app notification
- [ ] **MENT-03**: Mentioned user receives email if offline
- [ ] **MENT-04**: Mention suggestions show avatar and name
- [ ] **MENT-05**: Mention dropdown follows WAI-ARIA combobox pattern
- [ ] **MENT-06**: Mentions link to user profile on click

### Mobile Applications

- [ ] **MOB-01**: iOS app available in App Store
- [ ] **MOB-02**: Android app available in Play Store
- [ ] **MOB-03**: Push notifications for new messages
- [ ] **MOB-04**: User can view conversations and reply
- [ ] **MOB-05**: Offline message queue syncs when online
- [ ] **MOB-06**: Biometric authentication (Face ID, fingerprint)
- [ ] **MOB-07**: Quick reply from push notification
- [ ] **MOB-08**: Message read status syncs between mobile and web
- [ ] **MOB-09**: API versioning (/api/v2/) prevents mobile breakage

### E-commerce Integration (Shopify)

- [ ] **SHOP-01**: OAuth connection flow to Shopify store
- [ ] **SHOP-02**: Order status notifications sent automatically
- [ ] **SHOP-03**: Shipping update messages sent on fulfillment
- [ ] **SHOP-04**: Abandoned cart recovery messages after X hours
- [ ] **SHOP-05**: Product recommendations in messages
- [ ] **SHOP-06**: Order history visible in contact profile
- [ ] **SHOP-07**: Webhook handling for Shopify events

### Instagram DM Channel

- [ ] **INSTA-01**: Connect Instagram Business account via Meta OAuth
- [ ] **INSTA-02**: Receive Instagram DMs in unified inbox
- [ ] **INSTA-03**: Reply to Instagram DMs from inbox
- [ ] **INSTA-04**: Message status tracking (delivered, read)
- [ ] **INSTA-05**: Comment-to-DM automation on posts
- [ ] **INSTA-06**: Story mention handling and replies
- [ ] **INSTA-07**: Rate limiting respects 200 messages/hour limit

### Facebook Messenger Channel

- [ ] **FB-01**: Connect Facebook Page via Meta OAuth
- [ ] **FB-02**: Receive Messenger messages in unified inbox
- [ ] **FB-03**: Reply to Messenger from inbox
- [ ] **FB-04**: Message templates for Messenger
- [ ] **FB-05**: Page-based webhook routing for multi-page support
- [ ] **FB-06**: Handover protocol for bot-to-human escalation

### SMS Channel

- [ ] **SMS-01**: Twilio integration for SMS send/receive
- [ ] **SMS-02**: SMS fallback when WhatsApp unavailable
- [ ] **SMS-03**: Opt-out management (STOP keyword)
- [ ] **SMS-04**: MMS support for images
- [ ] **SMS-05**: Link shortening with click tracking
- [ ] **SMS-06**: A2P 10DLC registration guidance
- [ ] **SMS-07**: Per-message cost tracking

### WhatsApp Calling

- [ ] **CALL-01**: Incoming WhatsApp call handling
- [ ] **CALL-02**: Call status events (ringing, answered, ended)
- [ ] **CALL-03**: Call duration tracking
- [ ] **CALL-04**: Call recording with consent banner
- [ ] **CALL-05**: Agent availability status for calls
- [ ] **CALL-06**: Call transfer between agents
- [ ] **CALL-07**: Call history in conversation timeline

### Knowledge Base AI (RAG)

- [ ] **RAG-01**: Upload documents (PDF, DOCX, TXT)
- [ ] **RAG-02**: Crawl URLs for knowledge extraction
- [ ] **RAG-03**: AI answers queries from knowledge base
- [ ] **RAG-04**: Per-organization knowledge isolation
- [ ] **RAG-05**: Source citation in AI responses
- [ ] **RAG-06**: Knowledge base management UI
- [ ] **RAG-07**: Chunking and embedding pipeline
- [ ] **RAG-08**: Vector search with pgvector

## Future Requirements (v3+)

Deferred to future milestone. Tracked but not in current roadmap.

### Advanced Omnichannel

- **ADV-01**: Telegram channel support
- **ADV-02**: LINE channel support
- **ADV-03**: Email channel (full inbox, not just notifications)
- **ADV-04**: Web chat widget with channel preference

### Advanced AI

- **AI-01**: Custom AI model training per organization
- **AI-02**: Voice-to-text transcription for calls
- **AI-03**: AI-powered lead scoring

### Advanced Mobile

- **MADV-01**: Apple Watch quick replies
- **MADV-02**: Android widget for recent conversations

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video calling | WhatsApp Calling API is voice-only |
| Desktop app | Web + mobile sufficient for now |
| White-label reseller | Complex licensing, separate product |
| On-premise deployment | SaaS-only focus |
| Telegram/LINE/Viber | Focus on Meta ecosystem + SMS first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 8 | Pending |
| FOUND-02 | Phase 8 | Pending |
| FOUND-03 | Phase 8 | Pending |
| FOUND-04 | Phase 8 | Pending |
| FOUND-05 | Phase 8 | Pending |
| CAT-01 | Phase 9 | Pending |
| CAT-02 | Phase 9 | Pending |
| CAT-03 | Phase 9 | Pending |
| CAT-06 | Phase 9 | Pending |
| ZAP-01 | Phase 10 | Pending |
| ZAP-02 | Phase 10 | Pending |
| ZAP-03 | Phase 10 | Pending |
| ZAP-04 | Phase 10 | Pending |
| ZAP-05 | Phase 10 | Pending |
| ZAP-06 | Phase 10 | Pending |
| ZAP-07 | Phase 10 | Pending |
| ZAP-08 | Phase 10 | Pending |
| MENT-01 | Phase 11 | Pending |
| MENT-02 | Phase 11 | Pending |
| MENT-03 | Phase 11 | Pending |
| MENT-04 | Phase 11 | Pending |
| MENT-05 | Phase 11 | Pending |
| MENT-06 | Phase 11 | Pending |
| SHOP-01 | Phase 12 | Pending |
| SHOP-02 | Phase 12 | Pending |
| SHOP-03 | Phase 12 | Pending |
| SHOP-04 | Phase 12 | Pending |
| SHOP-05 | Phase 12 | Pending |
| SHOP-06 | Phase 12 | Pending |
| SHOP-07 | Phase 12 | Pending |
| CAT-04 | Phase 12 | Pending |
| CAT-05 | Phase 12 | Pending |
| INSTA-01 | Phase 13 | Pending |
| INSTA-02 | Phase 13 | Pending |
| INSTA-03 | Phase 13 | Pending |
| INSTA-04 | Phase 13 | Pending |
| INSTA-05 | Phase 13 | Pending |
| INSTA-06 | Phase 13 | Pending |
| INSTA-07 | Phase 13 | Pending |
| FB-01 | Phase 14 | Pending |
| FB-02 | Phase 14 | Pending |
| FB-03 | Phase 14 | Pending |
| FB-04 | Phase 14 | Pending |
| FB-05 | Phase 14 | Pending |
| FB-06 | Phase 14 | Pending |
| SMS-01 | Phase 15 | Pending |
| SMS-02 | Phase 15 | Pending |
| SMS-03 | Phase 15 | Pending |
| SMS-04 | Phase 15 | Pending |
| SMS-05 | Phase 15 | Pending |
| SMS-06 | Phase 15 | Pending |
| SMS-07 | Phase 15 | Pending |
| MOB-03 | Phase 16 | Pending |
| MOB-09 | Phase 16 | Pending |
| MOB-01 | Phase 17 | Pending |
| MOB-02 | Phase 17 | Pending |
| MOB-04 | Phase 17 | Pending |
| MOB-05 | Phase 17 | Pending |
| MOB-06 | Phase 17 | Pending |
| MOB-07 | Phase 17 | Pending |
| MOB-08 | Phase 17 | Pending |
| CALL-01 | Phase 18 | Pending |
| CALL-02 | Phase 18 | Pending |
| CALL-03 | Phase 18 | Pending |
| CALL-04 | Phase 18 | Pending |
| CALL-05 | Phase 18 | Pending |
| CALL-06 | Phase 18 | Pending |
| CALL-07 | Phase 18 | Pending |
| RAG-01 | Phase 19 | Pending |
| RAG-02 | Phase 19 | Pending |
| RAG-03 | Phase 19 | Pending |
| RAG-04 | Phase 19 | Pending |
| RAG-05 | Phase 19 | Pending |
| RAG-06 | Phase 19 | Pending |
| RAG-07 | Phase 19 | Pending |
| RAG-08 | Phase 19 | Pending |

**Coverage Summary:**

| Phase | Name | Requirements | Count |
|-------|------|--------------|-------|
| 8 | Foundation Layer | FOUND-01 to FOUND-05 | 5 |
| 9 | WhatsApp Catalog | CAT-01, CAT-02, CAT-03, CAT-06 | 4 |
| 10 | Zapier Integration | ZAP-01 to ZAP-08 | 8 |
| 11 | Team Collaboration | MENT-01 to MENT-06 | 6 |
| 12 | Shopify Integration | SHOP-01 to SHOP-07, CAT-04, CAT-05 | 9 |
| 13 | Instagram DM | INSTA-01 to INSTA-07 | 7 |
| 14 | Facebook Messenger | FB-01 to FB-06 | 6 |
| 15 | SMS Channel | SMS-01 to SMS-07 | 7 |
| 16 | Mobile Backend | MOB-03, MOB-09 | 2 |
| 17 | Mobile Applications | MOB-01, MOB-02, MOB-04 to MOB-08 | 7 |
| 18 | WhatsApp Calling | CALL-01 to CALL-07 | 7 |
| 19 | Knowledge Base AI | RAG-01 to RAG-08 | 8 |

**Totals:**
- v2 requirements: 76 mapped (73 unique requirements)
- Requirements with split phases: CAT-04, CAT-05 (Phase 12 depends on Phase 9)
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after roadmap creation*
