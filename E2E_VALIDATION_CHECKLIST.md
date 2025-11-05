# E2E Test Configuration Validation Checklist

Use this checklist to validate the E2E test configuration is working correctly.

## Pre-Execution Checklist

### Environment Setup
- [ ] Node.js installed (v18+ recommended)
- [ ] npm installed and working
- [ ] Git installed (for version control)
- [ ] `.env` file exists with required variables
- [ ] Supabase credentials configured in `.env`

### Database Setup
- [ ] Demo user accounts exist in Supabase:
  - [ ] super@admin.com (Super Admin)
  - [ ] owner@demo-company.com (Owner)
  - [ ] admin@demo-company.com (Admin)
  - [ ] agent@demo-company.com (Agent)
- [ ] User passwords match `auth-fixtures.ts` configuration
- [ ] Organizations exist for demo users
- [ ] Database migrations applied

### Application Setup
- [ ] Dependencies installed (`node_modules/` exists)
- [ ] Application builds successfully (`npm run build`)
- [ ] Application starts correctly (`npm run start`)
- [ ] Application accessible at http://localhost:3000
- [ ] Manual login works for all demo users

## Configuration Validation

### Files Created
- [ ] `playwright.config.ts` (modified with production config)
- [ ] `tests/e2e/global-setup.ts` (modified with authentication)
- [ ] `tests/e2e/auth-fixtures.ts` (created)
- [ ] `tests/e2e/test-env-setup.js` (created)
- [ ] `tests/e2e/README.md` (created)
- [ ] `run-e2e-tests.bat` (created)
- [ ] `.gitignore` (modified to exclude test artifacts)

### Configuration Checks
- [ ] `PLAYWRIGHT_TEST_MODE` defaults to 'production'
- [ ] `PLAYWRIGHT_BASE_URL` set to 'http://localhost:3000'
- [ ] Timeouts increased (90s test, 45s navigation, 20s action)
- [ ] Browser launch options configured
- [ ] Storage state support enabled
- [ ] Sequential execution enabled (`fullyParallel: false`)

## First Test Run

### Pre-Run Checks
- [ ] Port 3000 is available (no conflicting processes)
- [ ] `.auth/` directory doesn't exist (will be created)
- [ ] `test-results/` directory clear or doesn't exist
- [ ] No existing `server.log` file

### Execute Test Run
```bash
run-e2e-tests.bat
```

### During Execution - Monitor
- [ ] Build starts (if no cached build)
- [ ] Build completes successfully
- [ ] Production server starts
- [ ] Server responds on port 3000
- [ ] Global setup authenticates all users
- [ ] Tests execute without overlay blocking
- [ ] Tests progress through suite
- [ ] Reports generate

### Post-Execution - Verify

#### Authentication State
- [ ] `.auth/` directory created
- [ ] `superadmin-state.json` exists
- [ ] `owner-state.json` exists
- [ ] `admin-state.json` exists
- [ ] `agent-state.json` exists
- [ ] All state files contain valid JSON
- [ ] State files have cookies and localStorage

#### Test Results
- [ ] `test-results/` directory created
- [ ] `results.json` generated
- [ ] `results.xml` generated (JUnit format)
- [ ] Screenshots captured for failures
- [ ] Videos recorded for failures (if configured)

#### Reports
- [ ] `playwright-report/` directory created
- [ ] HTML report generated (`index.html`)
- [ ] Report opens in browser automatically
- [ ] Report shows test results clearly
- [ ] Failed tests have screenshots/traces

#### Process Cleanup
- [ ] Node processes terminated after tests
- [ ] Port 3000 freed after cleanup
- [ ] `server.log` created with server output

## Test Results Analysis

### Expected Results
- [ ] Test pass rate > 85%
- [ ] No authentication failures
- [ ] No timeout errors
- [ ] No "Next.js overlay" blocking issues
- [ ] No "profile not found" errors

### Failure Analysis (if any)
For each failed test:
- [ ] Review error message in report
- [ ] Check screenshot in `test-results/screenshots/`
- [ ] Review test code for issues
- [ ] Verify feature works manually
- [ ] Determine if test or application issue

### Common Acceptable Failures
- [ ] API endpoint tests (if endpoints not fully implemented)
- [ ] Feature-specific tests (if features not complete)
- [ ] 404 route tests (if routes not yet created)

## Second Test Run (Cached)

### Purpose
Verify authentication caching and performance improvements.

```bash
run-e2e-tests.bat
```

### Verify
- [ ] No rebuild required (using cached `.next/`)
- [ ] Server starts faster (30s vs 2-5 min)
- [ ] Authentication uses cached `.auth/` states
- [ ] Tests execute faster
- [ ] Same or better pass rate

## Mode Testing

### Development Mode
```bash
run-e2e-tests.bat dev
```

- [ ] Development server starts
- [ ] Tests execute (may have overlay issues)
- [ ] Results generated

### Headed Mode
```bash
run-e2e-tests.bat headed
```

- [ ] Browser windows visible during tests
- [ ] Can observe test execution
- [ ] Tests complete successfully

### UI Mode
```bash
run-e2e-tests.bat ui
```

- [ ] Playwright UI opens
- [ ] Can select and run individual tests
- [ ] Can step through test execution
- [ ] Can inspect page state

## Browser Testing

### Chromium (Default)
```bash
run-e2e-tests.bat chromium
```
- [ ] Tests run on Chromium
- [ ] Results generated

### Firefox
```bash
run-e2e-tests.bat firefox
```
- [ ] Tests run on Firefox
- [ ] Results may differ slightly from Chromium

### WebKit
```bash
run-e2e-tests.bat webkit
```
- [ ] Tests run on WebKit (Safari engine)
- [ ] Results may differ from other browsers

## Authenticated Fixtures Testing

### Create Test File
Create `tests/e2e/99-fixture-test.spec.ts`:
```typescript
import { test, expect } from './auth-fixtures';

test('owner fixture works', async ({ ownerPage }) => {
  await ownerPage.goto('/dashboard');
  await expect(ownerPage).toHaveURL(/\/dashboard/);
});
```

### Execute
```bash
npx playwright test tests/e2e/99-fixture-test.spec.ts
```

### Verify
- [ ] Test executes without manual login
- [ ] Test passes
- [ ] Authentication state reused
- [ ] Fixture provides authenticated page

## Troubleshooting Validation

### Test Each Fix

#### Fix 1: Clear Auth Cache
```bash
rmdir /s /q .auth
run-e2e-tests.bat
```
- [ ] Auth cache cleared
- [ ] Tests re-authenticate
- [ ] New state files created
- [ ] Tests pass

#### Fix 2: Kill Node Processes
```bash
taskkill /F /IM node.exe
run-e2e-tests.bat
```
- [ ] Processes killed
- [ ] New server starts
- [ ] Tests execute

#### Fix 3: Clean Build
```bash
rmdir /s /q .next
run-e2e-tests.bat
```
- [ ] Build cache cleared
- [ ] Fresh build executes
- [ ] Tests pass

## Documentation Validation

### README Accuracy
- [ ] Quick start works as documented
- [ ] Commands execute correctly
- [ ] Examples are accurate
- [ ] Troubleshooting steps work

### Configuration Documentation
- [ ] File paths correct
- [ ] Code examples work
- [ ] Configuration values accurate
- [ ] Environment variables documented

## Performance Validation

### Timing Benchmarks
- [ ] First run (with build): 8-16 minutes
- [ ] Cached run: 6-11 minutes
- [ ] Individual test: < 90 seconds
- [ ] Authentication: < 10 seconds per user

### Resource Usage
- [ ] Memory usage reasonable (< 1GB)
- [ ] CPU usage acceptable
- [ ] Disk space sufficient (< 500MB total)

## CI/CD Readiness (Optional)

### GitHub Actions Preparation
- [ ] `.github/workflows/` directory exists
- [ ] Workflow file created
- [ ] Environment variables configured
- [ ] Secrets added to GitHub
- [ ] Test workflow executes

### Workflow Testing
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: run-e2e-tests.bat
```

## Final Validation

### Overall Health Check
- [ ] All configuration files present
- [ ] All documentation complete
- [ ] Tests execute successfully
- [ ] Pass rate > 85%
- [ ] Authentication works reliably
- [ ] Reports generate correctly
- [ ] Cleanup functions properly
- [ ] Troubleshooting steps work

### Sign-Off Criteria
- [ ] Configuration complete and tested
- [ ] Documentation comprehensive and accurate
- [ ] Automation scripts functional
- [ ] Known issues documented
- [ ] Ready for team use

## Post-Validation Tasks

### Team Onboarding
- [ ] Share documentation with team
- [ ] Conduct demo of test execution
- [ ] Review results interpretation
- [ ] Explain troubleshooting steps

### Maintenance Planning
- [ ] Schedule weekly test runs
- [ ] Assign test maintenance owner
- [ ] Set up failure alerting
- [ ] Plan test expansion

### Continuous Improvement
- [ ] Identify flaky tests
- [ ] Optimize slow tests
- [ ] Expand test coverage
- [ ] Update documentation as needed

---

## Validation Status

**Configuration Validator:** _________________
**Date:** _________________
**Overall Status:** ⬜ PASS / ⬜ FAIL / ⬜ NEEDS WORK

**Notes:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

**Blockers:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

**Next Steps:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

*Use this checklist before deploying E2E test configuration to ensure everything works correctly.*
