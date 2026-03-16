/**
 * Test Data Constants for Power Apps Barcode Scanner
 *
 * This file contains all test fixtures and constants used across unit and E2E tests.
 * Following TDD principles, these represent expected inputs and outputs for the application.
 */

// ============================================================================
// BARCODE TEST DATA
// ============================================================================

/**
 * Valid barcode samples for different formats
 * Reference: FR-02 (Support Code 128, Code 39, QR Code)
 */
export const VALID_BARCODES = {
  // Code 128 format - commonly used for computer asset tags
  CODE_128: {
    standard: 'ASSET-001-2024',
    withNumbers: 'PC12345678',
    alphanumeric: 'DELL-XPS-15-9520',
    maxLength: 'A'.repeat(48), // Code 128 max practical length
  },

  // Code 39 format - older format, uppercase only
  CODE_39: {
    standard: 'ASSET001',
    withSpaces: 'ASSET 001 2024', // Code 39 supports spaces
    withDashes: 'PC-2024-001',
    checkDigit: 'LAPTOP123*', // Code 39 uses * as start/stop
  },

  // QR Code format - can contain URLs or longer text
  QR_CODE: {
    simple: 'QR-ASSET-001',
    url: 'https://inventory.company.com/asset/12345',
    json: '{"assetId":"12345","type":"laptop"}',
    unicode: 'Asset-001-ACME',
  },
} as const;

/**
 * Invalid barcode values that should fail validation
 * Reference: FR-03, FR-16 (Display value for verification, clear error messages)
 */
export const INVALID_BARCODES = {
  empty: '',
  whitespaceOnly: '   ',
  tooLong: 'A'.repeat(500), // Exceeds reasonable SharePoint column limit
  sqlInjection: "'; DROP TABLE Assets; --",
  xssAttempt: '<script>alert("xss")</script>',
  nullByte: 'ASSET\x00001',
  controlChars: 'ASSET\n\r\tVALUE',
  emojiContent: 'ASSET-001-1234',
} as const;

// ============================================================================
// USER TEST DATA
// ============================================================================

/**
 * Test user profiles for authentication scenarios
 * Reference: NFR-01 (Microsoft 365 authentication)
 */
export const TEST_USERS = {
  validUser: {
    email: 'test.scanner@company.onmicrosoft.com',
    displayName: 'Test Scanner User',
    id: 'user-guid-12345',
  },
  adminUser: {
    email: 'admin@company.onmicrosoft.com',
    displayName: 'Admin User',
    id: 'admin-guid-67890',
  },
  guestUser: {
    email: 'guest@external.com',
    displayName: 'External Guest',
    id: 'guest-guid-11111',
  },
} as const;

// ============================================================================
// FORM FIELD TEST DATA
// ============================================================================

/**
 * Location field test values
 * Reference: FR-15, FR-20 (Optional location per scan)
 */
export const LOCATION_VALUES = {
  valid: {
    simple: 'Building A',
    detailed: 'Building A, Floor 3, Room 301',
    withNumbers: 'Warehouse-7-Rack-12',
    maxLength: 'A'.repeat(255), // SharePoint single line text limit
  },
  invalid: {
    tooLong: 'A'.repeat(256),
    xssAttempt: '<script>alert("location")</script>',
  },
} as const;

/**
 * Notes field test values
 * Reference: FR-15, FR-20 (Optional notes per scan)
 */
export const NOTES_VALUES = {
  valid: {
    simple: 'New laptop for IT department',
    multiline: 'Received from vendor.\nSerial verified.\nReady for deployment.',
    withSpecialChars: "User's laptop - needs setup & configuration",
    maxLength: 'A'.repeat(2000), // Reasonable multiline limit
  },
  invalid: {
    xssAttempt: '<img onerror="alert(1)" src="x">',
  },
} as const;

// ============================================================================
// SHAREPOINT DATA MODEL
// ============================================================================

/**
 * Expected SharePoint list schema
 * Reference: Section 4.1 Data Model
 */
export const SHAREPOINT_SCHEMA = {
  listName: 'Computer Asset Scans',
  columns: {
    Title: { type: 'Text', required: false },
    BarcodeValue: { type: 'Text', required: true, maxLength: 255 },
    ScannedBy: { type: 'Person', required: true },
    ScannedDate: { type: 'DateTime', required: true },
    Location: { type: 'Text', required: false, maxLength: 255 },
    Notes: { type: 'Note', required: false },
  },
} as const;

/**
 * Sample SharePoint list items for verification
 */
export const SAMPLE_LIST_ITEMS = {
  minimal: {
    BarcodeValue: 'ASSET-001',
    ScannedBy: { Email: 'test@company.com', Title: 'Test User' },
    ScannedDate: '2024-06-15T10:30:00Z',
  },
  complete: {
    BarcodeValue: 'LAPTOP-XPS-15-001',
    ScannedBy: { Email: 'test@company.com', Title: 'Test User' },
    ScannedDate: '2024-06-15T10:30:00Z',
    Location: 'Building A, Floor 2',
    Notes: 'New laptop for engineering team',
  },
} as const;

// ============================================================================
// TIMING AND PERFORMANCE THRESHOLDS
// ============================================================================

/**
 * Performance thresholds from NFR requirements
 * Reference: NFR-04, NFR-05, NFR-06
 */
export const PERFORMANCE_THRESHOLDS = {
  barcodeScanMs: 2000, // NFR-04: under 2 seconds
  sharePointWriteMs: 5000, // NFR-05: under 5 seconds
  appLoadMs: 10000, // NFR-06: under 10 seconds on mobile
  animationDelayMs: 300, // UI feedback delay
} as const;

// ============================================================================
// VIEWPORT CONFIGURATIONS
// ============================================================================

/**
 * Device viewport sizes for responsive testing
 * Reference: NFR-07, NFR-08, NFR-09 (iOS, Android, Tablet)
 */
export const VIEWPORTS = {
  // Mobile phones
  iPhoneSE: { width: 375, height: 667 },
  iPhone12: { width: 390, height: 844 },
  iPhone14ProMax: { width: 430, height: 932 },
  pixel5: { width: 393, height: 851 },
  samsungGalaxyS21: { width: 360, height: 800 },

  // Tablets
  iPadMini: { width: 768, height: 1024 },
  iPadPro: { width: 1024, height: 1366 },
  androidTablet: { width: 800, height: 1280 },

  // Desktop (for Power Apps web player)
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Expected error messages for various failure scenarios
 * Reference: FR-16 (Clear error messages on failure)
 */
export const ERROR_MESSAGES = {
  // Barcode validation errors
  barcodeEmpty: 'Please scan or enter a barcode value',
  barcodeTooLong: 'Barcode value exceeds maximum length',
  barcodeInvalid: 'Invalid barcode format',

  // SharePoint errors
  sharePointConnection: 'Unable to connect to SharePoint. Please check your connection.',
  sharePointPermission: 'You do not have permission to add items to this list.',
  sharePointTimeout: 'Request timed out. Please try again.',
  sharePointDuplicate: 'This barcode was recently scanned. Submit anyway?',

  // Camera/Scanner errors
  cameraPermission: 'Camera access is required to scan barcodes. Please enable camera permissions.',
  cameraUnavailable: 'Camera is not available on this device.',
  scanFailed: 'Unable to read barcode. Please try again or enter manually.',

  // Network errors
  offline: 'You appear to be offline. Please check your connection.',
  networkError: 'Network error occurred. Please try again.',

  // Authentication errors
  authRequired: 'Please sign in with your Microsoft account.',
  authExpired: 'Your session has expired. Please sign in again.',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

/**
 * Expected success messages and confirmations
 * Reference: FR-04, FR-10 (Feedback on success)
 */
export const SUCCESS_MESSAGES = {
  scanComplete: 'Barcode scanned successfully',
  submitComplete: 'Asset logged to SharePoint',
  formReset: 'Ready for next scan',
} as const;

// ============================================================================
// TEST SELECTORS
// ============================================================================

/**
 * Data-testid selectors for E2E tests
 * These should match the actual Power Apps control names or custom attributes
 */
export const SELECTORS = {
  // Main controls
  scanButton: '[data-testid="scan-button"]',
  manualEntryButton: '[data-testid="manual-entry-button"]',
  submitButton: '[data-testid="submit-button"]',
  resetButton: '[data-testid="reset-button"]',

  // Input fields
  barcodeInput: '[data-testid="barcode-input"]',
  locationInput: '[data-testid="location-input"]',
  notesInput: '[data-testid="notes-input"]',

  // Display elements
  barcodeDisplay: '[data-testid="barcode-display"]',
  scanHistory: '[data-testid="scan-history"]',
  errorMessage: '[data-testid="error-message"]',
  successMessage: '[data-testid="success-message"]',
  loadingIndicator: '[data-testid="loading-indicator"]',

  // Camera/Scanner
  cameraPreview: '[data-testid="camera-preview"]',
  scannerOverlay: '[data-testid="scanner-overlay"]',

  // Power Apps specific (may need adjustment based on actual implementation)
  powerAppsCanvas: 'iframe[title*="Power Apps"]',
  powerAppsPlayer: '.pa-canvas-player',
} as const;

// ============================================================================
// URL CONFIGURATIONS
// ============================================================================

/**
 * Application URLs for different environments
 */
export const APP_URLS = {
  // Power Apps player URLs (placeholder - replace with actual)
  production: 'https://apps.powerapps.com/play/e/{app-id}',
  development: 'https://apps.powerapps.com/play/e/{dev-app-id}',

  // SharePoint URLs
  sharePointSite: 'https://company.sharepoint.com/sites/AssetTracking',
  sharePointList: 'https://company.sharepoint.com/sites/AssetTracking/Lists/ComputerAssetScans',

  // Microsoft login
  microsoftLogin: 'https://login.microsoftonline.com',
} as const;

// ============================================================================
// TEST WORKFLOW SEQUENCES
// ============================================================================

/**
 * Expected workflow step sequences for verification
 * Reference: Section 5 User Workflows
 */
export const WORKFLOW_STEPS = {
  primaryScanWorkflow: [
    'app_loaded',
    'scan_button_visible',
    'scan_initiated',
    'camera_opened',
    'barcode_captured',
    'value_displayed',
    'optional_fields_visible',
    'submit_enabled',
    'submit_clicked',
    'sharepoint_write',
    'success_confirmed',
    'form_reset',
  ],
  manualEntryWorkflow: [
    'app_loaded',
    'manual_entry_clicked',
    'input_field_visible',
    'barcode_entered',
    'optional_fields_visible',
    'submit_enabled',
    'submit_clicked',
    'sharepoint_write',
    'success_confirmed',
    'form_reset',
  ],
  errorRecoveryWorkflow: [
    'action_failed',
    'error_displayed',
    'retry_available',
    'user_retries',
    'action_succeeds',
  ],
} as const;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Generate a unique barcode value for testing
 */
export function generateTestBarcode(prefix = 'TEST'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a complete scan submission payload
 */
export function createScanPayload(overrides: Partial<{
  barcodeValue: string;
  location: string;
  notes: string;
  scannedBy: typeof TEST_USERS.validUser;
  scannedDate: string;
}> = {}) {
  return {
    barcodeValue: overrides.barcodeValue ?? generateTestBarcode(),
    location: overrides.location ?? '',
    notes: overrides.notes ?? '',
    scannedBy: overrides.scannedBy ?? TEST_USERS.validUser,
    scannedDate: overrides.scannedDate ?? new Date().toISOString(),
  };
}

/**
 * Create a mock SharePoint list item response
 */
export function createSharePointItemResponse(payload: ReturnType<typeof createScanPayload>, itemId = 1) {
  return {
    ID: itemId,
    Title: `Scan-${itemId}`,
    BarcodeValue: payload.barcodeValue,
    ScannedBy: {
      Email: payload.scannedBy.email,
      Title: payload.scannedBy.displayName,
    },
    ScannedDate: payload.scannedDate,
    Location: payload.location || null,
    Notes: payload.notes || null,
    Created: payload.scannedDate,
    Modified: payload.scannedDate,
  };
}
