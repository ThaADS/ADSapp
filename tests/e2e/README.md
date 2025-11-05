# ADSapp E2E Testing Guide

Complete guide for running end-to-end tests for the ADSapp WhatsApp Business Inbox platform.

## Overview

The E2E test suite validates critical user journeys across all user roles:
- **Super Admin**: System-wide administration
- **Owner**: Organization management and configuration
- **Admin**: Team and workflow management
- **Agent**: Customer communication and inbox operations

## Quick Start

### Windows

```bash
# Run all tests in production mode (recommended)
run-e2e-tests.bat

# Run tests in development mode
run-e2e-tests.bat dev

# Run tests with browser visible
run-e2e-tests.bat headed

# Run specific browser
run-e2e-tests.bat firefox
```

### Linux/Mac

```bash
# Set test mode
export PLAYWRIGHT_TEST_MODE=production

# Build and run
npm run build
npm run start &

# Run tests
npm run test:e2e

# Or use UI mode
npm run test:e2e:ui
```

## Test Modes

### Production Mode (Recommended)

Tests run against the production build, avoiding Next.js development overlay issues.

```bash
# Windows
run-e2e-tests.bat

# Manual
PLAYWRIGHT_TEST_MODE=production npx playwright test
```

**Advantages:**
- No Next.js dev overlay blocking clicks
- Accurate production performance testing
- Stable and reliable test execution

**Build Time:** 2-5 minutes (cached after first build)

### Development Mode

Tests run against the development server with hot reload.

```bash
# Windows
run-e2e-tests.bat dev

# Manual
PLAYWRIGHT_TEST_MODE=development npx playwright test
```

**Advantages:**
- Faster startup if dev server already running
- Real-time code changes during test development

**Disadvantages:**
- Next.js dev overlay can interfere with tests
- Slower page loads due to compilation

## Configuration

### Environment Variables

Create a `.env` file with required configuration:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Configuration
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_TEST_MODE=production
```

### Playwright Configuration

The `playwright.config.ts` file controls test behavior:

```typescript
// Test mode (production or development)
PLAYWRIGHT_TEST_MODE=production

// Base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

// Browser selection
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Users

The test suite uses pre-configured demo accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Super Admin | super@admin.com | Admin2024!Super | System-wide |
| Owner | owner@demo-company.com | Demo2024!Owner | Organization |
| Admin | admin@demo-company.com | Demo2024!Admin | Team |
| Agent | agent@demo-company.com | Demo2024!Agent | Inbox |

**Note:** Ensure these accounts exist in your Supabase database before running tests.

## Authentication

### Storage State

The global setup (`global-setup.ts`) authenticates all test users and saves their session state to `.auth/` directory:

```
.auth/
├── superadmin-state.json
├── owner-state.json
├── admin-state.json
└── agent-state.json
```

These states are reused across tests for faster execution.

### Using Authenticated Fixtures

Tests can use pre-authenticated page fixtures:

```typescript
import { test, expect } from './auth-fixtures';

test.describe('Owner Dashboard', () => {
  test('should access settings', async ({ ownerPage }) => {
    // Already authenticated as owner
    await ownerPage.goto('/dashboard/settings/organization');
    await expect(ownerPage.locator('h1')).toContainText('Organization Settings');
  });
});
```

### Manual Authentication

For tests requiring fresh authentication:

```typescript
import { test, expect, TEST_USERS } from './auth-fixtures';

test('manual login', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', TEST_USERS.owner.email);
  await page.fill('input[type="password"]', TEST_USERS.owner.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
});
```

## Test Structure

### Directory Layout

```
tests/e2e/
├── global-setup.ts           # Authentication and environment setup
├── global-teardown.ts        # Cleanup after all tests
├── auth-fixtures.ts          # Authenticated test fixtures
├── test-env-setup.js         # Production build management
├── README.md                 # This file
├── 01-landing-page.spec.ts   # Public pages
├── 02-authentication.spec.ts # Login flows
├── 03-api-health.spec.ts     # API endpoints
├── 04-dashboard-pages.spec.ts # Dashboard navigation
├── 11-owner-complete-flow.spec.ts    # Owner role tests
├── 12-admin-complete-flow.spec.ts    # Admin role tests
├── 13-agent-complete-flow.spec.ts    # Agent role tests
└── ... (more test files)
```

### Naming Convention

- `01-`, `02-`, etc.: Test execution order
- `*-complete-flow.spec.ts`: Comprehensive role-based tests
- `*-feature.spec.ts`: Feature-specific tests

## Running Tests

### All Tests

```bash
# Windows
run-e2e-tests.bat

# Cross-platform
npm run test:e2e
```

### Specific Test File

```bash
npx playwright test tests/e2e/11-owner-complete-flow.spec.ts
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### With UI Mode

```bash
npm run test:e2e:ui
# Or
npx playwright test --ui
```

### Debug Mode

```bash
npx playwright test --debug
```

### Headed Mode (See Browser)

```bash
run-e2e-tests.bat headed
# Or
npx playwright test --headed
```

## Reports and Artifacts

### HTML Report

After test execution, view the comprehensive HTML report:

```bash
npx playwright show-report
# Or open directly:
# playwright-report/index.html
```

### Test Artifacts

```
test-results/
├── screenshots/           # Failure screenshots
├── videos/               # Test execution videos
├── traces/               # Debug traces
├── results.json          # JSON test results
└── results.xml           # JUnit XML results
```

### View Traces

For detailed debugging:

```bash
npx playwright show-trace test-results/<trace-file>.zip
```

## Troubleshooting

### Common Issues

#### 1. "requireOrganization: No profile found"

**Cause:** Authentication state not properly saved or expired.

**Solution:**
```bash
# Delete auth cache and re-run
rm -rf .auth/
npm run test:e2e
```

#### 2. Next.js Dev Overlay Blocking Clicks

**Cause:** Running tests in development mode.

**Solution:**
```bash
# Use production mode
run-e2e-tests.bat
# Or set environment variable
set PLAYWRIGHT_TEST_MODE=production
```

#### 3. Server Not Starting

**Cause:** Port 3000 already in use.

**Solution:**
```bash
# Kill existing processes
taskkill /F /IM node.exe

# Or use different port
set PLAYWRIGHT_BASE_URL=http://localhost:3001
```

#### 4. Slow Test Execution

**Cause:** Development server compilation.

**Solution:**
- Use production mode (pre-compiled)
- Increase timeouts in `playwright.config.ts`
- Reduce parallel workers

#### 5. Authentication Fails

**Cause:** Demo accounts don't exist in database.

**Solution:**
1. Check Supabase database for user accounts
2. Run seed scripts to create demo accounts
3. Verify credentials match `TEST_USERS` in `auth-fixtures.ts`

### Debug Steps

1. **Run with headed mode:**
   ```bash
   run-e2e-tests.bat headed
   ```

2. **Check screenshots:**
   View `test-results/screenshots/` for failure images

3. **Enable debug logging:**
   ```bash
   DEBUG=pw:api npx playwright test
   ```

4. **Use UI mode for interactive debugging:**
   ```bash
   npm run test:e2e:ui
   ```

5. **Check server logs:**
   View `server.log` in project root

## Best Practices

### Writing Tests

1. **Use Fixtures:** Leverage authenticated fixtures for faster tests
2. **Stable Selectors:** Use `data-testid` attributes for reliable element selection
3. **Wait Patterns:** Use `waitForSelector` and `waitForURL` instead of fixed timeouts
4. **Isolation:** Each test should be independent and cleanup after itself
5. **Assertions:** Use meaningful assertions with clear error messages

### Example Test

```typescript
import { test, expect } from './auth-fixtures';

test.describe('Business Hours Feature', () => {
  test.beforeEach(async ({ ownerPage }) => {
    // Navigate to settings
    await ownerPage.goto('/dashboard/settings/organization');
    await ownerPage.waitForSelector('h1:has-text("Organization Settings")');
  });

  test('should update business hours', async ({ ownerPage }) => {
    // Find business hours section
    const mondayCheckbox = ownerPage.locator('[data-testid="business-hours-monday"]');

    // Toggle Monday
    await mondayCheckbox.check();
    await expect(mondayCheckbox).toBeChecked();

    // Save changes
    await ownerPage.click('button:has-text("Save")');

    // Verify success
    await expect(ownerPage.locator('.toast-success')).toBeVisible();
  });
});
```

## Performance Optimization

### Parallel Execution

Tests run in parallel by default. Adjust workers in `playwright.config.ts`:

```typescript
workers: process.env.CI ? 1 : 2,
```

### Reuse Authentication

Global setup authenticates once and reuses state:

```typescript
use: {
  storageState: '.auth/owner-state.json',
}
```

### Skip Unnecessary Steps

Use storage state instead of logging in for every test.

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Maintenance

### Update Test Users

Edit `tests/e2e/auth-fixtures.ts`:

```typescript
export const TEST_USERS = {
  owner: {
    email: 'your-email@example.com',
    password: 'YourPassword123!',
    role: 'owner',
  },
  // ... other users
};
```

### Add New Tests

1. Create new test file: `tests/e2e/XX-feature-name.spec.ts`
2. Use authenticated fixtures for role-based tests
3. Follow existing test patterns
4. Update this README if needed

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)

## Support

For issues or questions:
1. Check this README
2. Review test-results/ artifacts
3. Check ADSapp documentation
4. Open issue in project repository
