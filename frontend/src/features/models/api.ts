import { apiClient } from '@/shared/lib/api-client'
import { ApiResponse } from '@/shared/types'

// AI Models API
export const modelsApi = {
  getModels: () =>
    apiClient.get<ApiResponse<{ models: any[]; count: number }>>('/models'),

  getModelsByProvider: (provider: 'openai' | 'anthropic') =>
    apiClient.get<ApiResponse<{ provider: string; models: any[]; count: number }>>(`/models/providers/${provider}`),

  getModel: (modelId: string) =>
    apiClient.get<ApiResponse<{ model: any }>>(`/models/${modelId}`),

  getProviderStatus: () =>
    apiClient.get<ApiResponse<{ providers: any[] }>>('/models/providers/status'),

  syncModels: () =>
    apiClient.post<ApiResponse<{ results: any[]; summary: any }>>('/models/sync'),
}
