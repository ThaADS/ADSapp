# Feature Landscape

**Domain:** Multi-channel communication platform
**Researched:** 2026-01-23

## Table Stakes

Features users expect in competitive multi-channel inbox products. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multiple channel support | Competitors have it (Intercom, Zendesk) | High | Core differentiator |
| Zapier/automation integration | Standard for SaaS products | Medium | Customer demand #1 |
| Mobile app access | Teams work remotely | Medium | Common expectation |
| Unified inbox view | Basic multi-channel UX | Low | Already have base |
| Contact sync across channels | Data consistency | Medium | Extend existing contacts |
| Channel-specific templates | Different platforms have limits | Low | Extend template system |

## Differentiators

Features that set ADSapp apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered knowledge base | Auto-answers from docs | High | RAG implementation |
| WhatsApp Calling | Voice in same inbox | Medium | Few competitors have this |
| Cross-channel conversation | Same contact, multiple channels | High | Unified thread view |
| Smart routing by channel | Different agents per channel | Medium | Extend existing routing |
| Channel analytics comparison | Which channel performs best | Low | Extend analytics |
| AI response suggestions | Agent productivity boost | Medium | Extend existing AI |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Native mobile app (full rebuild) | High cost, maintenance burden | React Native with shared API |
| Per-channel databases | Data silos, sync nightmares | Single DB with channel_type column |
| Direct Meta webhooks per page | Complexity explosion | Single webhook + page routing |
| Custom vector database | Ops overhead | Use pgvector in Supabase |
| Real-time voice in browser | WebRTC complexity | Rely on WhatsApp app for calls |
| Email channel (initially) | Massive scope, SMTP complexity | Focus on messaging first |
| Custom push notification service | Reinventing wheel | Use Firebase |
| Self-hosted SMS gateway | Carrier relationships complex | Use Twilio/Vonage |

## Feature Dependencies

```
                    ┌───────────────────────────────────────┐
                    │      UNIFIED MESSAGE ROUTER           │
                    │      (Foundation - Build First)       │
                    └───────────────┬───────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │   Instagram   │       │   Facebook    │       │     SMS       │
    │   Channel     │       │   Channel     │       │   Channel     │
    └───────────────┘       └───────────────┘       └───────────────┘


    ┌───────────────────────────────────────────────────────────────┐
    │                   INDEPENDENT FEATURES                        │
    └───────────────────────────────────────────────────────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │    Zapier     │       │  Mobile App   │       │   WhatsApp    │
    │  Integration  │       │   Backend     │       │   Calling     │
    └───────────────┘       └───────────────┘       └───────────────┘


    ┌───────────────────────────────────────────────────────────────┐
    │                     AI ENHANCEMENT LAYER                      │
    │    (Depends on: Existing AI + Optional Knowledge Base)        │
    └───────────────────────────────────────────────────────────────┘
            │                       │
            ▼                       ▼
    ┌───────────────┐       ┌───────────────┐
    │  Knowledge    │       │  Enhanced AI  │
    │    Base       │──────▶│  Responses    │
    └───────────────┘       └───────────────┘
```

## MVP Recommendation

For MVP, prioritize:

1. **Unified Message Router** (foundation for all channels)
   - Must be in place before any new channel
   - Relatively low risk, extends existing patterns

2. **Zapier Integration** (high customer demand)
   - Independent of other features
   - Clear ROI, competitive necessity

3. **One additional channel: Instagram** (Meta ecosystem synergy)
   - Same webhook structure as WhatsApp
   - Same API family (Graph API)
   - High demand from existing WhatsApp users

4. **Mobile API access** (team productivity)
   - Enables field team usage
   - JWT extension is straightforward

Defer to post-MVP:

- **Facebook Messenger**: Similar to Instagram, can follow same pattern later
- **SMS Channel**: Requires Twilio account setup, provider negotiations
- **WhatsApp Calling**: Beta API, less stable
- **Knowledge Base/RAG**: Complex, requires content creation workflow
- **Full mobile app**: Start with API, build app later

## Feature Prioritization Matrix

| Feature | Customer Demand | Implementation Effort | Risk | Priority |
|---------|----------------|----------------------|------|----------|
| Zapier | HIGH | MEDIUM | LOW | P0 |
| Mobile API | HIGH | LOW | LOW | P0 |
| Instagram | HIGH | MEDIUM | MEDIUM | P1 |
| Facebook | MEDIUM | LOW (after IG) | LOW | P1 |
| SMS | MEDIUM | MEDIUM | LOW | P2 |
| WhatsApp Calling | LOW | MEDIUM | HIGH | P3 |
| Knowledge Base | MEDIUM | HIGH | MEDIUM | P3 |

## Sources

- Competitor analysis: Intercom, Zendesk, Freshdesk feature sets
- Customer feedback patterns (assumed from typical SaaS)
- Technical dependency analysis from codebase
