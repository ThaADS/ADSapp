-- Key Management System Migration
-- Adds tables and functions for AWS KMS-based encryption key management
-- with support for multi-tenant key isolation and automatic rotation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: encryption_keys
-- Stores encrypted data keys managed by AWS KMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kms_key_id TEXT NOT NULL, -- AWS KMS Key ID or ARN
    encrypted_data_key TEXT NOT NULL, -- Base64 encoded encrypted data key from KMS
    version INTEGER NOT NULL DEFAULT 1, -- Key version for rotation
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Whether this is the current active key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- When key should be rotated (90 days from creation)
    rotated_at TIMESTAMPTZ, -- When key was rotated (if inactive)
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional key metadata

    -- Constraints
    CONSTRAINT encryption_keys_version_positive CHECK (version > 0),
    CONSTRAINT encryption_keys_expires_after_created CHECK (expires_at > created_at),

    -- Unique constraint: only one active key per tenant
    UNIQUE(tenant_id, is_active) WHERE is_active = TRUE
);

-- Indexes for performance
CREATE INDEX idx_encryption_keys_tenant_id ON encryption_keys(tenant_id);
CREATE INDEX idx_encryption_keys_is_active ON encryption_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_encryption_keys_expires_at ON encryption_keys(expires_at);
CREATE INDEX idx_encryption_keys_tenant_version ON encryption_keys(tenant_id, version DESC);

-- ============================================================================
-- Table: key_rotation_log
-- Audit trail for all key management operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS key_rotation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    operation TEXT NOT NULL, -- 'create', 'rotate', 'decrypt', 'encrypt'
    from_version INTEGER, -- Version before rotation
    to_version INTEGER, -- Version after rotation
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES profiles(id), -- User who performed operation (if applicable)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints
    CONSTRAINT key_rotation_log_operation_valid CHECK (
        operation IN ('create', 'rotate', 'decrypt', 'encrypt', 'delete', 'expire')
    )
);

-- Indexes for audit queries
CREATE INDEX idx_key_rotation_log_tenant_id ON key_rotation_log(tenant_id);
CREATE INDEX idx_key_rotation_log_performed_at ON key_rotation_log(performed_at DESC);
CREATE INDEX idx_key_rotation_log_operation ON key_rotation_log(operation);
CREATE INDEX idx_key_rotation_log_success ON key_rotation_log(success) WHERE success = FALSE;

-- ============================================================================
-- Function: get_active_encryption_key
-- Retrieves the active encryption key for a tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_encryption_key(p_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    encrypted_data_key TEXT,
    version INTEGER,
    kms_key_id TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ek.id,
        ek.encrypted_data_key,
        ek.version,
        ek.kms_key_id,
        ek.expires_at
    FROM encryption_keys ek
    WHERE ek.tenant_id = p_tenant_id
      AND ek.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: rotate_encryption_key
-- Marks current key as inactive and creates new key entry
-- ============================================================================
CREATE OR REPLACE FUNCTION rotate_encryption_key(
    p_tenant_id UUID,
    p_kms_key_id TEXT,
    p_encrypted_data_key TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS TABLE (
    old_version INTEGER,
    new_version INTEGER,
    new_key_id UUID
) AS $$
DECLARE
    v_old_version INTEGER;
    v_new_version INTEGER;
    v_new_key_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get current key version
    SELECT version INTO v_old_version
    FROM encryption_keys
    WHERE tenant_id = p_tenant_id
      AND is_active = TRUE;

    -- If no active key exists, start at version 1
    IF v_old_version IS NULL THEN
        v_old_version := 0;
    END IF;

    v_new_version := v_old_version + 1;

    -- Mark current key as inactive
    UPDATE encryption_keys
    SET is_active = FALSE,
        rotated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND is_active = TRUE;

    -- Calculate expiration (90 days from now)
    v_expires_at := NOW() + INTERVAL '90 days';

    -- Create new key
    INSERT INTO encryption_keys (
        tenant_id,
        kms_key_id,
        encrypted_data_key,
        version,
        is_active,
        expires_at
    ) VALUES (
        p_tenant_id,
        p_kms_key_id,
        p_encrypted_data_key,
        v_new_version,
        TRUE,
        v_expires_at
    ) RETURNING id INTO v_new_key_id;

    -- Log rotation
    INSERT INTO key_rotation_log (
        tenant_id,
        operation,
        from_version,
        to_version,
        success,
        performed_by
    ) VALUES (
        p_tenant_id,
        'rotate',
        v_old_version,
        v_new_version,
        TRUE,
        p_performed_by
    );

    RETURN QUERY SELECT v_old_version, v_new_version, v_new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: get_keys_needing_rotation
-- Returns list of tenants with keys approaching expiration
-- ============================================================================
CREATE OR REPLACE FUNCTION get_keys_needing_rotation(
    p_days_threshold INTEGER DEFAULT 7
)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    current_version INTEGER,
    expires_at TIMESTAMPTZ,
    days_until_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ek.tenant_id,
        o.name AS tenant_name,
        ek.version AS current_version,
        ek.expires_at,
        EXTRACT(DAY FROM (ek.expires_at - NOW()))::INTEGER AS days_until_expiration
    FROM encryption_keys ek
    JOIN organizations o ON o.id = ek.tenant_id
    WHERE ek.is_active = TRUE
      AND ek.expires_at <= NOW() + (p_days_threshold || ' days')::INTERVAL
    ORDER BY ek.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: cleanup_old_keys
-- Archives or deletes old inactive keys (older than retention period)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_keys(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS TABLE (
    tenant_id UUID,
    keys_deleted INTEGER
) AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_deleted_count INTEGER;
    v_tenant_id UUID;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    FOR v_tenant_id IN
        SELECT DISTINCT ek.tenant_id
        FROM encryption_keys ek
        WHERE ek.is_active = FALSE
          AND ek.rotated_at < v_cutoff_date
    LOOP
        -- Count keys to delete
        SELECT COUNT(*) INTO v_deleted_count
        FROM encryption_keys
        WHERE encryption_keys.tenant_id = v_tenant_id
          AND is_active = FALSE
          AND rotated_at < v_cutoff_date;

        -- Delete old keys
        DELETE FROM encryption_keys
        WHERE encryption_keys.tenant_id = v_tenant_id
          AND is_active = FALSE
          AND rotated_at < v_cutoff_date;

        -- Log cleanup
        INSERT INTO key_rotation_log (
            tenant_id,
            operation,
            success,
            metadata
        ) VALUES (
            v_tenant_id,
            'delete',
            TRUE,
            jsonb_build_object(
                'keys_deleted', v_deleted_count,
                'retention_days', p_retention_days
            )
        );

        RETURN QUERY SELECT v_tenant_id, v_deleted_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on encryption_keys table
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see keys for their own organization
CREATE POLICY encryption_keys_tenant_isolation ON encryption_keys
    FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Service role can access all keys (for rotation automation)
CREATE POLICY encryption_keys_service_role ON encryption_keys
    FOR ALL
    TO service_role
    USING (TRUE);

-- Enable RLS on key_rotation_log table
ALTER TABLE key_rotation_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see logs for their own organization
CREATE POLICY key_rotation_log_tenant_isolation ON key_rotation_log
    FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Service role can access all logs
CREATE POLICY key_rotation_log_service_role ON key_rotation_log
    FOR ALL
    TO service_role
    USING (TRUE);

-- ============================================================================
-- Scheduled Job: Automatic Key Rotation Check
-- Note: This requires pg_cron extension (available in Supabase)
-- ============================================================================

-- Check for keys needing rotation daily at 2 AM UTC
-- SELECT cron.schedule(
--     'check-key-rotation',
--     '0 2 * * *', -- Daily at 2 AM UTC
--     $$
--     SELECT get_keys_needing_rotation(7);
--     $$
-- );

-- ============================================================================
-- Views for Monitoring
-- ============================================================================

-- View: Key rotation health dashboard
CREATE OR REPLACE VIEW key_rotation_health AS
SELECT
    o.id AS tenant_id,
    o.name AS tenant_name,
    ek.version AS current_version,
    ek.created_at AS key_created_at,
    ek.expires_at AS key_expires_at,
    EXTRACT(DAY FROM (ek.expires_at - NOW()))::INTEGER AS days_until_expiration,
    CASE
        WHEN ek.expires_at < NOW() THEN 'EXPIRED'
        WHEN ek.expires_at <= NOW() + INTERVAL '7 days' THEN 'WARNING'
        WHEN ek.expires_at <= NOW() + INTERVAL '30 days' THEN 'NOTICE'
        ELSE 'HEALTHY'
    END AS health_status,
    (
        SELECT COUNT(*)
        FROM key_rotation_log krl
        WHERE krl.tenant_id = o.id
          AND krl.operation = 'rotate'
          AND krl.success = TRUE
    ) AS total_rotations,
    (
        SELECT MAX(performed_at)
        FROM key_rotation_log krl
        WHERE krl.tenant_id = o.id
          AND krl.operation = 'rotate'
    ) AS last_rotation_at
FROM organizations o
LEFT JOIN encryption_keys ek ON ek.tenant_id = o.id AND ek.is_active = TRUE
ORDER BY
    CASE
        WHEN ek.expires_at < NOW() THEN 1
        WHEN ek.expires_at <= NOW() + INTERVAL '7 days' THEN 2
        WHEN ek.expires_at <= NOW() + INTERVAL '30 days' THEN 3
        ELSE 4
    END,
    ek.expires_at ASC NULLS LAST;

-- Grant permissions
GRANT SELECT ON key_rotation_health TO authenticated;
GRANT SELECT ON key_rotation_health TO service_role;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE encryption_keys IS 'Stores AWS KMS-managed encryption keys for multi-tenant data encryption';
COMMENT ON TABLE key_rotation_log IS 'Audit trail for all key management operations';
COMMENT ON FUNCTION get_active_encryption_key IS 'Retrieves the currently active encryption key for a tenant';
COMMENT ON FUNCTION rotate_encryption_key IS 'Performs key rotation by deactivating old key and creating new one';
COMMENT ON FUNCTION get_keys_needing_rotation IS 'Returns tenants with keys approaching expiration';
COMMENT ON FUNCTION cleanup_old_keys IS 'Archives or deletes old inactive keys past retention period';
COMMENT ON VIEW key_rotation_health IS 'Dashboard view for monitoring key rotation health across all tenants';

-- ============================================================================
-- Initial Data (Optional)
-- ============================================================================

-- Insert initial audit log entry
INSERT INTO key_rotation_log (
    tenant_id,
    operation,
    success,
    metadata,
    performed_at
)
SELECT
    id,
    'create',
    TRUE,
    jsonb_build_object('migration', 'initial_setup'),
    NOW()
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM key_rotation_log WHERE tenant_id = organizations.id
);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('encryption_keys', 'key_rotation_log');

    IF v_table_count = 2 THEN
        RAISE NOTICE 'KMS Key Management migration completed successfully';
        RAISE NOTICE 'Created tables: encryption_keys, key_rotation_log';
        RAISE NOTICE 'Created functions: get_active_encryption_key, rotate_encryption_key, get_keys_needing_rotation, cleanup_old_keys';
        RAISE NOTICE 'Created view: key_rotation_health';
    ELSE
        RAISE EXCEPTION 'Migration verification failed: expected 2 tables, found %', v_table_count;
    END IF;
END $$;
