-- ============================================================================
-- TAGS MANAGEMENT SYSTEM MIGRATION (FIXED)
-- ============================================================================
-- This migration adds a comprehensive tag management system for contacts
-- Replaces the simple TEXT[] tags with a proper relational structure

-- ============================================================================
-- 1. TAGS TABLE
-- ============================================================================

-- Main tags table for organization-wide tag management
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT NOT NULL DEFAULT '#6B7280',
  color_class TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
  icon TEXT, -- Optional icon name (lucide-react icons)
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name),
  CONSTRAINT valid_color_hex CHECK (color_hex ~* '^#[0-9A-F]{6}$')
);

-- ============================================================================
-- 2. CONTACT-TAG JUNCTION TABLE
-- ============================================================================

-- Many-to-many relationship between contacts and tags
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);

-- ============================================================================
-- 3. TAG CATEGORIES (OPTIONAL GROUPING)
-- ============================================================================

-- Optional: Group tags into categories for better organization
CREATE TABLE IF NOT EXISTS tag_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Add category reference to tags table (check if column exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(organization_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON tags(category_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_assigned_at ON contact_tags(assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_tag_categories_organization_id ON tag_categories(organization_id);

-- ============================================================================
-- 5. UPDATED AT TRIGGERS
-- ============================================================================

-- Drop triggers if they exist, then recreate them
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_categories_updated_at ON tag_categories;
CREATE TRIGGER update_tag_categories_updated_at
  BEFORE UPDATE ON tag_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tags in their organization" ON tags;
DROP POLICY IF EXISTS "Admins and owners can manage tags" ON tags;
DROP POLICY IF EXISTS "Agents can use tags" ON tags;
DROP POLICY IF EXISTS "Users can view contact tags in their organization" ON contact_tags;
DROP POLICY IF EXISTS "Users can manage contact tags in their organization" ON contact_tags;
DROP POLICY IF EXISTS "Users can view tag categories in their organization" ON tag_categories;
DROP POLICY IF EXISTS "Admins and owners can manage tag categories" ON tag_categories;

-- Tags RLS Policies
CREATE POLICY "Users can view tags in their organization" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can manage tags" ON tags
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Agents can use tags" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND is_active = true
  );

-- Contact Tags RLS Policies
CREATE POLICY "Users can view contact tags in their organization" ON contact_tags
  FOR SELECT USING (
    contact_id IN (
      SELECT c.id FROM contacts c
      JOIN profiles p ON p.organization_id = c.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contact tags in their organization" ON contact_tags
  FOR ALL USING (
    contact_id IN (
      SELECT c.id FROM contacts c
      JOIN profiles p ON p.organization_id = c.organization_id
      WHERE p.id = auth.uid()
    )
  );

-- Tag Categories RLS Policies
CREATE POLICY "Users can view tag categories in their organization" ON tag_categories
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can manage tag categories" ON tag_categories
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 7. FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to update tag usage count when assigned
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.tag_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_tags_usage_count_trigger ON contact_tags;
CREATE TRIGGER contact_tags_usage_count_trigger
  AFTER INSERT OR DELETE ON contact_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Function to get all tags for a contact
CREATE OR REPLACE FUNCTION get_contact_tags(contact_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  color_hex TEXT,
  color_class TEXT,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.color_hex,
    t.color_class,
    t.icon
  FROM tags t
  JOIN contact_tags ct ON ct.tag_id = t.id
  WHERE ct.contact_id = contact_uuid
    AND t.is_active = true
  ORDER BY t.sort_order, t.name;
END;
$$ LANGUAGE plpgsql;

-- Function to assign multiple tags to a contact
CREATE OR REPLACE FUNCTION assign_tags_to_contact(
  contact_uuid UUID,
  tag_ids UUID[],
  assigned_by_uuid UUID DEFAULT auth.uid()
)
RETURNS INTEGER AS $$
DECLARE
  tag_id UUID;
  inserted_count INTEGER := 0;
BEGIN
  FOREACH tag_id IN ARRAY tag_ids
  LOOP
    INSERT INTO contact_tags (contact_id, tag_id, assigned_by)
    VALUES (contact_uuid, tag_id, assigned_by_uuid)
    ON CONFLICT (contact_id, tag_id) DO NOTHING;

    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove tags from a contact
CREATE OR REPLACE FUNCTION remove_tags_from_contact(
  contact_uuid UUID,
  tag_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM contact_tags
  WHERE contact_id = contact_uuid
    AND tag_id = ANY(tag_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tag statistics for an organization
CREATE OR REPLACE FUNCTION get_tag_statistics(org_uuid UUID)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_color TEXT,
  usage_count BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.color_hex,
    COUNT(ct.id),
    MAX(ct.assigned_at)
  FROM tags t
  LEFT JOIN contact_tags ct ON ct.tag_id = t.id
  WHERE t.organization_id = org_uuid
    AND t.is_active = true
  GROUP BY t.id, t.name, t.color_hex
  ORDER BY COUNT(ct.id) DESC, t.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. INSERT DEFAULT TAGS FOR EACH ORGANIZATION
-- ============================================================================

-- Insert default tags that match the previous AVAILABLE_TAGS
INSERT INTO tags (organization_id, name, description, color_hex, color_class, sort_order)
SELECT
  o.id,
  default_tag.name,
  default_tag.description,
  default_tag.color_hex,
  default_tag.color_class,
  default_tag.sort_order
FROM organizations o
CROSS JOIN (
  VALUES
    ('VIP', 'Very Important Person', '#8B5CF6', 'bg-purple-100 text-purple-800', 1),
    ('Potential Client', 'Leads being nurtured', '#3B82F6', 'bg-blue-100 text-blue-800', 2),
    ('Active Lead', 'Engaged and responsive leads', '#10B981', 'bg-green-100 text-green-800', 3),
    ('Marketing', 'Marketing campaign contacts', '#F59E0B', 'bg-orange-100 text-orange-800', 4),
    ('Startup', 'Startup company contacts', '#EC4899', 'bg-pink-100 text-pink-800', 5),
    ('Tech', 'Technology sector contacts', '#6366F1', 'bg-indigo-100 text-indigo-800', 6),
    ('Enterprise', 'Enterprise-level contacts', '#6B7280', 'bg-gray-100 text-gray-800', 7)
) AS default_tag(name, description, color_hex, color_class, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM tags
  WHERE organization_id = o.id AND name = default_tag.name
);

-- ============================================================================
-- 9. CREATE DEFAULT TAG CATEGORIES
-- ============================================================================

INSERT INTO tag_categories (organization_id, name, description, sort_order)
SELECT
  o.id,
  category.name,
  category.description,
  category.sort_order
FROM organizations o
CROSS JOIN (
  VALUES
    ('Customer Type', 'Tags for categorizing customer types and priorities', 1),
    ('Industry', 'Tags for industry and business sector', 2),
    ('Status', 'Tags for lead and customer status', 3),
    ('Campaign', 'Tags for marketing campaigns and sources', 4)
) AS category(name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM tag_categories
  WHERE organization_id = o.id AND name = category.name
);

-- Assign tags to their appropriate categories
UPDATE tags SET category_id = (
  SELECT id FROM tag_categories
  WHERE organization_id = tags.organization_id
    AND name = 'Customer Type'
  LIMIT 1
) WHERE name IN ('VIP', 'Potential Client', 'Active Lead', 'Enterprise')
  AND category_id IS NULL;

UPDATE tags SET category_id = (
  SELECT id FROM tag_categories
  WHERE organization_id = tags.organization_id
    AND name = 'Industry'
  LIMIT 1
) WHERE name IN ('Tech', 'Startup')
  AND category_id IS NULL;

UPDATE tags SET category_id = (
  SELECT id FROM tag_categories
  WHERE organization_id = tags.organization_id
    AND name = 'Campaign'
  LIMIT 1
) WHERE name IN ('Marketing')
  AND category_id IS NULL;

-- ============================================================================
-- 10. OPTIONAL: VIEW FOR EASY TAG QUERIES
-- ============================================================================

-- Drop view if exists, then create it
DROP VIEW IF EXISTS contact_tags_view;
CREATE OR REPLACE VIEW contact_tags_view AS
SELECT
  c.id AS contact_id,
  c.organization_id,
  c.name AS contact_name,
  c.phone_number,
  t.id AS tag_id,
  t.name AS tag_name,
  t.color_hex AS tag_color_hex,
  t.color_class AS tag_color_class,
  t.icon AS tag_icon,
  ct.assigned_at,
  ct.assigned_by,
  p.full_name AS assigned_by_name
FROM contacts c
LEFT JOIN contact_tags ct ON ct.contact_id = c.id
LEFT JOIN tags t ON t.id = ct.tag_id AND t.is_active = true
LEFT JOIN profiles p ON p.id = ct.assigned_by
WHERE c.is_blocked = false;

-- RLS for view (inherits from base tables)
ALTER VIEW contact_tags_view SET (security_invoker = true);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Tags Management System migration completed successfully';
  RAISE NOTICE 'Created tables: tags, contact_tags, tag_categories';
  RAISE NOTICE 'Created functions: update_tag_usage_count, get_contact_tags, assign_tags_to_contact, remove_tags_from_contact, get_tag_statistics';
  RAISE NOTICE 'Inserted default tags and categories for all organizations';
END $$;
