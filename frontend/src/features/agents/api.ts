import { apiClient } from '@/shared/lib/api-client'
import { ApiResponse } from '@/shared/types'

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
