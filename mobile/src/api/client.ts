import { Platform } from 'react-native';
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { getAccessToken, refreshAccessToken } from '../lib/auth';

// iOS Simulator shares host network — localhost works on sim.
// For physical devices, use the host machine's LAN IP.
const getBaseUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:3001/api';
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getBaseUrl();

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
