import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';
import { useScanStore } from '@/store/scanStore';

// Mock the auth service
vi.mock('@/services/authService', () => ({
  initializeAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn().mockResolvedValue(false),
  login: vi.fn().mockResolvedValue({ localAccountId: 'user-123', name: 'Test User' }),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
  }),
}));

import * as authService from '@/services/authService';

describe('HomeScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    useScanStore.getState().reset();

    // Default: not authenticated
    vi.mocked(authService.isAuthenticated).mockResolvedValue(false);
  });

  describe('App Content', () => {
    it('should show app title', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Scan to Cut Sheets')).toBeInTheDocument();
      });
    });

    it('should show mode selection prompt when authenticated', async () => {
      vi.mocked(authService.isAuthenticated).mockResolvedValue(true);
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/What would you like to do/i)).toBeInTheDocument();
      });
    });

    it('should show Teams recommendation text', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Works best in Microsoft Teams mobile app/i)).toBeInTheDocument();
      });
    });
  });

  describe('Not Authenticated State', () => {
    it('should show Sign in with Microsoft button when not authenticated', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Sign in with Microsoft/i)).toBeInTheDocument();
      });
    });

    it('should show Start Demo Mode button in dev mode', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Start Demo Mode/i)).toBeInTheDocument();
      });
    });

    it('should call login when Sign in button is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Sign in with Microsoft/i)).toBeInTheDocument();
      });

      const signInButton = screen.getByText(/Sign in with Microsoft/i);
      await user.click(signInButton);

      expect(authService.login).toHaveBeenCalled();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(async () => {
      vi.mocked(authService.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should show user display name', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show mode selection cards when authenticated', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Create Cut Sheets')).toBeInTheDocument();
        expect(screen.getByText('Field Refresh Check')).toBeInTheDocument();
        expect(screen.getByText('Finish Cut Sheets')).toBeInTheDocument();
      });
    });

    it('should show Create Cut Sheets card description', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Scan boxes to create new cut sheets/i)).toBeInTheDocument();
      });
    });

    it('should start session when Create Cut Sheets card is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Create Cut Sheets')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Cut Sheets');
      await user.click(createButton);

      expect(useScanStore.getState().session).not.toBeNull();
      expect(useScanStore.getState().currentScreen).toBe('scanning');
      expect(useScanStore.getState().currentMode).toBe('createCutSheets');
    });

    it('should start field refresh session when Field Refresh Check card is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Field Refresh Check')).toBeInTheDocument();
      });

      const fieldRefreshButton = screen.getByText('Field Refresh Check');
      await user.click(fieldRefreshButton);

      expect(useScanStore.getState().fieldRefreshSession).not.toBeNull();
      expect(useScanStore.getState().currentScreen).toBe('fieldRefreshScan');
      expect(useScanStore.getState().currentMode).toBe('fieldRefreshCheck');
    });

    it('should show Coming Soon for Finish Cut Sheets', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
      });
    });

    it('should call logout when sign out button is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTitle(/Sign out/i)).toBeInTheDocument();
      });

      const signOutButton = screen.getByTitle(/Sign out/i);
      await user.click(signOutButton);

      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('Demo Mode', () => {
    it('should start session with anonymous user when Start Demo Mode is clicked', async () => {
      vi.mocked(authService.isAuthenticated).mockResolvedValue(false);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Start Demo Mode/i)).toBeInTheDocument();
      });

      const demoButton = screen.getByText(/Start Demo Mode/i);
      await user.click(demoButton);

      const session = useScanStore.getState().session;
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('anonymous');
      expect(session?.userName).toBe('Anonymous User');
    });
  });

  describe('Existing Session', () => {
    beforeEach(async () => {
      vi.mocked(authService.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
      });

      // Create an existing session with records
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().setScreen('home');
    });

    it('should show Resume Cut Sheets button when there are existing records', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Cut Sheets/i)).toBeInTheDocument();
      });
    });

    it('should navigate to review screen when Resume Cut Sheets is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Cut Sheets/i)).toBeInTheDocument();
      });

      const resumeButton = screen.getByText(/Resume Cut Sheets/i);
      await user.click(resumeButton);

      expect(useScanStore.getState().currentScreen).toBe('review');
      expect(useScanStore.getState().currentMode).toBe('createCutSheets');
    });
  });

  describe('Existing Field Refresh Session', () => {
    beforeEach(async () => {
      vi.mocked(authService.isAuthenticated).mockResolvedValue(true);
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
      });

      // Create an existing field refresh session with records
      useScanStore.getState().startFieldRefreshSession('user-123', 'John Doe');
      useScanStore.getState().addFieldRefreshRecord({
        assetTag: 'EW22-12345',
        serialNumber: 'XYZ1234',
        department: 'IT',
        locationNotes: 'Building A',
        machineType: 'desktop',
        status: 'pending',
        eligibilityStatus: 'eligible',
      });
      useScanStore.getState().setScreen('home');
    });

    it('should show Resume Field Refresh button when there are existing records', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Field Refresh/i)).toBeInTheDocument();
      });
    });

    it('should navigate to field refresh review screen when Resume Field Refresh is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Field Refresh/i)).toBeInTheDocument();
      });

      const resumeButton = screen.getByText(/Resume Field Refresh/i);
      await user.click(resumeButton);

      expect(useScanStore.getState().currentScreen).toBe('fieldRefreshReview');
    });
  });
});
