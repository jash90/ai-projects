import { apiClient } from '@/shared/lib/api-client';
import type { ApiResponse } from '@/shared/types';
import type {
  AdminStats,
  UserManagement,
  UserUsageStats,
  TokenLimitUpdate,
  AdminActivity,
} from './types';

export const adminApi = {
  // Dashboard stats
  getStats: () =>
    apiClient.get<ApiResponse<AdminStats>>('/admin/stats'),

  // User management
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'inactive';
  }) =>
    apiClient.get<ApiResponse<{
      users: UserManagement[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/admin/users', params),

  getUserStats: (userId: string) =>
    apiClient.get<ApiResponse<UserUsageStats>>(`/admin/users/${userId}/stats`),

  toggleUserStatus: (userId: string, isActive: boolean) =>
    apiClient.put<ApiResponse>(`/admin/users/${userId}/status`, { is_active: isActive }),

  updateUserTokenLimits: (userId: string, limits: Omit<TokenLimitUpdate, 'user_id'>) =>
    apiClient.put<ApiResponse>(`/admin/users/${userId}/limits`, limits),

  // Global token limits
  getGlobalTokenLimits: () =>
    apiClient.get<ApiResponse<{ global_limit: number; monthly_limit: number }>>('/admin/token-limits'),

  updateGlobalTokenLimits: (limits: Omit<TokenLimitUpdate, 'user_id'>) =>
    apiClient.put<ApiResponse>('/admin/limits/global', limits),

  // Activity log
  getActivity: (params?: {
    page?: number;
    limit?: number;
    admin_user_id?: string;
    action_type?: string;
  }) =>
    apiClient.get<ApiResponse<{
      activities: AdminActivity[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/admin/activity', params),
};
