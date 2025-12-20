/**
 * Sentry Frontend Integration
 * React error tracking with browser tracing and session replay
 */

import * as Sentry from '@sentry/react';
import type { UserContext } from './types';

let isInitialized = false;

/**
 * Initialize Sentry for React application
 */
export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  if (isInitialized) {
    console.log('[Sentry] Already initialized');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',

    // Performance Monitoring
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Distributed tracing - propagate trace context to these URLs
    tracePropagationTargets: [
      'localhost',
      /^\/api\//,
      new RegExp(`^${import.meta.env.VITE_API_URL?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''}`),
    ],

    // Session Replay - Full tracking as requested
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: 1.0, // Always capture replay on errors

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text for privacy but keep structure
        maskAllText: false, // Full tracking - no masking
        blockAllMedia: false, // Full tracking - include media
      }),
    ],

    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter out network errors that are expected
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          return null;
        }
        if (error.message.includes('NetworkError')) {
          return null;
        }
        if (error.message.includes('AbortError')) {
          return null;
        }
      }

      return event;
    },

    // Debug mode for development
    debug: import.meta.env.VITE_SENTRY_DEBUG === 'true',
  });

  isInitialized = true;
  console.log('[Sentry] Initialized successfully');
}

/**
 * Set user context after authentication
 */
export function setUser(user: UserContext | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Set additional context
    Sentry.setContext('user_info', {
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Clear user context on logout
 */
export function clearUser(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

/**
 * Capture exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    console.error('[Sentry] Not initialized, error not captured:', error);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message for non-error events
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (!isInitialized) return;

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for action tracking
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set additional context for debugging
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!isInitialized) return;
  Sentry.setContext(name, context);
}

/**
 * Set tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return isInitialized;
}

// Export Sentry for advanced usage (ErrorBoundary, etc.)
export { Sentry };
