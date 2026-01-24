-- =============================================================================
-- Super Admin Audit Logging System
-- Provides persistent, comprehensive audit logging for all super admin actions
-- =============================================================================

-- Create the super_admin_audit_logs table
CREATE TABLE IF NOT EXISTS super_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('organization', 'profile', 'system', 'billing')),
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON super_admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON super_admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON super_admin_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON super_admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON super_admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON super_admin_audit_logs(admin_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super admins can read audit logs
CREATE POLICY "Super admins can view audit logs"
    ON super_admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- RLS Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON super_admin_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create the log_super_admin_action function
CREATE OR REPLACE FUNCTION log_super_admin_action(
    admin_user_id UUID,
    action_name TEXT,
    target_type TEXT,
    target_id UUID DEFAULT NULL,
    action_details JSONB DEFAULT '{}',
    ip_addr INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Validate the admin is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = admin_user_id
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'User is not a super admin';
    END IF;

    -- Insert the audit log entry
    INSERT INTO super_admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        admin_user_id,
        action_name,
        target_type,
        target_id,
        action_details,
        ip_addr,
        user_agent
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_super_admin_action TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE super_admin_audit_logs IS 'Persistent audit trail of all super admin actions for compliance and security monitoring';
COMMENT ON FUNCTION log_super_admin_action IS 'Logs super admin actions with details, IP address, and user agent for audit compliance';
