/**
 * Jest Configuration for Unit Tests
 *
 * This configuration is set up for testing the business logic that would
 * be implemented in custom connectors, Azure Functions, or helper utilities
 * supporting the Power Apps barcode scanner application.
 */

/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.ts',
    '<rootDir>/unit/**/*.spec.ts',
  ],

  // Module name mapping for imports
  moduleNameMapper: {
    '^@fixtures/(.*)$': '<rootDir>/fixtures/$1',
    '^@pages/(.*)$': '<rootDir>/pages/$1',
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@lib/(.*)$': '<rootDir>/../src/lib/$1',
  },

  // Module directories for resolution
  modulePaths: ['<rootDir>/..'],

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'unit/**/*.ts',
    '!unit/**/*.d.ts',
    '!unit/**/*.test.ts',
    '!unit/**/*.spec.ts',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // TypeScript configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  // Verbose output
  verbose: true,

  // Maximum number of workers
  maxWorkers: '50%',

  // Test timeout (10 seconds)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Report slow tests
  slowTestThreshold: 5,

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Display individual test results
  reporters: ['default'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/.auth/',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/test-results/',
    '<rootDir>/coverage/',
  ],
};

module.exports = config;
