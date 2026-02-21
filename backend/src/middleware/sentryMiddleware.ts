import { Request, Response, NextFunction } from 'express';
import { addBreadcrumb } from '../analytics/sentry';

const SENSITIVE_PARAM_KEYS = /token|password|secret|key|apikey|authorization/i;

function sanitizeQueryParams(query: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    sanitized[key] = SENSITIVE_PARAM_KEYS.test(key) ? '[Filtered]' : value;
  }
  return sanitized;
}

/**
 * Adds an HTTP breadcrumb to Sentry for each request.
 * Sanitizes query parameters to avoid leaking secrets.
 */
export function sentryBreadcrumbMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    addBreadcrumb({
      category: 'http',
      message: `${req.method} ${req.path}`,
      level: 'info',
      data: {
        method: req.method,
        url: req.path,
        query: sanitizeQueryParams(req.query as Record<string, unknown>),
      },
    });
  } catch {
    // Breadcrumb errors must never break the request
  }
  next();
}
