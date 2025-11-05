import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...');

  // Cleanup tasks can be added here if needed
  // For example: cleanup test data, close external services, etc.

  console.log('✅ Global teardown completed');
}

export default globalTeardown;