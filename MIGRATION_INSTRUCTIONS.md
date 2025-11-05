# Migration 037: Team Invitations & API Keys - Application Instructions

## Problem Solved
The original migration had a type compatibility issue. The **FIXED** version includes diagnostic queries and better error handling.

## Apply Migration Manually

Since DDL statements cannot be executed via the Supabase JS client or connection pooler, you need to apply this migration through the Supabase Dashboard.

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn
   - Login if needed

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration SQL**
   - Open: `supabase/migrations/037_team_invitations_FIXED.sql`
   - Copy the ENTIRE contents (all 395 lines)

4. **Paste and Execute**
   - Paste the SQL into the query editor
   - Click "Run" button (or press Ctrl+Enter)

5. **Check for Success Messages**
   You should see:
   ```
   NOTICE: organizations.id type: uuid
   Success. No rows returned
   ```

6. **Verify Tables Created**
   Run this verification query in a new SQL Editor tab:
   ```sql
   -- Check tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name IN ('team_invitations', 'api_keys')
   AND table_schema = 'public';

   -- Check RLS is enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('team_invitations', 'api_keys');

   -- Check policies exist
   SELECT tablename, policyname
   FROM pg_policies
   WHERE tablename IN ('team_invitations', 'api_keys')
   ORDER BY tablename, policyname;
   ```

   Expected results:
   - 2 tables: `team_invitations`, `api_keys`
   - Both should have `rowsecurity = true`
   - 8 policies total (4 per table: select, insert, update, delete)

## What This Migration Creates

### Tables:
1. **team_invitations** - Stores pending team member invitations
   - Invitation tokens with expiry
   - Email-based invitations
   - Role assignment (admin/agent/viewer)
   - Acceptance/cancellation tracking

2. **api_keys** - API keys for programmatic access
   - Hashed keys (never stores plaintext)
   - Key prefix for identification
   - Usage tracking
   - Revocation support

### Security:
- Row Level Security (RLS) enabled on both tables
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- Multi-tenant isolation via organization_id
- Only owner/admin can manage invitations and keys

### Functions:
- `generate_invitation_token()` - Creates unique secure tokens
- `cleanup_expired_invitations()` - Removes expired invitations
- `log_invitation_event()` - Audit trail for invitations
- `log_api_key_event()` - Audit trail for API keys

### Triggers:
- Auto-update `updated_at` timestamps
- Automatic audit logging for all changes

## After Migration Success

Once the migration is applied successfully:

1. **Test Team Invitations**
   - Go to: http://localhost:3000/dashboard/settings/team
   - Try inviting a team member
   - Check that invitation is saved to database

2. **Test API Keys**
   - Go to: http://localhost:3000/dashboard/settings/integrations
   - Try creating an API key
   - Verify key is stored (hashed) in database

3. **Verify Audit Logs**
   ```sql
   SELECT * FROM audit_log
   WHERE resource_type IN ('team_invitation', 'api_key')
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Troubleshooting

### If you get type mismatch error again:
The diagnostic query at the top of the migration will show you the actual type:
```
NOTICE: organizations.id type: uuid
```

If it shows something OTHER than `uuid`, that's the root cause. Let me know what type it shows.

### If foreign key constraint fails:
Run this to check if organizations table exists and has the expected structure:
```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;
```

### If you need to retry:
The migration includes `DROP TABLE IF EXISTS` statements, so you can safely re-run it.

## Estimated Time
- **Copy/paste and execute**: 30 seconds
- **Verification queries**: 1 minute
- **Total**: < 2 minutes

## Next Steps After Migration
1. Test team invitation flow end-to-end
2. Test API key generation and usage
3. Verify email sending works (Resend API key is configured)
4. Check audit logs are being created
5. Test RLS policies with different user roles
