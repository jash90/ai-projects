import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
}

export async function saveAuth(tokens: { access_token: string; refresh_token: string }, user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const API_BASE_URL = 'http://localhost:3001/api'; // TODO: use expo-constants
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    if (data.access_token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
