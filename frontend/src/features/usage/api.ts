import { apiClient } from '@/shared/lib/api-client';
import type { ApiResponse } from '@/shared/types';
import type { CurrentUsageResponse } from './types';

export const usageApi = {
  // Get current token usage with limits (optimized endpoint)
  getCurrentUsage: () =>
    apiClient.get<ApiResponse<CurrentUsageResponse>>('/usage/current'),

  getSummary: (projectId?: string, agentId?: string, startDate?: string, endDate?: string) => {
    const params: any = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    if (projectId) {
      return apiClient.get<ApiResponse<any>>(`/projects/${projectId}/usage`, params)
    } else if (agentId) {
      return apiClient.get<ApiResponse<any>>(`/agents/${agentId}/usage`, params)
    } else {
      return apiClient.get<ApiResponse<any>>('/usage/summary', params)
    }
  },

  getStats: (startDate?: string, endDate?: string) => {
    const params: any = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return apiClient.get<ApiResponse<{ stats: any[] }>>('/usage/stats', params)
  },

  getProjectStats: (projectId: string) =>
    apiClient.get<ApiResponse<{ stats: any[] }>>(`/projects/${projectId}/usage`),

  getAgentStats: (agentId: string) =>
    apiClient.get<ApiResponse<{ stats: any[] }>>(`/agents/${agentId}/usage`)
};
