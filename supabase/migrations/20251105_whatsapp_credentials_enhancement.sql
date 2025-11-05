-- ============================================================================
-- WhatsApp Credentials Enhancement
-- ============================================================================
-- Migration: 20251105_whatsapp_credentials_enhancement
-- Purpose: Add access token and webhook verify token to organizations table
-- Author: AI Assistant
-- Date: 2025-11-05
-- Reason: Enhanced onboarding flow requires storing WhatsApp API credentials
--         for improved setup experience and validation

-- ============================================================================
-- Add WhatsApp API Credentials to Organizations
-- ============================================================================
-- These fields enable secure storage of WhatsApp Business API credentials
-- collected during the enhanced onboarding wizard

-- Add access token column (required for WhatsApp API authentication)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;

-- Add webhook verify token column (used for webhook validation)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS whatsapp_webhook_verify_token TEXT;

-- ============================================================================
-- Security Considerations
-- ============================================================================
-- Access tokens are sensitive credentials that grant API access
-- Recommendations:
-- 1. Consider encrypting these fields at rest using pgcrypto
-- 2. Audit access to these fields via RLS policies
-- 3. Implement token rotation policies
-- 4. Never expose these tokens in client-side code

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON COLUMN organizations.whatsapp_access_token IS
'WhatsApp Business API access token for authenticating API requests. SENSITIVE - handle with care.';

COMMENT ON COLUMN organizations.whatsapp_webhook_verify_token IS
'Custom token for verifying WhatsApp webhook requests. Used to secure webhook endpoints.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
