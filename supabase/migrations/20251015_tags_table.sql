-- Tags Table Migration
-- Create tags table with RLS policies for organization-scoped tag management

-- ============================================================================
-- 1. CREATE TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280', -- Default gray color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_org_name ON tags(organization_id, name);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Policy: Users can view tags in their organization
CREATE POLICY "Users can view tags in their organization" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can create tags in their organization
CREATE POLICY "Users can create tags in their organization" ON tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update tags in their organization
CREATE POLICY "Users can update tags in their organization" ON tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete tags in their organization
CREATE POLICY "Users can delete tags in their organization" ON tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;

-- ============================================================================
-- 7. INSERT DEFAULT TAGS FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Insert common default tags for each organization
INSERT INTO tags (organization_id, name, color)
SELECT
  o.id,
  tag_info.name,
  tag_info.color
FROM organizations o
CROSS JOIN (
  VALUES
    ('VIP', '#F59E0B'),
    ('Important', '#EF4444'),
    ('Follow-up', '#3B82F6'),
    ('New', '#10B981'),
    ('Pending', '#F59E0B')
) AS tag_info(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM tags
  WHERE organization_id = o.id AND name = tag_info.name
);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Tags table migration completed successfully';
  RAISE NOTICE '- Tags table created with RLS enabled';
  RAISE NOTICE '- Indexes created for performance optimization';
  RAISE NOTICE '- RLS policies configured for organization isolation';
  RAISE NOTICE '- Default tags inserted for existing organizations';
END $$;
