// TanStack Query hooks for the AI Projects API
// Types from: npx openapi-typescript openapi.json -o src/api/generated/schema.d.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  LoginInput, RegisterInput,
  CreateProjectInput, UpdateProjectInput,
  CreateAgentInput, UpdateAgentInput,
  CreateFileInput, UpdateFileInput,
} from '../types';

// ─── Query Key Factory ───────────────────────────────────────────────

export const queryKeys = {
  auth: { verify: ['auth', 'verify'] as const },
  projects: {
    all: ['projects'] as const,
    list: (params?: Record<string, unknown>) => ['projects', 'list', params] as const,
    recent: (limit?: number) => ['projects', 'recent', limit] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  agents: {
    all: ['agents'] as const,
    list: ['agents', 'list'] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
  },
  conversations: {
    project: (projectId: string) => ['conversations', 'project', projectId] as const,
    detail: (projectId: string, agentId: string) => ['conversations', projectId, agentId] as const,
  },
  threads: {
    project: (projectId: string) => ['threads', 'project', projectId] as const,
    detail: (threadId: string) => ['threads', 'detail', threadId] as const,
    messages: (threadId: string) => ['threads', threadId, 'messages'] as const,
  },
  files: {
    project: (projectId: string) => ['files', 'project', projectId] as const,
    detail: (id: string) => ['files', 'detail', id] as const,
  },
  models: {
    all: ['models'] as const,
    list: ['models', 'list'] as const,
    providers: ['models', 'providers'] as const,
  },
  usage: {
    current: ['usage', 'current'] as const,
    summary: (params?: Record<string, unknown>) => ['usage', 'summary', params] as const,
  },
} as const;

// ─── Auth Hooks ──────────────────────────────────────────────────────

export function useVerifyAuth() {
  return useQuery({
    queryKey: queryKeys.auth.verify,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/verify');
      if (error) throw error;
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginInput) => {
      const { data, error } = await apiClient.POST('/auth/login', { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.verify }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (body: RegisterInput) => {
      const { data, error } = await apiClient.POST('/auth/register', { body });
      if (error) throw error;
      return data;
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/auth/logout');
      if (error) throw error;
    },
    onSuccess: () => qc.clear(),
  });
}

// ─── Project Hooks ───────────────────────────────────────────────────

export function useProjects(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/projects', { params: { query: params } });
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentProjects(limit = 5) {
  return useQuery({
    queryKey: queryKeys.projects.recent(limit),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/projects/recent', { params: { query: { limit } } });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/projects/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProjectInput) => {
      const { data, error } = await apiClient.POST('/projects', { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & UpdateProjectInput) => {
      const { data, error } = await apiClient.PUT('/projects/{id}', { params: { path: { id } }, body });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/projects/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

// ─── Agent Hooks ─────────────────────────────────────────────────────

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.list,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/agents');
      if (error) throw error;
      return data;
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/agents/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAgentInput) => {
      const { data, error } = await apiClient.POST('/agents', { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents.all }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & UpdateAgentInput) => {
      const { data, error } = await apiClient.PUT('/agents/{id}', { params: { path: { id } }, body });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/agents/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents.all }),
  });
}

// ─── Conversation Hooks ──────────────────────────────────────────────

export function useConversation(projectId: string, agentId: string) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(projectId, agentId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/conversations/{projectId}/{agentId}', {
        params: { path: { projectId, agentId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!agentId,
  });
}

export function useProjectConversations(projectId: string) {
  return useQuery({
    queryKey: queryKeys.conversations.project(projectId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/conversations/{projectId}', {
        params: { path: { projectId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useClearConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, agentId }: { projectId: string; agentId: string }) => {
      const { data, error } = await apiClient.DELETE('/conversations/{projectId}/{agentId}', {
        params: { path: { projectId, agentId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { projectId, agentId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations.detail(projectId, agentId) });
    },
  });
}

// ─── Chat Hooks ──────────────────────────────────────────────────────

export function useChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId, agentId, message, includeFiles = true,
    }: { projectId: string; agentId: string; message: string; includeFiles?: boolean }) => {
      const { data, error } = await apiClient.POST('/projects/{projectId}/agents/{agentId}/chat', {
        params: { path: { projectId, agentId } },
        body: { message, includeFiles, stream: false },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { projectId, agentId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations.detail(projectId, agentId) });
    },
  });
}

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'] as const,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/ai/status');
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Thread Hooks ────────────────────────────────────────────────────

export function useThreads(projectId: string) {
  return useQuery({
    queryKey: queryKeys.threads.project(projectId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/threads/projects/{projectId}', {
        params: { path: { projectId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useThread(threadId: string) {
  return useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/threads/{threadId}', {
        params: { path: { threadId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });
}

export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: queryKeys.threads.messages(threadId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/threads/{threadId}/messages', {
        params: { path: { threadId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string; title?: string }) => {
      const { data, error } = await apiClient.POST('/threads/projects/{projectId}', {
        params: { path: { projectId } },
        body: { title },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: queryKeys.threads.project(projectId) }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { data, error } = await apiClient.DELETE('/threads/{threadId}', { params: { path: { threadId } } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  });
}

export function useThreadChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId, agentId, message, includeFiles = true,
    }: { threadId: string; agentId: string; message: string; includeFiles?: boolean }) => {
      const { data, error } = await apiClient.POST('/threads/{threadId}/chat', {
        params: { path: { threadId } },
        body: { message, agentId, includeFiles, stream: false },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { threadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.messages(threadId) });
      qc.invalidateQueries({ queryKey: queryKeys.threads.detail(threadId) });
    },
  });
}

// ─── Project Files Hooks ─────────────────────────────────────────────

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: queryKeys.files.project(projectId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/projects/{projectId}/files', {
        params: { path: { projectId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useProjectFile(id: string) {
  return useQuery({
    queryKey: queryKeys.files.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/files/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...body }: { projectId: string } & CreateFileInput) => {
      const { data, error } = await apiClient.POST('/projects/{projectId}/files', {
        params: { path: { projectId } }, body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: queryKeys.files.project(projectId) }),
  });
}

export function useUpdateProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & UpdateFileInput) => {
      const { data, error } = await apiClient.PUT('/files/{id}', { params: { path: { id } }, body });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.files.detail(id) });
      qc.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/files/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

// ─── Models Hooks ────────────────────────────────────────────────────

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models.list,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/models');
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useProviderStatus() {
  return useQuery({
    queryKey: queryKeys.models.providers,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/models/providers/status');
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ─── Usage Hooks ─────────────────────────────────────────────────────

export function useCurrentUsage() {
  return useQuery({
    queryKey: queryKeys.usage.current,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/usage/current');
      if (error) throw error;
      return data;
    },
  });
}

export function useUsageSummary(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.usage.summary(params),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/usage/summary', { params: { query: params } });
      if (error) throw error;
      return data;
    },
  });
}
