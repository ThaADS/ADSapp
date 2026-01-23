# Domain Pitfalls

**Domain:** Multi-channel communication platform
**Researched:** 2026-01-23

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Channel-Specific Message Handlers

**What goes wrong:** Creating separate, disconnected handlers for each channel (WhatsApp handler, Instagram handler, SMS handler) that don't share common logic.

**Why it happens:** Seems faster initially - just copy WhatsApp webhook and modify for Instagram. Each channel has unique fields.

**Consequences:**
- Duplicate code across handlers
- Inconsistent contact/conversation management
- Feature parity issues (one channel gets features others don't)
- Exponential maintenance burden as channels grow

**Prevention:**
- Build UnifiedMessageRouter FIRST
- Define canonical message format that normalizes all channels
- Channel handlers convert to/from canonical format only
- All business logic operates on canonical format

**Detection:**
- Code review: Look for `processWhatsAppMessage()`, `processInstagramMessage()` as separate functions
- If message handling logic exists in multiple webhook files, this pitfall is occurring

### Pitfall 2: OAuth Provider vs Consumer Confusion

**What goes wrong:** Using OAuth consumer patterns (existing SSO code) to implement OAuth provider functionality for Zapier.

**Why it happens:** Both involve OAuth, easy to confuse which direction tokens flow.

**Consequences:**
- Zapier integration fails silently
- Token validation errors
- Security vulnerabilities from improper token handling

**Prevention:**
- Document clearly: "For Zapier, ADSapp ISSUES tokens (we are provider)"
- Create separate `src/lib/integrations/zapier/oauth-provider.ts`
- Never mix provider and consumer code paths

**Detection:**
- If Zapier OAuth code imports from `src/lib/auth/sso/oauth.ts`, likely confused
- Zapier should have its own OAuth implementation that issues, not consumes, tokens

### Pitfall 3: Meta Webhook Per-Page

**What goes wrong:** Registering separate webhooks for each Facebook/Instagram page, creating webhook explosion.

**Why it happens:** Meta documentation shows per-page webhook examples. Seems like the right approach.

**Consequences:**
- Webhook URL management nightmare
- Rate limiting issues
- Inconsistent event handling
- Scaling problems as customers add pages

**Prevention:**
- Single webhook endpoint: `/api/webhooks/meta`
- Route based on page_id in webhook payload
- Store page-to-organization mapping in database

**Detection:**
- If webhook URLs contain page IDs or organization IDs, this pitfall is occurring
- Webhook registration should be one-time, not per-page

### Pitfall 4: Per-Channel Contact Records

**What goes wrong:** Creating separate contact records for each channel (WhatsApp contact, Instagram contact, SMS contact) for the same person.

**Why it happens:** Each channel has different identifiers (phone number vs Instagram ID vs email).

**Consequences:**
- Duplicate contacts per real person
- Lost conversation history across channels
- CRM sync confusion
- Analytics overcounting

**Prevention:**
- Single contacts table with channel_identifiers JSONB column
- Merge logic when same phone appears across channels
- Contact linking UI for manual resolution

**Detection:**
- If queries filter `WHERE channel = 'whatsapp'` on contacts table, likely issue
- Contact count significantly higher than unique customer count

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 1: Synchronous Webhook Processing

**What goes wrong:** Processing all webhook logic synchronously in the HTTP handler, causing webhook timeouts.

**Why it happens:** Simpler to implement initially. Works fine with low volume.

**Prevention:**
- Accept webhook, acknowledge immediately (200 OK)
- Queue actual processing via BullMQ
- Use existing queue patterns from `src/lib/queue/`

### Pitfall 2: Hardcoded SMS Provider

**What goes wrong:** Tightly coupling to Twilio without abstraction layer.

**Why it happens:** "We'll only use Twilio" - until pricing negotiations suggest Vonage.

**Prevention:**
- Create `SMSProviderInterface` abstraction
- Implement `TwilioProvider`, `VonageProvider` behind interface
- Store provider selection per organization

### Pitfall 3: Push Notification Token Leakage

**What goes wrong:** Storing device tokens without proper cleanup, sending to invalid tokens.

**Why it happens:** Easy to forget about token invalidation on app uninstall or logout.

**Prevention:**
- Handle push notification errors properly (remove invalid tokens)
- Clear tokens on user logout
- Implement token refresh mechanism

### Pitfall 4: Vector Search Without Fallback

**What goes wrong:** Knowledge base queries fail when no similar content exists, returning empty responses.

**Why it happens:** Vector search returns nothing if similarity threshold not met.

**Prevention:**
- Implement fallback to keyword search
- Have default responses when confidence low
- Log low-confidence queries for content gap analysis

### Pitfall 5: WhatsApp Calling Without Recording Consent

**What goes wrong:** Recording calls without user consent, violating privacy laws.

**Why it happens:** Technical focus, legal considerations overlooked.

**Prevention:**
- Implement recording consent prompt
- Store consent status per contact
- Regional compliance rules (GDPR, CCPA)

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 1: Inconsistent Channel Status

**What goes wrong:** Channel connection status in UI doesn't match reality.

**Prevention:**
- Regular health checks via existing `/api/integrations/status` pattern
- Clear error states and reconnection UI

### Pitfall 2: Timezone Confusion in Analytics

**What goes wrong:** Channel comparison analytics use different timezone assumptions.

**Prevention:**
- All timestamps in UTC
- Convert to user timezone only for display
- Document timezone handling in analytics code

### Pitfall 3: Message Template Limits Ignored

**What goes wrong:** Templates created for WhatsApp don't fit Instagram character limits.

**Prevention:**
- Channel-specific validation rules
- Preview per-channel before save
- Clear error messages about limits

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Unified Router | Channel-specific handlers | Define canonical message format first |
| Zapier Integration | OAuth direction confusion | Document provider vs consumer clearly |
| Meta Channels | Per-page webhooks | Single webhook with routing |
| SMS Channel | Hardcoded provider | Create abstraction interface |
| Mobile Backend | Token management | Implement proper cleanup |
| WhatsApp Calling | Recording consent | Legal review, consent UI |
| Knowledge Base | Empty results | Fallback search mechanism |

## Sources

- Industry post-mortems and retrospectives
- Multi-channel platform architecture patterns
- Meta Graph API documentation warnings
- OAuth 2.0 specification (RFC 6749)
- Codebase analysis of existing patterns
