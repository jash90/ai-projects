/**
 * Sentry Middleware - Request context and error handling
 */

import type { Request, Response, NextFunction } from 'express';
import { addBreadcrumb } from '../analytics';

/** Query parameter keys that must never appear in breadcrumbs */
const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'api_key', 'apikey',
  'password', 'secret', 'authorization', 'key', 'session',
  'credential', 'auth', 'jwt', 'code', 'reset_token',
]);

/**
 * Strip sensitive keys from a query object.
 * Returns undefined when the result would be empty.
 */
function sanitizeQuery(
  query: Record<string, unknown>
): Record<string, unknown> | undefined {
  const keys = Object.keys(query);
  if (keys.length === 0) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const key of keys) {
    sanitized[key] = SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
      ? '[Filtered]'
      : query[key];
  }
  return sanitized;
}

/**
 * Middleware to add request breadcrumbs
 */
export function sentryBreadcrumbMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.path}`,
    level: 'info',
    data: {
      url: req.url,
      method: req.method,
      query: sanitizeQuery(req.query as Record<string, unknown>),
      // Don't log body for security reasons
    },
  });

  next();
}
