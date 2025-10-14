# Route Testing Checklist ✅

## Pre-Flight Check

Before running the route tests, ensure:

### 1. Server Prerequisites

- [ ] Node.js installed (v18+)
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Database is running and accessible
- [ ] Environment variables configured (`.env.local`)

### 2. Test Users Exist

Verify these users are in your database:

- [ ] Owner: `owner@demo-company.com` (password: `Demo2024!Owner`)
- [ ] Admin: `admin@demo-company.com` (password: `Demo2024!Admin`)
- [ ] Agent: `agent@demo-company.com` (password: `Demo2024!Agent`)

**Quick Test:**
```bash
# Try logging in manually at http://localhost:3001/auth/signin
# Use each credential to verify they work
```

### 3. Server Running

- [ ] Development server started: `npm run dev`
- [ ] Server accessible at: `http://localhost:3001`
- [ ] No build errors in console

**Verify:**
```bash
curl http://localhost:3001
# Should return HTML (not error)
```

---

## Running the Tests

### Option 1: Full Audit (Recommended) ⭐

```bash
npm run test:routes:audit
```

**Expected duration:** 3-5 minutes
**What it does:** Tests all routes for all roles and generates complete reports

### Option 2: Individual Tests

```bash
# Test each role separately
npm run test:routes:owner    # ~1 min
npm run test:routes:admin    # ~1 min
npm run test:routes:agent    # ~1 min
npm run test:routes:404      # ~30 sec
```

### Option 3: All Tests Sequentially

```bash
npm run test:routes
```

**Expected duration:** 5-7 minutes
**What it does:** Runs all 5 test files one after another

---

## During Test Execution

### What to Watch For

#### ✅ Good Signs

```
✅ OK: /dashboard
✅ OK: /dashboard/inbox
✅ Properly blocked: /dashboard/settings/billing
```

#### ⚠️ Warning Signs

```
↪️ Redirected: /dashboard → /dashboard/inbox
```
**Note:** May be expected behavior

#### ❌ Problem Signs

```
❌ 404: /dashboard/some-route
⚠️ SECURITY ISSUE: Agent has access to /dashboard/analytics
⚠️ Error: Navigation timeout exceeded
```
**Action:** Note these for fixing

### Console Output Stages

1. **Initialization** (5-10 seconds)
   ```
   🔐 Starting Owner Route Testing...
   Logging in as owner@demo-company.com...
   ```

2. **Route Testing** (1-3 minutes per role)
   ```
   📋 Testing all routes...
   Testing: /dashboard
     ✅ OK: /dashboard
   ```

3. **Summary** (immediate)
   ```
   ============================================================
   📊 OWNER ROUTE TEST RESULTS
   ============================================================
   ✅ Working Routes: 14/14
   ```

4. **Final Report** (for full audit)
   ```
   📊 FINAL AUDIT REPORT
   Total Routes: 20
   Success Rate: 96.7%
   ```

---

## After Test Completion

### 1. Check Console Output

Look for:
- [ ] Overall success rate displayed
- [ ] List of broken routes (if any)
- [ ] Security issues (if any)
- [ ] Recommendations provided

### 2. Review Markdown Report

```bash
cat test-results/ROUTE_AUDIT_REPORT.md
```

Check:
- [ ] Success rate ≥ 90%
- [ ] Security issues = 0
- [ ] Broken routes listed
- [ ] Recommendations make sense

### 3. Examine Screenshots

```bash
ls test-results/screenshots/
# or on Windows:
dir test-results\screenshots\
```

Verify:
- [ ] Screenshots captured for all routes
- [ ] Pages look visually correct
- [ ] No obvious UI errors visible

### 4. View Playwright HTML Report (Optional)

```bash
npx playwright show-report
```

Review:
- [ ] All tests listed
- [ ] Pass/fail status clear
- [ ] Error details available (if any)

---

## Interpreting Results

### Perfect Score ✨

```
============================================================
📊 FINAL AUDIT REPORT
============================================================
Total Routes: 20
Total Tests: 60
✅ Successful: 60
❌ Failed: 0
⚠️ Security Issues: 0

Success Rate: 100.0%
============================================================

💡 RECOMMENDATIONS:
   - All routes are working correctly with proper access control!
```

**Action:** 🎉 Nothing to do! Everything works perfectly.

---

### Good Score ✅

```
============================================================
📊 FINAL AUDIT REPORT
============================================================
Total Routes: 20
Total Tests: 60
✅ Successful: 56
❌ Failed: 4
⚠️ Security Issues: 0

Success Rate: 93.3%
============================================================

❌ BROKEN ROUTES (404 Errors):
   - /dashboard/some-old-feature

💡 RECOMMENDATIONS:
   - Fix 1 broken routes that return 404 errors
```

**Action:** Fix the listed broken routes, then re-run tests.

---

### Needs Attention ⚠️

```
============================================================
📊 FINAL AUDIT REPORT
============================================================
Total Routes: 20
Total Tests: 60
✅ Successful: 48
❌ Failed: 12
⚠️ Security Issues: 2

Success Rate: 80.0%
============================================================

❌ BROKEN ROUTES (404 Errors):
   - /dashboard/feature1
   - /dashboard/feature2
   - /dashboard/settings/feature3

⚠️ SECURITY ISSUES:
   - AGENT: Agent should not have access to /dashboard/analytics
   - ADMIN: Admin should not have access to /dashboard/settings/billing

💡 RECOMMENDATIONS:
   - Fix 3 broken routes that return 404 errors
   - Address 2 security issues with role-based access control
```

**Action:**
1. Fix security issues IMMEDIATELY (critical)
2. Fix broken routes
3. Re-run tests to verify fixes

---

### Critical Issues 🚨

```
============================================================
📊 FINAL AUDIT REPORT
============================================================
Total Routes: 20
Total Tests: 60
✅ Successful: 30
❌ Failed: 30
⚠️ Security Issues: 5

Success Rate: 50.0%
============================================================

❌ Many routes returning 404
⚠️ Multiple security violations detected
```

**Action:**
1. **STOP** - Do not deploy
2. Review application routing structure
3. Check middleware configuration
4. Verify database and auth system
5. Fix all issues before proceeding

---

## Fixing Common Issues

### Issue: Login Failures

**Symptom:**
```
❌ Failed to login as owner@demo-company.com
```

**Solutions:**
1. Verify user exists in database
2. Check password is correct
3. Test login manually in browser
4. Check authentication API is working

**Quick Fix:**
```sql
-- Run in Supabase SQL editor
SELECT email FROM profiles WHERE email LIKE '%demo-company.com';
-- Verify all 3 test users exist
```

---

### Issue: Many 404 Errors

**Symptom:**
```
❌ 404: /dashboard/inbox
❌ 404: /dashboard/contacts
❌ 404: /dashboard/templates
```

**Solutions:**
1. Check Next.js file structure:
   ```bash
   ls src/app/dashboard/
   # Verify page.tsx files exist for each route
   ```

2. Check for build errors:
   ```bash
   npm run type-check
   npm run build
   ```

3. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Issue: Security Problems

**Symptom:**
```
⚠️ SECURITY ISSUE: Agent has access to /dashboard/analytics
```

**Solutions:**
1. Check middleware in `src/middleware.ts`
2. Verify role checks in page components
3. Review RLS policies in Supabase
4. Check `getServerSideProps` or similar auth guards

**Example Fix:**
```typescript
// In src/app/dashboard/analytics/page.tsx
export default async function AnalyticsPage() {
  const { user, role } = await getCurrentUser();

  // Add role check
  if (role === 'agent') {
    redirect('/dashboard');
  }

  // ... rest of page
}
```

---

### Issue: Timeout Errors

**Symptom:**
```
⚠️ Error: Navigation timeout exceeded
```

**Solutions:**
1. Check server is running and responsive
2. Look for slow database queries
3. Check for infinite loops in page rendering
4. Increase timeout in test files if needed

---

### Issue: Screenshots Not Captured

**Symptom:**
```bash
ls test-results/screenshots/
# Directory empty or missing
```

**Solutions:**
1. Check disk space
2. Verify write permissions
3. Run test again (directory auto-creates)

**Manual Fix:**
```bash
mkdir -p test-results/screenshots
chmod 755 test-results/screenshots
```

---

## Re-running Tests After Fixes

### Step 1: Make Your Fixes
- Fix broken routes
- Address security issues
- Resolve errors

### Step 2: Verify Locally
```bash
# Check the fixed routes manually
# Navigate to them in your browser
# Verify they work as expected
```

### Step 3: Re-run Tests
```bash
npm run test:routes:audit
```

### Step 4: Confirm Success
- [ ] Success rate improved
- [ ] Security issues = 0
- [ ] Broken routes fixed
- [ ] No new errors introduced

---

## Success Criteria

### Minimum Acceptable

- ✅ Success rate ≥ 90%
- ✅ Security issues = 0
- ✅ Critical routes working (dashboard, inbox, contacts)

### Production-Ready

- ✅ Success rate ≥ 95%
- ✅ Security issues = 0
- ✅ Broken routes < 5%
- ✅ All core features accessible

### Perfect Score

- ✅ Success rate = 100%
- ✅ Security issues = 0
- ✅ Broken routes = 0
- ✅ All routes work for all roles

---

## Final Checklist

Before marking route testing as complete:

- [ ] All tests executed successfully
- [ ] Reports generated without errors
- [ ] Success rate meets minimum criteria (≥90%)
- [ ] No security issues detected
- [ ] Broken routes documented and fixed
- [ ] Screenshots reviewed for visual correctness
- [ ] Test results committed to repository
- [ ] Team notified of any issues

---

## Next Steps

### If All Tests Pass ✅

1. [ ] Commit test results to git
2. [ ] Document any expected redirects
3. [ ] Add tests to CI/CD pipeline
4. [ ] Schedule regular test runs
5. [ ] Consider deploying to staging/production

### If Tests Fail ❌

1. [ ] Review this checklist
2. [ ] Fix reported issues
3. [ ] Re-run tests
4. [ ] Do NOT deploy until tests pass
5. [ ] Seek help if stuck (see troubleshooting)

---

## Quick Command Reference

```bash
# Preparation
npm install
npx playwright install
npm run dev

# Run tests
npm run test:routes:audit       # Full audit (recommended)
npm run test:routes:owner        # Owner only
npm run test:routes:admin        # Admin only
npm run test:routes:agent        # Agent only
npm run test:routes:404          # 404 checker

# View results
cat test-results/ROUTE_AUDIT_REPORT.md
ls test-results/screenshots/
npx playwright show-report

# Troubleshooting
curl http://localhost:3001       # Check server
npm run type-check               # Check TypeScript
npm run build                    # Check build
```

---

## Support Resources

1. **Documentation**
   - Quick Start: `ROUTE_TESTING_GUIDE.md`
   - Full Docs: `tests/e2e/ROUTE_TESTING_README.md`
   - Architecture: `test-results/TEST_ARCHITECTURE.md`

2. **Test Output**
   - Console output (real-time feedback)
   - Markdown report (human-readable summary)
   - JSON report (machine-readable data)
   - Screenshots (visual evidence)

3. **External Help**
   - Playwright docs: https://playwright.dev
   - Next.js docs: https://nextjs.org/docs
   - Project README: `README.md`

---

## Time Estimates

| Task | Duration |
|------|----------|
| Setup (first time) | 5-10 min |
| Run full audit | 3-5 min |
| Review results | 2-5 min |
| Fix issues | Varies |
| Re-run tests | 3-5 min |
| **Total (first run)** | **15-30 min** |

---

**Ready to test?**

✅ Check off all items in "Pre-Flight Check" above
✅ Run: `npm run test:routes:audit`
✅ Review results and fix any issues
✅ Re-run until perfect! 🎯

---

**Last Updated:** 2025-09-30
**Version:** 1.0.0
**Status:** Ready to use ✅