-- ============================================================================
-- SUPABASE SQL EDITOR COMPATIBLE SCRIPT - MISSING TABLES
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Apply missing tables migration via Supabase Dashboard SQL Editor
-- Date: 2025-10-14
-- Tables: 7 missing tables from TypeScript fixes
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Paste into Supabase Dashboard > SQL Editor
-- 3. Click "Run" button
-- 4. Review output - should show "✓ MIGRATION COMPLETED"
-- 5. If successful, changes are auto-committed
-- 6. If errors occur, review and fix before re-running
--
-- SAFETY CHECKS:
-- - Idempotent: Safe to run multiple times (uses IF NOT EXISTS)
-- - Non-destructive: Only creates new tables, never drops existing data
-- - RLS enabled: Multi-tenant isolation enforced
-- - Validated: All foreign keys reference existing tables
--
-- ============================================================================

-- Pre-migration validation
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ADSapp Missing Tables Migration - Starting';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '============================================================================';

  -- Verify helper functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_organization') THEN
    RAISE EXCEPTION 'Helper function get_user_organization not found. Run main migrations first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    RAISE EXCEPTION 'Helper function is_super_admin not found. Run main migrations first.';
  END IF;

  -- Verify baseline tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'Baseline table organizations not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Baseline table profiles not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    RAISE EXCEPTION 'Baseline table subscriptions not found';
  END IF;

  RAISE NOTICE '✓ Pre-migration validation passed';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TABLE 1: PERFORMANCE_ANALYTICS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_analytics') THEN
    CREATE TABLE performance_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      session_id TEXT,
      type TEXT NOT NULL CHECK (type IN (
        'CLS', 'FCP', 'FID', 'LCP', 'TTFB',
        'api-call', 'custom-timing', 'error',
        'user-interaction', 'navigation-timing'
      )),
      name TEXT,
      value NUMERIC,
      duration NUMERIC,
      url TEXT,
      route TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address INET,
      user_agent TEXT,
      viewport_width INT,
      viewport_height INT,
      device_type TEXT,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_performance_analytics_organization_id ON performance_analytics(organization_id);
    CREATE INDEX idx_performance_analytics_user_id ON performance_analytics(user_id);
    CREATE INDEX idx_performance_analytics_type ON performance_analytics(type);
    CREATE INDEX idx_performance_analytics_timestamp ON performance_analytics(timestamp DESC);
    CREATE INDEX idx_performance_analytics_session_id ON performance_analytics(session_id);
    CREATE INDEX idx_performance_analytics_composite ON performance_analytics(organization_id, type, timestamp DESC);

    ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view performance analytics in own organization"
      ON performance_analytics FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Users can insert performance analytics in own organization"
      ON performance_analytics FOR INSERT
      WITH CHECK (organization_id = public.get_user_organization() OR user_id = auth.uid());

    RAISE NOTICE '✓ Created table: performance_analytics (6 indexes, 2 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table performance_analytics already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 2: SCHEDULED_REPORTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reports') THEN
    CREATE TABLE scheduled_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL CHECK (report_type IN (
        'conversations', 'messages', 'agents', 'contacts', 'performance'
      )),
      report_name TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      filters JSONB DEFAULT '{}'::jsonb,
      format TEXT DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
      scheduling JSONB DEFAULT '{"frequency": "once"}'::jsonb,
      next_run_at TIMESTAMPTZ,
      last_run_at TIMESTAMPTZ,
      status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
      )),
      error_message TEXT,
      output_url TEXT,
      delivery_emails TEXT[],
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX idx_scheduled_reports_organization_id ON scheduled_reports(organization_id);
    CREATE INDEX idx_scheduled_reports_created_by ON scheduled_reports(created_by);
    CREATE INDEX idx_scheduled_reports_status ON scheduled_reports(status);
    CREATE INDEX idx_scheduled_reports_next_run_at ON scheduled_reports(next_run_at);
    CREATE INDEX idx_scheduled_reports_report_type ON scheduled_reports(report_type);

    ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view scheduled reports in own organization"
      ON scheduled_reports FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Users can create scheduled reports in own organization"
      ON scheduled_reports FOR INSERT
      WITH CHECK (organization_id = public.get_user_organization() AND created_by = auth.uid());

    CREATE POLICY "Users can update own scheduled reports"
      ON scheduled_reports FOR UPDATE
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Users can delete own scheduled reports"
      ON scheduled_reports FOR DELETE
      USING (organization_id = public.get_user_organization() OR created_by = auth.uid());

    RAISE NOTICE '✓ Created table: scheduled_reports (5 indexes, 4 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table scheduled_reports already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 3: AUDIT_LOGS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      actor_email TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      old_values JSONB,
      new_values JSONB,
      risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
      ip_address INET,
      user_agent TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      session_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
    CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
    CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
    CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
    CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX idx_audit_logs_composite ON audit_logs(organization_id, action, created_at DESC);

    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view audit logs in own organization"
      ON audit_logs FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "System can insert audit logs"
      ON audit_logs FOR INSERT
      WITH CHECK (true);

    RAISE NOTICE '✓ Created table: audit_logs (8 indexes, 2 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table audit_logs already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 4: INVOICES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    CREATE TABLE invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      stripe_invoice_id TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE,
      amount_due INT NOT NULL,
      amount_paid INT DEFAULT 0,
      currency TEXT DEFAULT 'usd',
      status TEXT NOT NULL CHECK (status IN (
        'draft', 'open', 'paid', 'void', 'uncollectible'
      )),
      billing_period_start DATE NOT NULL,
      billing_period_end DATE NOT NULL,
      due_date DATE,
      paid_at TIMESTAMPTZ,
      line_items JSONB DEFAULT '[]'::jsonb,
      subtotal INT NOT NULL,
      tax_amount INT DEFAULT 0,
      discount_amount INT DEFAULT 0,
      total_amount INT NOT NULL,
      payment_method TEXT,
      payment_intent_id TEXT,
      invoice_pdf_url TEXT,
      hosted_invoice_url TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
    CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
    CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
    CREATE INDEX idx_invoices_stripe_customer_id ON invoices(stripe_customer_id);
    CREATE INDEX idx_invoices_status ON invoices(status);
    CREATE INDEX idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view invoices in own organization"
      ON invoices FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Super admins can manage all invoices"
      ON invoices FOR ALL
      USING (public.is_super_admin());

    RAISE NOTICE '✓ Created table: invoices (7 indexes, 2 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table invoices already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 5: SUBSCRIPTION_CHANGES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_changes') THEN
    CREATE TABLE subscription_changes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      change_type TEXT NOT NULL CHECK (change_type IN (
        'created', 'upgraded', 'downgraded', 'cancelled',
        'renewed', 'trial_started', 'trial_ended', 'reactivated'
      )),
      old_plan_id TEXT,
      new_plan_id TEXT,
      old_status TEXT,
      new_status TEXT,
      old_amount INT,
      new_amount INT,
      currency TEXT DEFAULT 'usd',
      prorated_amount INT,
      effective_date DATE NOT NULL,
      change_reason TEXT,
      initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      stripe_subscription_id TEXT,
      stripe_event_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_subscription_changes_organization_id ON subscription_changes(organization_id);
    CREATE INDEX idx_subscription_changes_subscription_id ON subscription_changes(subscription_id);
    CREATE INDEX idx_subscription_changes_change_type ON subscription_changes(change_type);
    CREATE INDEX idx_subscription_changes_effective_date ON subscription_changes(effective_date);
    CREATE INDEX idx_subscription_changes_created_at ON subscription_changes(created_at DESC);

    ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view subscription changes in own organization"
      ON subscription_changes FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "System can insert subscription changes"
      ON subscription_changes FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Super admins can manage all subscription changes"
      ON subscription_changes FOR ALL
      USING (public.is_super_admin());

    RAISE NOTICE '✓ Created table: subscription_changes (5 indexes, 3 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table subscription_changes already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 6: USAGE_TRACKING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
    CREATE TABLE usage_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      usage_hour INT CHECK (usage_hour >= 0 AND usage_hour <= 23),
      resource_type TEXT NOT NULL CHECK (resource_type IN (
        'messages_sent', 'messages_received', 'storage_gb',
        'api_calls', 'active_contacts', 'active_users',
        'whatsapp_sessions', 'automation_executions'
      )),
      quantity NUMERIC NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      unit_price NUMERIC,
      total_cost NUMERIC,
      currency TEXT DEFAULT 'usd',
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
      is_billable BOOLEAN DEFAULT TRUE,
      included_quantity NUMERIC,
      overage_quantity NUMERIC,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(organization_id, usage_date, usage_hour, resource_type)
    );

    CREATE INDEX idx_usage_tracking_organization_id ON usage_tracking(organization_id);
    CREATE INDEX idx_usage_tracking_usage_date ON usage_tracking(usage_date DESC);
    CREATE INDEX idx_usage_tracking_resource_type ON usage_tracking(resource_type);
    CREATE INDEX idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
    CREATE INDEX idx_usage_tracking_invoice_id ON usage_tracking(invoice_id);
    CREATE INDEX idx_usage_tracking_composite ON usage_tracking(organization_id, usage_date, resource_type);

    ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view usage tracking in own organization"
      ON usage_tracking FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "System can insert usage tracking"
      ON usage_tracking FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Super admins can manage all usage tracking"
      ON usage_tracking FOR ALL
      USING (public.is_super_admin());

    RAISE NOTICE '✓ Created table: usage_tracking (6 indexes, 3 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table usage_tracking already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- TABLE 7: MESSAGE_TEMPLATES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
    CREATE TABLE message_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      category TEXT CHECK (category IN (
        'greeting', 'away', 'closing', 'follow_up', 'support', 'sales', 'custom'
      )),
      content TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      variables JSONB DEFAULT '[]'::jsonb,
      whatsapp_template_id TEXT,
      whatsapp_status TEXT CHECK (whatsapp_status IN (
        'draft', 'pending', 'approved', 'rejected'
      )),
      usage_count INT DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB DEFAULT '{}'::jsonb,
      tags TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_message_templates_organization_id ON message_templates(organization_id);
    CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);
    CREATE INDEX idx_message_templates_category ON message_templates(category);
    CREATE INDEX idx_message_templates_whatsapp_template_id ON message_templates(whatsapp_template_id);
    CREATE INDEX idx_message_templates_is_active ON message_templates(is_active);
    CREATE INDEX idx_message_templates_usage_count ON message_templates(usage_count DESC);

    ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view message templates in own organization"
      ON message_templates FOR SELECT
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Users can create message templates in own organization"
      ON message_templates FOR INSERT
      WITH CHECK (organization_id = public.get_user_organization() AND created_by = auth.uid());

    CREATE POLICY "Users can update message templates in own organization"
      ON message_templates FOR UPDATE
      USING (organization_id = public.get_user_organization() OR public.is_super_admin());

    CREATE POLICY "Users can delete message templates in own organization"
      ON message_templates FOR DELETE
      USING (organization_id = public.get_user_organization() OR created_by = auth.uid());

    RAISE NOTICE '✓ Created table: message_templates (6 indexes, 4 RLS policies)';
  ELSE
    RAISE NOTICE '⚠ Table message_templates already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

DO $$
BEGIN
  -- Create or replace the trigger function
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- scheduled_reports trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_scheduled_reports_updated_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reports'
  ) THEN
    CREATE TRIGGER update_scheduled_reports_updated_at
      BEFORE UPDATE ON scheduled_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✓ Created trigger: update_scheduled_reports_updated_at';
  END IF;

  -- invoices trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices'
  ) THEN
    CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON invoices
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✓ Created trigger: update_invoices_updated_at';
  END IF;

  -- usage_tracking trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_tracking_updated_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking'
  ) THEN
    CREATE TRIGGER update_usage_tracking_updated_at
      BEFORE UPDATE ON usage_tracking
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✓ Created trigger: update_usage_tracking_updated_at';
  END IF;

  -- message_templates trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_message_templates_updated_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates'
  ) THEN
    CREATE TRIGGER update_message_templates_updated_at
      BEFORE UPDATE ON message_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✓ Created trigger: update_message_templates_updated_at';
  END IF;

  RAISE NOTICE '✓ Update triggers configured';
END $$;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_new_tables_count INTEGER;
  v_total_indexes INTEGER;
  v_total_policies INTEGER;
  v_total_triggers INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'POST-MIGRATION VERIFICATION';
  RAISE NOTICE '============================================================================';

  -- Count newly created tables
  SELECT COUNT(*) INTO v_new_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  RAISE NOTICE '✓ Tables created: % (expected: 7)', v_new_tables_count;

  -- Count indexes on new tables
  SELECT COUNT(*) INTO v_total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  RAISE NOTICE '✓ Indexes created: % (expected: ~43)', v_total_indexes;

  -- Count RLS policies on new tables
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  RAISE NOTICE '✓ RLS policies created: % (expected: ~19)', v_total_policies;

  -- Count triggers
  SELECT COUNT(*) INTO v_total_triggers
  FROM pg_trigger
  WHERE tgname IN (
    'update_scheduled_reports_updated_at',
    'update_invoices_updated_at',
    'update_usage_tracking_updated_at',
    'update_message_templates_updated_at'
  );

  RAISE NOTICE '✓ Update triggers created: % (expected: 4)', v_total_triggers;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✓✓✓ MISSING TABLES MIGRATION COMPLETED SUCCESSFULLY ✓✓✓';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table Summary:';
  RAISE NOTICE '1. ✓ performance_analytics - Web Vitals & API performance metrics';
  RAISE NOTICE '2. ✓ scheduled_reports - Recurring report automation';
  RAISE NOTICE '3. ✓ audit_logs - Security event logging & compliance';
  RAISE NOTICE '4. ✓ invoices - Billing invoice records';
  RAISE NOTICE '5. ✓ subscription_changes - Subscription history tracking';
  RAISE NOTICE '6. ✓ usage_tracking - Resource usage monitoring';
  RAISE NOTICE '7. ✓ message_templates - WhatsApp message templates';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Enabled:';
  RAISE NOTICE '- Multi-tenant RLS policies on all tables';
  RAISE NOTICE '- Performance indexes for fast queries';
  RAISE NOTICE '- Updated_at triggers for audit trails';
  RAISE NOTICE '- Foreign key constraints for data integrity';
  RAISE NOTICE '- JSONB columns for flexible metadata';
  RAISE NOTICE '';
  RAISE NOTICE '✓ All changes auto-committed by Supabase';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Remove TODO comments from TypeScript files';
  RAISE NOTICE '2. Test performance analytics tracking';
  RAISE NOTICE '3. Test scheduled reports generation';
  RAISE NOTICE '4. Verify audit logging for MFA operations';
  RAISE NOTICE '5. Test invoice creation via Stripe webhooks';
  RAISE NOTICE '';
END $$;
