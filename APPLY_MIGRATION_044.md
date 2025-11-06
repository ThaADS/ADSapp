# Apply Migration 044: Automation Routing Tables

## Method 1: Via Supabase Dashboard SQL Editor (Recommended)

### Step 1: Open SQL Editor
1. Go to: https://app.supabase.com/project/egaiyydjgeqlhthxmvbn/sql
2. Click "New query"

### Step 2: Copy Migration SQL
Copy the contents of: `supabase/migrations/044_automation_routing_tables.sql`

### Step 3: Execute Migration
1. Paste the SQL into the editor
2. Click "Run" button
3. Verify: "Success. No rows returned"

### Step 4: Verify Tables Created
Run this query to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agent_capacity', 'routing_rules', 'conversation_queue', 'routing_history')
ORDER BY table_name;
```

Expected output:
```
agent_capacity
conversation_queue
routing_history
routing_rules
```

### Step 5: Verify RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('agent_capacity', 'routing_rules', 'conversation_queue', 'routing_history')
ORDER BY tablename, policyname;
```

Expected: 4 rows (one policy per table)

---

## Method 2: Via Supabase CLI (If Logged In)

### Prerequisites
```bash
# Login to Supabase (opens browser)
npx supabase login

# Link project
npx supabase link --project-ref egaiyydjgeqlhthxmvbn
```

### Apply Migration
```bash
# Push migration to remote database
npx supabase db push

# Or apply specific migration
npx supabase migration up --db-url "postgresql://postgres:[PASSWORD]@db.egaiyydjgeqlhthxmvbn.supabase.co:5432/postgres"
```

---

## Method 3: Direct PostgreSQL Connection

### Connection String
```
postgresql://postgres:[DATABASE_PASSWORD]@db.egaiyydjgeqlhthxmvbn.supabase.co:5432/postgres
```

Replace `[DATABASE_PASSWORD]` with your database password.

### Apply with psql
```bash
psql "postgresql://postgres:[PASSWORD]@db.egaiyydjgeqlhthxmvbn.supabase.co:5432/postgres" < supabase/migrations/044_automation_routing_tables.sql
```

---

## After Migration: Update TypeScript Types

Once migration is applied successfully, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id egaiyydjgeqlhthxmvbn > src/types/database.ts
```

Or manually via dashboard:
1. Go to: https://app.supabase.com/project/egaiyydjgeqlhthxmvbn/api
2. Scroll to "Generate Types"
3. Copy TypeScript types
4. Update `src/types/database.ts`

---

## Verification Checklist

After applying migration, verify:

- [ ] 4 new tables created (agent_capacity, routing_rules, conversation_queue, routing_history)
- [ ] RLS policies enabled on all 4 tables
- [ ] Indexes created for performance
- [ ] Triggers created for updated_at columns
- [ ] Foreign key constraints working
- [ ] TypeScript types regenerated

---

## Rollback (If Needed)

If migration causes issues, rollback with:

```sql
DROP TABLE IF EXISTS routing_history CASCADE;
DROP TABLE IF EXISTS conversation_queue CASCADE;
DROP TABLE IF EXISTS routing_rules CASCADE;
DROP TABLE IF EXISTS agent_capacity CASCADE;

DROP FUNCTION IF EXISTS update_agent_capacity_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_routing_rules_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_queue_updated_at() CASCADE;
```

---

## Migration Impact

### New Capabilities
✅ Intelligent conversation routing
✅ Agent capacity tracking
✅ Load balancing
✅ Queue management
✅ Routing analytics

### Breaking Changes
❌ None - all new tables, no existing schema changes

### Performance Impact
🟢 Minimal - indexes created for all common queries
🟢 RLS policies use efficient organization_id lookups

---

## Next Steps After Migration

1. **Remove Type Assertions**: Update `src/lib/automation/load-balancer.ts` to remove `as any` casts
2. **Remove ESLint Disable**: Remove `/* eslint-disable @typescript-eslint/no-explicit-any */` comments
3. **Test Routing**: Create test data and verify routing strategies work
4. **Seed Initial Data**: Add default routing rules for existing organizations

---

## Seed Default Data (Optional)

After migration, optionally seed default capacity for all agents:

```sql
-- Create default agent capacity for all existing agents
INSERT INTO agent_capacity (organization_id, agent_id, max_concurrent_conversations, auto_assign_enabled, status)
SELECT
  p.organization_id,
  p.id as agent_id,
  5 as max_concurrent_conversations,
  true as auto_assign_enabled,
  'available' as status
FROM profiles p
WHERE p.role IN ('owner', 'admin', 'agent')
ON CONFLICT (organization_id, agent_id) DO NOTHING;

-- Create default routing rule for each organization
INSERT INTO routing_rules (organization_id, rule_name, is_active, priority, strategy, created_by)
SELECT
  DISTINCT p.organization_id,
  'Default Load Balancer' as rule_name,
  true as is_active,
  1 as priority,
  'least_loaded' as strategy,
  (SELECT id FROM profiles WHERE organization_id = p.organization_id AND role = 'owner' LIMIT 1) as created_by
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, rule_name) DO NOTHING;
```

---

**Ready to apply? Choose Method 1 (Dashboard) for simplest approach!**
