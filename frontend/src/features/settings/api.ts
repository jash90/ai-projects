import { apiClient } from '@/shared/lib/api-client';
import type { ApiResponse } from '@/shared/types';
import type { User, UserPreferences } from '@/features/auth/types';
import type { UserUsageStats } from '@/features/admin/types';

export const settingsApi = {
  getProfile: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/settings/profile'),

  updateProfile: (updates: { username?: string; email?: string }) =>
    apiClient.put<ApiResponse<{ user: User }>>('/settings/profile', updates),

  updatePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.put<ApiResponse<{ message: string }>>('/settings/password', data),

  getPreferences: () =>
    apiClient.get<ApiResponse<{ preferences: UserPreferences }>>('/settings/preferences'),

  updatePreferences: (preferences: UserPreferences) =>
    apiClient.put<ApiResponse<{ preferences: UserPreferences }>>('/settings/preferences', preferences),

  getUsage: () =>
    apiClient.get<ApiResponse<{ stats: UserUsageStats }>>('/settings/usage'),
};
