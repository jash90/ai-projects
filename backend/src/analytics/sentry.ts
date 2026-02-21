/**
 * Sentry Integration - Error tracking and APM for backend
 *
 * IMPORTANT: Sentry.init() is called in ../instrument.ts which MUST be imported
 * before any other modules (including Express/http) for auto-instrumentation to work.
 * This module provides helper functions for error tracking, user context, etc.
 */

import * as Sentry from '@sentry/node';
import type { Express } from 'express';
import logger from '../utils/logger';
import type { UserContext, EventContext, BreadcrumbData } from './types';

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
  return Sentry.captureMessage(message, { level, extra: context });
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

export { Sentry };
