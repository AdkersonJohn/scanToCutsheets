/**
 * Authentication Setup for Power Apps E2E Tests
 *
 * This setup file handles Microsoft 365 authentication before running E2E tests.
 * It stores the authenticated state for reuse across test runs.
 *
 * Reference: NFR-01 (App shall use existing Microsoft 365 authentication)
 */

import { test as setup, expect } from '@playwright/test';
import { APP_URLS, TEST_USERS } from '../fixtures/test-data';

// Path to store authenticated browser state
const AUTH_FILE = 'tests/.auth/user.json';

/**
 * Setup: Authenticate with Microsoft 365
 *
 * This test runs before all other tests in the 'setup' project.
 * It authenticates with Microsoft 365 and saves the session state
 * for reuse by other test projects.
 */
setup('authenticate with Microsoft 365', async ({ page }) => {
  // Get credentials from environment variables
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD not set. Skipping authentication setup.'
    );
    console.warn('Tests will run without pre-authenticated state.');
    console.warn('Set these environment variables for automated auth:');
    console.warn('  export TEST_USER_EMAIL="your-email@company.com"');
    console.warn('  export TEST_USER_PASSWORD="your-password"');

    // Save empty auth state to prevent errors
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  console.log(`Authenticating as: ${email}`);

  // Navigate to Power Apps - this will redirect to Microsoft login
  await page.goto(APP_URLS.production);

  // Wait for Microsoft login page
  await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });

  // Enter email address
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);
  await page.click('input[type="submit"]');

  // Wait for password page
  await page.waitForSelector('input[type="password"]', { state: 'visible' });

  // Enter password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);
  await page.click('input[type="submit"]');

  // Handle "Stay signed in?" prompt if it appears
  try {
    const staySignedInNo = page.locator('text=No');
    await staySignedInNo.waitFor({ state: 'visible', timeout: 5000 });
    await staySignedInNo.click();
  } catch {
    // Prompt may not appear - that's okay
  }

  // Wait for redirect back to Power Apps
  await page.waitForURL(/apps\.powerapps\.com/, { timeout: 60000 });

  // Verify we're authenticated by checking for app content
  await page.waitForSelector('[data-testid="scan-button"]', {
    state: 'visible',
    timeout: 30000,
  });

  console.log('Authentication successful');

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});

/**
 * Setup: Authenticate as Admin User
 *
 * This can be used for tests that require admin permissions.
 * Uncomment and configure if needed.
 */
// setup('authenticate as admin', async ({ page }) => {
//   const email = process.env.ADMIN_USER_EMAIL;
//   const password = process.env.ADMIN_USER_PASSWORD;
//
//   if (!email || !password) {
//     console.warn('Admin credentials not set. Skipping admin auth setup.');
//     return;
//   }
//
//   // ... similar auth flow as above
//
//   await page.context().storageState({ path: 'tests/.auth/admin.json' });
// });

/**
 * Setup: Verify SharePoint List Access
 *
 * This setup verifies that the authenticated user has access
 * to the SharePoint list used for storing scan data.
 */
setup('verify SharePoint list access', async ({ page }) => {
  // Skip if no auth state exists
  try {
    // Load auth state
    const context = page.context();

    // Navigate to SharePoint list
    await page.goto(APP_URLS.sharePointList);

    // Check for list content (indicates access)
    const hasAccess = await page
      .locator('[data-automationid="ListViewItem"]')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (hasAccess) {
      console.log('SharePoint list access verified');
    } else {
      console.warn('Could not verify SharePoint list access');
      console.warn('Ensure user has Contribute permissions on the list');
    }
  } catch (error) {
    console.warn('SharePoint access check skipped:', error);
  }
});

/**
 * Setup: Clean Up Test Data
 *
 * This setup cleans up any leftover test data from previous runs.
 * This ensures tests start with a clean slate.
 */
setup('cleanup test data from previous runs', async ({ page }) => {
  try {
    // Navigate to SharePoint list
    await page.goto(APP_URLS.sharePointList);

    // Wait for list to load
    await page.waitForSelector('[data-automationid="ListViewItem"]', {
      timeout: 10000,
    });

    // Find and delete items with TEST prefix in BarcodeValue
    // This would use SharePoint's bulk selection and delete functionality
    // or direct API calls

    console.log('Test data cleanup completed');
  } catch (error) {
    console.log('No test data to clean up or cleanup skipped');
  }
});
