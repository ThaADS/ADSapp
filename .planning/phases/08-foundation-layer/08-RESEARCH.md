# Phase 8: Foundation Layer - Research Findings

**Research Date:** 2026-01-24
**Phase Goal:** Build unified message router and channel abstraction layer that all future channels depend on

---

## Executive Summary

This research provides a comprehensive analysis of implementing a unified message routing system with channel abstraction for the ADSapp multi-tenant WhatsApp messaging platform. The foundation layer will enable seamless integration of future messaging channels (Instagram, Facebook Messenger, SMS, etc.) while maintaining strict multi-tenant isolation through RLS policies.

**Key Findings:**
- Adapter Pattern is the industry-standard approach for channel abstraction
- Canonical message format normalization is critical for multi-channel threading
- PostgreSQL RLS with session variables provides robust multi-tenant isolation
- Message routing should be content-based with provider health monitoring
- Contact deduplication across channels is essential for unified conversation views

---

## 1. Current State Analysis

### 1.1 Existing WhatsApp Implementation

**Current Message Flow:**
```
WhatsApp Cloud API
  → /api/webhooks/whatsapp/route.ts
    → processIncomingMessage()
      → upsertContact()
      → findOrCreateConversation()
      → processMessageContent()
      → Insert into messages table
```

**Current Message Schema (001_initial_schema.sql):**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'system')),
  media_url TEXT,
  media_mime_type TEXT,
  is_read BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Limitations:**
1. WhatsApp-specific fields (whatsapp_message_id) in generic messages table
2. No channel identifier - assumes all messages are WhatsApp
3. Message processing logic tightly coupled to WhatsApp webhook format
4. No abstraction layer for different channel behaviors
5. Cannot support messages from same contact on different channels

### 1.2 Existing Message Types

**WhatsAppMessage Interface (src/lib/whatsapp/enhanced-client.ts):**
```typescript
export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'sticker' | 'button' | 'list' | 'interactive'
  text?: { body: string }
  image?: WhatsAppMedia & { caption?: string }
  document?: WhatsAppMedia & { caption?: string }
  audio?: WhatsAppMedia
  video?: WhatsAppMedia & { caption?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  contacts?: Array<{...}>
  button?: { text: string; payload: string }
  interactive?: {...}
  context?: { from: string; id: string }
  errors?: Array<{...}>
}
```

**Gap:** This is WhatsApp-specific. Instagram, Facebook Messenger, and SMS have different message structures that need normalization.

---

## 2. Industry Best Practices & Patterns

### 2.1 Unified Message Router Pattern

**Enterprise Integration Pattern: Message Router**

According to [Enterprise Integration Patterns](https://enterpriseintegrationpatterns.com/MessageRouter.html):

> "The Content-Based Router inspects the content of a message and routes it to another channel based on the content of the message. A key property of the Message Router is that it does not modify the message contents and only concerns itself with the destination of the message."

**Key Characteristics:**
- Does not modify message contents during routing
- Routes based on message metadata (channel, organization, priority)
- Enables parallel processing across multiple channels
- Supports intelligent routing based on provider health and limits

**Message Bus Pattern:**

From [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageBus.html):

> "A Message Bus is a combination of a common data model, a common command set, and a messaging infrastructure to allow different systems to communicate through a shared set of interfaces."

**Application to ADSapp:**
```
Unified Message Router (Message Bus)
  ├── WhatsApp Adapter
  ├── Instagram Adapter (future)
  ├── Facebook Messenger Adapter (future)
  └── SMS Adapter (future)
```

### 2.2 Adapter Pattern for Channel Abstraction

**Industry Standard Approach:**

According to [Bits and Pieces](https://blog.bitsrc.io/adapter-design-pattern-in-typescript-956cd3e05cec) and [Medium - Adapter Pattern](https://medium.com/@robinviktorsson/a-guide-to-the-adapter-design-pattern-in-typescript-and-node-js-with-practical-examples-f11590ace581):

> "The Adapter Pattern helps bridge the gap between different messaging platforms like Slack and MS Teams, allowing both platforms to be used interchangeably in a system. Common implementations include creating a unified IMessageClient interface with adapters for different services."

**Key Benefits:**
- **Reusability:** Allows reuse of existing classes without modifying their code
- **Flexibility:** Easy integration of new components
- **Separation of Concerns:** Adapter logic separate from business logic

**TypeScript Implementation Pattern:**

```typescript
// Unified interface (Target)
interface ChannelAdapter {
  send(message: CanonicalMessage): Promise<SendResult>
  receive(webhookPayload: unknown): Promise<CanonicalMessage>
  getStatus(messageId: string): Promise<MessageStatus>
  supportsFeature(feature: ChannelFeature): boolean
}

// Concrete adapters (Adaptees)
class WhatsAppAdapter implements ChannelAdapter { ... }
class InstagramAdapter implements ChannelAdapter { ... }
class FacebookMessengerAdapter implements ChannelAdapter { ... }
class SMSAdapter implements ChannelAdapter { ... }
```

**Best Practices (2024):**
- Use adapters to decouple domain models from external APIs
- Ensure consistent internal interfaces even if external APIs are inconsistent
- Support multiple backends (REST and GraphQL) behind common abstraction
- Only use when you need to integrate an existing class with an incompatible interface

Source: [Refactoring Guru](https://refactoring.guru/design-patterns/adapter/typescript/example)

### 2.3 Canonical Message Format

**Enterprise Integration Pattern: Canonical Data Model**

From [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CanonicalDataModel.html):

> "Therefore, design a Canonical Data Model that is independent from any specific application. Require each application to produce and consume messages in this common format."

**Unified Messaging in 2024:**

According to [MessengerPeople.dev](https://www.messengerpeople.dev/):

> "Use a single API to send and receive messages through WhatsApp Business API, Instagram, Facebook Messenger, Twitter and Telegram. Use the same API calls and requests for all messaging apps. We handle all quirks in the background, so developers can focus on providing a great experience to clients."

**Key Requirements:**
1. Channel-agnostic core fields (content, timestamp, sender)
2. Channel-specific metadata in structured JSON field
3. Media handling abstraction (URLs, MIME types, thumbnails)
4. Support for rich content (buttons, lists, locations, contacts)
5. Reply/context tracking across channels

**Recommended Canonical Format:**

```typescript
interface CanonicalMessage {
  // Core fields (required)
  id: string                    // Internal message ID
  conversationId: string        // Internal conversation ID
  channelType: 'whatsapp' | 'instagram' | 'facebook' | 'sms'
  channelMessageId: string      // External channel's message ID
  direction: 'inbound' | 'outbound'

  // Sender information
  senderType: 'contact' | 'agent' | 'system'
  senderId?: string             // Internal contact/profile ID

  // Content
  contentType: 'text' | 'media' | 'rich' | 'system'
  content: string               // Text content or media caption

  // Media (optional)
  media?: {
    type: 'image' | 'video' | 'audio' | 'document'
    url: string
    mimeType: string
    filename?: string
    thumbnailUrl?: string
    size?: number
  }

  // Rich content (optional)
  richContent?: {
    type: 'button' | 'list' | 'location' | 'contact'
    payload: Record<string, unknown>
  }

  // Context/threading
  replyToMessageId?: string

  // Status tracking
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  deliveredAt?: Date
  readAt?: Date

  // Channel-specific metadata
  channelMetadata: Record<string, unknown>

  // Timestamps
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}
```

### 2.4 Conversation Threading Across Channels

**Industry Approach (2024):**

According to [Respond.io](https://respond.io/blog/multichannel-communication):

> "Omnichannel platforms unify conversations across channels into a single thread, preventing message duplication, missed inquiries, and fragmented communication. Advanced platforms can identify and merge duplicated contacts from different channels."

**Key Strategies:**

1. **Contact Unification:**
   - Phone number as primary identifier (E.164 format)
   - Social media IDs as secondary identifiers
   - Deduplication logic to merge contacts across channels

2. **Conversation Routing:**
   - Same contact on different channels can have separate or unified conversations
   - Configuration option: "merge_channels" vs "separate_channels"
   - Smart routing based on customer preference and channel availability

3. **Channel Preference Tracking:**
   - Track customer's preferred channel
   - Auto-route responses to the channel customer last used
   - Allow agents to switch channels mid-conversation

**Recommended Database Schema Addition:**

```sql
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  channel_type TEXT NOT NULL, -- 'whatsapp', 'instagram', 'facebook', 'sms'
  channel_identifier TEXT NOT NULL, -- phone, @username, page_scoped_id
  is_primary BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, channel_type, channel_identifier)
);

CREATE TABLE channel_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id),
  channel_message_id TEXT NOT NULL, -- External channel's ID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'media', 'rich', 'system')),
  content TEXT NOT NULL,
  media JSONB, -- {type, url, mimeType, filename, thumbnailUrl, size}
  rich_content JSONB, -- {type, payload}
  reply_to_message_id UUID REFERENCES channel_messages(id),
  status TEXT NOT NULL DEFAULT 'sent',
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  channel_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Multi-Tenant Security (RLS)

### 3.1 PostgreSQL RLS Best Practices (2024)

**Industry Recommendations:**

According to [AWS Multi-Tenant RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) and [Permit.io RLS Guide](https://www.permit.io/blog/postgres-rls-implementation-guide):

> "PostgreSQL Row Level Security (RLS) guarantees at the database level that cross-tenant data access cannot happen, with every SQL statement automatically tenant-aware so developers can focus on business logic. RLS lets you move the isolation enforcement to a centralized place in the PostgreSQL backend, away from developers' day-to-day coding."

**Key Best Practices:**

1. **Enable RLS on All Tenant Tables:**
   ```sql
   ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
   ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
   ```

2. **Use Session Variables Over Database Users:**
   - Set `app.current_organization_id` session variable at connection time
   - Avoids overhead of creating PostgreSQL users per tenant
   - Enables connection pooling

3. **Standard RLS Policy Pattern:**
   ```sql
   CREATE POLICY tenant_isolation ON channel_messages
   FOR ALL
   USING (organization_id = current_setting('app.current_organization_id')::uuid);
   ```

4. **Defense in Depth:**
   > "RLS provides defense in depth: even if your code has a bug, the database won't return or modify data outside the tenant's scope."

5. **Watch Out for Views and Functions:**
   > "Views owned by roles with the BYPASSRLS privilege will completely bypass Row-Level Security policies, so querying such views will unexpectedly return all tenants' rows."

**Testing Requirements:**
- Write integration tests for each new table with RLS
- Authenticate as different tenants and verify data isolation
- Test that cross-tenant queries return zero results
- Monitor performance impact of RLS policies

Sources: [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html), [Crunchy Data Blog](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)

### 3.2 Common RLS Pitfalls

**Performance Impact:**
- Complex RLS policies can significantly impact query performance
- Use indexed columns in RLS policies (organization_id should be indexed)
- Monitor query execution plans with RLS enabled

**Security Gaps:**
- RLS can create security gaps if functions rely on user-supplied input
- SQL injection still possible through poorly written functions
- Thread-local storage must be properly cleared between requests

**Function Security:**
```sql
-- DANGEROUS: Function without SECURITY DEFINER can bypass RLS
CREATE FUNCTION get_messages() RETURNS SETOF channel_messages AS $$
  SELECT * FROM channel_messages;
$$ LANGUAGE SQL;

-- SAFE: Explicitly set search_path
CREATE FUNCTION get_messages()
RETURNS SETOF channel_messages
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM channel_messages
  WHERE organization_id = current_setting('app.current_organization_id')::uuid;
$$ LANGUAGE SQL;
```

Source: [Permit.io RLS Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)

---

## 4. Message Router Architecture

### 4.1 Routing Strategy

**Content-Based Routing with Health Monitoring:**

According to [Sent API Docs](https://docs.sent.dm/docs/docs/concepts/unified-messaging):

> "Health Monitoring provides real-time checks on provider reliability and limits, while Load Balancing spreads traffic across providers for cost, capacity, and performance."

**Recommended Router Implementation:**

```typescript
class UnifiedMessageRouter {
  private adapters: Map<ChannelType, ChannelAdapter>
  private healthMonitor: ChannelHealthMonitor

  async route(message: CanonicalMessage): Promise<SendResult> {
    // 1. Identify target channel
    const channelType = message.channelType

    // 2. Get adapter
    const adapter = this.adapters.get(channelType)
    if (!adapter) {
      throw new Error(`No adapter for channel: ${channelType}`)
    }

    // 3. Check channel health
    const health = await this.healthMonitor.checkHealth(channelType)
    if (!health.isHealthy) {
      // Fallback logic or queue for retry
      return this.handleUnhealthyChannel(message, health)
    }

    // 4. Validate channel supports required features
    if (message.richContent && !adapter.supportsFeature('rich_content')) {
      // Downgrade to text-only or return error
      return this.handleUnsupportedFeature(message)
    }

    // 5. Send via adapter
    return adapter.send(message)
  }

  async receive(
    channelType: ChannelType,
    webhookPayload: unknown
  ): Promise<CanonicalMessage> {
    const adapter = this.adapters.get(channelType)
    if (!adapter) {
      throw new Error(`No adapter for channel: ${channelType}`)
    }

    // Adapter normalizes channel-specific payload to canonical format
    return adapter.receive(webhookPayload)
  }
}
```

### 4.2 Adapter Interface Design

**Complete ChannelAdapter Interface:**

```typescript
export enum ChannelType {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  SMS = 'sms'
}

export enum ChannelFeature {
  RICH_CONTENT = 'rich_content',      // Buttons, lists, etc.
  MEDIA = 'media',                     // Images, videos, documents
  READ_RECEIPTS = 'read_receipts',     // Delivery and read status
  TYPING_INDICATORS = 'typing_indicators',
  LOCATION_SHARING = 'location_sharing',
  CONTACT_CARDS = 'contact_cards',
  REACTIONS = 'reactions'
}

export interface SendResult {
  success: boolean
  channelMessageId?: string
  error?: string
  retryable?: boolean
}

export interface MessageStatus {
  messageId: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  error?: string
}

export interface ChannelAdapter {
  // Metadata
  readonly channelType: ChannelType
  readonly name: string

  // Core operations
  send(message: CanonicalMessage): Promise<SendResult>
  receive(webhookPayload: unknown): Promise<CanonicalMessage>

  // Status tracking
  getStatus(channelMessageId: string): Promise<MessageStatus>

  // Feature support
  supportsFeature(feature: ChannelFeature): boolean
  getFeatures(): ChannelFeature[]

  // Validation
  validateMessage(message: CanonicalMessage): ValidationResult

  // Health check
  healthCheck(): Promise<HealthStatus>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface HealthStatus {
  isHealthy: boolean
  latency?: number
  rateLimit?: {
    remaining: number
    resetAt: Date
  }
  lastError?: string
}
```

### 4.3 WhatsApp Adapter Implementation (Reference)

**Example Adapter Structure:**

```typescript
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.WHATSAPP
  readonly name = 'WhatsApp Business Cloud API'

  private client: EnhancedWhatsAppClient
  private phoneNumberId: string

  constructor(accessToken: string, phoneNumberId: string) {
    this.client = new EnhancedWhatsAppClient(accessToken)
    this.phoneNumberId = phoneNumberId
  }

  async send(message: CanonicalMessage): Promise<SendResult> {
    try {
      // Convert canonical format to WhatsApp format
      const whatsappMessage = this.toWhatsAppFormat(message)

      // Send via WhatsApp client
      const channelMessageId = await this.client.sendMessage(
        this.phoneNumberId,
        message.channelMetadata.phoneNumber as string,
        whatsappMessage
      )

      return {
        success: true,
        channelMessageId
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryableError(error)
      }
    }
  }

  async receive(webhookPayload: unknown): Promise<CanonicalMessage> {
    // Parse WhatsApp webhook format
    const whatsappMessage = this.parseWebhook(webhookPayload)

    // Convert to canonical format
    return this.toCanonicalFormat(whatsappMessage)
  }

  supportsFeature(feature: ChannelFeature): boolean {
    const supported = [
      ChannelFeature.RICH_CONTENT,
      ChannelFeature.MEDIA,
      ChannelFeature.READ_RECEIPTS,
      ChannelFeature.LOCATION_SHARING,
      ChannelFeature.CONTACT_CARDS
    ]
    return supported.includes(feature)
  }

  getFeatures(): ChannelFeature[] {
    return [
      ChannelFeature.RICH_CONTENT,
      ChannelFeature.MEDIA,
      ChannelFeature.READ_RECEIPTS,
      ChannelFeature.LOCATION_SHARING,
      ChannelFeature.CONTACT_CARDS
    ]
  }

  validateMessage(message: CanonicalMessage): ValidationResult {
    const errors: string[] = []

    // Check phone number format
    if (!message.channelMetadata.phoneNumber) {
      errors.push('Phone number is required')
    }

    // Check content length (WhatsApp limit: 4096 chars)
    if (message.content.length > 4096) {
      errors.push('Content exceeds WhatsApp limit of 4096 characters')
    }

    // Check media type support
    if (message.media && !this.isSupportedMediaType(message.media.type)) {
      errors.push(`Unsupported media type: ${message.media.type}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const start = Date.now()
      await this.client.getBusinessProfile(this.phoneNumberId)
      const latency = Date.now() - start

      return {
        isHealthy: true,
        latency
      }
    } catch (error) {
      return {
        isHealthy: false,
        lastError: error.message
      }
    }
  }

  private toWhatsAppFormat(canonical: CanonicalMessage): Record<string, unknown> {
    // Implementation details
  }

  private toCanonicalFormat(whatsapp: WhatsAppMessage): CanonicalMessage {
    // Implementation details
  }

  private parseWebhook(payload: unknown): WhatsAppMessage {
    // Implementation details
  }

  private isSupportedMediaType(type: string): boolean {
    return ['image', 'video', 'audio', 'document'].includes(type)
  }

  private isRetryableError(error: any): boolean {
    // Rate limit, temporary network issues, etc.
    return error.statusCode >= 500 || error.statusCode === 429
  }
}
```

---

## 5. Database Schema Design

### 5.1 New Tables Required

**1. channel_connections Table:**

Purpose: Track all communication channels for each contact

```sql
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Channel identification
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),
  channel_identifier TEXT NOT NULL, -- Phone, @username, page_scoped_id

  -- Metadata
  display_name TEXT, -- Channel-specific display name
  avatar_url TEXT,   -- Channel-specific profile picture
  is_primary BOOLEAN DEFAULT false, -- Preferred channel for contact
  is_active BOOLEAN DEFAULT true,   -- Can receive messages

  -- Channel-specific data
  channel_metadata JSONB DEFAULT '{}',

  -- Verification
  verified_at TIMESTAMPTZ,

  -- Activity tracking
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, channel_type, channel_identifier)
);

-- Indexes
CREATE INDEX idx_channel_connections_org_contact ON channel_connections(organization_id, contact_id);
CREATE INDEX idx_channel_connections_channel_type ON channel_connections(channel_type);
CREATE INDEX idx_channel_connections_last_message ON channel_connections(last_message_at DESC);

-- RLS Policy
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_connections ON channel_connections
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid);
```

**2. channel_messages Table:**

Purpose: Store all messages with channel-specific metadata

```sql
CREATE TABLE channel_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,

  -- Channel tracking
  channel_message_id TEXT NOT NULL, -- External channel's message ID

  -- Message details
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'media', 'rich', 'system')),
  content TEXT NOT NULL,

  -- Media (JSONB for flexibility)
  media JSONB, -- {type, url, mimeType, filename, thumbnailUrl, size}

  -- Rich content (buttons, lists, location, contacts)
  rich_content JSONB, -- {type, payload}

  -- Threading
  reply_to_message_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- Channel-specific metadata
  channel_metadata JSONB DEFAULT '{}',

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channel_messages_org ON channel_messages(organization_id);
CREATE INDEX idx_channel_messages_conversation ON channel_messages(conversation_id, created_at DESC);
CREATE INDEX idx_channel_messages_channel_connection ON channel_messages(channel_connection_id);
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_message_id);
CREATE INDEX idx_channel_messages_status ON channel_messages(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_channel_messages_reply_to ON channel_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- RLS Policy
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_messages ON channel_messages
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid);
```

**3. channel_adapters_config Table:**

Purpose: Store channel adapter configuration per organization

```sql
CREATE TABLE channel_adapters_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Channel identification
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),

  -- Credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,

  -- Channel-specific configuration
  phone_number_id TEXT,           -- WhatsApp, SMS
  business_account_id TEXT,       -- WhatsApp, Instagram, Facebook
  page_id TEXT,                   -- Facebook, Instagram
  webhook_verify_token TEXT,

  -- Additional config
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('active', 'error', 'disconnected')),
  sync_error TEXT,

  -- Feature flags
  features JSONB DEFAULT '[]', -- Array of supported features

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, channel_type)
);

-- Indexes
CREATE INDEX idx_channel_adapters_org ON channel_adapters_config(organization_id);
CREATE INDEX idx_channel_adapters_type ON channel_adapters_config(channel_type);
CREATE INDEX idx_channel_adapters_active ON channel_adapters_config(is_active) WHERE is_active = true;

-- RLS Policy
ALTER TABLE channel_adapters_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_adapters ON channel_adapters_config
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid);
```

### 5.2 Migration Strategy

**Phase 1: Create New Tables**
- Deploy new tables with RLS policies
- No impact on existing system

**Phase 2: Backfill Data**
- Migrate existing WhatsApp data to new schema
- Create channel_connections for all existing contacts
- Copy messages to channel_messages table
- Maintain both schemas in parallel

**Phase 3: Update Application Code**
- Implement UnifiedMessageRouter
- Implement WhatsAppAdapter
- Route new messages through new system
- Continue reading from both old and new tables

**Phase 4: Deprecate Old Schema**
- Verify all functionality works with new schema
- Stop writing to old messages table
- Archive or drop old tables

**Rollback Strategy:**
- Keep old schema until new system is proven
- Feature flag to toggle between old and new routing
- Database triggers to sync writes between schemas during transition

---

## 6. Contact Deduplication Strategy

### 6.1 Contact Identification

**Primary Identifier: Phone Number**
- WhatsApp and SMS share phone numbers
- Normalize to E.164 format (+1234567890)
- Primary key for contact matching

**Secondary Identifiers:**
- Instagram: Username or User ID
- Facebook Messenger: Page-scoped ID (PSID)
- Email (for future channels)

**Unified Contact Record:**

```sql
-- Existing contacts table enhancement
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS normalized_phone TEXT; -- E.164 format
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_username TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook_psid TEXT;

-- Index for fast lookups
CREATE INDEX idx_contacts_normalized_phone ON contacts(organization_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL;
CREATE INDEX idx_contacts_instagram ON contacts(organization_id, instagram_username)
  WHERE instagram_username IS NOT NULL;
CREATE INDEX idx_contacts_facebook ON contacts(organization_id, facebook_psid)
  WHERE facebook_psid IS NOT NULL;
```

### 6.2 Deduplication Logic

**Algorithm:**

```typescript
async function findOrCreateContact(
  organizationId: string,
  channelType: ChannelType,
  channelIdentifier: string,
  contactInfo: ContactInfo
): Promise<Contact> {

  // 1. Normalize identifier
  const normalized = normalizeIdentifier(channelType, channelIdentifier)

  // 2. Search for existing contact
  let contact: Contact | null = null

  switch (channelType) {
    case 'whatsapp':
    case 'sms':
      // Search by phone number
      contact = await db.contacts.findFirst({
        where: {
          organization_id: organizationId,
          normalized_phone: normalized
        }
      })
      break

    case 'instagram':
      // Search by Instagram username
      contact = await db.contacts.findFirst({
        where: {
          organization_id: organizationId,
          instagram_username: normalized
        }
      })
      break

    case 'facebook':
      // Search by Facebook PSID
      contact = await db.contacts.findFirst({
        where: {
          organization_id: organizationId,
          facebook_psid: normalized
        }
      })
      break
  }

  // 3. Create new contact if not found
  if (!contact) {
    contact = await createContact(organizationId, channelType, normalized, contactInfo)
  }

  // 4. Ensure channel_connection exists
  await upsertChannelConnection(contact.id, channelType, channelIdentifier)

  return contact
}

function normalizeIdentifier(
  channelType: ChannelType,
  identifier: string
): string {
  switch (channelType) {
    case 'whatsapp':
    case 'sms':
      return normalizePhoneNumber(identifier) // E.164 format
    case 'instagram':
      return identifier.toLowerCase().replace('@', '')
    case 'facebook':
      return identifier // PSID is already normalized
    default:
      return identifier
  }
}
```

### 6.3 Merge Conflicts

**Scenario:** Contact connects via Instagram after already using WhatsApp

**Resolution Strategy:**
1. Detect potential duplicate (same name, similar contact info)
2. Present to admin for manual merge review
3. Merge conversations and channel_connections
4. Update primary contact record
5. Archive duplicate contact

**Merge Tracking Table:**

```sql
CREATE TABLE contact_merge_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  duplicate_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  match_criteria TEXT[], -- ['phone', 'name', 'email']
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_merged')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Implementation Roadmap

### 7.1 Recommended Implementation Order

**Step 1: Database Schema (Week 1)**
- Create channel_connections table
- Create channel_messages table
- Create channel_adapters_config table
- Add RLS policies
- Add indexes
- Test RLS isolation

**Step 2: Canonical Message Format (Week 1)**
- Define CanonicalMessage TypeScript interface
- Define ChannelAdapter interface
- Define supporting types (SendResult, MessageStatus, etc.)
- Document message format with examples

**Step 3: WhatsApp Adapter (Week 2)**
- Refactor existing WhatsApp code into adapter pattern
- Implement WhatsAppAdapter class
- Add conversion methods (canonical ↔ WhatsApp)
- Add feature detection
- Add validation
- Unit tests for adapter

**Step 4: Unified Message Router (Week 2)**
- Implement UnifiedMessageRouter class
- Add adapter registration
- Add routing logic
- Add health monitoring
- Add feature validation
- Unit tests for router

**Step 5: Integration (Week 3)**
- Update webhook handler to use router
- Update send message API to use router
- Backfill existing WhatsApp data to new tables
- Parallel write to old and new schemas
- Integration tests

**Step 6: Contact Deduplication (Week 3)**
- Add normalized identifier fields to contacts
- Implement deduplication logic
- Add merge suggestions
- Admin UI for reviewing merges

**Step 7: Monitoring & Observability (Week 4)**
- Add router metrics (messages routed, failures, latency)
- Add adapter health checks
- Add alerting for channel failures
- Dashboard for channel status

**Step 8: Documentation (Week 4)**
- API documentation for ChannelAdapter interface
- Developer guide for adding new channels
- Migration guide for existing data
- Architecture decision records

### 7.2 Testing Strategy

**Unit Tests:**
- ChannelAdapter implementations
- Message normalization functions
- Validation logic
- Health check logic

**Integration Tests:**
- Router with multiple adapters
- Database operations with RLS
- Webhook processing end-to-end
- Message sending end-to-end

**RLS Tests:**
```typescript
describe('RLS Isolation', () => {
  it('should prevent cross-tenant access to channel_messages', async () => {
    const org1Client = await createClientForOrg(org1.id)
    const org2Client = await createClientForOrg(org2.id)

    // Create message for org1
    const message = await org1Client
      .from('channel_messages')
      .insert({ organization_id: org1.id, ... })
      .select()
      .single()

    // Attempt to read as org2
    const { data, error } = await org2Client
      .from('channel_messages')
      .select()
      .eq('id', message.id)
      .single()

    expect(data).toBeNull()
    expect(error).toBeDefined()
  })
})
```

**Load Tests:**
- 1000 messages/second routing
- 100 concurrent webhook requests
- Adapter failure scenarios

### 7.3 Success Metrics

**Phase 8 Completion Criteria:**

1. **Unified Router Operational:**
   - ✅ All WhatsApp messages route through UnifiedMessageRouter
   - ✅ Router handles 1000+ messages/second
   - ✅ <100ms routing latency p95

2. **Channel Abstraction Complete:**
   - ✅ ChannelAdapter interface documented
   - ✅ WhatsAppAdapter implements all interface methods
   - ✅ Feature detection works correctly
   - ✅ Can add Instagram adapter in <1 week (proof of extensibility)

3. **Message Normalization Working:**
   - ✅ All WhatsApp message types convert to canonical format
   - ✅ Canonical messages convert back to WhatsApp format
   - ✅ No data loss in round-trip conversion
   - ✅ Rich content preserved (buttons, lists, locations)

4. **Multi-Channel Threading:**
   - ✅ Messages from same phone number on different channels appear in same conversation
   - ✅ Contact deduplication logic works
   - ✅ Admin can merge duplicate contacts

5. **RLS Policies Enforced:**
   - ✅ All new tables have RLS enabled
   - ✅ Cross-tenant queries return zero results
   - ✅ Integration tests verify isolation
   - ✅ No RLS bypass vulnerabilities

---

## 8. Risks & Mitigation

### 8.1 Technical Risks

**Risk 1: Performance Degradation**
- **Impact:** New abstraction layer adds latency
- **Mitigation:**
  - Benchmark current WhatsApp performance as baseline
  - Target <50ms overhead for routing layer
  - Use connection pooling and caching
  - Monitor p95 and p99 latency metrics

**Risk 2: Data Migration Complexity**
- **Impact:** Backfilling millions of existing messages
- **Mitigation:**
  - Parallel schema strategy (old + new coexist)
  - Batch migration with rate limiting
  - Rollback plan via feature flags
  - Verify data integrity with checksums

**Risk 3: Channel API Inconsistencies**
- **Impact:** Instagram/Facebook APIs differ from WhatsApp
- **Mitigation:**
  - Adapter pattern isolates channel differences
  - Feature detection prevents unsupported operations
  - Graceful degradation for missing features
  - Comprehensive validation before sending

**Risk 4: RLS Policy Bugs**
- **Impact:** Cross-tenant data leakage
- **Mitigation:**
  - Comprehensive RLS test suite
  - Manual security audit of all policies
  - Separate staging environment with multi-tenant test data
  - Monitoring alerts for unexpected cross-tenant queries

### 8.2 Business Risks

**Risk 1: Scope Creep**
- **Impact:** Phase 8 expands beyond foundation
- **Mitigation:**
  - Strict adherence to requirements (FOUND-01 through FOUND-05)
  - No actual Instagram/Facebook implementation in this phase
  - Focus on abstractions and WhatsApp migration only

**Risk 2: Timeline Delays**
- **Impact:** Delays downstream phases (Instagram, Facebook, etc.)
- **Mitigation:**
  - 4-week timeline with weekly checkpoints
  - Parallel work streams (schema + code)
  - Clear success criteria per week
  - Daily standups to identify blockers

---

## 9. Key Technical Decisions

### Decision 1: Adapter Pattern vs Service-Oriented Architecture

**Choice:** Adapter Pattern
**Rationale:**
- Simpler than microservices for current scale
- All channels share same database and auth
- Lower operational complexity (no service mesh needed)
- Can evolve to services later if needed

**Trade-offs:**
- Adapters run in same Node process (shared failure domain)
- Cannot independently scale channels
- Must restart app to update adapter logic

### Decision 2: Single Messages Table vs Per-Channel Tables

**Choice:** Single channel_messages table
**Rationale:**
- Unified conversation views require cross-channel queries
- RLS policies work same across all channels
- Simpler application code (one data model)
- PostgreSQL handles partitioning for scale

**Trade-offs:**
- Large JSONB columns for channel-specific metadata
- Cannot optimize indexes per channel type
- Schema changes affect all channels

### Decision 3: Canonical Format Structure

**Choice:** Rich canonical format with JSONB metadata
**Rationale:**
- Supports current WhatsApp features fully
- Extensible for future channel features
- Preserves channel-specific data for debugging
- Enables rich conversation UI

**Trade-offs:**
- Larger storage footprint than minimal format
- JSONB queries slower than typed columns
- Schema versioning needed for breaking changes

### Decision 4: RLS with Session Variables

**Choice:** RLS with `app.current_organization_id` session variable
**Rationale:**
- Industry best practice (AWS, Permit.io recommendations)
- Better performance than query-time checks
- Enables connection pooling
- Database-enforced security

**Trade-offs:**
- Must remember to set session variable on every connection
- Debugging requires checking session state
- Function security requires careful search_path management

---

## 10. Open Questions

**Q1: Should conversations be merged across channels or kept separate?**

**Options:**
- A: Merge all channels into single conversation per contact
- B: Separate conversations per channel
- C: Configurable per organization

**Recommendation:** Option C - Let organizations choose their preference. Some want unified view, others want channel separation.

**Q2: How to handle rate limits across multiple adapters?**

**Options:**
- A: Global rate limiter across all channels
- B: Per-adapter rate limiting
- C: No rate limiting (rely on channel APIs)

**Recommendation:** Option B - Each channel has different limits. Use per-adapter circuit breakers.

**Q3: Should we support cross-channel messaging (send WhatsApp, receive Instagram)?**

**Options:**
- A: Yes, with auto-routing to last used channel
- B: No, lock conversation to original channel
- C: Agent can manually switch channels

**Recommendation:** Option C for Phase 8. Option A requires more complex routing logic better suited for later phase.

**Q4: How to version canonical message format?**

**Options:**
- A: Version field in every message
- B: Schema migrations with backward compatibility
- C: No versioning, assume additive changes only

**Recommendation:** Option A - Add `canonicalFormatVersion: '1.0'` field. Required for long-term maintainability.

---

## 11. Recommended Next Steps

### Immediate Actions (Week 1)

1. **Review & Approve Research Document**
   - Share with technical team for feedback
   - Confirm architectural decisions
   - Finalize canonical message format

2. **Create Phase 8 Implementation Plan**
   - Break down into sprint-sized tasks
   - Assign owners for each work stream
   - Set up project tracking

3. **Set Up Development Environment**
   - Create feature branch: `feature/phase-8-foundation-layer`
   - Set up local test database with sample multi-channel data
   - Configure RLS testing utilities

4. **Begin Database Schema Work**
   - Write migration for new tables
   - Test RLS policies in isolation
   - Prepare backfill scripts

### Follow-Up Research Needed

1. **Instagram Direct API Research**
   - API capabilities and limitations
   - Webhook format and payload structure
   - Authentication flow (OAuth)
   - Rate limits and quotas

2. **Facebook Messenger Platform Research**
   - API differences from Instagram
   - Page-scoped IDs vs user IDs
   - Supported message types
   - Handover protocol for bot-to-human

3. **SMS Provider Evaluation**
   - Twilio vs Vonage vs Plivo
   - Pricing comparison
   - Feature parity (MMS, delivery receipts)
   - International coverage

---

## 12. References & Sources

### Industry Patterns & Best Practices

1. [Enterprise Integration Patterns - Message Router](https://enterpriseintegrationpatterns.com/MessageRouter.html)
2. [Enterprise Integration Patterns - Message Bus](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageBus.html)
3. [Enterprise Integration Patterns - Canonical Data Model](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CanonicalDataModel.html)
4. [Sent API Docs - Unified Messaging Intelligence](https://docs.sent.dm/docs/docs/concepts/unified-messaging)
5. [Glassix - Top 5 Unified Messaging Platforms In 2024](https://www.glassix.com/article/unified-messaging-platform)
6. [Nextiva - What Is Unified Messaging?](https://www.nextiva.com/blog/unified-messaging.html)

### TypeScript Adapter Pattern

7. [Bits and Pieces - Adapter Design Pattern in TypeScript](https://blog.bitsrc.io/adapter-design-pattern-in-typescript-956cd3e05cec)
8. [Medium - Adapter Pattern in TypeScript](https://medium.com/@robinviktorsson/a-guide-to-the-adapter-design-pattern-in-typescript-and-node-js-with-practical-examples-f11590ace581)
9. [Refactoring Guru - Adapter in TypeScript](https://refactoring.guru/design-patterns/adapter/typescript/example)
10. [Medium - Design Patterns With TypeScript Examples: Adapter](https://medium.com/@mariusbongarts/design-patterns-with-real-life-typescript-examples-adapter-d183af1f1462)

### PostgreSQL RLS for Multi-Tenancy

11. [AWS - Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
12. [AWS Prescriptive Guidance - Row-level security recommendations](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html)
13. [Rico Fritzsche - Mastering PostgreSQL Row-Level Security (RLS) for Rock-Solid Multi-Tenancy](https://ricofritzsche.me/mastering-postgresql-row-level-security-rls-for-rock-solid-multi-tenancy/)
14. [Crunchy Data Blog - Row Level Security for Tenants in Postgres](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
15. [Permit.io - Postgres RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
16. [Thenile.dev - Shipping multi-tenant SaaS using Postgres Row-Level Security](https://www.thenile.dev/blog/multi-tenant-rls)

### Unified Messaging Solutions

17. [MessengerPeople.dev - Unified Messaging API](https://www.messengerpeople.dev/)
18. [Zapier - The best all-in-one messaging apps in 2025](https://zapier.com/blog/best-all-in-one-messaging-app/)
19. [ManyChat - How to Merge Instagram, Messenger, and WhatsApp](https://manychat.com/blog/how-to-merge-instagram-messenger-and-whatsapp/)
20. [M.io - Is There An App That Combines All Messaging Apps?](https://www.m.io/blog/is-there-an-app-that-combines-all-messaging-apps)

### Multi-Channel Conversation Threading

21. [Respond.io - Multichannel Communication: 6 Platforms Compared](https://respond.io/blog/multichannel-communication)
22. [Chatfuel - Multi-channel customer communication: 5 best solutions for 2024](https://chatfuel.com/blog/multi-channel-customer-solutions)
23. [Red Hat Developer - Build an extendable multichannel messaging platform](https://developers.redhat.com/articles/2024/07/02/build-extendable-multichannel-messaging-platform)
24. [HubSpot - How to Leverage the Custom Channels API](https://developers.hubspot.com/blog/how-to-leverage-the-custom-channels-api-to-build-a-custom-messaging-integration)
25. [Kustomer - 15 Best Omnichannel Customer Support Platforms for 2026](https://www.kustomer.com/resources/blog/omnichannel-support-platform/)
26. [Tidio - 12 Best Unified Messaging Platforms](https://www.tidio.com/blog/unified-messaging-platform/)

---

## Appendix A: Canonical Message Format Examples

### Example 1: Simple Text Message (WhatsApp)

```json
{
  "id": "msg_a1b2c3d4",
  "conversationId": "conv_xyz123",
  "channelType": "whatsapp",
  "channelMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGAA==",
  "direction": "inbound",
  "senderType": "contact",
  "senderId": "contact_123",
  "contentType": "text",
  "content": "Hello, I need help with my order",
  "status": "delivered",
  "deliveredAt": "2024-01-24T10:30:00Z",
  "channelMetadata": {
    "phoneNumber": "+16501234567",
    "profileName": "John Doe"
  },
  "timestamp": "2024-01-24T10:30:00Z",
  "createdAt": "2024-01-24T10:30:01Z",
  "updatedAt": "2024-01-24T10:30:05Z"
}
```

### Example 2: Media Message (WhatsApp Image)

```json
{
  "id": "msg_e5f6g7h8",
  "conversationId": "conv_xyz123",
  "channelType": "whatsapp",
  "channelMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGBB==",
  "direction": "inbound",
  "senderType": "contact",
  "senderId": "contact_123",
  "contentType": "media",
  "content": "Here is the screenshot of the error",
  "media": {
    "type": "image",
    "url": "https://storage.supabase.co/media/org123/image_abc.jpg",
    "mimeType": "image/jpeg",
    "filename": "screenshot.jpg",
    "thumbnailUrl": "https://storage.supabase.co/media/org123/image_abc_thumb.jpg",
    "size": 245678
  },
  "status": "read",
  "deliveredAt": "2024-01-24T10:35:00Z",
  "readAt": "2024-01-24T10:36:00Z",
  "channelMetadata": {
    "phoneNumber": "+16501234567",
    "whatsappMediaId": "123456789",
    "sha256": "abc123def456..."
  },
  "timestamp": "2024-01-24T10:35:00Z",
  "createdAt": "2024-01-24T10:35:02Z",
  "updatedAt": "2024-01-24T10:36:01Z"
}
```

### Example 3: Rich Content (WhatsApp Interactive Button)

```json
{
  "id": "msg_i9j0k1l2",
  "conversationId": "conv_xyz123",
  "channelType": "whatsapp",
  "channelMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGCC==",
  "direction": "outbound",
  "senderType": "agent",
  "senderId": "agent_456",
  "contentType": "rich",
  "content": "Please select an option:",
  "richContent": {
    "type": "button",
    "payload": {
      "buttons": [
        {
          "id": "btn_track_order",
          "title": "Track Order"
        },
        {
          "id": "btn_cancel_order",
          "title": "Cancel Order"
        },
        {
          "id": "btn_speak_agent",
          "title": "Speak to Agent"
        }
      ]
    }
  },
  "status": "delivered",
  "deliveredAt": "2024-01-24T10:40:00Z",
  "channelMetadata": {
    "phoneNumber": "+16501234567",
    "interactiveType": "button"
  },
  "timestamp": "2024-01-24T10:39:58Z",
  "createdAt": "2024-01-24T10:39:59Z",
  "updatedAt": "2024-01-24T10:40:01Z"
}
```

### Example 4: Location Message

```json
{
  "id": "msg_m3n4o5p6",
  "conversationId": "conv_xyz123",
  "channelType": "whatsapp",
  "channelMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGDD==",
  "direction": "inbound",
  "senderType": "contact",
  "senderId": "contact_123",
  "contentType": "rich",
  "content": "Location: 37.7749, -122.4194 - San Francisco Office",
  "richContent": {
    "type": "location",
    "payload": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "name": "San Francisco Office",
      "address": "123 Market St, San Francisco, CA 94103"
    }
  },
  "status": "delivered",
  "deliveredAt": "2024-01-24T10:45:00Z",
  "channelMetadata": {
    "phoneNumber": "+16501234567"
  },
  "timestamp": "2024-01-24T10:45:00Z",
  "createdAt": "2024-01-24T10:45:01Z",
  "updatedAt": "2024-01-24T10:45:02Z"
}
```

### Example 5: Reply/Threaded Message

```json
{
  "id": "msg_q7r8s9t0",
  "conversationId": "conv_xyz123",
  "channelType": "whatsapp",
  "channelMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGEE==",
  "direction": "inbound",
  "senderType": "contact",
  "senderId": "contact_123",
  "contentType": "text",
  "content": "Yes, order #12345",
  "replyToMessageId": "msg_i9j0k1l2",
  "status": "delivered",
  "deliveredAt": "2024-01-24T10:41:00Z",
  "channelMetadata": {
    "phoneNumber": "+16501234567",
    "contextMessageId": "wamid.HBgLMTY1MDEyMzQ1NjcVAgARGBI5QTNDQTU2RjUwQ0Y2N0UyOEZGCC=="
  },
  "timestamp": "2024-01-24T10:41:00Z",
  "createdAt": "2024-01-24T10:41:01Z",
  "updatedAt": "2024-01-24T10:41:02Z"
}
```

---

## Appendix B: Adapter Feature Matrix

| Feature | WhatsApp | Instagram | Facebook | SMS | Notes |
|---------|----------|-----------|----------|-----|-------|
| Text Messages | ✅ | ✅ | ✅ | ✅ | All channels support basic text |
| Images | ✅ | ✅ | ✅ | ✅ (MMS) | MMS may have carrier limitations |
| Videos | ✅ | ✅ | ✅ | ✅ (MMS) | Size limits vary by channel |
| Audio | ✅ | ✅ | ✅ | ❌ | SMS does not support audio |
| Documents | ✅ | ❌ | ✅ | ❌ | Instagram Direct doesn't support files |
| Locations | ✅ | ✅ | ✅ | ❌ | SMS can send text coordinates |
| Contact Cards | ✅ | ❌ | ❌ | ❌ | WhatsApp-specific feature |
| Buttons | ✅ | ✅ | ✅ | ❌ | Interactive messages |
| Lists | ✅ | ✅ | ✅ | ❌ | Menu selections |
| Quick Replies | ✅ | ✅ | ✅ | ❌ | Predefined response options |
| Reactions | ✅ | ✅ | ✅ | ❌ | Emoji reactions to messages |
| Read Receipts | ✅ | ✅ | ✅ | ⚠️ | SMS read receipts carrier-dependent |
| Typing Indicators | ✅ | ✅ | ✅ | ❌ | Real-time typing status |
| End-to-End Encryption | ✅ | ⚠️ | ⚠️ | ❌ | WhatsApp default, IG/FB optional |
| Business Profile | ✅ | ✅ | ✅ | ❌ | Verified business profiles |
| Catalog Integration | ✅ | ✅ | ✅ | ❌ | Product catalogs |
| Payment Integration | ✅ | ❌ | ✅ | ❌ | In-app payments |
| Stories/Status | ✅ | ✅ | ✅ | ❌ | Ephemeral content |

**Legend:**
- ✅ Fully supported
- ⚠️ Partially supported or limited
- ❌ Not supported

---

## Appendix C: Database Migration Script Example

```sql
-- Phase 8 Foundation Layer Migration
-- Creates new tables for multi-channel support

BEGIN;

-- ============================================================================
-- 1. CHANNEL CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Channel identification
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),
  channel_identifier TEXT NOT NULL,

  -- Metadata
  display_name TEXT,
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Channel-specific data
  channel_metadata JSONB DEFAULT '{}',

  -- Verification
  verified_at TIMESTAMPTZ,

  -- Activity tracking
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, channel_type, channel_identifier)
);

-- Indexes
CREATE INDEX idx_channel_connections_org_contact ON channel_connections(organization_id, contact_id);
CREATE INDEX idx_channel_connections_channel_type ON channel_connections(channel_type);
CREATE INDEX idx_channel_connections_last_message ON channel_connections(last_message_at DESC);

-- RLS
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_connections ON channel_connections
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- 2. CHANNEL MESSAGES TABLE
-- ============================================================================

CREATE TABLE channel_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,

  -- Channel tracking
  channel_message_id TEXT NOT NULL,

  -- Message details
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'media', 'rich', 'system')),
  content TEXT NOT NULL,

  -- Media
  media JSONB,

  -- Rich content
  rich_content JSONB,

  -- Threading
  reply_to_message_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- Channel-specific metadata
  channel_metadata JSONB DEFAULT '{}',

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channel_messages_org ON channel_messages(organization_id);
CREATE INDEX idx_channel_messages_conversation ON channel_messages(conversation_id, created_at DESC);
CREATE INDEX idx_channel_messages_channel_connection ON channel_messages(channel_connection_id);
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_message_id);
CREATE INDEX idx_channel_messages_status ON channel_messages(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_channel_messages_reply_to ON channel_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- RLS
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_messages ON channel_messages
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- 3. CHANNEL ADAPTERS CONFIG TABLE
-- ============================================================================

CREATE TABLE channel_adapters_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Channel identification
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),

  -- Credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,

  -- Channel-specific configuration
  phone_number_id TEXT,
  business_account_id TEXT,
  page_id TEXT,
  webhook_verify_token TEXT,

  -- Additional config
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('active', 'error', 'disconnected')),
  sync_error TEXT,

  -- Feature flags
  features JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, channel_type)
);

-- Indexes
CREATE INDEX idx_channel_adapters_org ON channel_adapters_config(organization_id);
CREATE INDEX idx_channel_adapters_type ON channel_adapters_config(channel_type);
CREATE INDEX idx_channel_adapters_active ON channel_adapters_config(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE channel_adapters_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_channel_adapters ON channel_adapters_config
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_channel_connections_updated_at
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_messages_updated_at
  BEFORE UPDATE ON channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_adapters_config_updated_at
  BEFORE UPDATE ON channel_adapters_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

**End of Research Document**
