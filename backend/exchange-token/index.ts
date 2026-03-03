import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { ConfidentialClientApplication } from '@azure/msal-node';

interface TokenExchangeRequest {
  ssoToken: string;
}

interface TokenExchangeResponse {
  accessToken: string;
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log('Token exchange function processed a request.');

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    const { ssoToken } = req.body as TokenExchangeRequest;

    if (!ssoToken) {
      context.res = {
        status: 400,
        headers,
        body: { error: 'ssoToken is required' },
      };
      return;
    }

    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      context.res = {
        status: 500,
        headers,
        body: { error: 'Server configuration error' },
      };
      return;
    }

    const msalConfig = {
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    // On-Behalf-Of flow
    const result = await cca.acquireTokenOnBehalfOf({
      oboAssertion: ssoToken,
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result || !result.accessToken) {
      context.res = {
        status: 401,
        headers,
        body: { error: 'Failed to acquire token' },
      };
      return;
    }

    const response: TokenExchangeResponse = {
      accessToken: result.accessToken,
    };

    context.res = {
      status: 200,
      headers,
      body: response,
    };
  } catch (error) {
    context.log.error('Token exchange error:', error);
    context.res = {
      status: 500,
      headers,
      body: {
        error: 'Token exchange failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};

export default httpTrigger;
