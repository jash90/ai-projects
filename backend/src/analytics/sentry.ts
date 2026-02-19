/**
 * Sentry Integration - Error tracking and APM for backend
 *
 * IMPORTANT: Sentry.init() is called in ../instrument.ts which MUST be imported
 * before any other modules (including Express/http) for auto-instrumentation to work.
 * This module provides helper functions for error tracking, user context, etc.
 */

import * as Sentry from '@sentry/node';
import type { Express } from 'express';
// Note: nodeProfilingIntegration is configured in ../instrument.ts
import logger from '../utils/logger';
import type { UserContext, EventContext, BreadcrumbData } from './types';

/**
 * Check if Sentry was initialized (by instrument.ts).
 * Uses Sentry's own client check rather than a local flag.
 */
function checkInitialized(): boolean {
  return !!Sentry.getClient()?.getDsn();
}

/**
 * Log Sentry initialization status. Called during app startup from initializeAnalytics().
 */
export function initializeSentry(): void {
  if (checkInitialized()) {
    logger.info('Sentry initialized (via instrument.ts)', {
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    });
  } else if (process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN configured but client not initialized - check instrument.ts import order');
  } else {
    logger.info('Sentry DSN not configured, running without error tracking');
  }
}

/**
 * Setup Express error handler - MUST be called after all routes are registered.
 * Note: In @sentry/node v8+, HTTP request instrumentation is automatic via
 * the built-in httpIntegration - no separate request handler is needed.
 */
export function setupSentryErrorHandler(app: Express): void {
  if (!checkInitialized()) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: UserContext): void {
  if (!checkInitialized()) return;

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
  if (!checkInitialized()) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: EventContext
): string | undefined {
  if (!checkInitialized()) {
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
  if (!checkInitialized()) return undefined;

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(data: BreadcrumbData): void {
  if (!checkInitialized()) return;

  Sentry.addBreadcrumb({
    category: data.category,
    message: data.message,
    level: data.level || 'info',
    data: data.data,
  });
}

/**
 * Starts an inactive span for manual performance monitoring.
 * IMPORTANT: Caller MUST call span.end() when the operation completes.
 * @returns Always returns a span (noop span if Sentry not initialized)
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span {
  if (!checkInitialized()) {
    // Return a noop span that does nothing when not initialized
    return {
      end: () => {},
      setStatus: () => {},
      setAttribute: () => {},
      setAttributes: () => {},
      updateName: () => {},
      isRecording: () => false,
    } as unknown as Sentry.Span;
  }

  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Get current active span
 */
export function getActiveSpan(): Sentry.Span | undefined {
  if (!checkInitialized()) return undefined;
  return Sentry.getActiveSpan();
}

/**
 * Flush all pending events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!checkInitialized()) return true;
  return Sentry.flush(timeout);
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return checkInitialized();
}

// Re-export Sentry for direct access when needed
export { Sentry };
