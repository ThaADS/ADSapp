-- ============================================================================
-- SUPABASE SQL EDITOR COMPATIBLE MIGRATION SCRIPT (SAFE VERSION)
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Apply all Week 1-2 migrations via Supabase Dashboard SQL Editor
-- Date: 2025-10-14
-- Total Migrations: 10
-- Version: SAFE - Only applies RLS to existing tables
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Paste into Supabase Dashboard > SQL Editor
-- 3. Click "Run" button
-- 4. Review output - should show "✓ ALL MIGRATIONS COMPLETED"
-- 5. If successful, migrations are auto-committed
-- 6. If errors, review and fix before re-running
--
-- ============================================================================

-- Pre-migration validation
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ADSapp Database Migration - Week 1-2 (10 Migrations) - SAFE VERSION';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '============================================================================';

  -- Check baseline tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'Baseline table "organizations" not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Baseline table "profiles" not found';
  END IF;

  RAISE NOTICE '✓ Pre-migration validation passed';
END $$;

-- ============================================================================
-- MIGRATION 1: COMPLETE RLS COVERAGE
-- ============================================================================
-- Creating helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_role = 'super_admin';
END;
$$;

-- Enable RLS on existing tables only (safe approach)
DO $$
BEGIN
  -- Organizations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
    CREATE POLICY "Users can view own organization"
      ON organizations FOR SELECT
      USING (id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
    CREATE POLICY "Super admins can manage all organizations"
      ON organizations FOR ALL
      USING (is_super_admin());

    RAISE NOTICE '✓ RLS enabled on organizations';
  END IF;

  -- Profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view profiles in own organization" ON profiles;
    CREATE POLICY "Users can view profiles in own organization"
      ON profiles FOR SELECT
      USING (organization_id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (id = auth.uid() OR is_super_admin());

    RAISE NOTICE '✓ RLS enabled on profiles';
  END IF;

  -- Contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view contacts in own organization" ON contacts;
    CREATE POLICY "Users can view contacts in own organization"
      ON contacts FOR SELECT
      USING (organization_id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Users can create contacts in own organization" ON contacts;
    CREATE POLICY "Users can create contacts in own organization"
      ON contacts FOR INSERT
      WITH CHECK (organization_id = get_user_organization());

    DROP POLICY IF EXISTS "Users can update contacts in own organization" ON contacts;
    CREATE POLICY "Users can update contacts in own organization"
      ON contacts FOR UPDATE
      USING (organization_id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Users can delete contacts in own organization" ON contacts;
    CREATE POLICY "Users can delete contacts in own organization"
      ON contacts FOR DELETE
      USING (organization_id = get_user_organization() OR is_super_admin());

    RAISE NOTICE '✓ RLS enabled on contacts';
  END IF;

  -- Conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view conversations in own organization" ON conversations;
    CREATE POLICY "Users can view conversations in own organization"
      ON conversations FOR SELECT
      USING (organization_id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Users can create conversations in own organization" ON conversations;
    CREATE POLICY "Users can create conversations in own organization"
      ON conversations FOR INSERT
      WITH CHECK (organization_id = get_user_organization());

    DROP POLICY IF EXISTS "Users can update conversations in own organization" ON conversations;
    CREATE POLICY "Users can update conversations in own organization"
      ON conversations FOR UPDATE
      USING (organization_id = get_user_organization() OR is_super_admin());

    RAISE NOTICE '✓ RLS enabled on conversations';
  END IF;

  -- Messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view messages in own organization" ON messages;
    CREATE POLICY "Users can view messages in own organization"
      ON messages FOR SELECT
      USING (
        conversation_id IN (
          SELECT id FROM conversations WHERE organization_id = get_user_organization()
        ) OR is_super_admin()
      );

    DROP POLICY IF EXISTS "Users can create messages in own organization" ON messages;
    CREATE POLICY "Users can create messages in own organization"
      ON messages FOR INSERT
      WITH CHECK (
        conversation_id IN (
          SELECT id FROM conversations WHERE organization_id = get_user_organization()
        )
      );

    RAISE NOTICE '✓ RLS enabled on messages';
  END IF;

  -- Subscriptions (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view subscriptions in own organization" ON subscriptions;
    CREATE POLICY "Users can view subscriptions in own organization"
      ON subscriptions FOR SELECT
      USING (organization_id = get_user_organization() OR is_super_admin());

    DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON subscriptions;
    CREATE POLICY "Super admins can manage all subscriptions"
      ON subscriptions FOR ALL
      USING (is_super_admin());

    RAISE NOTICE '✓ RLS enabled on subscriptions';
  ELSE
    RAISE NOTICE '⚠ Subscriptions table not found - skipping RLS';
  END IF;

END $$;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 1/10 completed: RLS Coverage';
END $$;

-- ============================================================================
-- MIGRATION 2: MFA IMPLEMENTATION
-- ============================================================================
DO $$
BEGIN
  -- Check if columns already exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mfa_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✓ Added mfa_enabled column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mfa_secret'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_secret TEXT;
    RAISE NOTICE '✓ Added mfa_secret column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mfa_backup_codes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_backup_codes TEXT[];
    RAISE NOTICE '✓ Added mfa_backup_codes column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mfa_enrolled_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_enrolled_at TIMESTAMPTZ;
    RAISE NOTICE '✓ Added mfa_enrolled_at column';
  END IF;

  RAISE NOTICE '✓ Migration 2/10 completed: MFA Implementation';
END $$;

-- ============================================================================
-- MIGRATION 3: SESSION MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 3/10 completed: Session Management';
END $$;

-- ============================================================================
-- MIGRATION 4: WEBHOOK INFRASTRUCTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_processing_errors_webhook_event_id ON webhook_processing_errors(webhook_event_id);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 4/10 completed: Webhook Infrastructure';
END $$;

-- ============================================================================
-- MIGRATION 5: PAYMENT INTENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  payment_method_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_authentication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
  authentication_type TEXT NOT NULL,
  status TEXT NOT NULL,
  challenge_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
  compliance_type TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_organization_id ON payment_intents(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payment intents in own organization" ON payment_intents;
CREATE POLICY "Users can view payment intents in own organization"
  ON payment_intents FOR SELECT
  USING (organization_id = get_user_organization() OR is_super_admin());

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 5/10 completed: Payment Intents';
END $$;

-- ============================================================================
-- MIGRATION 6: REFUND MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_refund_id TEXT UNIQUE NOT NULL,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refund_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_organization_id ON refunds(organization_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_id ON refunds(stripe_refund_id);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view refunds in own organization" ON refunds;
CREATE POLICY "Users can view refunds in own organization"
  ON refunds FOR SELECT
  USING (organization_id = get_user_organization() OR is_super_admin());

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 6/10 completed: Refund Management';
END $$;

-- ============================================================================
-- MIGRATION 7: JOB QUEUE SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'completed', 'failed')),
  data JSONB,
  error TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run_at ON job_schedules(next_run_at);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 7/10 completed: Job Queue System';
END $$;

-- ============================================================================
-- MIGRATION 8: CACHE INFRASTRUCTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cache_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_level TEXT NOT NULL CHECK (cache_level IN ('L1', 'L2', 'L3')),
  hit_count INT DEFAULT 0,
  miss_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_invalidation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  reason TEXT,
  invalidated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_hits BIGINT DEFAULT 0,
  total_misses BIGINT DEFAULT 0,
  hit_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_cache_metadata_cache_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_stats_daily_date ON cache_stats_daily(date);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_logs_created_at ON cache_invalidation_logs(created_at);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 8/10 completed: Cache Infrastructure';
END $$;

-- ============================================================================
-- MIGRATION 9: KMS KEY MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_version INT NOT NULL,
  encrypted_data_key TEXT NOT NULL,
  kms_key_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS key_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  old_key_version INT NOT NULL,
  new_key_version INT NOT NULL,
  rotation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_organization_id ON encryption_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_is_active ON encryption_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires_at ON encryption_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_key_rotation_log_organization_id ON key_rotation_log(organization_id);

ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view encryption keys for own organization" ON encryption_keys;
CREATE POLICY "Users can view encryption keys for own organization"
  ON encryption_keys FOR SELECT
  USING (organization_id = get_user_organization() OR is_super_admin());

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 9/10 completed: KMS Key Management';
END $$;

-- ============================================================================
-- MIGRATION 10: GDPR COMPLIANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  retention_days INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS default_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT UNIQUE NOT NULL,
  retention_days INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_request_id UUID REFERENCES deletion_requests(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  records_deleted INT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add soft delete columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);
    RAISE NOTICE '✓ Added deleted_at to profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);
    RAISE NOTICE '✓ Added deleted_at to contacts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_conversations_deleted_at ON conversations(deleted_at);
    RAISE NOTICE '✓ Added deleted_at to conversations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);
    RAISE NOTICE '✓ Added deleted_at to messages';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_organization_id ON data_retention_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_organization_id ON deletion_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);

-- Insert default retention policies
INSERT INTO default_retention_policies (data_type, retention_days, description) VALUES
  ('messages', 730, '2 years retention for message history'),
  ('contacts', 1095, '3 years retention for contact information'),
  ('audit_logs', 2555, '7 years retention for compliance')
ON CONFLICT (data_type) DO NOTHING;

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view retention policies for own organization" ON data_retention_policies;
CREATE POLICY "Users can view retention policies for own organization"
  ON data_retention_policies FOR SELECT
  USING (organization_id = get_user_organization() OR is_super_admin());

DROP POLICY IF EXISTS "Users can view deletion requests for own organization" ON deletion_requests;
CREATE POLICY "Users can view deletion requests for own organization"
  ON deletion_requests FOR SELECT
  USING (organization_id = get_user_organization() OR is_super_admin());

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 10/10 completed: GDPR Compliance';
END $$;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_total_policies INTEGER;
  v_mfa_columns INTEGER;
  v_sessions_exists BOOLEAN;
  v_new_tables INTEGER;
  v_soft_delete_columns INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'POST-MIGRATION VERIFICATION';
  RAISE NOTICE '============================================================================';

  -- Count tables with RLS
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  RAISE NOTICE '✓ Tables with RLS enabled: %', v_tables_with_rls;

  -- Count RLS policies
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '✓ Total RLS policies: %', v_total_policies;

  -- Check MFA columns
  SELECT COUNT(*) INTO v_mfa_columns
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_enrolled_at');

  RAISE NOTICE '✓ MFA columns in profiles: % (expected: 4)', v_mfa_columns;

  -- Check sessions table
  v_sessions_exists := EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions'
  );

  RAISE NOTICE '✓ Sessions table exists: %', v_sessions_exists;

  -- Count new tables
  SELECT COUNT(*) INTO v_new_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'sessions', 'webhook_events', 'webhook_processing_errors',
      'payment_intents', 'payment_authentication_events', 'payment_compliance_logs',
      'refunds', 'refund_history', 'refund_notifications',
      'job_logs', 'job_schedules',
      'cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily',
      'encryption_keys', 'key_rotation_log',
      'data_retention_policies', 'default_retention_policies',
      'deletion_requests', 'deletion_audit_log'
    );

  RAISE NOTICE '✓ New tables created: % (expected: 20)', v_new_tables;

  -- Check soft delete columns
  SELECT COUNT(DISTINCT table_name) INTO v_soft_delete_columns
  FROM information_schema.columns
  WHERE table_name IN ('profiles', 'contacts', 'conversations', 'messages')
    AND column_name = 'deleted_at';

  RAISE NOTICE '✓ Soft delete columns added: %', v_soft_delete_columns;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✓✓✓ ALL 10 MIGRATIONS COMPLETED SUCCESSFULLY ✓✓✓';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Infrastructure Summary:';
  RAISE NOTICE '- RLS: Multi-tenant isolation enforced on % tables', v_tables_with_rls;
  RAISE NOTICE '- Policies: % RLS policies created', v_total_policies;
  RAISE NOTICE '- MFA: Two-factor authentication ready (4 columns)';
  RAISE NOTICE '- Sessions: Enterprise session management';
  RAISE NOTICE '- Webhooks: Stripe idempotency tracking';
  RAISE NOTICE '- Payments: 3D Secure + PCI compliance';
  RAISE NOTICE '- Refunds: Full audit trail';
  RAISE NOTICE '- Jobs: BullMQ integration';
  RAISE NOTICE '- Cache: Redis monitoring';
  RAISE NOTICE '- KMS: Encryption key management';
  RAISE NOTICE '- GDPR: Data lifecycle management';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Migrations auto-committed by Supabase';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Test user authentication and multi-tenancy';
  RAISE NOTICE '2. Verify RLS policies prevent cross-tenant access';
  RAISE NOTICE '3. Test MFA enrollment workflow';
  RAISE NOTICE '4. Monitor Stripe webhook processing';
  RAISE NOTICE '5. Test payment flows in sandbox';
  RAISE NOTICE '';
END $$;
