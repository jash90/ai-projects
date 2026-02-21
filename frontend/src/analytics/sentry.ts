/**
 * Sentry Frontend Integration
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  Routes,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: import.meta.env.VITE_SENTRY_DEBUG === 'true',
    sendDefaultPii: false,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: import.meta.env.VITE_POSTHOG_ENABLE_SESSION_RECORDING !== 'false' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: [/localhost/, /\/api\//, import.meta.env.VITE_API_URL].filter(Boolean) as (string | RegExp)[],
    beforeSend(event) {
      // Filter AbortError (user navigated away)
      if (event.exception?.values?.[0]?.type === 'AbortError') return null;
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

export { Sentry };
