/**
 * Jest Setup File
 *
 * This file runs before each test suite and sets up the testing environment.
 * It includes global mocks, custom matchers, and test utilities.
 */

// Extend Jest timeout for slower operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
// Uncomment if needed:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Add custom matchers
expect.extend({
  /**
   * Custom matcher to verify ISO 8601 date format
   */
  toBeISO8601Date(received: string) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    const pass = iso8601Regex.test(received);

    return {
      message: () =>
        pass
          ? `expected ${received} not to be an ISO 8601 date`
          : `expected ${received} to be an ISO 8601 date`,
      pass,
    };
  },

  /**
   * Custom matcher to verify barcode format
   */
  toBeValidBarcodeFormat(received: string) {
    // Valid barcode: non-empty, no control characters, reasonable length
    const isValid =
      typeof received === 'string' &&
      received.length > 0 &&
      received.length <= 255 &&
      !/[\x00-\x1F\x7F]/.test(received);

    return {
      message: () =>
        isValid
          ? `expected ${received} not to be a valid barcode format`
          : `expected ${received} to be a valid barcode format`,
      pass: isValid,
    };
  },

  /**
   * Custom matcher to verify SharePoint Person field format
   */
  toBeSharePointPerson(received: unknown) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'Email' in received &&
      'Title' in received &&
      typeof (received as any).Email === 'string' &&
      typeof (received as any).Title === 'string';

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a SharePoint Person field`
          : `expected ${JSON.stringify(received)} to be a SharePoint Person field with Email and Title`,
      pass,
    };
  },
});

// Declare custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeISO8601Date(): R;
      toBeValidBarcodeFormat(): R;
      toBeSharePointPerson(): R;
    }
  }
}

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  /**
   * Create a fixed timestamp for deterministic testing
   */
  fixedTimestamp: new Date('2024-06-15T10:30:00Z'),

  /**
   * Wait helper for async operations
   */
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Generate a unique test ID
   */
  uniqueId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// Declare global test utilities type
declare global {
  var testUtils: {
    fixedTimestamp: Date;
    wait: (ms: number) => Promise<void>;
    uniqueId: () => string;
  };
}

export {};
