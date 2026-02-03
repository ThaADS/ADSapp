-- Migration: Create media storage bucket for WhatsApp media files
-- This bucket stores all media received from and sent to WhatsApp contacts

-- ============================================================================
-- 1. CREATE STORAGE BUCKET FOR MEDIA
-- ============================================================================

-- Create bucket for WhatsApp media files (images, videos, audio, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- Public access for displaying in chat
  104857600,  -- 100 MB max (for large documents)
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Videos
    'video/mp4',
    'video/3gpp',
    -- Audio
    'audio/aac',
    'audio/mp4',
    'audio/mpeg',
    'audio/amr',
    'audio/ogg',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORAGE POLICIES - Multi-tenant isolation
-- ============================================================================

-- Policy: Allow authenticated users to upload to their organization folder
CREATE POLICY "Users can upload media to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  -- Path must start with user's organization_id
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Allow users to view media from their organization
CREATE POLICY "Users can view media from their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Allow public access for display in chat (since bucket is public)
CREATE POLICY "Public can view media files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Policy: Allow users to delete media from their organization
CREATE POLICY "Users can delete media from their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Service role can do anything (for cleanup jobs, webhooks)
CREATE POLICY "Service role has full access to media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- ============================================================================
-- 3. CREATE WHATSAPP-MEDIA BUCKET (legacy support)
-- ============================================================================

-- Some code references 'whatsapp-media' bucket, create for compatibility
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  104857600,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/3gpp',
    'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies for whatsapp-media bucket (same as media bucket)
CREATE POLICY "Users can upload to whatsapp-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view whatsapp-media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whatsapp-media' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Public can view whatsapp-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Users can delete whatsapp-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-media' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role full access whatsapp-media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'whatsapp-media')
WITH CHECK (bucket_id = 'whatsapp-media');

-- ============================================================================
-- 4. HELPER FUNCTION FOR STORAGE QUOTA
-- ============================================================================

-- Function to calculate storage usage per organization
CREATE OR REPLACE FUNCTION get_organization_storage_usage(org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size_bytes), 0)
  INTO total_size
  FROM media_files
  WHERE organization_id = org_id;

  RETURN total_size;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_storage_usage(UUID) TO authenticated;
