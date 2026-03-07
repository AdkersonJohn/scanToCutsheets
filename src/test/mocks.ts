import { vi } from 'vitest';
import type { ScanRecord, ScanningSession } from '@/types';

// Fixed timestamp for deterministic tests
export const FIXED_DATE = new Date('2024-06-15T12:00:00Z');

// Test data factories
export function createScanRecord(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: 'test-record-' + Math.random().toString(36).substring(7),
    assetTag: 'EW26-03975',
    serialNumber: 'ABC1234',
    scannedAt: FIXED_DATE,
    status: 'pending',
    ...overrides,
  };
}

export function createScanningSession(overrides: Partial<ScanningSession> = {}): ScanningSession {
  return {
    id: 'test-session-' + Math.random().toString(36).substring(7),
    userId: 'test-user-123',
    userName: 'Test User',
    startedAt: FIXED_DATE,
    endedAt: null,
    records: [],
    ...overrides,
  };
}

// Mock auth service
export const mockAuthService = {
  initializeAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn().mockResolvedValue(true),
  login: vi.fn().mockResolvedValue({ localAccountId: 'user-123', name: 'Test User' }),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
  }),
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  isInTeams: vi.fn().mockReturnValue(false),
  getMsalInstance: vi.fn().mockReturnValue(null),
  getAccount: vi.fn().mockResolvedValue(null),
};

// Mock SharePoint service
export const mockSharePointService = {
  searchSharePointSites: vi.fn().mockResolvedValue([]),
  getSiteByUrl: vi.fn().mockResolvedValue(null),
  getListsInSite: vi.fn().mockResolvedValue([]),
  getListByName: vi.fn().mockResolvedValue(null),
  createCutSheetItem: vi.fn().mockResolvedValue(undefined),
  submitCutSheets: vi.fn().mockResolvedValue({ successCount: 1, failedCount: 0 }),
  getConfiguredSiteId: vi.fn().mockReturnValue(null),
  getConfiguredListId: vi.fn().mockReturnValue(null),
  isSharePointConfigured: vi.fn().mockReturnValue(false),
  resetClient: vi.fn(),
};

// Mock scanner service
export const mockScannerService = {
  detectScannerType: vi.fn().mockResolvedValue('quagga'),
  getScannerType: vi.fn().mockReturnValue('quagga'),
  scanWithTeamsNative: vi.fn().mockResolvedValue('EW26-03975'),
  triggerHapticFeedback: vi.fn(),
  initializeQuaggaScanner: vi.fn(),
  stopQuaggaScanner: vi.fn(),
};

// Reset all mocks
export function resetAllMocks() {
  Object.values(mockAuthService).forEach(fn => fn.mockClear());
  Object.values(mockSharePointService).forEach(fn => fn.mockClear());
  Object.values(mockScannerService).forEach(fn => fn.mockClear());
}
