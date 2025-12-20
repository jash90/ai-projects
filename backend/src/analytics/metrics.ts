/**
 * Prometheus Metrics - Application performance monitoring
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import type { Request, Response } from 'express';
import logger from '../utils/logger';

// Create a custom registry
const registry = new Registry();

// Prefix for all metrics
const PREFIX = process.env.METRICS_PREFIX || 'aiprojects_';

// Collect default Node.js metrics
collectDefaultMetrics({
  register: registry,
  prefix: PREFIX,
});

// HTTP Request metrics
export const httpRequestsTotal = new Counter({
  name: `${PREFIX}http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: `${PREFIX}http_request_duration_seconds`,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// AI Provider metrics
export const aiRequestsTotal = new Counter({
  name: `${PREFIX}ai_requests_total`,
  help: 'Total number of AI provider requests',
  labelNames: ['provider', 'model', 'status'] as const,
  registers: [registry],
});

export const aiRequestDuration = new Histogram({
  name: `${PREFIX}ai_request_duration_seconds`,
  help: 'AI provider request duration in seconds',
  labelNames: ['provider', 'model'] as const,
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120],
  registers: [registry],
});

export const aiTokensUsed = new Counter({
  name: `${PREFIX}ai_tokens_total`,
  help: 'Total number of AI tokens used',
  labelNames: ['provider', 'model', 'type'] as const,
  registers: [registry],
});

// Error metrics
export const errorsTotal = new Counter({
  name: `${PREFIX}errors_total`,
  help: 'Total number of errors',
  labelNames: ['type', 'code'] as const,
  registers: [registry],
});

// Connection metrics
export const activeConnections = new Gauge({
  name: `${PREFIX}active_connections`,
  help: 'Number of active connections',
  labelNames: ['type'] as const,
  registers: [registry],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: `${PREFIX}db_query_duration_seconds`,
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: `${PREFIX}db_connections_active`,
  help: 'Number of active database connections',
  registers: [registry],
});

// Redis metrics
export const redisOperationsTotal = new Counter({
  name: `${PREFIX}redis_operations_total`,
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'] as const,
  registers: [registry],
});

/**
 * Initialize metrics collection
 */
export function initializeMetrics(): void {
  if (process.env.METRICS_ENABLED === 'false') {
    logger.info('Metrics collection disabled');
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    logger.info('Metrics disabled in test environment');
    return;
  }

  logger.info('Prometheus metrics initialized', {
    prefix: PREFIX,
    path: process.env.METRICS_PATH || '/metrics',
  });
}

/**
 * Get metrics endpoint handler
 */
export function getMetricsHandler() {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (error) {
      logger.error('Error collecting metrics', { error });
      res.status(500).end('Error collecting metrics');
    }
  };
}

/**
 * Normalize path for metrics (remove dynamic segments)
 */
export function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs (whole segments only, preserves v1, v2, etc.)
    // Matches digits that are a complete path segment (between slashes or at end)
    .replace(/\/(\d+)(?=\/|$)/g, '/:id')
    // Remove query strings
    .split('?')[0];
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationSeconds: number
): void {
  const normalizedPath = normalizePath(path);

  httpRequestsTotal.inc({
    method,
    path: normalizedPath,
    status_code: statusCode.toString(),
  });

  httpRequestDuration.observe(
    {
      method,
      path: normalizedPath,
      status_code: statusCode.toString(),
    },
    durationSeconds
  );
}

/**
 * Record AI request metrics
 */
export function recordAiRequest(
  provider: string,
  model: string,
  status: 'success' | 'error',
  durationSeconds: number,
  promptTokens?: number,
  completionTokens?: number
): void {
  aiRequestsTotal.inc({ provider, model, status });
  aiRequestDuration.observe({ provider, model }, durationSeconds);

  if (promptTokens) {
    aiTokensUsed.inc({ provider, model, type: 'prompt' }, promptTokens);
  }
  if (completionTokens) {
    aiTokensUsed.inc({ provider, model, type: 'completion' }, completionTokens);
  }
}

/**
 * Record error
 */
export function recordError(type: string, code: string): void {
  errorsTotal.inc({ type, code });
}

/**
 * Update active connections
 */
export function setActiveConnections(type: 'websocket' | 'http', count: number): void {
  activeConnections.set({ type }, count);
}

/**
 * Get the registry for testing
 */
export function getRegistry(): Registry {
  return registry;
}

/**
 * Check if metrics are enabled
 */
export function isMetricsEnabled(): boolean {
  return process.env.METRICS_ENABLED !== 'false' && process.env.NODE_ENV !== 'test';
}
