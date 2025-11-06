# Apply Migration 039: Organization Logos Storage

## Quick Apply (< 1 minute)

1. **Open Supabase SQL Editor**

   ```
   https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new
   ```

2. **Copy & Paste**
   - Open: `supabase/migrations/039_organization_logos_storage.sql`
   - Copy ALL (Ctrl+A, Ctrl+C)
   - Paste in SQL Editor (Ctrl+V)

3. **Run**
   - Click "Run" or press Ctrl+Enter

4. **Expected Result**
   ```
   ✅ organization-logos bucket created
   ✅ logo_url column added
   ```

## What This Migration Does

### Creates

- ✅ Supabase Storage bucket: `organization-logos`
- ✅ Storage policies for secure access
- ✅ `logo_url` column in `organizations` table
- ✅ Audit logging trigger for logo changes

### Storage Bucket Settings

```
Bucket: organization-logos
Public: Yes (for easy CDN access)
Max Size: 5MB per file
Allowed Types: JPEG, PNG, WebP, SVG
Path Structure: {organization_id}/logo.{ext}
```

### Security Policies

- ✅ Anyone (authenticated) can view logos
- ✅ Only owner/admin can upload logos
- ✅ Only owner/admin can update logos
- ✅ Only owner/admin can delete logos
- ✅ Multi-tenant isolation enforced

## After Migration

### Test Logo Upload

1. Navigate to: `http://localhost:3000/dashboard/settings/organization`
2. Scroll to "Organization Logo" section
3. Click "Upload Logo"
4. Select an image (PNG, JPG, WebP, or SVG)
5. Logo uploads and displays immediately
6. Click "Remove" to delete logo

### Verify in Storage

1. Go to Supabase Dashboard
2. Click "Storage" in sidebar
3. Open "organization-logos" bucket
4. Should see folder with your organization ID
5. Logo file inside folder

### Verify in Database

```sql
-- Check if bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'organization-logos';

-- Check logo URL
SELECT id, name, logo_url
FROM organizations
WHERE id = 'your-org-id';

-- Check audit log
SELECT * FROM audit_log
WHERE action = 'organization.logo_updated'
ORDER BY created_at DESC
LIMIT 5;
```

## Rollback (If Needed)

```sql
-- Remove logo URLs
ALTER TABLE organizations
DROP COLUMN IF EXISTS logo_url CASCADE;

-- Remove trigger
DROP TRIGGER IF EXISTS organization_logo_audit ON organizations;
DROP FUNCTION IF EXISTS log_logo_change();

-- Remove storage policies
DROP POLICY IF EXISTS "Anyone can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos for their organization" ON storage.objects;

-- Delete bucket (WARNING: Deletes all logos!)
DELETE FROM storage.buckets WHERE id = 'organization-logos';
```

---

**Time**: < 1 minute
**Risk**: Low (additive only, creates new resources)
**Impact**: Organizations can now upload and display custom logos
