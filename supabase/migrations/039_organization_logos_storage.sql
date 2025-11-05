-- Migration: Organization Logos Storage
-- Created: 2025-10-20
-- Purpose: Set up Supabase Storage for organization logos

-- =============================================
-- 1. CREATE STORAGE BUCKET
-- =============================================

-- Create bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true, -- Public bucket for easy access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. STORAGE POLICIES
-- =============================================

-- Allow authenticated users to view all logos
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow users to upload logos for their organization
CREATE POLICY "Users can upload logos for their organization"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations
    WHERE id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Allow users to update logos for their organization
CREATE POLICY "Users can update logos for their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations
    WHERE id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- Allow users to delete logos for their organization
CREATE POLICY "Users can delete logos for their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations
    WHERE id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- 3. ADD LOGO_URL COLUMN TO ORGANIZATIONS
-- =============================================

-- Add logo_url column to store the public URL
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- =============================================
-- 4. HELPER FUNCTION
-- =============================================

-- Function to generate logo public URL
CREATE OR REPLACE FUNCTION get_organization_logo_url(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  logo_path TEXT;
  base_url TEXT;
BEGIN
  -- Get the Supabase project URL
  base_url := current_setting('app.settings.supabase_url', true);

  -- Check if organization has a logo
  SELECT logo_url INTO logo_path
  FROM organizations
  WHERE id = org_id;

  IF logo_path IS NOT NULL THEN
    RETURN logo_path;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. AUDIT LOGGING
-- =============================================

-- Trigger for logo changes
CREATE OR REPLACE FUNCTION log_logo_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
    INSERT INTO audit_log (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      NEW.id::TEXT,
      'organization.logo_updated',
      'organization',
      NEW.id::TEXT,
      jsonb_build_object(
        'old_logo_url', OLD.logo_url,
        'new_logo_url', NEW.logo_url
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER organization_logo_audit
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_logo_change();

-- =============================================
-- 6. COMMENTS
-- =============================================

COMMENT ON COLUMN organizations.logo_url IS 'Public URL of the organization logo stored in Supabase Storage';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Verify bucket was created
SELECT 'organization-logos bucket created' AS status
WHERE EXISTS (
  SELECT 1 FROM storage.buckets
  WHERE id = 'organization-logos'
);

-- Verify column was added
SELECT 'logo_url column added' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'organizations'
  AND column_name = 'logo_url'
);
