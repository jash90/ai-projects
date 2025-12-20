/**
 * Sentry Middleware - Request context and error handling
 */

import type { Request, Response, NextFunction } from 'express';
import { setUserContext, addBreadcrumb } from '../analytics';

// Use type intersection instead of interface extension to avoid conflicts
// with Express global type augmentation
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    username?: string;
    role?: string;
  };
};

/**
 * Middleware to set Sentry user context after authentication
 */
export function sentryUserContextMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (req.user) {
    setUserContext({
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    });

    // Add breadcrumb for authenticated request
    addBreadcrumb({
      category: 'auth',
      message: 'Authenticated request',
      level: 'info',
      data: {
        userId: req.user.id,
        path: req.path,
        method: req.method,
      },
    });
  }

  next();
}

/**
 * Middleware to add request breadcrumbs
 */
export function sentryBreadcrumbMiddleware(
  req: AuthenticatedRequest,
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
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      // Don't log body for security reasons
    },
  });

  next();
}
