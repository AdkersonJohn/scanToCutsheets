import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { ScanningScreen } from './ScanningScreen';
import { useScanStore } from '@/store/scanStore';

// Mock scanner service
vi.mock('@/services/scannerService', () => ({
  detectScannerType: vi.fn().mockResolvedValue('quagga'),
  getScannerType: vi.fn().mockReturnValue('quagga'),
  scanWithTeamsNative: vi.fn().mockResolvedValue('EW26-03975'),
  triggerHapticFeedback: vi.fn(),
  initializeQuaggaScanner: vi.fn(),
  stopQuaggaScanner: vi.fn(),
}));

describe('ScanningScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    useScanStore.getState().reset();
    useScanStore.getState().startSession('user-123', 'Test User');
  });

  describe('Initial State', () => {
    it('should show Scanning header', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText('Scanning')).toBeInTheDocument();
      });
    });

    it('should show 0 scanned badge initially', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText('0 scanned')).toBeInTheDocument();
      });
    });

    it('should show Scanned Items section', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText('Scanned Items')).toBeInTheDocument();
      });
    });
  });

  describe('Scan Mode Indicator', () => {
    it('should show Asset Tag mode indicator initially', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText('Asset Tag')).toBeInTheDocument();
        expect(screen.getByText('Format: EW##-#####')).toBeInTheDocument();
      });
    });
  });

  describe('Scanned Items List', () => {
    it('should show empty state when no items scanned', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText(/No items scanned yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Done Button', () => {
    it('should show Done button', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Done/i)).toBeInTheDocument();
      });
    });

    it('should end session when Done is clicked', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Done/i)).toBeInTheDocument();
      });

      const doneButton = screen.getByText(/Done \(0\)/i);
      await user.click(doneButton);

      expect(useScanStore.getState().currentScreen).toBe('review');
      expect(useScanStore.getState().isScanning).toBe(false);
    });

    it('should show record count in Done button', async () => {
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');

      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Done \(1\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Store State', () => {
    it('should have active session', () => {
      render(<ScanningScreen />);

      expect(useScanStore.getState().session).not.toBeNull();
      expect(useScanStore.getState().isScanning).toBe(true);
    });

    it('should be in assetTag scan mode initially', () => {
      render(<ScanningScreen />);

      expect(useScanStore.getState().scanMode).toBe('assetTag');
    });

    it('should have no pending asset tag initially', () => {
      render(<ScanningScreen />);

      expect(useScanStore.getState().pendingAssetTag).toBeNull();
    });
  });

  describe('Total Count Display', () => {
    it('should show 0 total initially', async () => {
      render(<ScanningScreen />);

      await waitFor(() => {
        expect(screen.getByText('0 total')).toBeInTheDocument();
      });
    });
  });
});
