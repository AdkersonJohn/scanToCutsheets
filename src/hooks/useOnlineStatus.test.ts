import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: originalNavigatorOnLine,
    });
  });

  describe('Initial State', () => {
    it('should return isOnline as true when navigator.onLine is true', () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);
      expect(result.current.lastOnlineAt).toBeNull();
    });

    it('should return isOnline as false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Online Event', () => {
    it('should update isOnline to true when online event fires', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should set wasOffline to true when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });
    });

    it('should set lastOnlineAt when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.lastOnlineAt).toBeNull();

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Offline Event', () => {
    it('should update isOnline to false when offline event fires', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should preserve wasOffline state when going offline', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      // Go offline then online to set wasOffline
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });

      // Go offline again
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOnlineStatus());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Multiple Transitions', () => {
    it('should handle multiple online/offline transitions', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      // Initial state
      expect(result.current.isOnline).toBe(true);

      // Go offline
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Go online
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(true);
      });

      // Go offline again
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.wasOffline).toBe(true);
      });

      // Go online again
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });
  });
});
