import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration for ADSapp
 *
 * Key Features:
 * - Production build testing (no Next.js dev overlay interference)
 * - Proper authentication state management
 * - Browser context configuration to avoid pointer event blocking
 * - Optimized timeouts for slow compilation
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Test mode: 'development' or 'production'
const TEST_MODE = process.env.PLAYWRIGHT_TEST_MODE || 'production';
const IS_PRODUCTION = TEST_MODE === 'production';

// Base URL configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Web server configuration based on test mode
const webServerConfig = IS_PRODUCTION
  ? {
      command: 'npm run build && npm run start',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180000, // 3 minutes for build + start
      ignoreHTTPSErrors: true,
    }
  : {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    };

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: false, // Changed to false to avoid race conditions with auth

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Allow 1 retry locally for flaky tests

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2, // Limit workers to reduce load

  /* Maximum number of concurrent test failures */
  maxFailures: process.env.CI ? undefined : 10,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'], // Console output
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Extended timeouts for slow compilation and page loads */
    actionTimeout: 20000, // 20s for actions (was 15s)
    navigationTimeout: 45000, // 45s for navigation (was 30s)

    /* Ignore HTTPS errors in development */
    ignoreHTTPSErrors: true,

    /* Browser context options to avoid overlay interference */
    viewport: { width: 1280, height: 720 },

    /* Storage state for authenticated sessions */
    storageState: process.env.STORAGE_STATE || undefined,

    /* Extra HTTP headers for authentication */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en',
    },

    /* User agent */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // Primary testing on Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Launch options to avoid Next.js overlay issues
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
      },
      dependencies: ['setup'],
    },

    // Firefox testing (optional, can be enabled with --project=firefox)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    // WebKit testing (optional, can be enabled with --project=webkit)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],

  /* Run your local server before starting the tests */
  webServer: webServerConfig,

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  /* Test timeout - increased for slow builds */
  timeout: 90000, // 90s (was 60s)
  expect: {
    timeout: 20000, // 20s (was 15s)
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results/',

  /* Grep patterns to filter tests */
  // Can be overridden with --grep flag
  // grep: /Feature/,
  // grepInvert: /Skip/,
})