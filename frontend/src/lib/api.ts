import axios, { AxiosInstance } from 'axios'
import { ApiResponse, AuthTokens, PaginatedResponse } from '@/types'
import { authStore } from '@/stores/authStore'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = authStore.getState().tokens?.access_token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = authStore.getState().tokens?.refresh_token
            if (refreshToken) {
              const response = await this.client.post<ApiResponse<{ access_token: string }>>('/auth/refresh', {
                refresh_token: refreshToken,
              })

              if (response.data.success && response.data.data) {
                const newToken = response.data.data.access_token
                authStore.getState().setTokens({
                  access_token: newToken,
                  refresh_token: refreshToken,
                })

                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return this.client(originalRequest)
              }
            }
          } catch (refreshError) {
            authStore.getState().logout()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url)
    return response.data
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data)
    return response.data
  }

  // File upload with progress
  async uploadFile<T>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  // Get axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: any; tokens: AuthTokens }>>('/auth/login', data),

  register: (data: { email: string; username: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: any; tokens: AuthTokens }>>('/auth/register', data),

  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  getProfile: () =>
    apiClient.get<ApiResponse<{ user: any }>>('/auth/profile'),

  updateProfile: (data: any) =>
    apiClient.put<ApiResponse<{ user: any }>>('/auth/profile', data),

  verifyToken: () =>
    apiClient.get<ApiResponse<{ user: any; valid: boolean }>>('/auth/verify'),
}

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

// Agents API
export const agentsApi = {
  getAgents: () =>
    apiClient.get<ApiResponse<{ agents: any[] }>>('/agents'),

  getAgent: (id: string) =>
    apiClient.get<ApiResponse<{ agent: any }>>(`/agents/${id}`),

  createAgent: (data: any) =>
    apiClient.post<ApiResponse<{ agent: any }>>('/agents', data),

  updateAgent: (id: string, data: any) =>
    apiClient.put<ApiResponse<{ agent: any }>>(`/agents/${id}`, data),

  deleteAgent: (id: string) =>
    apiClient.delete<ApiResponse>(`/agents/${id}`),

  getAgentStats: (id: string) =>
    apiClient.get<ApiResponse<{ agent_id: string; conversations_using: number; can_delete: boolean }>>(`/agents/${id}/stats`),
}

// Conversations API
export const conversationsApi = {
  getConversation: (projectId: string, agentId: string) =>
    apiClient.get<ApiResponse<{ conversation: any }>>(`/conversations/${projectId}/${agentId}`),

  clearConversation: (projectId: string, agentId: string) =>
    apiClient.delete<ApiResponse>(`/conversations/${projectId}/${agentId}`),

  getProjectConversations: (projectId: string) =>
    apiClient.get<ApiResponse<{ conversations: any[] }>>(`/conversations/${projectId}`),

  getConversationStats: (projectId: string, agentId: string) =>
    apiClient.get<ApiResponse<{ message_count: number; last_activity: string | null }>>(`/conversations/${projectId}/${agentId}/stats`),
}

// Chat API
export const chatApi = {
  sendMessage: (projectId: string, agentId: string, data: { message: string; includeFiles?: boolean }) =>
    apiClient.post<ApiResponse<{ conversation: any; response: any }>>(`/projects/${projectId}/agents/${agentId}/chat`, data),

  getAIStatus: () =>
    apiClient.get<ApiResponse<{ providers: Record<string, boolean>; models: Record<string, string[]> }>>('/ai/status'),

  validateAIConfig: (data: { provider: 'openai' | 'anthropic'; model: string }) =>
    apiClient.post<ApiResponse<{ provider: string; model: string; valid: boolean }>>('/ai/validate', data),
}

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

// Uploaded Files API (for binary files)
export const uploadedFilesApi = {
  getFiles: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>(`/projects/${projectId}/files`, params),

  uploadFile: (projectId: string, file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile<ApiResponse<{ file: any }>>(`/projects/${projectId}/files`, file, onProgress),

  getFile: (id: string) =>
    apiClient.get(`/files/${id}`),

  downloadFile: (id: string, filename?: string) =>
    apiClient.downloadFile(`/files/${id}/download`, filename),

  deleteFile: (id: string) =>
    apiClient.delete<ApiResponse>(`/files/${id}`),

  getFilesByType: (projectId: string, mimetype: string) =>
    apiClient.get<ApiResponse<{ files: any[]; mimetype: string; count: number }>>(`/projects/${projectId}/files/type/${mimetype}`),

  searchFiles: (projectId: string, query: string, limit?: number) =>
    apiClient.get<ApiResponse<{ files: any[]; query: string; results_count: number }>>(`/projects/${projectId}/files/search`, {
      q: query,
      limit,
    }),

  getStats: (projectId: string) =>
    apiClient.get<ApiResponse<any>>(`/projects/${projectId}/files/stats`),
}

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

// Alias for project text files
export const projectFilesApi = filesApi