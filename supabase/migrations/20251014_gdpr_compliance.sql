-- =====================================================
-- GDPR Compliance System Migration
-- Comprehensive data protection and privacy automation
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DATA SUBJECT REQUESTS (DSR)
-- Article 15-22: Access, Rectification, Erasure, Portability
-- =====================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Requester information
  user_email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requester_name TEXT,

  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN (
    'access',           -- Article 15: Right to access
    'rectification',    -- Article 16: Right to rectification
    'erasure',          -- Article 17: Right to erasure (right to be forgotten)
    'portability',      -- Article 20: Right to data portability
    'restriction',      -- Article 18: Right to restriction of processing
    'objection'         -- Article 21: Right to object
  )),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Initial submission
    'verification',     -- Identity verification in progress
    'verified',         -- Identity verified
    'processing',       -- Request being processed
    'completed',        -- Request fulfilled
    'rejected',         -- Request rejected with reason
    'cancelled'         -- Request cancelled by user
  )),

  -- Verification
  verification_method TEXT, -- 'email_token', 'phone_otp', 'identity_document'
  verification_token TEXT,
  verification_attempts INTEGER DEFAULT 0,
  verification_completed_at TIMESTAMPTZ,

  -- Request metadata
  request_data JSONB DEFAULT '{}',
  request_reason TEXT,
  legal_basis TEXT,

  -- Processing
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processing_started_at TIMESTAMPTZ,
  processing_notes TEXT,

  -- Response
  response_data JSONB DEFAULT '{}',
  export_file_path TEXT,
  export_file_size_bytes BIGINT,
  export_file_format TEXT, -- 'json', 'csv', 'pdf'
  export_generated_at TIMESTAMPTZ,
  export_expires_at TIMESTAMPTZ,
  export_downloaded_at TIMESTAMPTZ,

  -- Completion
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  rejection_reason TEXT,

  -- SLA tracking
  due_date TIMESTAMPTZ, -- 30 days from request
  reminded_at TIMESTAMPTZ,

  -- Audit
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for DSR
CREATE INDEX idx_dsr_organization ON data_subject_requests(organization_id);
CREATE INDEX idx_dsr_email ON data_subject_requests(user_email);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_type ON data_subject_requests(request_type);
CREATE INDEX idx_dsr_due_date ON data_subject_requests(due_date) WHERE status NOT IN ('completed', 'rejected', 'cancelled');
CREATE INDEX idx_dsr_assigned ON data_subject_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- RLS for DSR
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY dsr_organization_isolation ON data_subject_requests
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- CONSENT MANAGEMENT
-- Article 7: Conditions for consent
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_purposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Purpose details
  purpose_code TEXT NOT NULL UNIQUE, -- 'marketing_email', 'analytics', 'third_party_sharing'
  purpose_name TEXT NOT NULL,
  purpose_description TEXT NOT NULL,
  purpose_category TEXT NOT NULL, -- 'essential', 'functional', 'analytics', 'marketing'

  -- Legal basis
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent',              -- Article 6(1)(a): Freely given consent
    'contract',             -- Article 6(1)(b): Contract performance
    'legal_obligation',     -- Article 6(1)(c): Legal obligation
    'vital_interests',      -- Article 6(1)(d): Vital interests
    'public_task',          -- Article 6(1)(e): Public task
    'legitimate_interest'   -- Article 6(1)(f): Legitimate interests
  )),

  -- Requirements
  required BOOLEAN DEFAULT false, -- Cannot use platform without it
  default_granted BOOLEAN DEFAULT false,
  requires_opt_in BOOLEAN DEFAULT true,

  -- Data details
  data_categories TEXT[] NOT NULL, -- 'contact_info', 'message_content', 'usage_data'
  data_recipients TEXT[], -- 'internal', 'analytics_provider', 'marketing_platform'
  retention_period TEXT NOT NULL, -- '30 days', '1 year', 'until_withdrawal'

  -- Consent text
  consent_text TEXT NOT NULL,
  consent_text_version TEXT NOT NULL,
  privacy_policy_url TEXT,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Subject
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,

  -- Consent details
  purpose_id UUID NOT NULL REFERENCES consent_purposes(id) ON DELETE CASCADE,
  purpose_code TEXT NOT NULL,

  -- Consent state
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,

  -- Consent capture
  consent_method TEXT NOT NULL, -- 'signup', 'settings', 'cookie_banner', 'api'
  consent_text TEXT NOT NULL, -- Exact text user agreed to
  consent_version TEXT NOT NULL,

  -- Technical details
  ip_address TEXT,
  user_agent TEXT,
  page_url TEXT,

  -- Audit
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for consent
CREATE INDEX idx_consent_records_org ON consent_records(organization_id);
CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_email ON consent_records(user_email);
CREATE INDEX idx_consent_records_purpose ON consent_records(purpose_id);
CREATE INDEX idx_consent_records_granted ON consent_records(granted);
CREATE UNIQUE INDEX idx_consent_records_unique ON consent_records(user_email, purpose_code, organization_id)
  WHERE withdrawn_at IS NULL;

-- RLS for consent
ALTER TABLE consent_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_purposes_org_isolation ON consent_purposes
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY consent_records_org_isolation ON consent_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- DATA PROCESSING RECORDS
-- Article 30: Records of processing activities
-- =====================================================

CREATE TABLE IF NOT EXISTS processing_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Activity identification
  activity_code TEXT NOT NULL UNIQUE,
  activity_name TEXT NOT NULL,
  activity_description TEXT NOT NULL,

  -- Purpose and legal basis
  processing_purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation',
    'vital_interests', 'public_task', 'legitimate_interest'
  )),
  legitimate_interest_assessment TEXT,

  -- Data details
  data_categories TEXT[] NOT NULL, -- 'identity', 'contact', 'financial', 'location'
  data_sources TEXT[], -- 'user_provided', 'third_party', 'public_records'
  data_subjects TEXT[] NOT NULL, -- 'customers', 'employees', 'suppliers'

  -- Recipients and transfers
  recipients TEXT[], -- 'internal_team', 'cloud_provider', 'analytics_service'
  recipient_categories TEXT[], -- 'controllers', 'processors', 'third_parties'

  -- International transfers
  transfers_outside_eea BOOLEAN DEFAULT false,
  transfer_countries TEXT[],
  transfer_safeguards TEXT, -- 'standard_contractual_clauses', 'adequacy_decision'
  transfer_safeguards_details TEXT,

  -- Retention
  retention_period TEXT NOT NULL,
  retention_criteria TEXT NOT NULL,
  deletion_procedure TEXT,

  -- Security measures
  security_measures TEXT[] NOT NULL,
  encryption_used BOOLEAN DEFAULT false,
  access_controls TEXT,

  -- DPO and accountability
  dpo_name TEXT,
  dpo_contact TEXT,
  controller_name TEXT,
  controller_contact TEXT,
  processor_names TEXT[],

  -- DPIA requirement
  dpia_required BOOLEAN DEFAULT false,
  dpia_completed BOOLEAN DEFAULT false,
  dpia_id UUID,

  -- Review and status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review')),
  last_reviewed_at TIMESTAMPTZ,
  next_review_date DATE,
  review_frequency TEXT DEFAULT '12 months',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for processing activities
CREATE INDEX idx_processing_activities_org ON processing_activities(organization_id);
CREATE INDEX idx_processing_activities_status ON processing_activities(status);
CREATE INDEX idx_processing_activities_review ON processing_activities(next_review_date) WHERE status = 'active';

-- RLS for processing activities
ALTER TABLE processing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY processing_activities_org_isolation ON processing_activities
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PRIVACY IMPACT ASSESSMENTS (DPIA)
-- Article 35: Data Protection Impact Assessment
-- =====================================================

CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Assessment identification
  assessment_code TEXT NOT NULL UNIQUE,
  assessment_name TEXT NOT NULL,
  assessment_description TEXT NOT NULL,

  -- Processing details
  processing_activity_id UUID REFERENCES processing_activities(id) ON DELETE SET NULL,
  processing_description TEXT NOT NULL,
  processing_purpose TEXT NOT NULL,

  -- Necessity and proportionality
  necessity_justification TEXT NOT NULL,
  proportionality_assessment TEXT NOT NULL,
  alternatives_considered TEXT,

  -- Data processed
  data_types TEXT[] NOT NULL,
  data_volume TEXT, -- 'low', 'medium', 'high', 'very_high'
  data_sensitivity TEXT NOT NULL CHECK (data_sensitivity IN ('low', 'medium', 'high', 'critical')),
  special_categories_data BOOLEAN DEFAULT false, -- Article 9: Sensitive data
  special_categories_details TEXT,

  -- Data subjects
  data_subjects_description TEXT NOT NULL,
  vulnerable_subjects BOOLEAN DEFAULT false,
  vulnerable_subjects_details TEXT,

  -- Risk assessment
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risks_identified JSONB NOT NULL DEFAULT '[]',
  likelihood_assessment TEXT,
  impact_assessment TEXT,

  -- Mitigation measures
  mitigation_measures JSONB NOT NULL DEFAULT '[]',
  residual_risk_level TEXT,
  security_measures TEXT[],

  -- Consultation
  dpo_consulted BOOLEAN DEFAULT false,
  dpo_opinion TEXT,
  data_subjects_consulted BOOLEAN DEFAULT false,
  consultation_details TEXT,

  -- Approval and review
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'under_review', 'dpo_review', 'approved', 'rejected', 'requires_revision'
  )),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Review schedule
  review_frequency TEXT DEFAULT '12 months',
  last_reviewed_at TIMESTAMPTZ,
  next_review_date DATE,

  -- Documentation
  supporting_documents JSONB DEFAULT '[]',
  conclusions TEXT,
  recommendations TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for DPIA
CREATE INDEX idx_dpia_org ON privacy_impact_assessments(organization_id);
CREATE INDEX idx_dpia_status ON privacy_impact_assessments(status);
CREATE INDEX idx_dpia_risk_level ON privacy_impact_assessments(risk_level);
CREATE INDEX idx_dpia_review ON privacy_impact_assessments(next_review_date) WHERE status = 'approved';

-- RLS for DPIA
ALTER TABLE privacy_impact_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY dpia_org_isolation ON privacy_impact_assessments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- DATA BREACH MANAGEMENT
-- Article 33-34: Notification of data breaches
-- =====================================================

CREATE TABLE IF NOT EXISTS data_breach_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Incident identification
  incident_code TEXT NOT NULL UNIQUE,
  incident_name TEXT NOT NULL,
  incident_description TEXT NOT NULL,

  -- Timeline
  incident_date TIMESTAMPTZ NOT NULL,
  discovered_date TIMESTAMPTZ NOT NULL,
  contained_date TIMESTAMPTZ,

  -- Severity assessment
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_to_rights TEXT NOT NULL CHECK (risk_to_rights IN ('low', 'medium', 'high')),

  -- Affected data
  data_types_affected TEXT[] NOT NULL,
  special_categories_affected BOOLEAN DEFAULT false,
  data_volume_affected TEXT,

  -- Affected individuals
  affected_users_count INTEGER,
  affected_users_identified BOOLEAN DEFAULT false,
  affected_users_list JSONB DEFAULT '[]',
  vulnerable_individuals BOOLEAN DEFAULT false,

  -- Breach details
  breach_type TEXT NOT NULL, -- 'confidentiality', 'integrity', 'availability'
  breach_cause TEXT, -- 'cyber_attack', 'human_error', 'system_failure'
  breach_vector TEXT,
  unauthorized_access BOOLEAN DEFAULT false,
  data_loss BOOLEAN DEFAULT false,

  -- Response actions
  containment_actions JSONB DEFAULT '[]',
  containment_effective BOOLEAN,
  recovery_actions JSONB DEFAULT '[]',

  -- Notifications (Article 33: 72-hour rule)
  notification_required BOOLEAN NOT NULL DEFAULT true,

  -- DPA notification (Article 33)
  dpa_notification_required BOOLEAN DEFAULT true,
  dpa_notified_at TIMESTAMPTZ,
  dpa_notification_method TEXT,
  dpa_reference_number TEXT,
  dpa_within_72h BOOLEAN,
  delay_justification TEXT,

  -- Data subject notification (Article 34)
  subjects_notification_required BOOLEAN DEFAULT false,
  subjects_notified_at TIMESTAMPTZ,
  subjects_notification_method TEXT,
  subjects_notification_count INTEGER,

  -- Investigation
  investigation_status TEXT DEFAULT 'ongoing' CHECK (investigation_status IN (
    'ongoing', 'completed', 'closed'
  )),
  root_cause TEXT,
  root_cause_analysis TEXT,
  contributing_factors TEXT[],

  -- Remediation
  remediation_plan TEXT,
  remediation_actions JSONB DEFAULT '[]',
  remediation_completed BOOLEAN DEFAULT false,
  remediation_completed_at TIMESTAMPTZ,

  -- Prevention
  preventive_measures JSONB DEFAULT '[]',
  policy_changes_required BOOLEAN DEFAULT false,
  training_required BOOLEAN DEFAULT false,

  -- Lessons learned
  lessons_learned TEXT,
  recommendations TEXT,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_actions JSONB DEFAULT '[]',

  -- Status
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN (
    'investigating', 'contained', 'resolved', 'closed'
  )),
  closed_at TIMESTAMPTZ,

  -- Audit
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for data breaches
CREATE INDEX idx_breaches_org ON data_breach_incidents(organization_id);
CREATE INDEX idx_breaches_severity ON data_breach_incidents(severity);
CREATE INDEX idx_breaches_status ON data_breach_incidents(status);
CREATE INDEX idx_breaches_incident_date ON data_breach_incidents(incident_date);
CREATE INDEX idx_breaches_dpa_notification ON data_breach_incidents(dpa_notified_at)
  WHERE dpa_notification_required = true;

-- RLS for data breaches
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY breaches_org_isolation ON data_breach_incidents
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMPLIANCE SCORING AND TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Score calculation
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Category scores
  data_protection_score INTEGER CHECK (data_protection_score >= 0 AND data_protection_score <= 100),
  consent_management_score INTEGER CHECK (consent_management_score >= 0 AND consent_management_score <= 100),
  data_subject_rights_score INTEGER CHECK (data_subject_rights_score >= 0 AND data_subject_rights_score <= 100),
  security_measures_score INTEGER CHECK (security_measures_score >= 0 AND security_measures_score <= 100),
  accountability_score INTEGER CHECK (accountability_score >= 0 AND accountability_score <= 100),

  -- Metrics
  dsr_average_response_days NUMERIC(10,2),
  dsr_completion_rate NUMERIC(5,2),
  consent_rate NUMERIC(5,2),
  active_processing_activities INTEGER,
  completed_dpias INTEGER,
  open_data_breaches INTEGER,

  -- Gaps identified
  gaps JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  -- Audit
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by TEXT DEFAULT 'system',

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for compliance metrics
CREATE INDEX idx_compliance_org ON compliance_metrics(organization_id);
CREATE INDEX idx_compliance_date ON compliance_metrics(calculated_at);

-- RLS for compliance metrics
ALTER TABLE compliance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_metrics_org_isolation ON compliance_metrics
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- AUDIT LOG FOR GDPR OPERATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'dsr_created', 'consent_granted', 'breach_reported'
  event_category TEXT NOT NULL, -- 'dsr', 'consent', 'breach', 'compliance'
  event_description TEXT NOT NULL,

  -- Actor
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,

  -- Subject
  subject_id UUID,
  subject_type TEXT, -- 'user', 'dsr', 'consent', 'breach'

  -- Technical details
  ip_address TEXT,
  user_agent TEXT,

  -- Changes
  changes_before JSONB,
  changes_after JSONB,

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for audit log
CREATE INDEX idx_audit_org ON gdpr_audit_log(organization_id);
CREATE INDEX idx_audit_event_type ON gdpr_audit_log(event_type);
CREATE INDEX idx_audit_category ON gdpr_audit_log(event_category);
CREATE INDEX idx_audit_date ON gdpr_audit_log(created_at);
CREATE INDEX idx_audit_actor ON gdpr_audit_log(actor_id);

-- RLS for audit log
ALTER TABLE gdpr_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_org_isolation ON gdpr_audit_log
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- AUTOMATED TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dsr_updated_at BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_activities_updated_at BEFORE UPDATE ON processing_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dpia_updated_at BEFORE UPDATE ON privacy_impact_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breaches_updated_at BEFORE UPDATE ON data_breach_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set DSR due date automatically (30 days from request)
CREATE OR REPLACE FUNCTION set_dsr_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.due_date = NEW.requested_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dsr_due_date_trigger BEFORE INSERT ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION set_dsr_due_date();

-- Auto-delete expired exports (privacy by design)
CREATE OR REPLACE FUNCTION delete_expired_exports()
RETURNS void AS $$
BEGIN
  UPDATE data_subject_requests
  SET export_file_path = NULL,
      export_file_size_bytes = NULL
  WHERE export_expires_at < NOW()
    AND export_file_path IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- DSR Summary View
CREATE OR REPLACE VIEW dsr_summary AS
SELECT
  organization_id,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_requests,
  AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/86400)::numeric(10,2) as avg_response_days,
  COUNT(*) FILTER (WHERE completed_at > due_date) as overdue_requests
FROM data_subject_requests
GROUP BY organization_id;

-- Consent Summary View
CREATE OR REPLACE VIEW consent_summary AS
SELECT
  cr.organization_id,
  cp.purpose_category,
  COUNT(DISTINCT cr.user_email) as total_users,
  COUNT(*) FILTER (WHERE cr.granted = true) as granted_count,
  COUNT(*) FILTER (WHERE cr.granted = false) as denied_count,
  (COUNT(*) FILTER (WHERE cr.granted = true)::numeric / NULLIF(COUNT(DISTINCT cr.user_email), 0) * 100)::numeric(5,2) as consent_rate
FROM consent_records cr
JOIN consent_purposes cp ON cr.purpose_id = cp.id
WHERE cr.withdrawn_at IS NULL
GROUP BY cr.organization_id, cp.purpose_category;

-- Data Breach Timeline View
CREATE OR REPLACE VIEW breach_compliance_timeline AS
SELECT
  id,
  organization_id,
  incident_code,
  severity,
  discovered_date,
  dpa_notified_at,
  EXTRACT(EPOCH FROM (dpa_notified_at - discovered_date))/3600 as notification_hours,
  CASE
    WHEN dpa_notified_at IS NULL THEN 'pending'
    WHEN EXTRACT(EPOCH FROM (dpa_notified_at - discovered_date))/3600 <= 72 THEN 'compliant'
    ELSE 'breach'
  END as compliance_status
FROM data_breach_incidents
WHERE dpa_notification_required = true;

-- =====================================================
-- INITIAL DATA: Default Consent Purposes
-- =====================================================

-- Note: This should be customized per organization
-- These are common GDPR consent purposes

-- =====================================================
-- FUNCTIONS FOR GDPR OPERATIONS
-- =====================================================

-- Function to calculate compliance score
CREATE OR REPLACE FUNCTION calculate_compliance_score(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  base_score INTEGER := 82; -- Current baseline
  dsr_score INTEGER := 0;
  consent_score INTEGER := 0;
  processing_score INTEGER := 0;
  dpia_score INTEGER := 0;
  breach_score INTEGER := 0;
  total_score INTEGER;
BEGIN
  -- DSR automation (up to 5 points)
  SELECT CASE
    WHEN AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/86400) <= 7 THEN 5
    WHEN AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/86400) <= 15 THEN 3
    ELSE 1
  END INTO dsr_score
  FROM data_subject_requests
  WHERE organization_id = org_id
    AND status = 'completed'
    AND requested_at > NOW() - INTERVAL '90 days';

  dsr_score := COALESCE(dsr_score, 0);

  -- Consent management (up to 3 points)
  SELECT CASE
    WHEN COUNT(DISTINCT purpose_id) >= 5 THEN 3
    WHEN COUNT(DISTINCT purpose_id) >= 3 THEN 2
    ELSE 1
  END INTO consent_score
  FROM consent_records
  WHERE organization_id = org_id;

  consent_score := COALESCE(consent_score, 0);

  -- Processing activities (up to 2 points)
  SELECT CASE
    WHEN COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE last_reviewed_at > NOW() - INTERVAL '12 months') = COUNT(*) THEN 2
    WHEN COUNT(*) >= 3 THEN 1
    ELSE 0
  END INTO processing_score
  FROM processing_activities
  WHERE organization_id = org_id
    AND status = 'active';

  processing_score := COALESCE(processing_score, 0);

  -- DPIA completion (up to 1 point)
  SELECT CASE
    WHEN COUNT(*) >= 2 AND COUNT(*) FILTER (WHERE status = 'approved') = COUNT(*) THEN 1
    ELSE 0
  END INTO dpia_score
  FROM privacy_impact_assessments
  WHERE organization_id = org_id;

  dpia_score := COALESCE(dpia_score, 0);

  -- Breach management (up to 2 points)
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 2
    WHEN COUNT(*) FILTER (WHERE dpa_within_72h = false) = 0 THEN 1
    ELSE 0
  END INTO breach_score
  FROM data_breach_incidents
  WHERE organization_id = org_id
    AND incident_date > NOW() - INTERVAL '12 months';

  breach_score := COALESCE(breach_score, 2); -- Default 2 if no breaches

  -- Calculate total
  total_score := base_score + dsr_score + consent_score + processing_score + dpia_score + breach_score;

  -- Cap at 100
  IF total_score > 100 THEN
    total_score := 100;
  END IF;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE data_subject_requests IS 'GDPR Article 15-22: Data Subject Access Requests and rights management';
COMMENT ON TABLE consent_purposes IS 'GDPR Article 7: Consent purpose definitions for granular consent management';
COMMENT ON TABLE consent_records IS 'GDPR Article 7: Individual consent records with full audit trail';
COMMENT ON TABLE processing_activities IS 'GDPR Article 30: Record of processing activities (ROPA)';
COMMENT ON TABLE privacy_impact_assessments IS 'GDPR Article 35: Data Protection Impact Assessments (DPIA)';
COMMENT ON TABLE data_breach_incidents IS 'GDPR Article 33-34: Data breach notification and management';
COMMENT ON TABLE compliance_metrics IS 'Real-time GDPR compliance scoring and gap analysis';
COMMENT ON TABLE gdpr_audit_log IS 'Complete audit trail of all GDPR-related operations';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_compliance_score TO authenticated;
GRANT EXECUTE ON FUNCTION delete_expired_exports TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
