# Stack Research: Feature Gap Implementation

**Project:** ADSapp WhatsApp Business Inbox SaaS
**Researched:** 2026-01-23
**Confidence:** HIGH (verified via official docs and current sources)

## Executive Summary

This research covers stack additions needed for 10 new features. The existing stack (Next.js 15, React 19, Supabase, Stripe, WhatsApp Cloud API) is solid and extensible. Most new features integrate cleanly without major architectural changes.

**Key decisions:**
- Use Supabase pgvector for RAG (already have Supabase)
- Use Turborepo + Expo SDK 54 + Solito for mobile apps (code sharing with existing Next.js)
- Meta Graph API directly for Instagram/Messenger (same OAuth flow as WhatsApp)
- Twilio for SMS and WhatsApp Calling (unified provider, good Node.js SDK)
- Native webhook endpoints for Zapier/Shopify (minimal new dependencies)

---

## Existing Stack (Keep)

### Core Framework
| Technology | Version | Purpose | Why Keep |
|------------|---------|---------|----------|
| Next.js | 15+ (16.0.7 installed) | App Router, API Routes | Already mature, team familiar |
| React | 19.1.0 | UI framework | Native to Next.js, matches Expo 54 |
| TypeScript | 5.x | Type safety | Existing codebase typed |
| Tailwind CSS | 4 | Styling | Existing component library |

### Database & Infrastructure
| Technology | Version | Purpose | Why Keep |
|------------|---------|---------|----------|
| Supabase | 2.58.0 | PostgreSQL + Auth + Storage + Realtime | Already integrated, RLS in place |
| BullMQ | 5.61.0 | Job queues | Already configured for async operations |
| Redis/Upstash | Latest | Queue backend, caching | Already integrated |
| Stripe | 18.5.0 | Payments | Existing billing system |

### AI Stack
| Technology | Version | Purpose | Why Keep |
|------------|---------|---------|----------|
| OpenRouter | Custom client | Multi-model AI (Claude, GPT) | Existing in `src/lib/ai/openrouter.ts` |

---

## New Dependencies Required

### 1. Zapier Integration

**No new npm dependencies required.**

Zapier integration is webhook-based. Your Next.js API routes already support webhooks.

| Component | Implementation | Notes |
|-----------|----------------|-------|
| Triggers | Webhook endpoints in `/api/webhooks/zapier/` | Send events when conversations/contacts change |
| Actions | REST API endpoints | Zapier calls your existing API |
| Authentication | OAuth 2.0 | Reuse existing `openid-client` and `jose` from SSO |

**Implementation approach:**
```typescript
// No library needed - native Next.js API routes
// /api/webhooks/zapier/subscribe - Register webhook
// /api/webhooks/zapier/unsubscribe - Remove webhook
// /api/webhooks/zapier/[trigger] - Trigger events
```

**Why no Zapier SDK:** Zapier runs your code in their AWS Lambda. You just need to expose REST endpoints and handle OAuth. The Zapier CLI is for building integrations, not consuming them.

**Sources:**
- [Zapier Authentication Docs](https://docs.zapier.com/platform/build/auth)
- [Zapier + Next.js Pattern](https://www.austinkw.co/zapier)

---

### 2. WhatsApp Catalog API

**No new npm dependencies required.**

The existing `EnhancedWhatsAppClient` in `src/lib/whatsapp/enhanced-client.ts` already uses the Meta Graph API v18.0. Catalog is an extension of the same API.

| Feature | API Endpoint | Integration Point |
|---------|--------------|-------------------|
| Get Catalog | `GET /{catalog_id}/products` | Extend `EnhancedWhatsAppClient` |
| Single Product Message | `POST /{phone_id}/messages` | New message type in client |
| Multi-Product Message | `POST /{phone_id}/messages` | New message type (up to 30 items) |

**Required Meta Configuration:**
- Facebook Commerce Manager setup
- Catalog linked to WhatsApp Business Account
- Facebook Business Manager admin access

**New types to add:**
```typescript
interface WhatsAppProductMessage {
  type: 'product' | 'product_list'
  action: {
    catalog_id: string
    product_retailer_id?: string  // Single product
    sections?: ProductSection[]    // Multi-product (up to 30 items, 10 sections)
  }
}
```

**Sources:**
- [WhatsApp Catalog API Guide](https://zixflow.com/blog/whatsapp-catalog-api-for-ecommerce/)
- [360dialog Catalog Docs](https://docs.360dialog.com/docs/waba-messaging/products-and-catalogs)

---

### 3. @Mentions in Conversations

**New dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@tiptap/core` | ^2.11.x | Rich text editor framework |
| `@tiptap/extension-mention` | ^2.11.x | @mention functionality |
| `@tiptap/react` | ^2.11.x | React bindings |
| `@tiptap/starter-kit` | ^2.11.x | Common extensions bundle |

**Why Tiptap:** Industry standard for React mention implementations. Works with existing Supabase Realtime for notifications.

**Alternative considered:** Velt SDK has built-in mentions but adds external dependency and is overkill for simple agent mentions.

**Installation:**
```bash
npm install @tiptap/core @tiptap/extension-mention @tiptap/react @tiptap/starter-kit
```

**Notification flow:**
1. Agent types `@john` in message input
2. Mention stored in message metadata JSONB
3. Supabase Realtime triggers notification
4. Existing notification system handles delivery

**Sources:**
- [Tiptap Mention Extension](https://tiptap.dev/docs/editor/extensions/nodes/mention)
- [Velt Collaboration SDK](https://velt.dev/blog/build-rich-text-editor-nextjs)

---

### 4. React Native Mobile Apps

**New dependencies (mobile app package in monorepo):**

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ^54.0.0 | React Native framework (React 19.1.0, RN 0.81) |
| `expo-router` | ^5.x | File-based routing (like Next.js App Router) |
| `solito` | ^5.0.0 | Next.js + React Native navigation unification |
| `@react-navigation/native` | ^7.x | Native navigation |
| `expo-notifications` | ^0.31.x | Push notifications |
| `expo-secure-store` | ^14.x | Secure credential storage |

**Monorepo structure (Turborepo):**
```
apps/
  web/          # Existing Next.js app (move current src/ here)
  mobile/       # New Expo app
packages/
  ui/           # Shared React components (with React Native primitives)
  api-client/   # Shared Supabase/API client
  types/        # Shared TypeScript types (move from src/types/)
```

**Why this approach:**
- Expo SDK 54 uses React 19.1.0 (matches your Next.js exactly)
- React Native 0.81 is current stable
- Solito 5 eliminates react-native-web dependency on Next.js side
- Turborepo provides efficient build caching
- 90% code sharing for business logic achievable

**What to share:**
- API client (`src/lib/supabase/`, `src/lib/whatsapp/`)
- State management (Zustand stores)
- Types (`src/types/`)
- Business logic (validation, utils)

**What NOT to share:**
- UI components (mobile UX differs fundamentally from web)
- Navigation structure
- Platform-specific features

**Push Notifications Backend:**
| Package | Version | Purpose |
|---------|---------|---------|
| `firebase-admin` | ^12.x | Cross-platform push (iOS/Android) |

**Installation (mobile app):**
```bash
# In apps/mobile/
npx create-expo-app@latest . --template tabs
npm install solito @react-navigation/native expo-notifications expo-secure-store

# Root level
npm install -D turbo

# Backend push notifications
npm install firebase-admin
```

**Sources:**
- [Expo SDK 54 Release](https://expo.dev/changelog/2024-11-12-sdk-52)
- [Solito 5 Web-First](https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek)
- [Turborepo + React Native 2025 Guide](https://medium.com/better-dev-nextjs-react/setting-up-turborepo-with-react-native-and-next-js-the-2025-production-guide-690478ad75af)

---

### 5. Shopify Integration

**New dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@shopify/shopify-api` | ^12.x | Official Shopify Admin API client |

**Why official SDK:**
- Handles OAuth, webhooks, rate limiting (2 calls/sec)
- GraphQL and REST support
- Webhook HMAC verification built-in
- Active maintenance (merged into shopify-app-js monorepo)

**Breaking change in v12:** All REST resource IDs are now `string` type instead of `number`.

**Integration pattern:**
```typescript
// Similar to existing CRM integrations in src/lib/crm/
src/lib/shopify/
  client.ts      # Shopify API client
  auth.ts        # OAuth flow
  webhooks.ts    # Webhook handlers
  sync.ts        # Order/customer sync
```

**Webhooks to subscribe:**
- `orders/create` - New order notifications
- `orders/updated` - Order status changes
- `customers/create` - New customer sync
- `app/uninstalled` - Cleanup

**Installation:**
```bash
npm install @shopify/shopify-api
```

**Sources:**
- [Shopify API Node.js Docs](https://github.com/Shopify/shopify-api-js)
- [Shopify Webhooks Guide](https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/webhooks.md)

---

### 6. Instagram DM Channel

**No new npm dependencies required.**

Instagram Messenger API uses the same Meta Graph API as WhatsApp. Reuse OAuth and API patterns.

| Requirement | Details |
|-------------|---------|
| Permissions | `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments` |
| Access Level | ADVANCED (requires Meta App Review) |
| Account Type | Business or Creator only (personal deprecated Dec 2024) |

**Constraints:**
- 200 DMs/hour rate limit
- 24-hour messaging window (like WhatsApp)
- 7-day window with `human_agent` tag

**Sources:**
- [Instagram Graph API 2025 Guide](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2025/)
- [Messenger API for Instagram](https://developers.facebook.com/docs/messenger-platform/instagram)

---

### 7. Facebook Messenger Channel

**No new npm dependencies required.**

Same Meta Graph API. Facebook Messenger was the original platform; Instagram API is based on it.

| Requirement | Details |
|-------------|---------|
| Permissions | `pages_messaging`, `pages_manage_metadata` |
| Webhook | Subscribe to `messages`, `messaging_postbacks` |

**Unified approach:**
```typescript
// Create unified Meta messaging client
src/lib/meta/
  client.ts          # Base Meta Graph API client
  whatsapp.ts        # WhatsApp-specific extensions (move existing)
  instagram.ts       # Instagram-specific extensions
  messenger.ts       # Messenger-specific extensions
  webhook-handler.ts # Unified webhook processing
```

**Sources:**
- [Facebook Messenger API](https://developers.facebook.com/docs/messenger-platform)
- [MessengerPeople Unified API](https://www.messengerpeople.dev/)

---

### 8. SMS Channel

**New dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `twilio` | ^5.x | SMS sending/receiving via Programmable Messaging |

**Why Twilio:**
- Most mature Node.js SDK
- Same provider can handle WhatsApp Calling (unified vendor)
- 1,600+ global carriers
- Per-second billing (cost-effective)
- Strong webhook support

**Alternatives considered:**
- **Vonage**: Good but less mature SDK, separate from WhatsApp calling
- **MessageBird/Bird**: Less transparent pricing, requires quote
- **Plivo**: Good pricing but separate from WhatsApp calling solution

**Rate limits:** 2 REST API calls/second.

**Installation:**
```bash
npm install twilio
```

**Sources:**
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [Twilio Alternatives Comparison](https://zixflow.com/blog/twilio-alternatives/)

---

### 9. WhatsApp Calling API

**New dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `twilio` | ^5.x | WhatsApp Business Calling via Programmable Voice |

**Why Twilio for WhatsApp Calling:**
- Meta partnered with Twilio for WhatsApp Business Calling
- GA since July 15, 2025
- Integrates with Twilio Programmable Voice
- Same SDK as SMS (single dependency for both)

**Key capabilities:**
- User-initiated (inbound) calls - **FREE**
- Brand-initiated (outbound) calls - Requires explicit user consent
- VoIP via WebRTC
- **Cannot connect to PSTN** (mobile/landline not supported)

**Sources:**
- [WhatsApp Business Calling API](https://business.whatsapp.com/blog/whatsapp-business-calling-api)
- [Twilio WhatsApp Calling Docs](https://www.twilio.com/docs/voice/whatsapp-business-calling)

---

### 10. Knowledge Base AI (RAG)

**New dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | Already installed (2.58.0) | pgvector queries |
| `langchain` | ^0.3.x | RAG orchestration (optional, evaluate need) |
| `@langchain/openai` | ^0.3.x | OpenAI embeddings client |

**Why Supabase pgvector:**
- Already using Supabase (no new infrastructure)
- pgvector extension is free and built-in
- RLS works with vectors (permission-aware multi-tenant RAG)
- Real-time subscriptions for document updates

**Embedding model recommendation:**

| Model | Dimensions | Cost/1M tokens | Recommendation |
|-------|------------|----------------|----------------|
| `text-embedding-3-small` | 1536 | $0.02 | **Use this** - best cost/performance ratio |
| `text-embedding-3-large` | 3072 | $0.13 | Only if higher accuracy needed |
| `text-embedding-ada-002` | 1536 | $0.10 | Legacy, avoid |

**Schema addition:**
```sql
-- Enable pgvector extension (Supabase dashboard or SQL)
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents table
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy (multi-tenant isolation)
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their organization documents"
  ON knowledge_documents FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- IVFFlat index for fast similarity search
CREATE INDEX ON knowledge_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Installation:**
```bash
npm install langchain @langchain/openai
# Note: Start without langchain - add only if chains/agents needed
```

**Sources:**
- [Supabase AI & Vectors Docs](https://supabase.com/docs/guides/ai)
- [pgvector Extension](https://supabase.com/docs/guides/database/extensions/pgvector)
- [RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions)
- [OpenAI Embeddings Pricing](https://openai.com/api/pricing/)

---

## Integration Points with Existing Stack

### Supabase Integration
| New Feature | Integration Point |
|-------------|-------------------|
| @Mentions | Realtime subscriptions for notifications, store in message `metadata` JSONB |
| RAG Knowledge Base | pgvector extension, RLS for multi-tenant isolation |
| All Channels | Same `conversations`/`messages` tables with new `channel` enum value |

### Existing WhatsApp Client Extension
```typescript
// Extend EnhancedWhatsAppClient for Catalog
// In src/lib/whatsapp/enhanced-client.ts
async sendProductMessage(phoneNumberId: string, to: string, catalogId: string, productId: string) { }
async sendProductListMessage(phoneNumberId: string, to: string, catalogId: string, sections: ProductSection[]) { }
async getCatalogProducts(catalogId: string) { }
```

### OpenRouter AI Integration for RAG
The existing `OpenRouterClient` in `src/lib/ai/openrouter.ts` can be extended:
```typescript
// Add context injection method
async chatWithContext(
  messages: OpenRouterMessage[],
  knowledgeContext: string[],
  options?: Partial<OpenRouterRequest>
) {
  const systemMessage = {
    role: 'system' as const,
    content: `Use this knowledge base context to answer:\n${knowledgeContext.join('\n\n')}`
  }
  return this.chat([systemMessage, ...messages], options)
}
```

### Multi-Channel Architecture
```typescript
// Unified channel abstraction
type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'sms'

interface ChannelClient {
  sendMessage(to: string, message: Message): Promise<string>
  handleWebhook(payload: unknown): Promise<IncomingMessage>
}

// Factory pattern
function getChannelClient(channel: Channel, orgId: string): ChannelClient {
  switch (channel) {
    case 'whatsapp': return new WhatsAppClient(orgId)
    case 'instagram': return new InstagramClient(orgId)
    case 'messenger': return new MessengerClient(orgId)
    case 'sms': return new TwilioSmsClient(orgId)
  }
}
```

---

## What NOT to Add

### 1. Separate Vector Database (Pinecone, Weaviate, Qdrant)
**Why not:** Supabase pgvector provides vector storage with RLS, same infrastructure, no additional cost. Firecrawl and Berri AI migrated FROM Pinecone TO Supabase pgvector for efficiency.

### 2. React Native Web for Mobile Web
**Why not:** Solito 5 eliminates this dependency. Web runs pure Next.js, mobile runs pure React Native. No need for react-native-web on the web side.

### 3. Separate Messaging SDKs for Each Channel
**Why not:** Meta Graph API covers WhatsApp, Instagram, and Messenger. Building unified client is cleaner than 3 separate SDKs.

### 4. Socket.IO for Real-Time
**Why not:** Supabase Realtime already handles WebSocket connections. Adding Socket.IO would duplicate functionality.

### 5. Zapier SDK / Zapier Platform CLI
**Why not:** That's for building Zapier apps. You're exposing webhooks and API endpoints as an integration partner.

### 6. Third-Party Unified Messaging Platforms (Unipile, Umnico, MessengerPeople)
**Why not:** These add abstraction cost (per-message fees) and vendor dependency. Direct Meta API gives you control and is free (pay per message to Meta only).

### 7. LangChain Initially for Simple RAG
**Why not initially:** For basic RAG (embed, store, retrieve, query), direct Supabase + OpenAI calls are simpler. Add LangChain later only if you need chains, agents, or complex orchestration.

---

## Summary: Installation Commands

### Phase 1: @Mentions
```bash
npm install @tiptap/core @tiptap/extension-mention @tiptap/react @tiptap/starter-kit
```

### Phase 2: Shopify Integration
```bash
npm install @shopify/shopify-api
```

### Phase 3: SMS + WhatsApp Calling
```bash
npm install twilio
```

### Phase 4: RAG Knowledge Base
```bash
# Start simple, no langchain needed initially
# Enable pgvector in Supabase dashboard
# Use OpenRouter for embeddings OR add:
npm install @langchain/openai  # For OpenAI embeddings client
```

### Phase 5: Mobile App (new package in monorepo)
```bash
# In apps/mobile/
npx create-expo-app@latest . --template tabs
npm install solito @react-navigation/native expo-notifications expo-secure-store

# Root level for monorepo
npm install -D turbo

# Backend for push notifications
npm install firebase-admin
```

### No Additional Dependencies Needed For:
- Zapier Integration (webhook endpoints only)
- WhatsApp Catalog API (extend existing client)
- Instagram DM (extend Meta client)
- Facebook Messenger (extend Meta client)

---

## Environment Variables (New)

```env
# Firebase (Push Notifications for Mobile)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Twilio (SMS + WhatsApp Calling)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Meta Graph API (Instagram/Facebook) - per organization in DB
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
# Page tokens stored per-organization in organizations table

# Zapier OAuth Provider
ZAPIER_OAUTH_CLIENT_ID=your_client_id
ZAPIER_OAUTH_CLIENT_SECRET=your_client_secret
```

---

## Confidence Assessment

| Feature | Confidence | Reason |
|---------|------------|--------|
| Zapier | HIGH | Standard webhook pattern, well-documented |
| WhatsApp Catalog | HIGH | Extension of existing Meta API v18.0 |
| @Mentions | HIGH | Tiptap is industry standard, well-documented |
| Mobile Apps | HIGH | Expo SDK 54 + Solito 5 are current stable releases |
| Shopify | HIGH | Official SDK v12, active maintenance |
| Instagram/Messenger | HIGH | Same Meta Graph API as WhatsApp |
| SMS | HIGH | Twilio is mature, well-documented |
| WhatsApp Calling | HIGH | Twilio GA since July 2025, official Meta partner |
| RAG Knowledge Base | HIGH | Supabase pgvector is production-ready |

All recommendations verified against official documentation as of January 2026.

---

## Sources

- [Zapier Authentication Docs](https://docs.zapier.com/platform/build/auth)
- [WhatsApp Catalog API](https://zixflow.com/blog/whatsapp-catalog-api-for-ecommerce/)
- [Tiptap Mention Extension](https://tiptap.dev/docs/editor/extensions/nodes/mention)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52)
- [Solito 5 Release](https://github.com/nandorojo/solito/releases)
- [Shopify API Node.js](https://github.com/Shopify/shopify-api-js)
- [Instagram Graph API 2025](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2025/)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [WhatsApp Business Calling API](https://www.twilio.com/docs/voice/whatsapp-business-calling)
- [Supabase AI & Vectors](https://supabase.com/docs/guides/ai)
- [OpenAI Embeddings Pricing](https://openai.com/api/pricing/)
