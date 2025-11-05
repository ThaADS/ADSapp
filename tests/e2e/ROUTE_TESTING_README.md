# Route Testing Suite - Complete Documentation

## Overview

This comprehensive route testing suite validates **every route** in the ADSapp application across **all user roles** (Super Admin, Owner, Admin, Agent). The tests ensure:

1. ✅ All routes load correctly for authorized users
2. 🔒 Unauthorized users are properly redirected
3. ❌ 404 errors are detected and reported
4. 🛡️ Role-based access control (RBAC) is enforced

## Test Files

### 11. Owner Complete Flow (`11-owner-complete-flow.spec.ts`)
**Purpose:** Test all owner-accessible routes

**What it tests:**
- Login as `owner@demo-company.com`
- Navigate to all 14 dashboard routes
- Verify each page loads without 404 errors
- Capture screenshots of every page
- Report any broken routes

**Routes tested:**
- `/dashboard` - Main dashboard
- `/dashboard/inbox` - WhatsApp inbox
- `/dashboard/conversations` - Conversation management
- `/dashboard/contacts` - Contact management
- `/dashboard/templates` - Message templates
- `/dashboard/automation` - Automation rules
- `/dashboard/analytics` - Analytics dashboard
- `/dashboard/settings` - Settings hub
- `/dashboard/settings/profile` - User profile
- `/dashboard/settings/organization` - Organization settings
- `/dashboard/settings/team` - Team management
- `/dashboard/settings/billing` - **Owner-only** billing
- `/dashboard/settings/integrations` - Integration settings
- `/dashboard/settings/whatsapp` - WhatsApp configuration

**Success criteria:**
- ✅ 0 routes return 404
- ✅ At least 80% of routes load successfully
- ✅ Owner can access billing settings

---

### 12. Admin Complete Flow (`12-admin-complete-flow.spec.ts`)
**Purpose:** Test admin-accessible routes and verify restrictions

**What it tests:**
- Login as `admin@demo-company.com`
- Navigate to 13 accessible routes
- Verify admin **cannot** access billing (owner-only)
- Report any unauthorized access

**Routes tested:**
- All owner routes **except** `/dashboard/settings/billing`

**Restricted routes:**
- ❌ `/dashboard/settings/billing` - Should be blocked

**Success criteria:**
- ✅ 0 accessible routes return 404
- ✅ At least 80% of accessible routes work
- ✅ Admin is properly blocked from billing

---

### 13. Agent Complete Flow (`13-agent-complete-flow.spec.ts`)
**Purpose:** Test agent-accessible routes and verify strict restrictions

**What it tests:**
- Login as `agent@demo-company.com`
- Navigate to 6 accessible routes
- Verify agent **cannot** access 8 restricted routes
- Report any security issues

**Accessible routes:**
- `/dashboard` - Main dashboard
- `/dashboard/inbox` - WhatsApp inbox
- `/dashboard/conversations` - Conversations
- `/dashboard/contacts` - Contacts
- `/dashboard/settings` - Settings (profile only)
- `/dashboard/settings/profile` - User profile

**Restricted routes (should be blocked):**
- ❌ `/dashboard/templates`
- ❌ `/dashboard/automation`
- ❌ `/dashboard/analytics`
- ❌ `/dashboard/settings/organization`
- ❌ `/dashboard/settings/team`
- ❌ `/dashboard/settings/billing`
- ❌ `/dashboard/settings/integrations`
- ❌ `/dashboard/settings/whatsapp`

**Success criteria:**
- ✅ 0 accessible routes return 404
- ✅ At least 80% of accessible routes work
- ✅ All 8 restricted routes are properly blocked

---

### 14. Route 404 Checker (`14-route-404-checker.spec.ts`)
**Purpose:** Test public, protected, and invalid routes

**What it tests:**
- **Public routes** (no authentication)
  - `/` - Homepage
  - `/auth/signin` - Sign in page
  - `/auth/signup` - Sign up page
  - `/auth/forgot-password` - Password reset

- **Protected routes** (should redirect to signin)
  - All dashboard routes
  - Admin routes

- **Invalid routes** (should return 404)
  - `/dashboard/invalid`
  - `/dashboard/settings/invalid`
  - `/nonexistent`

**Success criteria:**
- ✅ All public routes are accessible
- ✅ Protected routes redirect to signin (90%+ protection rate)
- ✅ Invalid routes return 404 or redirect

---

### 15. Full Route Audit (`15-full-route-audit.spec.ts`) ⭐
**Purpose:** Comprehensive audit across all roles with detailed reporting

**What it tests:**
- Tests **all 3 user roles** (owner, admin, agent)
- Tests **all routes** for each role
- Verifies **access control** is properly enforced
- Generates **detailed reports** (JSON + Markdown)

**Output:**
1. **JSON Report:** `test-results/route-audit.json`
   - Machine-readable data
   - Complete test results
   - Statistics and metrics

2. **Markdown Report:** `test-results/ROUTE_AUDIT_REPORT.md`
   - Human-readable summary
   - Broken routes list
   - Security issues
   - Recommendations

3. **Screenshots:** `test-results/screenshots/`
   - Visual evidence for every route
   - Named by role and route

**Success criteria:**
- ✅ 0 security issues (proper RBAC)
- ✅ 90%+ overall success rate
- ✅ All reports generated successfully

---

## Running the Tests

### Prerequisites

1. **Server must be running on port 3001:**
   ```bash
   npm run dev
   # Server will start on http://localhost:3001
   ```

2. **Test users must exist in database:**
   - `owner@demo-company.com` (password: `Demo2024!Owner`)
   - `admin@demo-company.com` (password: `Demo2024!Admin`)
   - `agent@demo-company.com` (password: `Demo2024!Agent`)

### Run Individual Tests

```bash
# Test owner routes
npm run test:routes:owner

# Test admin routes
npm run test:routes:admin

# Test agent routes
npm run test:routes:agent

# Test 404 handling
npm run test:routes:404

# Run full audit (recommended)
npm run test:routes:audit
```

### Run All Route Tests

```bash
npm run test:routes
```

### Using Playwright Directly

```bash
# Run specific test file
npx playwright test tests/e2e/11-owner-complete-flow.spec.ts

# Run with UI (interactive mode)
npx playwright test tests/e2e/15-full-route-audit.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test tests/e2e/11-owner-complete-flow.spec.ts --headed

# Run and generate report
npx playwright test tests/e2e/15-full-route-audit.spec.ts
npx playwright show-report
```

---

## Test Output & Reports

### Console Output

Each test provides real-time feedback:

```
🔐 Starting Owner Route Testing...

Logging in as owner@demo-company.com...
Current URL after login: http://localhost:3001/dashboard

📋 Testing all routes...

Testing: /dashboard
  ✅ OK: /dashboard

Testing: /dashboard/inbox
  ✅ OK: /dashboard/inbox

Testing: /dashboard/settings/billing
  ✅ OK: /dashboard/settings/billing

============================================================
📊 OWNER ROUTE TEST RESULTS
============================================================
✅ Working Routes: 14/14
❌ 404 Errors: 0
↪️  Redirects: 0
⚠️  Errors: 0
============================================================
```

### JSON Report Structure

```json
{
  "generatedAt": "2025-09-30T10:30:00.000Z",
  "summary": {
    "totalRoutes": 20,
    "totalTests": 60,
    "successfulTests": 58,
    "failedTests": 2,
    "securityIssues": 0
  },
  "roleResults": [...],
  "brokenRoutes": ["/dashboard/some-broken-route"],
  "securityIssues": [],
  "recommendations": [
    "Fix 1 broken routes that return 404 errors"
  ]
}
```

### Markdown Report

A comprehensive report with:
- Summary table with key metrics
- Role-by-role test results
- List of broken routes (404 errors)
- Security issues (unauthorized access)
- Actionable recommendations

**Location:** `test-results/ROUTE_AUDIT_REPORT.md`

### Screenshots

Every route is captured as a PNG screenshot:

**Naming convention:**
- Owner routes: `owner-dashboard-inbox.png`
- Admin routes: `admin-dashboard-contacts.png`
- Agent routes: `agent-dashboard-settings.png`
- Restricted: `admin-restricted-dashboard-settings-billing.png`

**Location:** `test-results/screenshots/`

---

## Understanding Test Results

### ✅ Success
Route loads correctly without errors:
```
✅ OK: /dashboard/inbox
```

### ❌ 404 Error
Route returns "Not Found" error:
```
❌ 404: /dashboard/nonexistent
```
**Action needed:** Fix the route or remove broken links

### ↪️ Redirect
Route redirects to a different URL:
```
↪️ Redirected: /dashboard → /dashboard/inbox
```
**This may be expected behavior** (e.g., redirecting to default page)

### 🔒 Properly Blocked
Unauthorized access is prevented:
```
✅ Properly blocked: /dashboard/settings/billing (redirected to /dashboard)
```
**This is good** - access control is working

### ⚠️ Security Issue
User has unexpected access:
```
⚠️ SECURITY ISSUE: Agent has access to /dashboard/settings/billing
```
**Action needed:** Fix role-based access control

---

## Troubleshooting

### Tests Fail to Login

**Problem:** "Failed to login as owner@demo-company.com"

**Solution:**
1. Verify users exist in database
2. Check passwords are correct
3. Ensure auth system is working:
   ```bash
   # Test manual login
   curl -X POST http://localhost:3001/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"owner@demo-company.com","password":"Demo2024!Owner"}'
   ```

### Server Not Running

**Problem:** "Navigation timeout exceeded"

**Solution:**
```bash
# Start dev server
npm run dev

# Verify it's running on port 3001
curl http://localhost:3001
```

### Many 404 Errors

**Problem:** Multiple routes return 404

**Solution:**
1. Check Next.js file structure matches routes
2. Verify middleware isn't blocking routes
3. Check for TypeScript/build errors:
   ```bash
   npm run type-check
   npm run build
   ```

### Screenshots Not Saving

**Problem:** Screenshots directory doesn't exist

**Solution:**
```bash
# Create directory manually
mkdir -p test-results/screenshots

# Or let tests create it (already handled in tests)
```

### Playwright Not Installed

**Problem:** "Command not found: playwright"

**Solution:**
```bash
# Install Playwright
npm install @playwright/test

# Install browsers
npx playwright install
```

---

## Configuration

### Port Configuration

Tests use `http://localhost:3001` by default.

**To change:**
1. Update dev script in `package.json`:
   ```json
   "dev": "next dev --turbopack --port 3000"
   ```

2. Update test files (search and replace):
   ```typescript
   // Change in all test files
   http://localhost:3001 → http://localhost:3000
   ```

### Timeout Configuration

Default timeouts in tests:
- Navigation: 10 seconds
- Page load: 1 second
- Login wait: 2 seconds

**To adjust:**
```typescript
// In test files
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 15000 // Increase to 15 seconds
});
```

### User Credentials

Tests use these credentials:
- Owner: `owner@demo-company.com` / `Demo2024!Owner`
- Admin: `admin@demo-company.com` / `Demo2024!Admin`
- Agent: `agent@demo-company.com` / `Demo2024!Agent`

**To change:**
Edit the `users` object in `15-full-route-audit.spec.ts`

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Route Tests

on: [push, pull_request]

jobs:
  test-routes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3001

      - name: Run route audit
        run: npm run test:routes:audit

      - name: Upload reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: route-test-reports
          path: |
            test-results/
            playwright-report/
```

---

## Best Practices

### 1. Run Full Audit Regularly

```bash
# Run before committing major changes
npm run test:routes:audit
```

### 2. Review Screenshots

Check `test-results/screenshots/` to visually verify pages look correct.

### 3. Monitor Success Rate

Aim for:
- ✅ 95%+ route success rate
- ✅ 0 security issues
- ✅ < 5% broken routes

### 4. Fix Issues Immediately

Don't let broken routes accumulate:
1. Check markdown report for issues
2. Fix routes returning 404
3. Address security concerns
4. Re-run tests to verify fixes

### 5. Update Tests When Adding Routes

When adding new routes, update the appropriate test file:
- Owner routes → `11-owner-complete-flow.spec.ts`
- Admin routes → `12-admin-complete-flow.spec.ts`
- Agent routes → `13-agent-complete-flow.spec.ts`

---

## Quick Reference

### Common Commands

```bash
# Development workflow
npm run dev                      # Start server
npm run test:routes:audit        # Run full audit
npx playwright show-report       # View HTML report

# Individual role tests
npm run test:routes:owner        # Test owner routes
npm run test:routes:admin        # Test admin routes
npm run test:routes:agent        # Test agent routes

# Check specific issues
npm run test:routes:404          # Test 404 handling

# Run all tests
npm run test:routes              # All route tests
```

### File Locations

```
tests/e2e/
├── 11-owner-complete-flow.spec.ts       # Owner tests
├── 12-admin-complete-flow.spec.ts       # Admin tests
├── 13-agent-complete-flow.spec.ts       # Agent tests
├── 14-route-404-checker.spec.ts         # 404 tests
└── 15-full-route-audit.spec.ts          # Full audit ⭐

test-results/
├── route-audit.json                     # JSON report
├── ROUTE_AUDIT_REPORT.md                # Markdown report
└── screenshots/                         # All screenshots

playwright-report/
└── index.html                           # Playwright HTML report
```

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test console output
3. Examine screenshots for visual issues
4. Check Playwright documentation: https://playwright.dev

---

**Last Updated:** 2025-09-30
**Test Suite Version:** 1.0
**Compatible with:** ADSapp v0.1.0