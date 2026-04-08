/**
 * Orval mutator — bridges orval's call pattern to openapi-fetch.
 * Orval generates: customInstance<T>(url, { method, headers, body, signal, ... })
 * We delegate to the openapi-fetch client which handles path/query params & serialization.
 */
import { apiClient } from './client';
import type { paths } from './generated/schema';

export async function customInstance<T>(
  url: string,
  options: RequestInit & {
    method?: string;
    body?: string;
    signal?: AbortSignal;
    params?: { path?: Record<string, string | number>; query?: Record<string, unknown> };
  } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  const body = options.body ? JSON.parse(options.body as string) : undefined;
  const signal = options.signal;
  const pathParams = (options.params?.path || {}) as Record<string, string>;
  const queryParams = options.params?.query as Record<string, unknown> | undefined;

  const fetchParams: any = {
    params: {
      path: pathParams,
      ...(queryParams ? { query: queryParams } : {}),
    },
    body,
    signal,
  };

  const path = url as keyof paths;
  let result: { data: unknown; error: unknown; response: Response };

  switch (method) {
    case 'GET':
      result = await apiClient.GET(path as any, fetchParams);
      break;
    case 'POST':
      result = await apiClient.POST(path as any, fetchParams);
      break;
    case 'PUT':
      result = await apiClient.PUT(path as any, fetchParams);
      break;
    case 'DELETE':
      result = await apiClient.DELETE(path as any, fetchParams);
      break;
    case 'PATCH':
      result = await apiClient.PATCH(path as any, fetchParams);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  if (result.error) {
    throw result.error;
  }

  // Return in orval's expected shape: { data, status, headers }
  return {
    data: result.data,
    status: result.response.status,
    headers: result.response.headers,
  } as T;
}
