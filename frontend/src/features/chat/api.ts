import { apiClient } from '@/shared/lib/api-client'
import { authStore } from '@/features/auth/store'
import { ApiResponse } from '@/shared/types'
import type { Thread, ThreadMessage } from './types'

function lazyCapture(err: unknown, ctx?: Record<string, unknown>) {
  import('@/shared/analytics/sentry').then(({ captureException: ce }) => { try { ce(err, ctx); } catch {} })
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

      if (data.files && data.files.length > 0) {
        const formData = new FormData()
        formData.append('message', data.message)
        formData.append('includeFiles', String(data.includeFiles !== false))
        formData.append('stream', 'true')
        data.files.forEach(file => formData.append('files', file))
        body = formData
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
        body,
        credentials: 'include',
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
      lazyCapture(error, { source: 'chat_streaming', agentId, projectId })
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

// Threads API
export const threadsApi = {
  getThreads: (projectId: string) =>
    apiClient.get<ApiResponse<{ threads: Thread[] }>>(`/threads/projects/${projectId}`),

  createThread: (projectId: string, title?: string) =>
    apiClient.post<ApiResponse<{ thread: Thread }>>(`/threads/projects/${projectId}`, { title }),

  getThread: (threadId: string) =>
    apiClient.get<ApiResponse<{ thread: Thread }>>(`/threads/${threadId}`),

  updateThread: (threadId: string, title: string) =>
    apiClient.put<ApiResponse<{ thread: Thread }>>(`/threads/${threadId}`, { title }),

  deleteThread: (threadId: string) =>
    apiClient.delete<ApiResponse>(`/threads/${threadId}`),

  getMessages: (threadId: string) =>
    apiClient.get<ApiResponse<{ messages: ThreadMessage[] }>>(`/threads/${threadId}/messages`),

  sendMessage: (
    threadId: string,
    agentId: string,
    data: { message: string; includeFiles?: boolean; stream?: boolean }
  ) =>
    apiClient.post<ApiResponse<{ message: ThreadMessage; messages: ThreadMessage[]; response: any }>>(
      `/threads/${threadId}/chat`,
      { ...data, agentId }
    ),

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
        }),
        credentials: 'include',
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
      lazyCapture(error, { source: 'thread_streaming', threadId })
      if (error instanceof Error && (error as any).errorData) {
        onError((error as any).errorData);
      } else {
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },

  deleteMessage: (threadId: string, messageId: string) =>
    apiClient.delete<ApiResponse>(`/threads/${threadId}/messages/${messageId}`),

  getThreadStats: (threadId: string) =>
    apiClient.get<ApiResponse<{
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
      total_cost: number;
      request_count: number;
    }>>(`/threads/${threadId}/stats`),
};
