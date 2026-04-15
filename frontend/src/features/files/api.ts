import { apiClient } from '@/shared/lib/api-client'
import { ApiResponse, PaginatedResponse } from '@/shared/types'

// Project Files API (for text-based files)
export const filesApi = {
  getFiles: (projectId: string) =>
    apiClient.get<ApiResponse<{ files: any[]; count: number }>>(`/projects/${projectId}/files`),

  getProjectFiles: (projectId: string) =>
    apiClient.get<ApiResponse<{ files: any[]; count: number }>>(`/projects/${projectId}/files`),

  createFile: (projectId: string, data: { name: string; content: string; type: string }) =>
    apiClient.post<ApiResponse<{ file: any }>>(`/projects/${projectId}/files`, data),

  getFile: (id: string) =>
    apiClient.get<ApiResponse<{ file: any }>>(`/files/${id}`),

  updateFile: (id: string, data: { name?: string; content?: string; type?: string }) =>
    apiClient.put<ApiResponse<{ file: any }>>(`/files/${id}`, data),

  deleteFile: (id: string) =>
    apiClient.delete<ApiResponse>(`/files/${id}`),

  searchFiles: (projectId: string, query: string) =>
    apiClient.get<ApiResponse<{ files: any[]; query: string; count: number }>>(`/projects/${projectId}/files/search`, {
      q: query,
    }),

  getFilesByType: (projectId: string, type: string) =>
    apiClient.get<ApiResponse<{ files: any[]; type: string; count: number }>>(`/projects/${projectId}/files/type/${type}`),

  getStats: (projectId: string) =>
    apiClient.get<ApiResponse<{ project_id: string; total_files: number; file_types: any[] }>>(`/projects/${projectId}/files/stats`),
}

// Alias for project text files
export const projectFilesApi = filesApi

export const uploadedFilesApi = {
  getFiles: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>(`/projects/${projectId}/uploads`, params),

  uploadFile: (projectId: string, file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile<ApiResponse<{ file: any }>>(`/projects/${projectId}/uploads`, file, onProgress),

  getFile: (id: string) =>
    apiClient.get(`/files/${id}`),

  downloadFile: (id: string, filename?: string) =>
    apiClient.downloadFile(`/files/${id}/download`, filename),

  deleteFile: (id: string) =>
    apiClient.delete<ApiResponse>(`/files/${id}`),

  getFilesByType: (projectId: string, mimetype: string) =>
    apiClient.get<ApiResponse<{ files: any[]; mimetype: string; count: number }>>(`/projects/${projectId}/uploads/type/${mimetype}`),

  searchFiles: (projectId: string, query: string, limit?: number) =>
    apiClient.get<ApiResponse<{ files: any[]; query: string; results_count: number }>>(`/projects/${projectId}/uploads/search`, {
      q: query,
      limit,
    }),

  getStats: (projectId: string) =>
    apiClient.get<ApiResponse<any>>(`/projects/${projectId}/uploads/stats`),
}
