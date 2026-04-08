/**
 * Orval mutator — wraps openapi-fetch client for TanStack Query hook generation.
 * Orval calls customInstance<T>(...) which delegates to apiClient.GET/POST/etc.
 */
import { apiClient } from './client';
import type { paths } from './generated/schema';

type Method = keyof paths[string];
type Path = keyof paths;
type Op<P extends Path, M extends Method> = paths[P][M];

type RequestOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: {
    path?: Record<string, string | number>;
    query?: Record<string, unknown>;
  };
  body?: unknown;
  signal?: AbortSignal;
};

// Extract the success response data type
type SuccessResponse<T> = T extends { 200: { content: { 'application/json': infer D } } }
  ? D
  : T extends { 201: { content: { 'application/json': infer D } } }
  ? D
  : unknown;

export async function customInstance<T>(request: RequestOptions): Promise<T> {
  const { url, method, params, body, signal } = request;

  // Map URL pattern (/projects/{id}) + params to openapi-fetch call
  const pathParams = (params?.path || {}) as Record<string, string>;
  const queryParams = params?.query as Record<string, unknown> | undefined;

  const fetchParams = {
    params: {
      path: pathParams,
      ...(queryParams ? { query: queryParams } : {}),
    },
    body: body as any,
    signal,
  };

  // Route to the correct apiClient method
  const path = url as keyof paths;

  switch (method) {
    case 'GET': {
      const { data, error } = await apiClient.GET(path as any, fetchParams as any);
      if (error) throw error;
      return data as T;
    }
    case 'POST': {
      const { data, error } = await apiClient.POST(path as any, fetchParams as any);
      if (error) throw error;
      return data as T;
    }
    case 'PUT': {
      const { data, error } = await apiClient.PUT(path as any, fetchParams as any);
      if (error) throw error;
      return data as T;
    }
    case 'DELETE': {
      const { data, error } = await apiClient.DELETE(path as any, fetchParams as any);
      if (error) throw error;
      return data as T;
    }
    case 'PATCH': {
      const { data, error } = await apiClient.PATCH(path as any, fetchParams as any);
      if (error) throw error;
      return data as T;
    }
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
