import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { getAccessToken, refreshAccessToken } from '../lib/auth';

const API_BASE_URL = 'http://localhost:3001/api'; // TODO: use expo-constants in production

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token before each request
apiClient.use({
  async onRequest({ request }) {
    const token = await getAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        throw new Error('SESSION_EXPIRED');
      }
    }
    return response;
  },
});

export type { paths };
