-- ============================================================================
-- SIMPLIFIED TAGS MIGRATION - Part 1: Tables Only
-- ============================================================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT NOT NULL DEFAULT '#6B7280',
  color_class TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Add category column to tags if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_categories_organization_id ON tag_categories(organization_id);

-- 3. Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for tags
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view tags in their organization" ON tags;
  DROP POLICY IF EXISTS "Admins and owners can manage tags" ON tags;

  -- Create policies
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
END $$;

-- 5. Create RLS policies for contact_tags
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view contact tags in their organization" ON contact_tags;
  DROP POLICY IF EXISTS "Users can manage contact tags in their organization" ON contact_tags;

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
END $$;

-- 6. Create RLS policies for tag_categories
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view tag categories in their organization" ON tag_categories;
  DROP POLICY IF EXISTS "Admins and owners can manage tag categories" ON tag_categories;

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
END $$;

-- 7. Insert default tag categories
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

-- 8. Insert default tags
INSERT INTO tags (organization_id, name, description, color_hex, color_class, sort_order, category_id)
SELECT
  o.id,
  default_tag.name,
  default_tag.description,
  default_tag.color_hex,
  default_tag.color_class,
  default_tag.sort_order,
  (
    SELECT id FROM tag_categories tc
    WHERE tc.organization_id = o.id
      AND tc.name = default_tag.category_name
    LIMIT 1
  )
FROM organizations o
CROSS JOIN (
  VALUES
    ('VIP', 'Very Important Person', '#8B5CF6', 'bg-purple-100 text-purple-800', 1, 'Customer Type'),
    ('Potential Client', 'Leads being nurtured', '#3B82F6', 'bg-blue-100 text-blue-800', 2, 'Customer Type'),
    ('Active Lead', 'Engaged and responsive leads', '#10B981', 'bg-green-100 text-green-800', 3, 'Customer Type'),
    ('Marketing', 'Marketing campaign contacts', '#F59E0B', 'bg-orange-100 text-orange-800', 4, 'Campaign'),
    ('Startup', 'Startup company contacts', '#EC4899', 'bg-pink-100 text-pink-800', 5, 'Industry'),
    ('Tech', 'Technology sector contacts', '#6366F1', 'bg-indigo-100 text-indigo-800', 6, 'Industry'),
    ('Enterprise', 'Enterprise-level contacts', '#6B7280', 'bg-gray-100 text-gray-800', 7, 'Customer Type')
) AS default_tag(name, description, color_hex, color_class, sort_order, category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM tags
  WHERE organization_id = o.id AND name = default_tag.name
);
