import { apiClient } from '@/shared/lib/api-client'
import { ApiResponse, PaginatedResponse } from '@/shared/types'

// Projects API
export const projectsApi = {
  getProjects: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>('/projects', params),

  getProject: (id: string) =>
    apiClient.get<ApiResponse<{ project: any }>>(`/projects/${id}`),

  createProject: (data: any) =>
    apiClient.post<ApiResponse<{ project: any }>>('/projects', data),

  updateProject: (id: string, data: any) =>
    apiClient.put<ApiResponse<{ project: any }>>(`/projects/${id}`, data),

  deleteProject: (id: string) =>
    apiClient.delete<ApiResponse>(`/projects/${id}`),

  searchProjects: (query: string, limit?: number) =>
    apiClient.get<ApiResponse<{ projects: any[]; query: string }>>('/projects/search', {
      q: query,
      limit,
    }),

  getRecentProjects: (limit?: number) =>
    apiClient.get<ApiResponse<{ projects: any[] }>>('/projects/recent', { limit }),
}
