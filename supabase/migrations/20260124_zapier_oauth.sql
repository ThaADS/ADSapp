-- =====================================================
-- Migration: Zapier Integration - OAuth 2.0 Provider
-- Description: Create OAuth 2.0 Authorization Server tables
--              for Zapier and future integrations
-- Created: 2026-01-24
-- =====================================================

BEGIN;

-- =====================================================
-- OAuth Clients Table
-- Stores OAuth client applications (e.g., Zapier)
-- =====================================================
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_secret_hash TEXT NOT NULL,  -- bcrypt hash, never stored plaintext
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'messages:read',
    'messages:write',
    'contacts:read',
    'contacts:write',
    'webhooks:manage'
  ],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- OAuth Authorization Codes Table
-- Short-lived codes for Authorization Code Grant flow
-- =====================================================
CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  -- PKCE support for enhanced security
  code_challenge TEXT,
  code_challenge_method TEXT CHECK (code_challenge_method IN ('S256', 'plain')),
  state TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- OAuth Access Tokens Table
-- JWT-based access tokens (1 hour lifespan)
-- =====================================================
CREATE TABLE oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,  -- SHA256 hash of JWT
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- OAuth Refresh Tokens Table
-- Long-lived refresh tokens (30 days lifespan)
-- =====================================================
CREATE TABLE oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,  -- SHA256 hash
  access_token_id UUID NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Authorization codes: Fast lookup for unused codes
CREATE INDEX idx_oauth_codes_code
  ON oauth_authorization_codes(code)
  WHERE used_at IS NULL;

-- Authorization codes: Cleanup expired codes
CREATE INDEX idx_oauth_codes_expires
  ON oauth_authorization_codes(expires_at);

-- Access tokens: Fast token validation
CREATE INDEX idx_oauth_access_tokens_hash
  ON oauth_access_tokens(token_hash);

-- Access tokens: Cleanup expired tokens
CREATE INDEX idx_oauth_access_tokens_expires
  ON oauth_access_tokens(expires_at);

-- Access tokens: User token management
CREATE INDEX idx_oauth_access_tokens_user
  ON oauth_access_tokens(user_id);

-- Refresh tokens: Fast token validation
CREATE INDEX idx_oauth_refresh_tokens_hash
  ON oauth_refresh_tokens(token_hash);

-- Refresh tokens: Fast access token lookup
CREATE INDEX idx_oauth_refresh_tokens_access
  ON oauth_refresh_tokens(access_token_id);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all OAuth tables
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- OAuth Clients: Only super admins can manage
CREATE POLICY "Super admins can manage OAuth clients"
  ON oauth_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Authorization Codes: Users can view their own
CREATE POLICY "Users can view own auth codes"
  ON oauth_authorization_codes FOR SELECT
  USING (user_id = auth.uid());

-- Access Tokens: Users can view their own
CREATE POLICY "Users can view own access tokens"
  ON oauth_access_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Access Tokens: Users can revoke their own
CREATE POLICY "Users can revoke own access tokens"
  ON oauth_access_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND revoked_at IS NOT NULL);

-- Refresh Tokens: Users can view their own
CREATE POLICY "Users can view own refresh tokens"
  ON oauth_refresh_tokens FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- Database Functions
-- =====================================================

-- Cleanup expired tokens (run daily via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes (older than 1 hour)
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < now() - INTERVAL '1 hour';

  -- Delete expired and revoked access tokens (keep 7 days for audit)
  DELETE FROM oauth_access_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');

  -- Delete expired and used refresh tokens (keep 7 days for audit)
  DELETE FROM oauth_refresh_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Updated At Trigger
-- =====================================================

-- Add updated_at trigger to oauth_clients
CREATE TRIGGER update_oauth_clients_updated_at
  BEFORE UPDATE ON oauth_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE oauth_clients IS 'OAuth 2.0 client applications (e.g., Zapier)';
COMMENT ON TABLE oauth_authorization_codes IS 'Short-lived authorization codes (10 minutes)';
COMMENT ON TABLE oauth_access_tokens IS 'JWT access tokens with 1 hour lifespan';
COMMENT ON TABLE oauth_refresh_tokens IS 'Refresh tokens with 30 day lifespan';

COMMENT ON COLUMN oauth_clients.client_secret_hash IS 'Bcrypt hash of client secret, never stored plaintext';
COMMENT ON COLUMN oauth_authorization_codes.code_challenge IS 'PKCE code challenge for enhanced security';
COMMENT ON COLUMN oauth_access_tokens.token_hash IS 'SHA256 hash of JWT token';
COMMENT ON COLUMN oauth_refresh_tokens.token_hash IS 'SHA256 hash of refresh token';

COMMIT;
