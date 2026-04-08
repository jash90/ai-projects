/**
 * Orval mutator — bridges orval's call pattern to openapi-fetch.
 * Orval generates: customInstance<T>(url, { method, headers, body, signal, ... })
 * We delegate to the openapi-fetch client which handles serialization.
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

  // Strategy: find the matching path template and extract param values.
  const matchedTemplate = findPathTemplate(url);
  const pathParams = matchedTemplate ? extractPathParams(matchedTemplate, url) : {};

  const queryParams = options.params?.query as Record<string, unknown> | undefined;

  const fetchParams: any = {
    params: {
      path: pathParams,
      ...(queryParams ? { query: queryParams } : {}),
    },
    body,
    signal,
  };

  const path = (matchedTemplate || url) as keyof paths;
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

/**
 * Match a concrete URL like /projects/123/agents/456/chat
 * to a template like /projects/{projectId}/agents/{agentId}/chat
 */
function findPathTemplate(url: string): string | null {
  const templates = Object.keys(pathPaths);
  for (const template of templates) {
    if (urlMatchesTemplate(url, template)) {
      return template;
    }
  }
  return null;
}

function urlMatchesTemplate(url: string, template: string): boolean {
  const urlParts = url.split('/').filter(Boolean);
  const templateParts = template.split('/').filter(Boolean);
  if (urlParts.length !== templateParts.length) return false;
  return urlParts.every((part, i) =>
    templateParts[i].startsWith('{') || templateParts[i] === part
  );
}

function extractPathParams(template: string, url: string): Record<string, string> {
  const templateParts = template.split('/').filter(Boolean);
  const urlParts = url.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  templateParts.forEach((part, i) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      const paramName = part.slice(1, -1);
      params[paramName] = urlParts[i];
    }
  });
  return params;
}

// Build a map of all path templates from the OpenAPI spec
// This is statically known from our openapi.json
const pathPaths: Record<string, true> = {
  '/auth/verify': true,
  '/auth/register': true,
  '/auth/login': true,
  '/auth/logout': true,
  '/auth/refresh': true,
  '/projects': true,
  '/projects/recent': true,
  '/projects/{id}': true,
  '/agents': true,
  '/agents/{id}': true,
  '/conversations/{projectId}': true,
  '/conversations/{projectId}/{agentId}': true,
  '/projects/{projectId}/agents/{agentId}/chat': true,
  '/ai/status': true,
  '/ai/models': true,
  '/ai/providers': true,
  '/files': true,
  '/files/{id}': true,
  '/files/project/{projectId}': true,
  '/threads': true,
  '/threads/{threadId}': true,
  '/threads/{threadId}/messages': true,
  '/threads/{threadId}/chat': true,
  '/usage/current': true,
  '/usage/summary': true,
};
