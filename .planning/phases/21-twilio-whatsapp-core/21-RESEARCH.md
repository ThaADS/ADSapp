# Phase 21 Research: Twilio WhatsApp Core

**Date:** 2026-02-03
**Phase Goal:** Implement Twilio WhatsApp adapter with full send/receive capability

## Requirements Covered

- **TWWA-01**: User can connect Twilio WhatsApp account via Account SID and Auth Token
- **TWWA-02**: Incoming WhatsApp messages via Twilio appear in unified inbox within 30 seconds
- **TWWA-03**: User can send text messages via Twilio WhatsApp to contacts
- **TWWA-04**: User can send media (image, video, audio, document) via Twilio WhatsApp

## Existing Patterns Analysis

### 1. ChannelAdapter Interface (`src/types/channels.ts`)

All channel adapters must implement:
```typescript
interface ChannelAdapter {
  readonly channelType: ChannelType
  readonly name: string
  send(message: CanonicalMessage): Promise<SendResult>
  receive(webhookPayload: unknown): Promise<CanonicalMessage>
  getStatus(channelMessageId: string): Promise<MessageStatus>
  supportsFeature(feature: ChannelFeature): boolean
  getFeatures(): ChannelFeature[]
  validateMessage(message: CanonicalMessage): ValidationResult
  healthCheck(): Promise<HealthStatus>
}
```

**Pattern**: Extend `BaseChannelAdapter` which provides shared utilities:
- `normalizePhoneNumber()` - E.164 format normalization
- `isRetryableError()` - Error classification
- `generateMessageId()` - Internal ID generation
- `extractErrorCode()` / `formatErrorMessage()` - Error handling
- `validateChannelSpecific()` - Hook for channel-specific validation

### 2. WhatsApp Cloud API Adapter (`src/lib/channels/adapters/whatsapp.ts`)

Reference implementation features:
- Static factory: `createForOrganization(organizationId)`
- Content type handling: text, media, rich content (buttons, lists, location, contacts)
- Webhook parsing with status update support
- MAX_TEXT_LENGTH = 4096
- SUPPORTED_FEATURES: RICH_CONTENT, MEDIA, READ_RECEIPTS, LOCATION_SHARING, CONTACT_CARDS, REACTIONS

### 3. SMS/Twilio Adapter (`src/lib/channels/adapters/sms.ts`, `src/lib/integrations/sms/`)

Twilio-specific patterns to reuse:
- **Credential encryption**: XOR with ENCRYPTION_KEY, base64 encoded
- **Webhook validation**: HMAC-SHA1 signature verification
- **Idempotency**: `sms_webhook_events` table with `payload_hash`
- **API client**: Basic Auth with Account SID + Auth Token
- **Status mapping**: Twilio statuses → canonical statuses

### 4. Database Schema Pattern (`supabase/migrations/20260128_sms_channel.sql`)

Tables needed for Twilio WhatsApp:
1. `twilio_whatsapp_connections` - Twilio credentials per org
2. `twilio_whatsapp_messages` - Message storage with Twilio SIDs
3. `twilio_whatsapp_webhook_events` - Idempotency tracking

## Twilio WhatsApp API Differences from SMS

### API Endpoint
- SMS: `https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
- WhatsApp: Same endpoint, but `To` and `From` prefixed with `whatsapp:`

### Message Format
```typescript
// Twilio WhatsApp message
{
  To: 'whatsapp:+1234567890',
  From: 'whatsapp:+0987654321', // Twilio WhatsApp Business Number
  Body: 'Hello World',
  // For media:
  MediaUrl: 'https://example.com/image.jpg'
}
```

### Status Values
- SMS: queued → sending → sent → delivered → undelivered → failed
- WhatsApp: queued → sending → sent → **delivered** → **read** → failed

**Key difference**: WhatsApp supports `read` receipts, SMS does not.

### Webhook Payload
```typescript
// Twilio WhatsApp webhook (similar to SMS)
{
  MessageSid: 'SM...',
  AccountSid: 'AC...',
  From: 'whatsapp:+1234567890',
  To: 'whatsapp:+0987654321',
  Body: 'Hello',
  NumMedia: '0',
  // For status callbacks:
  MessageStatus: 'delivered' | 'read' | 'failed',
  ErrorCode: '...',
  ErrorMessage: '...'
}
```

### Template Messages
WhatsApp requires pre-approved templates for messages outside 24-hour window.
Via Twilio:
```typescript
{
  To: 'whatsapp:+1234567890',
  From: 'whatsapp:+0987654321',
  ContentSid: 'HXXXXX', // Content API template
  ContentVariables: JSON.stringify({ "1": "John", "2": "Order123" })
}
```

**Note**: Template implementation is Phase 22, not Phase 21.

## Implementation Plan

### Files to Create

1. **`src/lib/integrations/twilio-whatsapp/client.ts`**
   - Twilio WhatsApp client (based on SMS client pattern)
   - Credential encryption/decryption
   - Send text message
   - Send media message
   - Webhook signature validation

2. **`src/lib/integrations/twilio-whatsapp/webhook-handler.ts`**
   - Process incoming messages
   - Process status callbacks
   - Idempotency handling
   - Conversation get-or-create

3. **`src/lib/channels/adapters/twilio-whatsapp.ts`**
   - TwilioWhatsAppAdapter class
   - Implements ChannelAdapter interface
   - Factory method for organization

4. **`src/app/api/webhooks/twilio-whatsapp/route.ts`**
   - Webhook endpoint for Twilio
   - Signature validation
   - Route to handler

5. **`src/app/api/integrations/twilio-whatsapp/connect/route.ts`**
   - API for saving Twilio credentials
   - Verify credentials before saving

6. **`supabase/migrations/20260203_twilio_whatsapp.sql`**
   - Database schema for Twilio WhatsApp

### Database Schema

```sql
-- Twilio WhatsApp connections (per organization)
CREATE TABLE twilio_whatsapp_connections (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  twilio_account_sid TEXT NOT NULL,
  twilio_auth_token_hash TEXT NOT NULL, -- Encrypted
  whatsapp_number TEXT NOT NULL, -- E.164 with whatsapp: prefix
  whatsapp_number_sid TEXT,
  friendly_name TEXT,
  is_active BOOLEAN DEFAULT true,
  webhook_configured BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_number)
);

-- Twilio WhatsApp webhook events (idempotency)
CREATE TABLE twilio_whatsapp_webhook_events (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES twilio_whatsapp_connections(id),
  message_sid TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'message', 'status'
  payload_hash TEXT,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_sid, event_type)
);
```

### Key Differences from SMS Adapter

| Aspect | SMS | Twilio WhatsApp |
|--------|-----|-----------------|
| Phone format | E.164 (+1...) | whatsapp:+1... |
| Read receipts | No | Yes |
| Templates | No | Yes (Phase 22) |
| Media types | Image, MMS | Image, Video, Audio, Document, Sticker |
| Rich content | No | Buttons, Lists (Phase 22) |
| 24-hour window | N/A | Outside window = template only |

## Risk Assessment

1. **Twilio account verification**: Need to verify credentials before storing
2. **Webhook URL configuration**: User must configure in Twilio console
3. **24-hour window**: Out of scope for Phase 21, handled via templates in Phase 22
4. **Rate limits**: Twilio has rate limits per number
5. **Media hosting**: Media URLs must be publicly accessible or use Twilio-hosted media

## Success Criteria

1. ✅ User can enter Twilio Account SID, Auth Token, and WhatsApp number
2. ✅ Credentials are validated and encrypted before storage
3. ✅ Incoming messages create conversations in unified inbox
4. ✅ Messages appear within 30 seconds of receipt
5. ✅ User can send text messages to contacts
6. ✅ User can send media messages (image, video, audio, document)
7. ✅ TwilioWhatsAppAdapter integrates with existing ChannelAdapter system

## Dependencies

- Phase 8: Twilio connection UI already exists in onboarding
- Existing: ChannelAdapter interface and BaseChannelAdapter
- Existing: Encryption utilities from SMS integration
