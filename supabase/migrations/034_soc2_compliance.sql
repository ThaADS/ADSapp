-- ============================================================================
-- SOC 2 Type II Compliance Infrastructure
-- Migration: 034_soc2_compliance.sql
-- Purpose: Complete SOC 2 Trust Service Criteria tracking and evidence management
-- ============================================================================

-- ============================================================================
-- 1. SOC 2 Controls Catalog (64 Trust Service Criteria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS soc2_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tsc_id VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  control_objective TEXT NOT NULL,
  implementation_procedures JSONB NOT NULL DEFAULT '[]',
  evidence_requirements JSONB NOT NULL DEFAULT '[]',
  testing_procedures TEXT,
  implementation_status VARCHAR(50) DEFAULT 'not_started',
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 0 AND effectiveness_rating <= 100),
  last_tested_date TIMESTAMPTZ,
  next_test_due_date TIMESTAMPTZ,
  responsible_party TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_soc2_controls_category ON soc2_controls(category);
CREATE INDEX idx_soc2_controls_status ON soc2_controls(implementation_status);
CREATE INDEX idx_soc2_controls_next_test ON soc2_controls(next_test_due_date);

-- ============================================================================
-- 2. Audit Evidence Storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS soc2_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES soc2_controls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  evidence_type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collection_method VARCHAR(100),
  evidence_period_start TIMESTAMPTZ,
  evidence_period_end TIMESTAMPTZ,
  auditor_verified BOOLEAN DEFAULT FALSE,
  auditor_notes TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_date TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_soc2_evidence_control ON soc2_evidence(control_id);
CREATE INDEX idx_soc2_evidence_org ON soc2_evidence(organization_id);
CREATE INDEX idx_soc2_evidence_collection_date ON soc2_evidence(collection_date);
CREATE INDEX idx_soc2_evidence_retention ON soc2_evidence(retention_until);
