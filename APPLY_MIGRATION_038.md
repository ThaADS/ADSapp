# Apply Migration 038: Business Hours Storage

## Quick Apply (< 1 minute)

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new
   ```

2. **Copy & Paste**
   - Open: `supabase/migrations/038_business_hours_storage.sql`
   - Copy ALL (Ctrl+A, Ctrl+C)
   - Paste in SQL Editor (Ctrl+V)

3. **Run**
   - Click "Run" or press Ctrl+Enter

4. **Expected Result**
   ```
   ✅ business_hours column added
   ```

## What This Migration Does

### Adds to Database
- ✅ `business_hours` JSONB column to `organizations` table
- ✅ Validation function to ensure proper format
- ✅ Check constraint for data integrity

### Business Hours Format
```json
{
  "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
  "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
}
```

## After Migration

### Test the Feature
1. Navigate to: `http://localhost:3000/dashboard/settings/organization`
2. Scroll to "Business Hours" section
3. Modify hours for any day
4. Click "Save Business Hours"
5. Verify success message
6. Refresh page - hours should persist!

### Verify in Database
```sql
-- Check if column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name = 'business_hours';

-- View business hours for an organization
SELECT id, name, business_hours
FROM organizations
WHERE id = 'your-org-id';
```

## Rollback (If Needed)

```sql
-- Remove business hours column
ALTER TABLE organizations
DROP COLUMN IF EXISTS business_hours CASCADE;

-- Remove validation function
DROP FUNCTION IF EXISTS validate_business_hours(JSONB);
```

---

**Time**: < 1 minute
**Risk**: Low (additive only, no data modification)
**Impact**: Business hours now persist across sessions
