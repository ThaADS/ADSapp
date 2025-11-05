-- ============================================================================
-- Team Invitations & License Management - PART 1: Tables & Columns
-- ============================================================================
-- Migration: 20251105_team_invitations_part1_tables
-- Purpose: Create tables and columns ONLY (no functions or triggers)
-- Author: AI Assistant
-- Date: 2025-11-05
-- Strategy: Split migration into 2 parts to avoid validation issues

-- ============================================================================
-- STEP 1: Create Tables
-- ============================================================================

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (expires_at > created_at),
  CHECK (accepted_at IS NULL OR accepted_at >= created_at)
);

-- ============================================================================
-- STEP 2: Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_invitations_organization ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org_email_status ON team_invitations(organization_id, email, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_status ON team_invitations(expires_at, status);

-- ============================================================================
-- STEP 3: Add License Management Columns
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS used_team_members INTEGER DEFAULT 1 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_license_usage ON organizations(used_team_members, max_team_members);

-- Add constraints using DO blocks (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_team_members') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_max_team_members CHECK (max_team_members > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_used_within_max') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_used_within_max CHECK (used_team_members <= max_team_members);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Enable RLS
-- ============================================================================

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON team_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;

-- Create RLS policies
CREATE POLICY "Users can view invitations for their organization"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STEP 5: Update Existing Organizations
-- ============================================================================

UPDATE organizations o
SET used_team_members = (
  SELECT COUNT(*)
  FROM profiles p
  WHERE p.organization_id = o.id
),
updated_at = NOW()
WHERE used_team_members = 1; -- Only update if still at default

-- ============================================================================
-- STEP 6: Add Documentation Comments
-- ============================================================================

COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN team_invitations.token IS 'Secure random token for invitation URL';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expires 7 days after creation';

COMMENT ON COLUMN organizations.max_team_members IS 'Maximum team members allowed by subscription plan';
COMMENT ON COLUMN organizations.used_team_members IS 'Current number of team members (auto-updated)';

-- ============================================================================
-- Part 1 Complete - Run Part 2 Next
-- ============================================================================
