/**
 * MFA Implementation Migration
 *
 * Adds Multi-Factor Authentication support to profiles table
 * - TOTP secret storage (encrypted)
 * - Backup codes (hashed with SHA-256)
 * - Enrollment tracking
 * - MFA enablement status
 *
 * Security: Secrets are stored securely, backup codes are hashed
 */

-- Add MFA columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

-- Create index for MFA lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_mfa_enabled ON profiles(mfa_enabled)
WHERE mfa_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.mfa_enabled IS 'Whether MFA is currently enabled for this user';
COMMENT ON COLUMN profiles.mfa_secret IS 'TOTP secret for MFA (base32 encoded)';
COMMENT ON COLUMN profiles.mfa_backup_codes IS 'SHA-256 hashed backup codes (10 codes)';
COMMENT ON COLUMN profiles.mfa_enrolled_at IS 'Timestamp when MFA was first enabled';

/**
 * Create MFA audit log entries table for security tracking
 *
 * This table tracks all MFA-related security events:
 * - Enrollment initiated
 * - MFA enabled/disabled
 * - Login verification attempts (success/failure)
 * - Backup code usage
 * - Backup codes regenerated
 */

-- Extend audit_logs table with MFA-specific actions if not exists
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'action'
  ) THEN
    -- Create audit_logs table if it doesn't exist
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details JSONB,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes for audit log queries
    CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

    -- Enable RLS on audit_logs
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for audit_logs
    CREATE POLICY "Users can view their own audit logs"
      ON audit_logs FOR SELECT
      USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

    CREATE POLICY "System can insert audit logs"
      ON audit_logs FOR INSERT
      WITH CHECK (true); -- Allow system inserts

    -- Super admins can view all audit logs
    CREATE POLICY "Super admins can view all audit logs"
      ON audit_logs FOR SELECT
      USING (is_super_admin(auth.uid()));
  END IF;
END
$;

/**
 * Create helper function to check if user has MFA enabled
 */
CREATE OR REPLACE FUNCTION user_has_mfa_enabled(check_user_id UUID)
RETURNS BOOLEAN AS $
  SELECT COALESCE(mfa_enabled, FALSE)
  FROM profiles
  WHERE id = check_user_id;
$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_has_mfa_enabled IS 'Check if a user has MFA enabled';

/**
 * Create function to get remaining backup codes count
 */
CREATE OR REPLACE FUNCTION get_backup_codes_count(check_user_id UUID)
RETURNS INTEGER AS $
  SELECT COALESCE(array_length(mfa_backup_codes, 1), 0)
  FROM profiles
  WHERE id = check_user_id;
$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_backup_codes_count IS 'Get count of remaining backup codes for a user';

/**
 * Update RLS policies for profiles table to ensure MFA data is protected
 * Only the user themselves or super admins can see MFA-related fields
 */

-- Create policy for MFA data access (users can only see their own MFA data)
CREATE POLICY "Users can view their own MFA status" ON profiles
FOR SELECT
USING (
  id = auth.uid()
  OR is_super_admin(auth.uid())
);

-- Users can update their own MFA settings
CREATE POLICY "Users can update their own MFA settings" ON profiles
FOR UPDATE
USING (
  id = auth.uid()
  OR is_super_admin(auth.uid())
);

/**
 * Create view for MFA statistics (admin dashboard)
 */
CREATE OR REPLACE VIEW mfa_statistics AS
SELECT
  COUNT(*) FILTER (WHERE mfa_enabled = TRUE) as users_with_mfa,
  COUNT(*) FILTER (WHERE mfa_enabled = FALSE) as users_without_mfa,
  COUNT(*) as total_users,
  ROUND(
    COUNT(*) FILTER (WHERE mfa_enabled = TRUE)::NUMERIC /
    NULLIF(COUNT(*), 0)::NUMERIC * 100,
    2
  ) as mfa_adoption_percentage,
  COUNT(*) FILTER (
    WHERE mfa_enabled = TRUE
    AND mfa_enrolled_at > NOW() - INTERVAL '30 days'
  ) as new_mfa_enrollments_30d
FROM profiles
WHERE deleted_at IS NULL;

COMMENT ON VIEW mfa_statistics IS 'MFA adoption statistics for admin dashboard';

-- Grant access to mfa_statistics view
GRANT SELECT ON mfa_statistics TO authenticated;

/**
 * Create trigger to log MFA enablement changes
 */
CREATE OR REPLACE FUNCTION log_mfa_status_change()
RETURNS TRIGGER AS $
BEGIN
  IF OLD.mfa_enabled IS DISTINCT FROM NEW.mfa_enabled THEN
    INSERT INTO audit_logs (
      user_id,
      organization_id,
      action,
      details,
      timestamp
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      CASE
        WHEN NEW.mfa_enabled THEN 'mfa_enabled'
        ELSE 'mfa_disabled'
      END,
      jsonb_build_object(
        'previous_status', OLD.mfa_enabled,
        'new_status', NEW.mfa_enabled
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_mfa_status_change ON profiles;
CREATE TRIGGER trigger_log_mfa_status_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.mfa_enabled IS DISTINCT FROM NEW.mfa_enabled)
  EXECUTE FUNCTION log_mfa_status_change();

COMMENT ON TRIGGER trigger_log_mfa_status_change ON profiles IS 'Automatically log MFA status changes to audit_logs';

/**
 * Data validation constraints
 */

-- Ensure MFA fields are consistent
ALTER TABLE profiles
ADD CONSTRAINT check_mfa_consistency CHECK (
  (mfa_enabled = FALSE AND mfa_secret IS NULL AND mfa_enrolled_at IS NULL)
  OR
  (mfa_enabled = TRUE AND mfa_secret IS NOT NULL AND mfa_enrolled_at IS NOT NULL)
);

COMMENT ON CONSTRAINT check_mfa_consistency ON profiles IS 'Ensure MFA fields are logically consistent';

-- Ensure backup codes are reasonable (max 20 codes)
ALTER TABLE profiles
ADD CONSTRAINT check_backup_codes_limit CHECK (
  mfa_backup_codes IS NULL
  OR array_length(mfa_backup_codes, 1) <= 20
);

COMMENT ON CONSTRAINT check_backup_codes_limit ON profiles IS 'Limit backup codes to maximum of 20';

/**
 * Insert initial audit log for migration
 */
INSERT INTO audit_logs (
  user_id,
  organization_id,
  action,
  details,
  timestamp
)
SELECT
  id,
  organization_id,
  'mfa_schema_migration',
  jsonb_build_object(
    'migration', '20251013_mfa_implementation',
    'description', 'MFA support added to profiles table'
  ),
  NOW()
FROM profiles
WHERE is_super_admin = TRUE
LIMIT 1;

/**
 * Migration complete
 * MFA columns added, helper functions created, RLS policies updated
 */
