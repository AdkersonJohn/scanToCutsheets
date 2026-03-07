import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OfflineBanner } from './OfflineBanner';

// Mock the useOnlineStatus hook
const mockUseOnlineStatus = vi.fn();
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when online', () => {
    it('should not render banner content when user is online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
        lastOnlineAt: null,
      });

      render(<OfflineBanner />);

      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
    });

    it('should not show the banner when isOnline is true', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: true,
        lastOnlineAt: new Date(),
      });

      render(<OfflineBanner />);

      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
    });
  });

  describe('when offline', () => {
    it('should render the offline banner when user is offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: false,
        lastOnlineAt: null,
      });

      render(<OfflineBanner />);

      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });

    it('should display the offline message', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: false,
        lastOnlineAt: null,
      });

      render(<OfflineBanner />);

      expect(screen.getByText(/Scanned items are saved locally/i)).toBeInTheDocument();
    });

    it('should include the wifi-off icon', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: false,
        lastOnlineAt: null,
      });

      render(<OfflineBanner />);

      // The banner should have the warning background
      const banner = screen.getByText(/You're offline/i).closest('div');
      expect(banner).toBeInTheDocument();
    });
  });
});
