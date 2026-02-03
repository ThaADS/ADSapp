-- Migration: WhatsApp Provider Settings
-- Purpose: Store WhatsApp provider selection per organization (Cloud API vs Twilio)
-- Phase: 24 - Integration & Settings
-- Date: 2026-02-03

-- =============================================================================
-- WhatsApp Provider Settings Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider selection: 'cloud_api' (Meta) or 'twilio'
  active_provider TEXT NOT NULL DEFAULT 'cloud_api' CHECK (active_provider IN ('cloud_api', 'twilio')),

  -- Fallback configuration
  fallback_enabled BOOLEAN NOT NULL DEFAULT false,
  fallback_provider TEXT CHECK (fallback_provider IN ('cloud_api', 'twilio')),

  -- Connection references (optional - can be null if not connected)
  cloud_api_connection_id UUID,
  twilio_connection_id UUID,

  -- Feature flags
  -- 'active' = use templates from active provider
  -- 'cloud_api' = always use Cloud API templates
  -- 'twilio' = always use Twilio Content API templates
  prefer_templates_from TEXT NOT NULL DEFAULT 'active' CHECK (prefer_templates_from IN ('active', 'cloud_api', 'twilio')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One settings record per organization
  UNIQUE(organization_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_provider_settings_org
  ON whatsapp_provider_settings(organization_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE whatsapp_provider_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's provider settings
CREATE POLICY "Users can view own org provider settings"
  ON whatsapp_provider_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Only owners and admins can manage provider settings
CREATE POLICY "Admins can insert provider settings"
  ON whatsapp_provider_settings FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update provider settings"
  ON whatsapp_provider_settings FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete provider settings"
  ON whatsapp_provider_settings FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_provider_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_provider_settings_updated_at
  BEFORE UPDATE ON whatsapp_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_provider_settings_updated_at();

-- =============================================================================
-- Helper Function: Get Active Provider for Organization
-- =============================================================================

CREATE OR REPLACE FUNCTION get_whatsapp_provider(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  provider TEXT;
BEGIN
  SELECT active_provider INTO provider
  FROM whatsapp_provider_settings
  WHERE organization_id = org_id;

  -- Default to cloud_api if no settings exist
  RETURN COALESCE(provider, 'cloud_api');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Initialize Settings for Existing Organizations
-- =============================================================================

-- Create default settings for organizations that have WhatsApp connections
-- but no provider settings yet
INSERT INTO whatsapp_provider_settings (organization_id, active_provider)
SELECT DISTINCT organization_id, 'cloud_api'
FROM whatsapp_connections
WHERE organization_id NOT IN (
  SELECT organization_id FROM whatsapp_provider_settings
)
ON CONFLICT (organization_id) DO NOTHING;

-- Also create for organizations with Twilio connections (set to twilio if no cloud api)
INSERT INTO whatsapp_provider_settings (organization_id, active_provider)
SELECT DISTINCT organization_id, 'twilio'
FROM twilio_whatsapp_connections
WHERE is_active = true
AND organization_id NOT IN (
  SELECT organization_id FROM whatsapp_provider_settings
)
ON CONFLICT (organization_id) DO NOTHING;
