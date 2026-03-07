import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { SubmissionScreen } from './SubmissionScreen';
import { useScanStore } from '@/store/scanStore';

// Mock scanner service
vi.mock('@/services/scannerService', () => ({
  triggerHapticFeedback: vi.fn(),
}));

// Mock SharePoint service
vi.mock('@/services/sharePointService', () => ({
  submitCutSheets: vi.fn(),
  getConfiguredSiteId: vi.fn().mockReturnValue(null),
  getConfiguredListId: vi.fn().mockReturnValue(null),
  isSharePointConfigured: vi.fn().mockReturnValue(false),
}));

// Mock useOnlineStatus hook
const mockUseOnlineStatus = vi.fn();
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

import * as sharePointService from '@/services/sharePointService';

describe('SubmissionScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    useScanStore.getState().reset();

    // Default: online
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: null,
    });

    // Default: SharePoint not configured (demo mode)
    vi.mocked(sharePointService.isSharePointConfigured).mockReturnValue(false);
    vi.mocked(sharePointService.getConfiguredSiteId).mockReturnValue(null);
    vi.mocked(sharePointService.getConfiguredListId).mockReturnValue(null);

    // Setup a session with records
    useScanStore.getState().startSession('user-123', 'Test User');
    useScanStore.getState().addScan('EW26-03975');
    useScanStore.getState().addScan('ABC1234');
    useScanStore.getState().endSession();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should show Submitting header initially', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });

    it('should show Creating cut sheets text', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText(/Creating cut sheets/i)).toBeInTheDocument();
    });

    it('should show progress percentage', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show the scanned record', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('EW26-03975')).toBeInTheDocument();
    });

    it('should show Items header', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('Items')).toBeInTheDocument();
    });
  });

  describe('Offline State', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true,
      });
    });

    it('should show offline message when offline', async () => {
      render(<SubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText("You're Offline")).toBeInTheDocument();
      });
    });

    it('should show header as Offline', async () => {
      render(<SubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('should show message about local save', async () => {
      render(<SubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Your scanned items are saved locally/i)).toBeInTheDocument();
      });
    });

    it('should show Back to Review button when offline', async () => {
      render(<SubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Back to Review/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to review when Back to Review is clicked', async () => {
      render(<SubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Back to Review/i)).toBeInTheDocument();
      });

      const backButton = screen.getByText(/Back to Review/i);
      await user.click(backButton);

      expect(useScanStore.getState().currentScreen).toBe('review');
    });
  });

  describe('Record Status Display', () => {
    it('should show pending status for records being processed', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('should display asset tag in the list', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('EW26-03975')).toBeInTheDocument();
    });
  });

  describe('Multiple Records', () => {
    beforeEach(() => {
      // Add more records
      useScanStore.getState().addScan('EW26-04000');
      useScanStore.getState().addScan('DEF5678');
    });

    it('should show correct total count', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('0 of 2')).toBeInTheDocument();
    });

    it('should show all records in the list', () => {
      render(<SubmissionScreen />);

      expect(screen.getByText('EW26-03975')).toBeInTheDocument();
      expect(screen.getByText('EW26-04000')).toBeInTheDocument();
    });
  });

  describe('Store Integration', () => {
    it('should have correct session state', () => {
      render(<SubmissionScreen />);

      const session = useScanStore.getState().session;
      expect(session).not.toBeNull();
      expect(session?.records.length).toBe(1);
      expect(session?.records[0].assetTag).toBe('EW26-03975');
    });

    it('should have records with pending status initially', () => {
      render(<SubmissionScreen />);

      const session = useScanStore.getState().session;
      expect(session?.records[0].status).toBe('pending');
    });
  });
});
