/**
 * Metrics Middleware - Request timing and counting
 */

import type { Request, Response, NextFunction } from 'express';
import { recordHttpRequest, isMetricsEnabled } from '../analytics';

// Paths to skip for metrics (health checks, metrics endpoint itself)
const SKIP_PATHS = ['/api/health', '/metrics', '/favicon.ico'];

/**
 * Middleware to collect HTTP request metrics
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if metrics disabled or path should be skipped
  if (!isMetricsEnabled() || SKIP_PATHS.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  const startTime = process.hrtime.bigint();

  // Hook into response finish event
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationSeconds = durationNs / 1e9;

    recordHttpRequest(req.method, req.path, res.statusCode, durationSeconds);
  });

  next();
}
