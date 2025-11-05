-- ============================================================================
-- Team Invitations - ABSOLUTE MINIMAL VERSION
-- ============================================================================
-- This is the simplest possible version to test if table creation works
-- No RLS, no triggers, no complex constraints

-- ============================================================================
-- STEP 1: Create BARE table (no constraints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_invitations_organization ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- ============================================================================
-- STEP 3: Add license columns to organizations
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS used_team_members INTEGER DEFAULT 1 NOT NULL;

-- ============================================================================
-- STEP 4: Test query to verify it worked
-- ============================================================================

-- Run this after to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'team_invitations';
