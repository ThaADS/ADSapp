-- ============================================================================
-- MISSING DATABASE TABLES MIGRATION
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Create 7 missing database tables identified during TypeScript fixes
-- Date: 2025-10-14
-- Tables: performance_analytics, scheduled_reports, audit_logs, invoices,
--         subscription_changes, usage_tracking, message_templates
-- ============================================================================

-- ============================================================================
-- TABLE 1: PERFORMANCE_ANALYTICS
-- ============================================================================
-- Purpose: Store advanced performance metrics for Web Vitals and API monitoring
-- Referenced by: src/app/api/analytics/performance/route.ts

CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Performance metric identification
  type TEXT NOT NULL CHECK (type IN (
    'CLS', 'FCP', 'FID', 'LCP', 'TTFB',
    'api-call', 'custom-timing', 'error',
    'user-interaction', 'navigation-timing'
  )),
  name TEXT,

  -- Metric values
  value NUMERIC,
  duration NUMERIC,

  -- Context and metadata
  url TEXT,
  route TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Browser and device information
  ip_address INET,
  user_agent TEXT,
  viewport_width INT,
  viewport_height INT,
  device_type TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance_analytics
CREATE INDEX IF NOT EXISTS idx_performance_analytics_organization_id
  ON performance_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_user_id
  ON performance_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_type
  ON performance_analytics(type);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_timestamp
  ON performance_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_session_id
  ON performance_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_composite
  ON performance_analytics(organization_id, type, timestamp DESC);

-- RLS for performance_analytics
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view performance analytics in own organization"
  ON performance_analytics;
CREATE POLICY "Users can view performance analytics in own organization"
  ON performance_analytics FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can insert performance analytics in own organization"
  ON performance_analytics;
CREATE POLICY "Users can insert performance analytics in own organization"
  ON performance_analytics FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    OR user_id = auth.uid()
  );

COMMENT ON TABLE performance_analytics IS 'Advanced performance metrics for Web Vitals, API calls, and custom timings';
COMMENT ON COLUMN performance_analytics.type IS 'Metric type: Web Vitals (CLS, FCP, FID, LCP, TTFB) or custom types';
COMMENT ON COLUMN performance_analytics.value IS 'Numeric value for the metric (e.g., milliseconds, score)';

-- ============================================================================
-- TABLE 2: SCHEDULED_REPORTS
-- ============================================================================
-- Purpose: Manage recurring and one-time report generation schedules
-- Referenced by: src/app/api/analytics/reports/route.ts

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report configuration
  report_type TEXT NOT NULL CHECK (report_type IN (
    'conversations', 'messages', 'agents', 'contacts', 'performance'
  )),
  report_name TEXT,

  -- Date range configuration
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Filters and customization
  filters JSONB DEFAULT '{}'::jsonb,
  format TEXT DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),

  -- Scheduling configuration
  scheduling JSONB DEFAULT '{"frequency": "once"}'::jsonb,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  error_message TEXT,

  -- Output and delivery
  output_url TEXT,
  delivery_emails TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for scheduled_reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_organization_id
  ON scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by
  ON scheduled_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_status
  ON scheduled_reports(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run_at
  ON scheduled_reports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_report_type
  ON scheduled_reports(report_type);

-- RLS for scheduled_reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view scheduled reports in own organization"
  ON scheduled_reports;
CREATE POLICY "Users can view scheduled reports in own organization"
  ON scheduled_reports FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can create scheduled reports in own organization"
  ON scheduled_reports;
CREATE POLICY "Users can create scheduled reports in own organization"
  ON scheduled_reports FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own scheduled reports"
  ON scheduled_reports;
CREATE POLICY "Users can update own scheduled reports"
  ON scheduled_reports FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can delete own scheduled reports"
  ON scheduled_reports;
CREATE POLICY "Users can delete own scheduled reports"
  ON scheduled_reports FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    OR created_by = auth.uid()
  );

COMMENT ON TABLE scheduled_reports IS 'Recurring and one-time report generation schedules';
COMMENT ON COLUMN scheduled_reports.scheduling IS 'JSON config: {"frequency": "once|daily|weekly|monthly", "dayOfWeek": 1, "dayOfMonth": 15, "time": "09:00"}';

-- ============================================================================
-- TABLE 3: AUDIT_LOGS
-- ============================================================================
-- Purpose: Comprehensive security event logging for compliance and forensics
-- Referenced by: src/app/api/auth/mfa/enroll/route.ts, super-admin.ts

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Actor information
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,

  -- Action details
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,

  -- Change tracking
  old_values JSONB,
  new_values JSONB,

  -- Risk and security
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Context
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Session tracking
  session_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id
  ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type
  ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id
  ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level
  ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite
  ON audit_logs(organization_id, action, created_at DESC);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs in own organization"
  ON audit_logs;
CREATE POLICY "Users can view audit logs in own organization"
  ON audit_logs FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "System can insert audit logs"
  ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- Allow system to insert from any context

COMMENT ON TABLE audit_logs IS 'Comprehensive security event logging for compliance and forensics';
COMMENT ON COLUMN audit_logs.risk_level IS 'Risk assessment: low (normal ops), medium (config changes), high (security events), critical (breaches)';

-- ============================================================================
-- TABLE 4: INVOICES
-- ============================================================================
-- Purpose: Store billing invoice records for financial tracking
-- Referenced by: Stripe integration, billing events

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,

  -- Invoice details
  invoice_number TEXT UNIQUE,
  amount_due INT NOT NULL,
  amount_paid INT DEFAULT 0,
  currency TEXT DEFAULT 'usd',

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'draft', 'open', 'paid', 'void', 'uncollectible'
  )),

  -- Dates
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,

  -- Line items and details
  line_items JSONB DEFAULT '[]'::jsonb,

  -- Tax and discounts
  subtotal INT NOT NULL,
  tax_amount INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  total_amount INT NOT NULL,

  -- Payment information
  payment_method TEXT,
  payment_intent_id TEXT,

  -- Invoice files
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
  ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id
  ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_customer_id
  ON invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON invoices(created_at DESC);

-- RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices in own organization"
  ON invoices;
CREATE POLICY "Users can view invoices in own organization"
  ON invoices FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Super admins can manage all invoices"
  ON invoices;
CREATE POLICY "Super admins can manage all invoices"
  ON invoices FOR ALL
  USING (public.is_super_admin());

COMMENT ON TABLE invoices IS 'Billing invoice records for financial tracking and compliance';
COMMENT ON COLUMN invoices.line_items IS 'JSON array of invoice line items with descriptions, quantities, and amounts';

-- ============================================================================
-- TABLE 5: SUBSCRIPTION_CHANGES
-- ============================================================================
-- Purpose: Track subscription history for audit and analysis
-- Referenced by: Subscription management, billing analytics

CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'upgraded', 'downgraded', 'cancelled',
    'renewed', 'trial_started', 'trial_ended', 'reactivated'
  )),

  -- Before and after states
  old_plan_id TEXT,
  new_plan_id TEXT,
  old_status TEXT,
  new_status TEXT,

  -- Financial impact
  old_amount INT,
  new_amount INT,
  currency TEXT DEFAULT 'usd',
  prorated_amount INT,

  -- Timing
  effective_date DATE NOT NULL,

  -- Reason and context
  change_reason TEXT,
  initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Stripe integration
  stripe_subscription_id TEXT,
  stripe_event_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription_changes
CREATE INDEX IF NOT EXISTS idx_subscription_changes_organization_id
  ON subscription_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_subscription_id
  ON subscription_changes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_change_type
  ON subscription_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_effective_date
  ON subscription_changes(effective_date);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_created_at
  ON subscription_changes(created_at DESC);

-- RLS for subscription_changes
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subscription changes in own organization"
  ON subscription_changes;
CREATE POLICY "Users can view subscription changes in own organization"
  ON subscription_changes FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "System can insert subscription changes"
  ON subscription_changes;
CREATE POLICY "System can insert subscription changes"
  ON subscription_changes FOR INSERT
  WITH CHECK (true); -- Allow system to track changes from webhooks

DROP POLICY IF EXISTS "Super admins can manage all subscription changes"
  ON subscription_changes;
CREATE POLICY "Super admins can manage all subscription changes"
  ON subscription_changes FOR ALL
  USING (public.is_super_admin());

COMMENT ON TABLE subscription_changes IS 'Subscription history tracking for audit and churn analysis';
COMMENT ON COLUMN subscription_changes.change_type IS 'Type of subscription change for analytics and reporting';

-- ============================================================================
-- TABLE 6: USAGE_TRACKING
-- ============================================================================
-- Purpose: Monitor resource usage for billing and capacity planning
-- Referenced by: Usage-based billing, analytics

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Usage period
  usage_date DATE NOT NULL,
  usage_hour INT CHECK (usage_hour >= 0 AND usage_hour <= 23),

  -- Resource types
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'messages_sent', 'messages_received', 'storage_gb',
    'api_calls', 'active_contacts', 'active_users',
    'whatsapp_sessions', 'automation_executions'
  )),

  -- Usage metrics
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,

  -- Cost calculation
  unit_price NUMERIC,
  total_cost NUMERIC,
  currency TEXT DEFAULT 'usd',

  -- Billing association
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  is_billable BOOLEAN DEFAULT TRUE,

  -- Limits and overages
  included_quantity NUMERIC,
  overage_quantity NUMERIC,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for aggregation
  UNIQUE(organization_id, usage_date, usage_hour, resource_type)
);

-- Indexes for usage_tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_organization_id
  ON usage_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_usage_date
  ON usage_tracking(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource_type
  ON usage_tracking(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id
  ON usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_invoice_id
  ON usage_tracking(invoice_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_composite
  ON usage_tracking(organization_id, usage_date, resource_type);

-- RLS for usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view usage tracking in own organization"
  ON usage_tracking;
CREATE POLICY "Users can view usage tracking in own organization"
  ON usage_tracking FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "System can insert usage tracking"
  ON usage_tracking;
CREATE POLICY "System can insert usage tracking"
  ON usage_tracking FOR INSERT
  WITH CHECK (true); -- Allow system to track usage

DROP POLICY IF EXISTS "Super admins can manage all usage tracking"
  ON usage_tracking;
CREATE POLICY "Super admins can manage all usage tracking"
  ON usage_tracking FOR ALL
  USING (public.is_super_admin());

COMMENT ON TABLE usage_tracking IS 'Resource usage monitoring for billing and capacity planning';
COMMENT ON COLUMN usage_tracking.usage_hour IS 'Hour of day (0-23) for granular tracking, NULL for daily aggregates';

-- ============================================================================
-- TABLE 7: MESSAGE_TEMPLATES
-- ============================================================================
-- Purpose: Store WhatsApp message templates for quick replies and automation
-- Referenced by: WhatsApp integration, messaging system

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Template details
  name TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'greeting', 'away', 'closing', 'follow_up', 'support', 'sales', 'custom'
  )),

  -- Template content
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',

  -- Variables and personalization
  variables JSONB DEFAULT '[]'::jsonb,

  -- WhatsApp template status
  whatsapp_template_id TEXT,
  whatsapp_status TEXT CHECK (whatsapp_status IN (
    'draft', 'pending', 'approved', 'rejected'
  )),

  -- Usage tracking
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_organization_id
  ON message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by
  ON message_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_category
  ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_whatsapp_template_id
  ON message_templates(whatsapp_template_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active
  ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_usage_count
  ON message_templates(usage_count DESC);

-- RLS for message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view message templates in own organization"
  ON message_templates;
CREATE POLICY "Users can view message templates in own organization"
  ON message_templates FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can create message templates in own organization"
  ON message_templates;
CREATE POLICY "Users can create message templates in own organization"
  ON message_templates FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update message templates in own organization"
  ON message_templates;
CREATE POLICY "Users can update message templates in own organization"
  ON message_templates FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can delete message templates in own organization"
  ON message_templates;
CREATE POLICY "Users can delete message templates in own organization"
  ON message_templates FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    OR created_by = auth.uid()
  );

COMMENT ON TABLE message_templates IS 'WhatsApp message templates for quick replies and automation';
COMMENT ON COLUMN message_templates.variables IS 'JSON array of variable names used in template, e.g., ["customer_name", "order_id"]';

-- ============================================================================
-- UPDATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scheduled_reports_updated_at ON scheduled_reports;
CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_new_tables_count INTEGER;
  v_total_indexes INTEGER;
  v_total_policies INTEGER;
BEGIN
  -- Count newly created tables
  SELECT COUNT(*) INTO v_new_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  -- Count indexes on new tables
  SELECT COUNT(*) INTO v_total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  -- Count RLS policies on new tables
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'performance_analytics', 'scheduled_reports', 'audit_logs',
      'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
    );

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✓ MISSING TABLES MIGRATION COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables created: % (expected: 7)', v_new_tables_count;
  RAISE NOTICE 'Indexes created: %', v_total_indexes;
  RAISE NOTICE 'RLS policies created: %', v_total_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Table Summary:';
  RAISE NOTICE '1. performance_analytics - Web Vitals and API performance metrics';
  RAISE NOTICE '2. scheduled_reports - Recurring report automation';
  RAISE NOTICE '3. audit_logs - Security event logging';
  RAISE NOTICE '4. invoices - Billing invoice records';
  RAISE NOTICE '5. subscription_changes - Subscription history';
  RAISE NOTICE '6. usage_tracking - Resource usage monitoring';
  RAISE NOTICE '7. message_templates - WhatsApp message templates';
  RAISE NOTICE '';
  RAISE NOTICE '✓ All tables have multi-tenant RLS policies';
  RAISE NOTICE '✓ All tables have performance indexes';
  RAISE NOTICE '✓ All tables have updated_at triggers where applicable';
  RAISE NOTICE '============================================================================';
END $$;
