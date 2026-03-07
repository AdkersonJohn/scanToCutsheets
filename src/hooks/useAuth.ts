import { useState, useEffect, useCallback } from 'react';
import {
  initializeAuth,
  getAccessToken,
  getCurrentUser,
  login,
  isAuthenticated as checkIsAuthenticated,
} from '@/services/authService';
import { resetClient } from '@/services/sharePointService';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
  });

  const authenticate = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await initializeAuth();

      // Check if already authenticated
      const authenticated = await checkIsAuthenticated();

      if (authenticated) {
        // Get access token to ensure it's valid
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Failed to get access token');
        }

        const user = await getCurrentUser();

        setState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user,
        });
      } else {
        // Not authenticated yet
        setState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          user: null,
        });
      }
    } catch (error) {
      console.error('Authentication check failed:', error);

      // For development, allow unauthenticated access with fallback user
      const user = await getCurrentUser();
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        user,
      });
    }
  }, []);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const account = await login();
      if (account) {
        // Reset the Graph client so it gets a fresh token
        resetClient();

        const user = await getCurrentUser();
        setState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user,
        });
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }));
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return {
    ...state,
    authenticate,
    signIn,
  };
}
