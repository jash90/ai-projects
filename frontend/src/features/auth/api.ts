import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse } from '@/shared/types'
import type { User, AuthTokens } from './types'

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', data),

  register: (data: { email: string; username: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', data),

  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  getCurrentUser: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),

  getProfile: () =>
    apiClient.get<ApiResponse<{ user: any }>>('/auth/profile'),

  updateProfile: (data: any) =>
    apiClient.put<ApiResponse<{ user: any }>>('/auth/profile', data),

  verifyToken: () =>
    apiClient.get<ApiResponse<{ user: User; valid: boolean }>>('/auth/verify'),
}
