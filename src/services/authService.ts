import * as microsoftTeams from '@microsoft/teams-js';

export interface AuthTokens {
  accessToken: string;
  idToken: string;
}

export async function getTeamsSSOToken(): Promise<string> {
  try {
    const result = await microsoftTeams.authentication.getAuthToken();
    return result;
  } catch (error) {
    console.error('Failed to get Teams SSO token:', error);
    throw error;
  }
}

export async function exchangeTokenForGraphToken(ssoToken: string): Promise<string> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  const response = await fetch(`${apiBaseUrl}/exchange-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ssoToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange token');
  }

  const data = await response.json();
  return data.accessToken;
}

export async function getCurrentUser(): Promise<{ id: string; displayName: string; email: string }> {
  try {
    const context = await microsoftTeams.app.getContext();
    return {
      id: context.user?.id ?? 'unknown',
      displayName: context.user?.displayName ?? 'Unknown User',
      email: context.user?.userPrincipalName ?? 'unknown@example.com',
    };
  } catch (error) {
    console.warn('Not in Teams context, using mock user:', error);
    return {
      id: 'mock-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
    };
  }
}
