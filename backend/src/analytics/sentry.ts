/**
 * Sentry Integration - Error tracking and APM for backend
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express } from 'express';
import logger from '../utils/logger';
import type { UserContext, EventContext, BreadcrumbData } from './types';

let isInitialized = false;

/**
 * Initialize Sentry with Express integration
 */
export function initializeSentry(app: Express): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info('Sentry DSN not configured, skipping initialization');
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    logger.info('Sentry disabled in test environment');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      debug: process.env.SENTRY_DEBUG === 'true',

      // Send default PII data (IP address) for user context
      sendDefaultPii: true,

      integrations: [
        nodeProfilingIntegration(),
      ],

      // Filter out health check transactions
      beforeSendTransaction(event) {
        if (event.transaction?.includes('/api/health')) {
          return null;
        }
        return event;
      },

      // Filter out 4xx client errors and add context
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Skip 4xx client errors
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode >= 400 && statusCode < 500) {
            return null;
          }
        }

        return event;
      },
    });

    // Setup Express instrumentation
    Sentry.setupExpressErrorHandler(app);

    isInitialized = true;
    logger.info('Sentry initialized successfully', {
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: UserContext): void {
  if (!isInitialized) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: EventContext
): string | undefined {
  if (!isInitialized) {
    logger.error('Exception captured (Sentry disabled)', { error, context });
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
    tags: {
      userId: context?.userId,
      projectId: context?.projectId,
      agentId: context?.agentId,
      provider: context?.provider,
    },
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: EventContext
): string | undefined {
  if (!isInitialized) return undefined;

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(data: BreadcrumbData): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    category: data.category,
    message: data.message,
    level: data.level || 'info',
    data: data.data,
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  if (!isInitialized) return undefined;

  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Get current active span
 */
export function getActiveSpan(): Sentry.Span | undefined {
  if (!isInitialized) return undefined;
  return Sentry.getActiveSpan();
}

/**
 * Flush all pending events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!isInitialized) return true;
  return Sentry.flush(timeout);
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return isInitialized;
}

// Re-export Sentry for direct access when needed
export { Sentry };
