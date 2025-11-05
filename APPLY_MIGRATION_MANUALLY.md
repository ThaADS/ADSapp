# Manual Migration Apply Instructions

## Supabase Client Cannot Execute DDL

De Supabase JavaScript client kan geen DDL statements (CREATE TABLE, etc.) uitvoeren via RPC calls. Dit moet handmatig via de Supabase Dashboard.

## **Apply Migration: 037_team_invitations.sql**

### Method 1: Supabase Dashboard SQL Editor (RECOMMENDED)

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn
   ```

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy Migration SQL:**
   - Open: `supabase/migrations/037_team_invitations.sql`
   - Copy ENTIRE contents (10.72 KB)

4. **Paste and Execute:**
   - Paste SQL into query editor
   - Click "Run" button
   - Wait for completion (~5-10 seconds)

5. **Verify Tables Created:**
   ```sql
   -- Run this to verify:
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('team_invitations', 'api_keys');
   ```

   Expected output:
   ```
   team_invitations
   api_keys
   ```

### Method 2: psql Command Line

If you have psql installed:

```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/037_team_invitations.sql
```

Replace:
- `[PROJECT-REF]`: Your project reference
- `[PASSWORD]`: Your database password

### What This Migration Creates

**Tables:**
1. `team_invitations` - Stores pending team member invitations
   - Tracks email, role, token, expiry
   - Audit trail for accepted/cancelled invitations

2. `api_keys` - Stores API keys for programmatic access
   - Hashed keys (security)
   - Last used tracking
   - Soft delete (revoked_at)

**Security:**
- Row Level Security (RLS) enabled on both tables
- Organization-level isolation (users only see their org data)
- Role-based access (owner/admin can invite/manage)

**Helpers:**
- `generate_invitation_token()` - Creates unique invitation tokens
- `cleanup_expired_invitations()` - Removes expired invitations
- Audit logging triggers for all events

## After Migration

### Test Team Invitations

1. Login as owner: `owner@demo-company.com` / `Demo2024!Owner`
2. Go to Settings → Team
3. Click "Invite Member"
4. Enter email and select role
5. Click "Send Invitation"
6. Should see invitation in "Pending Invitations" list

### Test API Keys

1. Go to Settings → Integrations
2. Scroll to "API Keys" section
3. Click "Generate New Key"
4. Enter name
5. Click "Generate"
6. Should see new key with copy functionality

## Troubleshooting

### "permission denied for table"
- RLS policies not applied correctly
- Re-run migration or check Supabase logs

### "relation does not exist"
- Tables not created
- Check migration execution logs
- Verify you're running on correct database

### "function does not exist"
- Helper functions not created
- Verify update_updated_at_column() exists (from previous migrations)

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP FUNCTION IF EXISTS generate_invitation_token();
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
DROP FUNCTION IF EXISTS log_invitation_event();
DROP FUNCTION IF EXISTS log_api_key_event();
```

---

**Created:** 2025-10-20
**Migration File:** `supabase/migrations/037_team_invitations.sql`
**Size:** 10.72 KB (43 SQL statements)
