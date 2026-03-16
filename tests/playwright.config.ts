/**
 * Playwright Configuration for Power Apps Barcode Scanner E2E Tests
 *
 * This configuration is designed to test Power Apps canvas applications
 * running in the Microsoft Power Apps web player.
 *
 * Key considerations:
 * - Power Apps requires Microsoft 365 authentication
 * - Tests run against the Power Apps web player (not mobile)
 * - Mobile viewport testing simulates responsive behavior
 * - Performance thresholds align with NFR requirements
 */

import { defineConfig, devices } from '@playwright/test';
import { PERFORMANCE_THRESHOLDS, VIEWPORTS } from './fixtures/test-data';

/**
 * Environment configuration
 * These should be set via environment variables or .env file
 */
const config = {
  // Power Apps application URL (replace with actual app URL)
  appUrl: process.env.POWER_APPS_URL || 'https://apps.powerapps.com/play/e/YOUR-APP-ID',

  // SharePoint site for data verification
  sharePointUrl: process.env.SHAREPOINT_URL || 'https://your-tenant.sharepoint.com/sites/AssetTracking',

  // Test user credentials (for automated auth)
  testUserEmail: process.env.TEST_USER_EMAIL || '',
  testUserPassword: process.env.TEST_USER_PASSWORD || '',

  // Authentication state storage
  authStatePath: 'tests/.auth/user.json',
};

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Run tests in parallel by default
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI (flaky test mitigation)
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource contention
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    // Always output to console with progress
    ['list'],
    // HTML report for detailed analysis
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    // JUnit for CI integration
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],

  // Global test settings
  use: {
    // Base URL for navigation
    baseURL: config.appUrl,

    // Collect trace on first retry for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: PERFORMANCE_THRESHOLDS.sharePointWriteMs,

    // Default navigation timeout (aligned with app load NFR)
    navigationTimeout: PERFORMANCE_THRESHOLDS.appLoadMs,

    // Emulate user permissions for camera (for barcode scanner testing)
    permissions: ['camera'],

    // Locale and timezone for consistent date/time testing
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Accept downloads (for any export functionality)
    acceptDownloads: true,

    // Storage state for authenticated sessions
    // storageState: config.authStatePath,
  },

  // Timeout for each test
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Projects for different browser and viewport combinations
  projects: [
    // ==========================================================================
    // SETUP PROJECT - Authentication
    // ==========================================================================
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        headless: false, // As per user requirements, run headed
      },
    },

    // ==========================================================================
    // DESKTOP BROWSERS
    // ==========================================================================
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        headless: false, // Run headed for visual verification
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: VIEWPORTS.desktop,
        headless: false,
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: VIEWPORTS.desktop,
        headless: false,
      },
      dependencies: ['setup'],
    },

    // ==========================================================================
    // MOBILE VIEWPORTS (NFR-07, NFR-08: iOS and Android support)
    // ==========================================================================
    {
      name: 'mobile-iphone',
      use: {
        ...devices['iPhone 12'],
        viewport: VIEWPORTS.iPhone12,
        headless: false,
        // Mobile-specific settings
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-iphone-se',
      use: {
        ...devices['iPhone SE'],
        viewport: VIEWPORTS.iPhoneSE,
        headless: false,
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-android',
      use: {
        ...devices['Pixel 5'],
        viewport: VIEWPORTS.pixel5,
        headless: false,
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-samsung',
      use: {
        ...devices['Galaxy S9+'],
        viewport: VIEWPORTS.samsungGalaxyS21,
        headless: false,
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    // ==========================================================================
    // TABLET VIEWPORTS (NFR-09: Tablet support)
    // ==========================================================================
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: VIEWPORTS.iPadMini,
        headless: false,
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    {
      name: 'tablet-ipad-pro',
      use: {
        ...devices['iPad Pro 11'],
        viewport: VIEWPORTS.iPadPro,
        headless: false,
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    // ==========================================================================
    // PERFORMANCE TESTING PROJECT
    // ==========================================================================
    {
      name: 'performance',
      testMatch: /performance\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        headless: false,
        // Enable performance metrics collection
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration (if serving local test app)
  // webServer: {
  //   command: 'npm run serve',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

// Export config values for use in tests
export { config };
