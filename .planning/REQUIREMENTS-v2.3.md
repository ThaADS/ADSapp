# Requirements: ADSapp v2.3 Twilio WhatsApp Integration

**Defined:** 2026-02-03
**Core Value:** Businesses can use Twilio as alternative WhatsApp provider with full feature parity

## v2.3 Requirements

Requirements for Twilio WhatsApp integration. Each maps to roadmap phases 21-24.

### Twilio WhatsApp Core (TWWA)

- [ ] **TWWA-01**: User can connect Twilio WhatsApp account via Account SID and Auth Token
- [ ] **TWWA-02**: Incoming WhatsApp messages via Twilio appear in unified inbox within 30 seconds
- [ ] **TWWA-03**: User can send text messages via Twilio WhatsApp to contacts
- [ ] **TWWA-04**: User can send media (image, video, audio, document) via Twilio WhatsApp

### Message Templates (TWWT)

- [ ] **TWWT-01**: User can view approved WhatsApp templates from Twilio Content API
- [ ] **TWWT-02**: User can send template messages via Twilio WhatsApp
- [ ] **TWWT-03**: Template variables are populated from contact data

### Status & Delivery (TWWS)

- [ ] **TWWS-01**: Message status (sent, delivered, read, failed) updates via Twilio status callbacks
- [ ] **TWWS-02**: Failed messages show error reason in UI
- [ ] **TWWS-03**: Message timestamps reflect Twilio delivery times

### Integration & Routing (TWWI)

- [ ] **TWWI-01**: TwilioWhatsAppAdapter implements ChannelAdapter interface
- [ ] **TWWI-02**: User can switch between Cloud API and Twilio per organization in settings

## Future Requirements (v2.4+)

### WhatsApp Business Features

- **TWWF-01**: Interactive message support (buttons, lists)
- **TWWF-02**: Location sharing via Twilio
- **TWWF-03**: Contact card sending
- **TWWF-04**: WhatsApp Pay integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice calls via Twilio | Separate Phase 18 (WhatsApp Calling) |
| SMS fallback | Already implemented in Phase 15 |
| Bulk messaging | Requires Meta approval, future consideration |
| WhatsApp Flows | Advanced feature, defer to v3.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TWWA-01 | Phase 21 | Pending |
| TWWA-02 | Phase 21 | Pending |
| TWWA-03 | Phase 21 | Pending |
| TWWA-04 | Phase 21 | Pending |
| TWWT-01 | Phase 22 | Pending |
| TWWT-02 | Phase 22 | Pending |
| TWWT-03 | Phase 22 | Pending |
| TWWS-01 | Phase 23 | Pending |
| TWWS-02 | Phase 23 | Pending |
| TWWS-03 | Phase 23 | Pending |
| TWWI-01 | Phase 24 | Pending |
| TWWI-02 | Phase 24 | Pending |

**Coverage:**
- v2.3 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-03 after initial definition*
