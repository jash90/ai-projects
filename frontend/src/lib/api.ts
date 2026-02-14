import axios, { AxiosInstance } from 'axios'
import { ApiResponse, AuthTokens, PaginatedResponse, User, UserPreferences, AdminStats, UserManagement, UserUsageStats, TokenLimitUpdate, AdminActivity, Thread, ThreadMessage } from '@/types'
import { authStore } from '@/stores/authStore'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes for AI processing
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

        // Extract meaningful error messages from API responses
        if (error.response?.data) {
          const errorData = error.response.data;
          
          // Create a structured error object that preserves all error information
          const structuredError = new Error(errorData.error || errorData.message || 'API Error');
          structuredError.name = 'APIError';
          
          // Attach the full error data for better error handling
          (structuredError as any).errorData = errorData;
          
          return Promise.reject(structuredError);
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

  // Multipart form data upload
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  // Multipart form data update
  async putFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.put<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
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

  createAgent: async (data: any) => {
    // Handle file uploads separately if files are present
    if (data.files && data.files.length > 0) {
      const formData = new FormData()
      
      // Add agent data
      Object.keys(data).forEach(key => {
        if (key !== 'files') {
          formData.append(key, data[key])
        }
      })
      
      // Add files
      data.files.forEach((file: File) => {
        formData.append('files', file)
      })
      
      return apiClient.postFormData<ApiResponse<{ agent: any }>>('/agents', formData)
    }
    
    return apiClient.post<ApiResponse<{ agent: any }>>('/agents', data)
  },

  updateAgent: async (id: string, data: any) => {
    // Handle file uploads separately if files are present
    if (data.files && data.files.length > 0) {
      const formData = new FormData()
      
      // Add agent data
      Object.keys(data).forEach(key => {
        if (key !== 'files') {
          formData.append(key, data[key])
        }
      })
      
      // Add files
      data.files.forEach((file: File) => {
        formData.append('files', file)
      })
      
      return apiClient.putFormData<ApiResponse<{ agent: any }>>(`/agents/${id}`, formData)
    }
    
    return apiClient.put<ApiResponse<{ agent: any }>>(`/agents/${id}`, data)
  },

  deleteAgent: (id: string) =>
    apiClient.delete<ApiResponse>(`/agents/${id}`),

  getAgentStats: (id: string) =>
    apiClient.get<ApiResponse<{ agent_id: string; conversations_using: number; can_delete: boolean }>>(`/agents/${id}/stats`),

  // Agent file management
  getAgentFiles: (agentId: string) =>
    apiClient.get<ApiResponse<{ files: any[]; count: number }>>(`/agents/${agentId}/files`),

  deleteAgentFile: (agentId: string, fileId: string) =>
    apiClient.delete<ApiResponse>(`/agents/${agentId}/files/${fileId}`),
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
  sendMessage: async (
    projectId: string,
    agentId: string,
    data: { message: string; includeFiles?: boolean; stream?: boolean; files?: File[] }
  ) => {
    // If files are included, use FormData
    if (data.files && data.files.length > 0) {
      const formData = new FormData()
      formData.append('message', data.message)
      formData.append('includeFiles', String(data.includeFiles !== false))
      formData.append('stream', String(data.stream === true))
      data.files.forEach(file => formData.append('files', file))

      return apiClient.postFormData<ApiResponse<{ conversation: any; response: any }>>(
        `/projects/${projectId}/agents/${agentId}/chat`,
        formData
      )
    }

    // Otherwise use JSON
    return apiClient.post<ApiResponse<{ conversation: any; response: any }>>(
      `/projects/${projectId}/agents/${agentId}/chat`,
      { message: data.message, includeFiles: data.includeFiles, stream: data.stream }
    )
  },

  sendStreamingMessage: async (
    projectId: string,
    agentId: string,
    data: { message: string; includeFiles?: boolean; files?: File[] },
    onChunk: (chunk: string) => void,
    onComplete: (response: any) => void,
    onError: (error: string) => void
  ) => {
    const token = authStore.getState().tokens?.access_token;
    const baseURL = import.meta.env.VITE_API_URL || '/api';

    try {
      let body: FormData | string;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      // If files are included, use FormData
      if (data.files && data.files.length > 0) {
        const formData = new FormData()
        formData.append('message', data.message)
        formData.append('includeFiles', String(data.includeFiles !== false))
        formData.append('stream', 'true')
        data.files.forEach(file => formData.append('files', file))
        body = formData
        // Don't set Content-Type for FormData - browser will set it with boundary
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({
          ...data,
          stream: true
        })
      }

      const response = await fetch(`${baseURL}/projects/${projectId}/agents/${agentId}/chat`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        // Try to extract error message from response body
        try {
          const errorData = await response.json();

          // Create a structured error that preserves all error information
          const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).errorData = errorData;
          throw error;
        } catch (parseError) {
          // If we can't parse the response, fall back to status text
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'complete') {
                onComplete(data);
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      // Handle structured error data properly
      if (error instanceof Error && (error as any).errorData) {
        onError((error as any).errorData);
      } else {
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },

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

// Token usage API
export interface CurrentUsageResponse {
  totalTokens: number;
  monthlyTokens: number;
  limits: {
    globalLimit: number;
    monthlyLimit: number;
  };
  percentUsed: {
    global: number;
    monthly: number;
  };
  remaining: {
    global: number;
    monthly: number;
  };
}

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
}

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

// Admin API
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
    apiClient.put<ApiResponse>(`/admin/users/${userId}/token-limits`, limits),

  // Global token limits
  getGlobalTokenLimits: () =>
    apiClient.get<ApiResponse<{ global_limit: number; monthly_limit: number }>>('/admin/token-limits'),

  updateGlobalTokenLimits: (limits: Omit<TokenLimitUpdate, 'user_id'>) =>
    apiClient.put<ApiResponse>('/admin/token-limits', limits),

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

// Threads API
export const threadsApi = {
  // Get all threads for a project
  getThreads: (projectId: string) =>
    apiClient.get<ApiResponse<{ threads: Thread[] }>>(`/threads/projects/${projectId}`),

  // Create a new thread
  createThread: (projectId: string, title?: string) =>
    apiClient.post<ApiResponse<{ thread: Thread }>>(`/threads/projects/${projectId}`, { title }),

  // Get thread by ID
  getThread: (threadId: string) =>
    apiClient.get<ApiResponse<{ thread: Thread }>>(`/threads/${threadId}`),

  // Update thread
  updateThread: (threadId: string, title: string) =>
    apiClient.put<ApiResponse<{ thread: Thread }>>(`/threads/${threadId}`, { title }),

  // Delete thread
  deleteThread: (threadId: string) =>
    apiClient.delete<ApiResponse>(`/threads/${threadId}`),

  // Get messages for a thread
  getMessages: (threadId: string) =>
    apiClient.get<ApiResponse<{ messages: ThreadMessage[] }>>(`/threads/${threadId}/messages`),

  // Send a chat message in a thread
  sendMessage: (
    threadId: string,
    agentId: string,
    data: { message: string; includeFiles?: boolean; stream?: boolean }
  ) =>
    apiClient.post<ApiResponse<{ message: ThreadMessage; messages: ThreadMessage[]; response: any }>>(
      `/threads/${threadId}/chat`,
      { ...data, agentId }
    ),

  // Send streaming message in a thread
  sendStreamingMessage: async (
    threadId: string,
    agentId: string,
    data: { message: string; includeFiles?: boolean },
    onChunk: (chunk: string) => void,
    onComplete: (response: any) => void,
    onError: (error: string) => void
  ) => {
    const token = authStore.getState().tokens?.access_token;
    const baseURL = import.meta.env.VITE_API_URL || '/api';

    try {
      const response = await fetch(`${baseURL}/threads/${threadId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...data,
          agentId,
          stream: true
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).errorData = errorData;
          throw error;
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'complete') {
                onComplete(data);
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && (error as any).errorData) {
        onError((error as any).errorData);
      } else {
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },

  // Delete a message
  deleteMessage: (threadId: string, messageId: string) =>
    apiClient.delete<ApiResponse>(`/threads/${threadId}/messages/${messageId}`),

  // Get token usage stats for a thread
  getThreadStats: (threadId: string) =>
    apiClient.get<ApiResponse<{
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
      total_cost: number;
      request_count: number;
    }>>(`/threads/${threadId}/stats`),
};

// Settings API
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