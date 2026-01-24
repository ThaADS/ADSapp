-- Migration: Channel Abstraction Layer Foundation
-- Purpose: Create multi-channel messaging infrastructure with tenant isolation
-- Date: 2026-01-24

BEGIN;

-- ============================================================================
-- Table: channel_connections
-- Purpose: Store connection details for each channel associated with a contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Channel identity
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),
  channel_identifier TEXT NOT NULL, -- phone number, Instagram ID, Facebook ID, etc.

  -- Display metadata
  display_name TEXT,
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Channel-specific data
  channel_metadata JSONB DEFAULT '{}',

  -- Activity tracking
  verified_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one connection per channel per organization
  CONSTRAINT unique_channel_connection UNIQUE(organization_id, channel_type, channel_identifier)
);

-- Indexes for channel_connections
CREATE INDEX idx_channel_connections_org_id ON channel_connections(organization_id);
CREATE INDEX idx_channel_connections_contact_id ON channel_connections(contact_id);
CREATE INDEX idx_channel_connections_org_contact ON channel_connections(organization_id, contact_id);
CREATE INDEX idx_channel_connections_channel_type ON channel_connections(channel_type);
CREATE INDEX idx_channel_connections_is_active ON channel_connections(is_active) WHERE is_active = true;

-- ============================================================================
-- Table: channel_messages
-- Purpose: Store all messages across all channels in canonical format
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,

  -- Channel message identity
  channel_message_id TEXT NOT NULL, -- Original message ID from the channel

  -- Message direction and sender
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Message content
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'media', 'rich', 'system')),
  content TEXT NOT NULL,
  media JSONB, -- { type, url, mimeType, filename, thumbnailUrl, size }
  rich_content JSONB, -- { type, payload } for buttons, lists, locations, contacts

  -- Threading
  reply_to_message_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error tracking
  failed_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Channel-specific metadata
  channel_metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for channel_messages
CREATE INDEX idx_channel_messages_org_id ON channel_messages(organization_id);
CREATE INDEX idx_channel_messages_conversation_id ON channel_messages(conversation_id);
CREATE INDEX idx_channel_messages_channel_connection_id ON channel_messages(channel_connection_id);
CREATE INDEX idx_channel_messages_channel_message_id ON channel_messages(channel_message_id);
CREATE INDEX idx_channel_messages_status ON channel_messages(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_channel_messages_direction ON channel_messages(direction);
CREATE INDEX idx_channel_messages_created_at ON channel_messages(created_at DESC);
CREATE INDEX idx_channel_messages_org_conversation ON channel_messages(organization_id, conversation_id);

-- ============================================================================
-- Table: channel_adapters_config
-- Purpose: Store per-organization configuration for each channel adapter
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_adapters_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Channel type
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'sms')),

  -- Authentication (encrypted tokens)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,

  -- Channel-specific IDs
  phone_number_id TEXT, -- WhatsApp
  business_account_id TEXT, -- WhatsApp, Instagram, Facebook
  page_id TEXT, -- Facebook
  webhook_verify_token TEXT,

  -- Additional configuration
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('active', 'error', 'disconnected')),
  sync_error TEXT,

  -- Features supported by this configuration
  features JSONB DEFAULT '[]', -- Array of ChannelFeature enum values

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one config per channel type per organization
  CONSTRAINT unique_adapter_config UNIQUE(organization_id, channel_type)
);

-- Indexes for channel_adapters_config
CREATE INDEX idx_channel_adapters_config_org_id ON channel_adapters_config(organization_id);
CREATE INDEX idx_channel_adapters_config_channel_type ON channel_adapters_config(channel_type);
CREATE INDEX idx_channel_adapters_config_is_active ON channel_adapters_config(is_active) WHERE is_active = true;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_adapters_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_connections
CREATE POLICY channel_connections_tenant_isolation ON channel_connections
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- RLS Policies for channel_messages
CREATE POLICY channel_messages_tenant_isolation ON channel_messages
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- RLS Policies for channel_adapters_config
CREATE POLICY channel_adapters_config_tenant_isolation ON channel_adapters_config
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

-- Trigger for channel_connections
CREATE TRIGGER update_channel_connections_updated_at
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for channel_messages
CREATE TRIGGER update_channel_messages_updated_at
  BEFORE UPDATE ON channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for channel_adapters_config
CREATE TRIGGER update_channel_adapters_config_updated_at
  BEFORE UPDATE ON channel_adapters_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
