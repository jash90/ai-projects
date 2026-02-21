/**
 * Sentry Frontend Integration
 * Error tracking and performance monitoring
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

export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Distributed tracing - propagate trace context to these URLs
    tracePropagationTargets: [
      'localhost',
      /^\/api\//,
      new RegExp(`^${import.meta.env.VITE_API_URL?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''}`),
    ],

    // Session Replay - only active when user has granted analytics consent (GDPR/RODO)
    replaysSessionSampleRate: import.meta.env.VITE_POSTHOG_ENABLE_SESSION_RECORDING !== 'false' ? 0.1 : 0,
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
  });
}

export function setUser(user: { id: string; email?: string; username?: string }): void {
  try {
    Sentry.setUser({ id: user.id, email: user.email, username: user.username });
  } catch {}
}

export function clearUser(): void {
  try { Sentry.setUser(null); } catch {}
}

export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  try { Sentry.captureException(error, { extra: context }); } catch {}
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  try { Sentry.captureMessage(message, level); } catch {}
}

export function addBreadcrumb(
  type: string,
  message: string,
  data?: Record<string, unknown>
): void {
  try {
    Sentry.addBreadcrumb({ type, message, data, level: 'info' });
  } catch {}
}

/**
 * Routes component wrapped with Sentry for automatic route instrumentation
 */
export const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

// Export Sentry for advanced usage (ErrorBoundary, etc.)
export { Sentry };
