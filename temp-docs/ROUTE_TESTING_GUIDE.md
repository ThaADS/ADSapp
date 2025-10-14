# Route Testing Quick Start Guide

## 🎯 What This Does

Tests **every route** in your application for **all user roles** to ensure:
- ✅ Pages load without 404 errors
- 🔒 Unauthorized users can't access restricted pages
- 📊 Complete audit report with actionable recommendations

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Server
```bash
npm run dev
```
Wait for: `✓ Ready on http://localhost:3001`

### Step 2: Run the Full Audit
```bash
npm run test:routes:audit
```

### Step 3: Review the Results
```bash
# Check the markdown report
cat test-results/ROUTE_AUDIT_REPORT.md

# Or view screenshots
ls test-results/screenshots/
```

## 📊 What Gets Tested

### User Roles & Routes

| Role | Routes Tested | Restrictions |
|------|--------------|--------------|
| **Owner** | 14 routes | Full access including billing |
| **Admin** | 13 routes | No billing access |
| **Agent** | 6 routes | Only inbox & contacts |

### Test Coverage

```
✅ Dashboard routes (all roles)
✅ Settings pages (role-based)
✅ Access control (RBAC)
✅ 404 error handling
✅ Authentication redirects
✅ Invalid route handling
```

## 📁 Generated Reports

After running tests, you'll get:

1. **Console Output** - Real-time test results
2. **JSON Report** - `test-results/route-audit.json`
3. **Markdown Report** - `test-results/ROUTE_AUDIT_REPORT.md` ⭐
4. **Screenshots** - `test-results/screenshots/` (every page)
5. **HTML Report** - `playwright-report/index.html`

## 🎨 Example Output

```
============================================================
📊 FINAL AUDIT REPORT
============================================================
Total Routes: 20
Total Tests: 60
✅ Successful: 58
❌ Failed: 2
⚠️  Security Issues: 0

Success Rate: 96.7%

❌ BROKEN ROUTES (404 Errors):
   - /dashboard/some-missing-page

💡 RECOMMENDATIONS:
   - Fix 1 broken routes that return 404 errors
============================================================
```

## 🧪 Individual Test Commands

```bash
# Test specific roles
npm run test:routes:owner    # Owner routes only
npm run test:routes:admin    # Admin routes only
npm run test:routes:agent    # Agent routes only

# Test 404 handling
npm run test:routes:404      # Public/protected/invalid routes

# Full audit (recommended)
npm run test:routes:audit    # All roles + reports

# Run all tests
npm run test:routes          # Everything
```

## 📋 Test Files Created

| File | Purpose |
|------|---------|
| `tests/e2e/11-owner-complete-flow.spec.ts` | Owner routes |
| `tests/e2e/12-admin-complete-flow.spec.ts` | Admin routes + restrictions |
| `tests/e2e/13-agent-complete-flow.spec.ts` | Agent routes + restrictions |
| `tests/e2e/14-route-404-checker.spec.ts` | 404 error handling |
| `tests/e2e/15-full-route-audit.spec.ts` | Complete audit ⭐ |

## 🔍 Understanding Results

### ✅ Success - Route works correctly
```
✅ OK: /dashboard/inbox
```

### ❌ 404 Error - Route is broken
```
❌ 404: /dashboard/nonexistent
```
**Action:** Fix the route or remove broken links

### ↪️ Redirect - Expected behavior
```
↪️ Redirected: /dashboard → /dashboard/inbox
```
**Note:** This may be intentional (e.g., default page redirect)

### 🔒 Access Denied - Security working
```
✅ Properly blocked: /dashboard/settings/billing
```
**Good!** Role-based access control is working

### ⚠️ Security Issue - Needs fixing
```
⚠️ SECURITY ISSUE: Agent has access to /dashboard/settings/billing
```
**Action:** Fix role permissions immediately

## 🛠️ Troubleshooting

### Server Not Running
```bash
# Error: Navigation timeout exceeded

# Solution:
npm run dev
# Wait for "Ready on http://localhost:3001"
```

### Login Failures
```bash
# Error: Failed to login as owner@demo-company.com

# Solution: Verify test users exist
# - owner@demo-company.com (Demo2024!Owner)
# - admin@demo-company.com (Demo2024!Admin)
# - agent@demo-company.com (Demo2024!Agent)
```

### Playwright Not Installed
```bash
# Error: Command not found: playwright

# Solution:
npm install @playwright/test
npx playwright install
```

### Many 404 Errors
```bash
# Check for build errors
npm run type-check
npm run build

# Check Next.js file structure
# Ensure files exist in src/app/ matching routes
```

## 📈 Success Metrics

Aim for these targets:

| Metric | Target | Current |
|--------|--------|---------|
| Overall Success Rate | ≥ 90% | Run test to see |
| Security Issues | 0 | Run test to see |
| Broken Routes | < 5% | Run test to see |

## 🎯 When to Run These Tests

### Before Deploying
```bash
npm run test:routes:audit
# Ensure all routes work in production
```

### After Adding Routes
```bash
npm run test:routes:audit
# Verify new routes are accessible
```

### When Changing Permissions
```bash
npm run test:routes:audit
# Ensure RBAC still works correctly
```

### Regular Monitoring
```bash
# Weekly or after major changes
npm run test:routes:audit
```

## 📸 Screenshots

Every route is captured as a screenshot:

```bash
# View all screenshots
ls test-results/screenshots/

# Examples:
# - owner-dashboard.png
# - admin-dashboard-contacts.png
# - agent-dashboard-inbox.png
```

## 📊 Viewing the HTML Report

```bash
# After running tests
npx playwright show-report

# Opens browser with detailed report
# - Test results by file
# - Execution timeline
# - Error details with screenshots
# - Console logs
```

## 🔄 Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/route-tests.yml
- name: Run Route Tests
  run: |
    npm run dev &
    sleep 10
    npm run test:routes:audit
```

## 💡 Tips

1. **Run full audit first** to get baseline
2. **Check screenshots** for visual issues
3. **Fix 404s immediately** - they indicate broken links
4. **Monitor security issues** - unauthorized access is critical
5. **Update tests** when adding new routes

## 📚 Detailed Documentation

For comprehensive information, see:
- `tests/e2e/ROUTE_TESTING_README.md` - Complete documentation
- `test-results/ROUTE_AUDIT_REPORT.md` - Latest test results

## ✅ Quick Checklist

Before considering tests complete:

- [ ] Server running on port 3001
- [ ] All 3 test users exist (owner, admin, agent)
- [ ] Tests run without errors
- [ ] Success rate ≥ 90%
- [ ] 0 security issues
- [ ] Screenshots captured for all routes
- [ ] Reports generated successfully

## 🎉 Next Steps

1. **Run the tests:**
   ```bash
   npm run test:routes:audit
   ```

2. **Review the report:**
   ```bash
   cat test-results/ROUTE_AUDIT_REPORT.md
   ```

3. **Fix any issues found**

4. **Re-run to verify fixes:**
   ```bash
   npm run test:routes:audit
   ```

5. **Add to CI/CD pipeline** for continuous monitoring

---

## 🆘 Need Help?

Check these resources:
1. Console output for detailed errors
2. `test-results/ROUTE_AUDIT_REPORT.md` for summary
3. Screenshots in `test-results/screenshots/`
4. Playwright docs: https://playwright.dev
5. Full documentation: `tests/e2e/ROUTE_TESTING_README.md`

---

**Ready to test? Run:** `npm run test:routes:audit`

**Current Status:** ⏳ Not yet run - Run the command above to start!