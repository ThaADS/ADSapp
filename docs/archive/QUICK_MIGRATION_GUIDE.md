# Quick Migration Guide - Missing Tables

**Status**: ✅ Ready for immediate application
**Risk**: Low (idempotent, non-destructive)
**Time**: ~5 seconds execution

---

## Quick Start (Recommended Method)

### Step 1: Copy SQL Script

Open: `database-scripts/APPLY_MISSING_TABLES.sql`

### Step 2: Apply in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Paste entire script
3. Click "Run"
4. Look for: `✓✓✓ MISSING TABLES MIGRATION COMPLETED SUCCESSFULLY ✓✓✓`

### Step 3: Verify

Should see output:

```
✓ Tables created: 7 (expected: 7)
✓ Indexes created: ~43 (expected: ~43)
✓ RLS policies created: ~19 (expected: ~19)
✓ Update triggers created: 4 (expected: 4)
```

### Step 4: Remove TODOs

1. `src/app/api/analytics/performance/route.ts` (lines 36-45, 154-204)
2. `src/app/api/analytics/reports/route.ts` (lines 95-137, 408-422)
3. `src/app/api/auth/mfa/enroll/route.ts` (lines 53-59)

---

## Tables Created

1. ✅ **performance_analytics** - Web Vitals & API performance (6 indexes, 2 RLS)
2. ✅ **scheduled_reports** - Report automation (5 indexes, 4 RLS)
3. ✅ **audit_logs** - Security logging (8 indexes, 2 RLS)
4. ✅ **invoices** - Billing records (7 indexes, 2 RLS)
5. ✅ **subscription_changes** - Subscription history (5 indexes, 3 RLS)
6. ✅ **usage_tracking** - Resource monitoring (6 indexes, 3 RLS)
7. ✅ **message_templates** - WhatsApp templates (6 indexes, 4 RLS)

---

## Files Delivered

1. **supabase/migrations/20251014_missing_tables.sql** (26KB)
   - Official migration file for Supabase CLI

2. **database-scripts/APPLY_MISSING_TABLES.sql** (26KB) ⭐ USE THIS
   - Supabase SQL Editor compatible (recommended)
   - Idempotent with safety checks
   - Detailed progress notifications

3. **database-scripts/MISSING_TABLES_DOCUMENTATION.md** (23KB)
   - Complete schema documentation
   - Use cases and examples
   - Integration guide

4. **AGENT_4_MISSING_TABLES_REPORT.md** (22KB)
   - Executive summary
   - Technical specifications
   - Post-migration checklist

---

## Safety Features

✅ Idempotent (safe to run multiple times)
✅ Non-destructive (only creates, never drops)
✅ Validates prerequisites (helper functions, baseline tables)
✅ Detailed error messages for troubleshooting
✅ Auto-committed by Supabase (no manual commit needed)

---

## Need Help?

**Migration Issues**: See `MISSING_TABLES_DOCUMENTATION.md` → Troubleshooting section
**Integration Questions**: See `AGENT_4_MISSING_TABLES_REPORT.md` → Integration Points
**Full Details**: See complete documentation in database-scripts folder

---

**Ready?** Copy `database-scripts/APPLY_MISSING_TABLES.sql` → Paste in Supabase SQL Editor → Click Run → Done! 🚀
