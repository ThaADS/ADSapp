-- GDPR Compliance Migration
-- Week 2 Day 4 - Data Retention & Deletion Implementation
-- Implements: Data retention policies, deletion requests, audit logging, soft delete

-- ============================================================================
-- PART 1: Data Retention Policies
-- ============================================================================

-- Table for storing data retention policies per tenant and data type
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN (
        'messages',
        'contacts',
        'conversations',
        'sessions',
        'audit_logs',
        'analytics',
        'media_files',
        'demo_data'
    )),
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    is_active BOOLEAN DEFAULT TRUE,
    enforcement_enabled BOOLEAN DEFAULT TRUE,
    auto_delete_enabled BOOLEAN DEFAULT FALSE,
    last_enforced_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint per organization and data type
    UNIQUE(organization_id, data_type)
);

-- Default retention policies (organization_id = NULL means system default)
CREATE TABLE IF NOT EXISTS public.default_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type TEXT NOT NULL UNIQUE CHECK (data_type IN (
        'messages',
        'contacts',
        'conversations',
        'sessions',
        'audit_logs',
        'analytics',
        'media_files',
        'demo_data'
    )),
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    legal_requirement BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies (GDPR compliant)
INSERT INTO public.default_retention_policies (data_type, retention_days, legal_requirement, description) VALUES
    ('messages', 90, FALSE, 'WhatsApp messages - 90 days default, configurable per tenant'),
    ('contacts', 730, FALSE, 'Contact data - 2 years of inactivity'),
    ('conversations', 365, FALSE, 'Conversation metadata - 1 year'),
    ('sessions', 30, FALSE, 'User sessions - 30 days'),
    ('audit_logs', 2555, TRUE, 'Audit logs - 7 years (legal requirement)'),
    ('analytics', 1095, FALSE, 'Analytics data - 3 years'),
    ('media_files', 365, FALSE, 'Media attachments - 1 year'),
    ('demo_data', 7, FALSE, 'Demo session data - 7 days')
ON CONFLICT (data_type) DO NOTHING;

-- ============================================================================
-- PART 2: Deletion Requests (Right to Erasure)
-- ============================================================================

-- Table for tracking GDPR deletion requests
CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    user_id UUID REFERENCES public.profiles(id),
    contact_id UUID REFERENCES public.contacts(id),
    request_type TEXT NOT NULL CHECK (request_type IN (
        'user_account',
        'contact_data',
        'conversation_data',
        'all_personal_data'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'verified',
        'in_progress',
        'completed',
        'failed',
        'cancelled'
    )),
    reason TEXT,
    verification_token TEXT UNIQUE,
    verification_expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    requested_by UUID REFERENCES public.profiles(id),
    processed_by UUID REFERENCES public.profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_reason TEXT,
    records_deleted JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure only one active deletion request per entity
    CONSTRAINT unique_active_deletion UNIQUE(organization_id, user_id, contact_id, status)
        WHERE status IN ('pending', 'verified', 'in_progress')
);

-- ============================================================================
-- PART 3: Deletion Audit Log
-- ============================================================================

-- Comprehensive audit log for all deletion operations
CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    deletion_request_id UUID REFERENCES public.deletion_requests(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'soft_delete',
        'hard_delete',
        'anonymize',
        'export_before_delete',
        'retention_policy_delete'
    )),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    record_data JSONB, -- Snapshot of deleted data (encrypted sensitive fields)
    deleted_by UUID REFERENCES public.profiles(id),
    deletion_reason TEXT NOT NULL,
    is_reversible BOOLEAN DEFAULT FALSE,
    legal_basis TEXT, -- GDPR legal basis: consent, contract, legal_obligation, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_deletion_audit_org_date ON public.deletion_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_table ON public.deletion_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_request ON public.deletion_audit_log(deletion_request_id);

-- ============================================================================
-- PART 4: Add Soft Delete Columns to Existing Tables
-- ============================================================================

-- Add deleted_at column for soft delete pattern
DO $$
BEGIN
    -- Organizations (preserve for billing/legal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'organizations' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.organizations ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contacts' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.contacts ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'conversations' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.conversations ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Demo sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'demo_sessions' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.demo_sessions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Subscriptions (keep for billing compliance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.subscriptions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add deleted_by column to track who performed deletion
DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);
    ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);
    ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);
    ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);
END $$;

-- ============================================================================
-- PART 5: Indexes for Performance
-- ============================================================================

-- Retention policy indexes
CREATE INDEX IF NOT EXISTS idx_retention_policies_org ON public.data_retention_policies(organization_id, data_type);
CREATE INDEX IF NOT EXISTS idx_retention_policies_enforcement ON public.data_retention_policies(is_active, enforcement_enabled)
    WHERE enforcement_enabled = TRUE;

-- Deletion request indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_org ON public.deletion_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON public.deletion_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deletion_requests_contact ON public.deletion_requests(contact_id) WHERE contact_id IS NOT NULL;

-- Soft delete indexes (for filtering out deleted records)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted ON public.contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON public.conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON public.messages(deleted_at) WHERE deleted_at IS NULL;

-- Retention enforcement indexes (find expired records)
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_last_message ON public.contacts(last_message_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 6: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Data Retention Policies - Only admins can manage
DROP POLICY IF EXISTS "Users can view retention policies for their organization" ON public.data_retention_policies;
CREATE POLICY "Users can view retention policies for their organization"
    ON public.data_retention_policies FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles
            WHERE id = auth.uid() AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Admins can manage retention policies" ON public.data_retention_policies;
CREATE POLICY "Admins can manage retention policies"
    ON public.data_retention_policies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = data_retention_policies.organization_id
            AND role IN ('admin', 'owner', 'super_admin')
            AND deleted_at IS NULL
        )
    );

-- Default Retention Policies - Read-only for all authenticated users
DROP POLICY IF EXISTS "Everyone can view default retention policies" ON public.default_retention_policies;
CREATE POLICY "Everyone can view default retention policies"
    ON public.default_retention_policies FOR SELECT
    TO authenticated
    USING (TRUE);

-- Deletion Requests - Users can manage their own requests
DROP POLICY IF EXISTS "Users can view their deletion requests" ON public.deletion_requests;
CREATE POLICY "Users can view their deletion requests"
    ON public.deletion_requests FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = deletion_requests.organization_id
            AND role IN ('admin', 'owner', 'super_admin')
            AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can create deletion requests" ON public.deletion_requests;
CREATE POLICY "Users can create deletion requests"
    ON public.deletion_requests FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = deletion_requests.organization_id
            AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Admins can manage deletion requests" ON public.deletion_requests;
CREATE POLICY "Admins can manage deletion requests"
    ON public.deletion_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = deletion_requests.organization_id
            AND role IN ('admin', 'owner', 'super_admin')
            AND deleted_at IS NULL
        )
    );

-- Deletion Audit Log - Admins only
DROP POLICY IF EXISTS "Admins can view deletion audit logs" ON public.deletion_audit_log;
CREATE POLICY "Admins can view deletion audit logs"
    ON public.deletion_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = deletion_audit_log.organization_id
            AND role IN ('admin', 'owner', 'super_admin')
            AND deleted_at IS NULL
        )
    );

-- ============================================================================
-- PART 7: Database Functions for GDPR Operations
-- ============================================================================

-- Function: Get retention policy for data type
CREATE OR REPLACE FUNCTION get_retention_policy(
    p_organization_id UUID,
    p_data_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_retention_days INTEGER;
BEGIN
    -- Check for organization-specific policy first
    SELECT retention_days INTO v_retention_days
    FROM public.data_retention_policies
    WHERE organization_id = p_organization_id
    AND data_type = p_data_type
    AND is_active = TRUE
    AND enforcement_enabled = TRUE;

    -- If no org-specific policy, use default
    IF v_retention_days IS NULL THEN
        SELECT retention_days INTO v_retention_days
        FROM public.default_retention_policies
        WHERE data_type = p_data_type;
    END IF;

    RETURN COALESCE(v_retention_days, 365); -- Default 1 year if not found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark records for deletion (soft delete)
CREATE OR REPLACE FUNCTION soft_delete_record(
    p_table_name TEXT,
    p_record_id UUID,
    p_deleted_by UUID,
    p_reason TEXT DEFAULT 'User request'
) RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Validate table name to prevent SQL injection
    IF p_table_name NOT IN ('profiles', 'contacts', 'conversations', 'messages', 'organizations') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;

    -- Execute soft delete
    v_sql := format(
        'UPDATE public.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
        p_table_name
    );

    EXECUTE v_sql USING p_deleted_by, p_record_id;

    -- Log the deletion
    INSERT INTO public.deletion_audit_log (
        organization_id,
        action_type,
        table_name,
        record_id,
        deleted_by,
        deletion_reason,
        is_reversible
    ) VALUES (
        (SELECT organization_id FROM public.profiles WHERE id = p_deleted_by),
        'soft_delete',
        p_table_name,
        p_record_id,
        p_deleted_by,
        p_reason,
        TRUE
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Soft delete failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Find expired records based on retention policy
CREATE OR REPLACE FUNCTION find_expired_records(
    p_organization_id UUID,
    p_data_type TEXT,
    p_limit INTEGER DEFAULT 1000
) RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    age_days INTEGER
) AS $$
DECLARE
    v_retention_days INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    -- Get retention policy
    v_retention_days := get_retention_policy(p_organization_id, p_data_type);
    v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;

    -- Return expired records based on data type
    CASE p_data_type
        WHEN 'messages' THEN
            RETURN QUERY
            SELECT m.id, m.created_at,
                   EXTRACT(DAY FROM NOW() - m.created_at)::INTEGER as age_days
            FROM public.messages m
            JOIN public.conversations c ON m.conversation_id = c.id
            WHERE c.organization_id = p_organization_id
            AND m.created_at < v_cutoff_date
            AND m.deleted_at IS NULL
            LIMIT p_limit;

        WHEN 'contacts' THEN
            RETURN QUERY
            SELECT c.id, c.created_at,
                   EXTRACT(DAY FROM NOW() - COALESCE(c.last_message_at, c.created_at))::INTEGER as age_days
            FROM public.contacts c
            WHERE c.organization_id = p_organization_id
            AND COALESCE(c.last_message_at, c.created_at) < v_cutoff_date
            AND c.deleted_at IS NULL
            LIMIT p_limit;

        WHEN 'conversations' THEN
            RETURN QUERY
            SELECT conv.id, conv.created_at,
                   EXTRACT(DAY FROM NOW() - conv.updated_at)::INTEGER as age_days
            FROM public.conversations conv
            WHERE conv.organization_id = p_organization_id
            AND conv.updated_at < v_cutoff_date
            AND conv.deleted_at IS NULL
            LIMIT p_limit;

        ELSE
            RETURN;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_data_retention_policies_updated_at ON public.data_retention_policies;
CREATE TRIGGER update_data_retention_policies_updated_at
    BEFORE UPDATE ON public.data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON public.deletion_requests;
CREATE TRIGGER update_deletion_requests_updated_at
    BEFORE UPDATE ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 8: Update existing RLS policies to exclude soft-deleted records
-- ============================================================================

-- Note: Existing policies should be updated to filter WHERE deleted_at IS NULL
-- This is done application-side in queries for flexibility

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.data_retention_policies TO authenticated;
GRANT SELECT ON public.default_retention_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deletion_requests TO authenticated;
GRANT SELECT ON public.deletion_audit_log TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_retention_policy(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_expired_records(UUID, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment documenting this migration
COMMENT ON TABLE public.data_retention_policies IS 'GDPR compliance: Tenant-specific data retention policies';
COMMENT ON TABLE public.deletion_requests IS 'GDPR compliance: Track deletion requests (Right to Erasure)';
COMMENT ON TABLE public.deletion_audit_log IS 'GDPR compliance: Comprehensive audit trail of all deletions';
COMMENT ON FUNCTION get_retention_policy(UUID, TEXT) IS 'Get effective retention policy for organization and data type';
COMMENT ON FUNCTION find_expired_records(UUID, TEXT, INTEGER) IS 'Find records that exceed retention policy and should be deleted';
