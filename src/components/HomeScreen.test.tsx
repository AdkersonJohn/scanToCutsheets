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

    it('should show app description', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Scan asset tag barcodes/i)).toBeInTheDocument();
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

    it('should show Start Scanning button when authenticated', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Start Scanning/i)).toBeInTheDocument();
      });
    });

    it('should start session when Start Scanning is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Start Scanning/i)).toBeInTheDocument();
      });

      const startButton = screen.getByText(/Start Scanning/i);
      await user.click(startButton);

      expect(useScanStore.getState().session).not.toBeNull();
      expect(useScanStore.getState().currentScreen).toBe('scanning');
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

    it('should show Resume Session button when there are existing records', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Session/i)).toBeInTheDocument();
      });
    });

    it('should navigate to review screen when Resume Session is clicked', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Resume Session/i)).toBeInTheDocument();
      });

      const resumeButton = screen.getByText(/Resume Session/i);
      await user.click(resumeButton);

      expect(useScanStore.getState().currentScreen).toBe('review');
    });
  });
});
