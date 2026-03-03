import { PublicClientApplication, Configuration, AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import * as microsoftTeams from '@microsoft/teams-js';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const graphScopes = ['User.Read', 'Sites.ReadWrite.All'];

let msalInstance: PublicClientApplication | null = null;
let isTeamsContext = false;
let initialized = false;

export async function initializeAuth(): Promise<void> {
  if (initialized) return;

  // Check if we're in Teams
  try {
    await microsoftTeams.app.initialize();
    isTeamsContext = true;
    console.log('Running in Teams context');
  } catch {
    isTeamsContext = false;
    console.log('Not running in Teams context, using MSAL');
  }

  if (!isTeamsContext) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();
  }

  initialized = true;
}

export function isInTeams(): boolean {
  return isTeamsContext;
}

export function getMsalInstance(): PublicClientApplication | null {
  return msalInstance;
}

export async function getAccount(): Promise<AccountInfo | null> {
  if (isTeamsContext) {
    try {
      const context = await microsoftTeams.app.getContext();
      return {
        homeAccountId: context.user?.id || '',
        localAccountId: context.user?.id || '',
        environment: 'teams',
        tenantId: context.user?.tenant?.id || '',
        username: context.user?.userPrincipalName || '',
        name: context.user?.displayName,
      } as AccountInfo;
    } catch {
      return null;
    }
  }

  if (!msalInstance) return null;

  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

export async function login(): Promise<AccountInfo | null> {
  if (!initialized) {
    await initializeAuth();
  }

  if (isTeamsContext) {
    return getAccount();
  }

  if (!msalInstance) {
    throw new Error('MSAL not initialized');
  }

  // Use redirect for mobile browsers (popups are often blocked)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    await msalInstance.loginRedirect({
      scopes: graphScopes,
    });
    // After redirect, the page will reload and handleRedirectPromise() will process the result
    return null;
  }

  try {
    const response = await msalInstance.loginPopup({
      scopes: graphScopes,
    });
    return response.account;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  if (isTeamsContext) {
    return;
  }

  if (!msalInstance) return;

  const account = await getAccount();
  if (account) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      await msalInstance.logoutRedirect({ account });
    } else {
      await msalInstance.logoutPopup({ account });
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!initialized) {
    await initializeAuth();
  }

  if (isTeamsContext) {
    return getTeamsAccessToken();
  }

  return getMsalAccessToken();
}

async function getTeamsAccessToken(): Promise<string | null> {
  try {
    // Get the SSO token from Teams
    const ssoToken = await microsoftTeams.authentication.getAuthToken();

    // Exchange it for a Graph API token via the Azure Function
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';
    const response = await fetch(`${apiBaseUrl}/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ssoToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token exchange failed');
    }

    const { accessToken } = await response.json();
    return accessToken;
  } catch (error) {
    console.error('Failed to get Teams auth token:', error);
    return null;
  }
}

async function getMsalAccessToken(): Promise<string | null> {
  if (!msalInstance) {
    throw new Error('MSAL not initialized');
  }

  const account = await getAccount();
  if (!account) {
    throw new Error('No account found. Please login first.');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: graphScopes,
      account,
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      try {
        const response = await msalInstance.acquireTokenPopup({
          scopes: graphScopes,
          account,
        });
        return response.accessToken;
      } catch (popupError) {
        console.error('Interactive token acquisition failed:', popupError);
        throw popupError;
      }
    }
    throw error;
  }
}

export async function getCurrentUser(): Promise<{ id: string; displayName: string; email: string }> {
  if (!initialized) {
    await initializeAuth();
  }

  const account = await getAccount();

  if (account) {
    return {
      id: account.localAccountId,
      displayName: account.name || account.username,
      email: account.username,
    };
  }

  // Fallback for development
  return {
    id: 'dev-user-id',
    displayName: 'Development User',
    email: 'dev@example.com',
  };
}

export async function isAuthenticated(): Promise<boolean> {
  if (!initialized) {
    await initializeAuth();
  }

  const account = await getAccount();
  return account !== null;
}
