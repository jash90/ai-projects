/**
 * Sentry Frontend Integration
 * React error tracking with browser tracing and session replay
 */

import * as Sentry from '@sentry/react';
import {
  useEffect,
} from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
  Routes,
} from 'react-router-dom';
import { isAnalyticsAllowed } from '@/utils/consent';
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

    // Session Replay - only active when user has granted analytics consent (GDPR/RODO)
    replaysSessionSampleRate: isAnalyticsAllowed()
      ? parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE || '0.1')
      : 0,
    replaysOnErrorSampleRate: isAnalyticsAllowed()
      ? parseFloat(import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE || '1.0')
      : 0,

    // Integrations
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Replay integration included but gated by sample rates above (0 = no recording)
      Sentry.replayIntegration({
        // Privacy-first configuration: mask all text and block media by default
        // Elements that must remain visible can use data-sentry-unmask attribute
        // Example: <h1 data-sentry-unmask>Page Title</h1>
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error instanceof Error) {
        // AbortError = user navigated away or cancelled request — expected, drop it
        if (error.name === 'AbortError' || error.message.includes('AbortError')) {
          return null;
        }

        // Tag network errors for filtering in Sentry dashboard instead of dropping
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          event.tags = { ...event.tags, error_type: 'network' };
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

/**
 * Sentry-instrumented Routes component for React Router v6
 * Use this instead of `Routes` from react-router-dom for automatic route tracking
 */
export const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

// Export Sentry for advanced usage (ErrorBoundary, etc.)
export { Sentry };
