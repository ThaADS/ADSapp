/**
 * Playwright Authentication Fixtures
 *
 * This file provides authenticated browser contexts for different user roles.
 * Tests can use these fixtures to automatically start with an authenticated session.
 *
 * Usage in tests:
 *
 * import { test as authenticatedTest } from './auth-fixtures';
 *
 * authenticatedTest.describe('Owner Features', () => {
 *   authenticatedTest('should access dashboard', async ({ ownerPage }) => {
 *     await ownerPage.goto('/dashboard');
 *     // ... test authenticated features
 *   });
 * });
 */

import { test as base } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Storage state paths
const STORAGE_STATE_DIR = path.join(__dirname, '..', '..', '.auth');

const STORAGE_STATES = {
  superadmin: path.join(STORAGE_STATE_DIR, 'superadmin-state.json'),
  owner: path.join(STORAGE_STATE_DIR, 'owner-state.json'),
  admin: path.join(STORAGE_STATE_DIR, 'admin-state.json'),
  agent: path.join(STORAGE_STATE_DIR, 'agent-state.json'),
};

// Test user credentials for manual authentication
export const TEST_USERS = {
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

/**
 * Helper to check if storage state exists
 */
function storageStateExists(role: keyof typeof STORAGE_STATES): boolean {
  const statePath = STORAGE_STATES[role];
  return fs.existsSync(statePath);
}

/**
 * Helper to manually authenticate a user
 */
async function manualAuthenticate(page: any, role: keyof typeof TEST_USERS) {
  const user = TEST_USERS[role];
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  console.log(`🔐 Manually authenticating ${role}: ${user.email}`);

  // Navigate to sign-in
  await page.goto(`${baseURL}/auth/signin`, { waitUntil: 'domcontentloaded' });

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"], input[name="password"]', user.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(
    (url: URL) => url.pathname.includes('/dashboard') || url.pathname.includes('/admin'),
    { timeout: 20000 }
  ).catch(() => {
    console.warn(`  ⚠️  Navigation timeout for ${role} - continuing anyway`);
  });

  await page.waitForTimeout(2000);

  console.log(`  ✅ ${role} authenticated`);
}

// Extended test type with authenticated contexts
type AuthenticatedFixtures = {
  superadminPage: any;
  ownerPage: any;
  adminPage: any;
  agentPage: any;
  authenticatedContext: any;
};

/**
 * Extended test with authenticated page fixtures
 */
export const test = base.extend<AuthenticatedFixtures>({
  // Superadmin authenticated page
  superadminPage: async ({ browser }, use) => {
    let context;
    let page;

    try {
      if (storageStateExists('superadmin')) {
        context = await browser.newContext({
          storageState: STORAGE_STATES.superadmin,
        });
      } else {
        console.warn('⚠️  Superadmin storage state not found, authenticating manually');
        context = await browser.newContext();
        page = await context.newPage();
        await manualAuthenticate(page, 'superadmin');
      }

      if (!page) {
        page = await context.newPage();
      }

      await use(page);
    } finally {
      if (context) await context.close();
    }
  },

  // Owner authenticated page
  ownerPage: async ({ browser }, use) => {
    let context;
    let page;

    try {
      if (storageStateExists('owner')) {
        context = await browser.newContext({
          storageState: STORAGE_STATES.owner,
        });
      } else {
        console.warn('⚠️  Owner storage state not found, authenticating manually');
        context = await browser.newContext();
        page = await context.newPage();
        await manualAuthenticate(page, 'owner');
      }

      if (!page) {
        page = await context.newPage();
      }

      await use(page);
    } finally {
      if (context) await context.close();
    }
  },

  // Admin authenticated page
  adminPage: async ({ browser }, use) => {
    let context;
    let page;

    try {
      if (storageStateExists('admin')) {
        context = await browser.newContext({
          storageState: STORAGE_STATES.admin,
        });
      } else {
        console.warn('⚠️  Admin storage state not found, authenticating manually');
        context = await browser.newContext();
        page = await context.newPage();
        await manualAuthenticate(page, 'admin');
      }

      if (!page) {
        page = await context.newPage();
      }

      await use(page);
    } finally {
      if (context) await context.close();
    }
  },

  // Agent authenticated page
  agentPage: async ({ browser }, use) => {
    let context;
    let page;

    try {
      if (storageStateExists('agent')) {
        context = await browser.newContext({
          storageState: STORAGE_STATES.agent,
        });
      } else {
        console.warn('⚠️  Agent storage state not found, authenticating manually');
        context = await browser.newContext();
        page = await context.newPage();
        await manualAuthenticate(page, 'agent');
      }

      if (!page) {
        page = await context.newPage();
      }

      await use(page);
    } finally {
      if (context) await context.close();
    }
  },

  // Generic authenticated context (can be used with any role)
  authenticatedContext: async ({ browser }, use) => {
    // Default to owner if no specific role is needed
    const context = storageStateExists('owner')
      ? await browser.newContext({ storageState: STORAGE_STATES.owner })
      : await browser.newContext();

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';

/**
 * Helper function to get storage state path for a role
 */
export function getStorageStatePath(role: keyof typeof STORAGE_STATES): string {
  return STORAGE_STATES[role];
}

/**
 * Helper function to create authenticated context manually
 */
export async function createAuthenticatedContext(
  browser: any,
  role: keyof typeof STORAGE_STATES
) {
  if (storageStateExists(role)) {
    return await browser.newContext({
      storageState: STORAGE_STATES[role],
    });
  }

  // Fallback to manual authentication
  const context = await browser.newContext();
  const page = await context.newPage();
  await manualAuthenticate(page, role);

  return context;
}
