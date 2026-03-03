import { useState, useEffect, useCallback } from 'react';
import { getTeamsSSOToken, exchangeTokenForGraphToken, getCurrentUser } from '@/services/authService';
import { initializeGraphClient } from '@/services/graphClient';

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
      const ssoToken = await getTeamsSSOToken();
      const graphToken = await exchangeTokenForGraphToken(ssoToken);
      initializeGraphClient(graphToken);

      const user = await getCurrentUser();

      setState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        user,
      });
    } catch (error) {
      console.error('Authentication failed:', error);

      // For development, allow unauthenticated access
      const user = await getCurrentUser();
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        user,
      });
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return {
    ...state,
    authenticate,
  };
}
