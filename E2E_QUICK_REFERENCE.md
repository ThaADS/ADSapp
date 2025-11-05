# E2E Testing Quick Reference Card

## 🚀 Quick Start

```bash
# Run all tests (RECOMMENDED)
run-e2e-tests.bat

# Run with browser visible
run-e2e-tests.bat headed

# Run in UI mode for debugging
run-e2e-tests.bat ui
```

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `run-e2e-tests.bat` | Run all tests in production mode |
| `run-e2e-tests.bat dev` | Run tests in development mode |
| `run-e2e-tests.bat chromium` | Run tests only on Chromium |
| `run-e2e-tests.bat headed` | Run with browser visible |
| `run-e2e-tests.bat ui` | Run with Playwright UI |
| `npm run test:e2e` | Run tests (manual) |
| `npx playwright show-report` | View test report |

## 🔐 Test Users

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@admin.com | Admin2024!Super |
| Owner | owner@demo-company.com | Demo2024!Owner |
| Admin | admin@demo-company.com | Demo2024!Admin |
| Agent | agent@demo-company.com | Demo2024!Agent |

## 🛠️ Troubleshooting

### Authentication Errors
```bash
# Clear auth cache
rmdir /s /q .auth
run-e2e-tests.bat
```

### Server Issues
```bash
# Kill node processes
taskkill /F /IM node.exe
run-e2e-tests.bat
```

### Build Issues
```bash
# Clean and rebuild
rmdir /s /q .next
npm run build
run-e2e-tests.bat
```

## 📊 Test Reports

- **HTML Report:** `playwright-report/index.html`
- **Screenshots:** `test-results/screenshots/`
- **Videos:** `test-results/videos/`
- **JSON Results:** `test-results/results.json`

## 🧪 Writing Tests

```typescript
import { test, expect } from './auth-fixtures';

// Use authenticated fixture
test('owner test', async ({ ownerPage }) => {
  await ownerPage.goto('/dashboard');
  await expect(ownerPage.locator('h1')).toBeVisible();
});

// Manual authentication
test('custom test', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
});
```

## 📁 Key Files

```
playwright.config.ts              # Main configuration
tests/e2e/global-setup.ts        # Authentication setup
tests/e2e/auth-fixtures.ts       # Test fixtures
tests/e2e/README.md              # Full documentation
run-e2e-tests.bat                # Test runner
.auth/                           # Stored sessions
```

## 🎯 Best Practices

✅ Use production mode (default)
✅ Leverage authenticated fixtures
✅ Use `waitForSelector` not `waitForTimeout`
✅ Keep tests independent
✅ Add meaningful assertions
✅ Use data-testid for selectors

❌ Don't use development mode by default
❌ Don't share state between tests
❌ Don't hardcode delays
❌ Don't ignore authentication errors

## 🔍 Debugging

```bash
# Debug mode
npx playwright test --debug

# UI mode
npm run test:e2e:ui

# Headed mode
run-e2e-tests.bat headed

# Specific test
npx playwright test tests/e2e/16-business-hours-feature.spec.ts --debug
```

## 📖 Full Documentation

For complete details, see:
- `tests/e2e/README.md` - Comprehensive testing guide
- `E2E_TEST_CONFIGURATION_COMPLETE.md` - Implementation details
