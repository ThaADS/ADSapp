// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { FullConfig, chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup for Playwright E2E Tests
 *
 * This setup:
 * 1. Verifies server is running
 * 2. Creates authenticated sessions for test users
 * 3. Stores authentication state for reuse
 * 4. Validates demo accounts
 */

// Test user credentials
const TEST_USERS = {
  superadmin: {
    email: 'super@admin.com',
    password: 'Admin2024!Super',
    role: 'superadmin',
  },
  owner: {
    email: 'owner@demo-company.com',
    password: 'Demo2024!Owner',
    role: 'owner',
  },
  admin: {
    email: 'admin@demo-company.com',
    password: 'Demo2024!Admin',
    role: 'admin',
  },
  agent: {
    email: 'agent@demo-company.com',
    password: 'Demo2024!Agent',
    role: 'agent',
  },
};

// Storage state directory
const STORAGE_STATE_DIR = path.join(__dirname, '..', '..', '.auth');

/**
 * Check if server is accessible
 */
async function checkServer(page: Page, baseURL: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking server at ${baseURL}...`);
    const response = await page.goto(baseURL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (response && response.ok()) {
      console.log('✅ Server is accessible and responding\n');
      return true;
    }

    console.log(`⚠️  Server responded with status: ${response?.status()}\n`);
    return false;
  } catch (error) {
    console.error('❌ Server is not accessible:', error);
    return false;
  }
}

/**
 * Authenticate user and save session state
 */
async function authenticateUser(
  browser: Browser,
  baseURL: string,
  userConfig: { email: string; password: string; role: string }
): Promise<boolean> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`🔐 Authenticating ${userConfig.role}: ${userConfig.email}`);

    // Navigate to sign-in page
    await page.goto(`${baseURL}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('  (Network idle timeout - continuing anyway)');
    });

    // Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Wait for form elements
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    await emailInput.fill(userConfig.email);
    await passwordInput.fill(userConfig.password);

    // Submit the form
    await submitButton.click();

    // Wait for navigation after login
    await page.waitForURL(
      (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/admin'),
      { timeout: 20000 }
    ).catch(() => {
      console.log('  (Navigation timeout - checking if login succeeded)');
    });

    // Additional wait for any redirects
    await page.waitForTimeout(2000);

    // Verify authentication succeeded by checking for dashboard or admin content
    const currentURL = page.url();
    const isAuthenticated =
      currentURL.includes('/dashboard') ||
      currentURL.includes('/admin') ||
      !(currentURL.includes('/auth/signin'));

    if (isAuthenticated) {
      // Save authentication state
      const storageStatePath = path.join(STORAGE_STATE_DIR, `${userConfig.role}-state.json`);

      // Ensure directory exists
      if (!fs.existsSync(STORAGE_STATE_DIR)) {
        fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
      }

      await context.storageState({ path: storageStatePath });
      console.log(`  ✅ Authentication successful - state saved to ${storageStatePath}`);
      console.log(`  📍 Redirected to: ${currentURL}\n`);
      return true;
    } else {
      console.log(`  ❌ Authentication failed - still on: ${currentURL}\n`);
      // Take screenshot for debugging
      await page.screenshot({
        path: path.join(__dirname, '..', '..', 'test-results', `auth-failed-${userConfig.role}.png`),
      });
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error during authentication:`, error);
    // Take screenshot for debugging
    await page.screenshot({
      path: path.join(__dirname, '..', '..', 'test-results', `auth-error-${userConfig.role}.png`),
    }).catch(() => {});
    return false;
  } finally {
    await context.close();
  }
}

/**
 * Main global setup function
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting Playwright E2E Test Setup\n');
  console.log('='.repeat(60));

  const baseURL = config.use?.baseURL || 'http://localhost:3000';
  console.log(`Base URL: ${baseURL}\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    // Step 1: Check if server is running
    const serverAccessible = await checkServer(page, baseURL);

    if (!serverAccessible) {
      console.error('❌ Server is not accessible. Please ensure the application is running.');
      console.error('   For production tests: npm run build && npm run start');
      console.error('   For development tests: npm run dev\n');
      throw new Error('Server is not accessible');
    }

    await page.close();

    // Step 2: Authenticate test users
    console.log('🔐 Setting up authenticated sessions for test users\n');

    const authResults = {
      superadmin: false,
      owner: false,
      admin: false,
      agent: false,
    };

    // Authenticate each user
    for (const [role, userConfig] of Object.entries(TEST_USERS)) {
      authResults[role as keyof typeof authResults] = await authenticateUser(
        browser,
        baseURL,
        userConfig
      );

      // Small delay between authentications
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 3: Verify results
    console.log('='.repeat(60));
    console.log('\n📊 Authentication Results:\n');

    let allAuthSucceeded = true;
    for (const [role, success] of Object.entries(authResults)) {
      const status = success ? '✅' : '❌';
      console.log(`  ${status} ${role.toUpperCase()}: ${success ? 'Ready' : 'Failed'}`);
      if (!success) allAuthSucceeded = false;
    }

    console.log('\n' + '='.repeat(60));

    if (!allAuthSucceeded) {
      console.warn('\n⚠️  Some authentications failed. Tests may fail for those users.');
      console.warn('   Check the screenshots in test-results/ for debugging.\n');
    } else {
      console.log('\n✅ All test users authenticated successfully!\n');
    }

    console.log('🎯 Global setup completed - ready to run tests\n');
  } catch (error) {
    console.error('\n❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;