import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Reset modules before each test to ensure clean state
beforeEach(() => {
  vi.resetModules();
});

// Mock window.matchMedia for Fluent UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for Fluent UI components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  configurable: true,
  value: true,
});

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
      PROD: false,
      MODE: 'test',
      VITE_AZURE_CLIENT_ID: 'test-client-id',
      VITE_AZURE_TENANT_ID: 'test-tenant-id',
      VITE_AZURE_REDIRECT_URI: 'http://localhost:5173',
      VITE_SHAREPOINT_SITE_ID: '',
      VITE_SHAREPOINT_LIST_ID: '',
    },
  },
});

// Mock Microsoft Teams SDK
vi.mock('@microsoft/teams-js', () => ({
  app: {
    initialize: vi.fn().mockRejectedValue(new Error('Not in Teams')),
    getContext: vi.fn().mockResolvedValue({}),
    notifySuccess: vi.fn(),
  },
  barCode: {
    isSupported: vi.fn().mockReturnValue(false),
    scanBarCode: vi.fn(),
  },
  authentication: {
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

// Mock Quagga2
vi.mock('@ericblade/quagga2', () => ({
  default: {
    init: vi.fn((config, callback) => callback(null)),
    start: vi.fn(),
    stop: vi.fn(),
    onDetected: vi.fn(),
  },
}));
