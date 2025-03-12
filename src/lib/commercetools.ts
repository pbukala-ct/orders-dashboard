import { createClient } from '@commercetools/sdk-client';
import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth';
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http';
import { createRequestBuilder } from '@commercetools/api-request-builder';

// These values should come from environment variables
const projectKey = process.env.NEXT_PUBLIC_CT_PROJECT_KEY || '';
const clientId = process.env.CTP_CLIENT_ID || '';
const clientSecret = process.env.CTP_CLIENT_SECRET || '';
const apiUrl = process.env.CTP_API_URL || '';
const authUrl = process.env.CTP_AUTH_URL || '';

const client = createClient({
  middlewares: [
    createAuthMiddlewareForClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: {
        clientId,
        clientSecret,
      },
    }),
    createHttpMiddleware({
      host: apiUrl,
    }),
  ],
});

export const getRequestBuilder = () => {
  return createRequestBuilder({ projectKey });
};

export default client;