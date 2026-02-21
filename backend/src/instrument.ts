/**
 * Sentry Pre-Init — MUST be imported before any other modules (Express, http, etc.)
 * so that auto-instrumentation can patch them for performance monitoring.
 */
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1');
const debug = process.env.SENTRY_DEBUG === 'true';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    profilesSampleRate,
    debug,
    sendDefaultPii: false,
    integrations: [
      nodeProfilingIntegration(),
    ],
    beforeSend(event) {
      // Filter out 400/404 client errors
      const statusCode = event.contexts?.response?.status_code as number | undefined;
      if (statusCode && statusCode < 500) {
        return null;
      }

      // Scrub PII from request data
      if (event.request) {
        // Scrub sensitive headers
        if (event.request.headers) {
          const headers = event.request.headers as Record<string, string>;
          for (const key of Object.keys(headers)) {
            if (/authorization|cookie|token|api[_-]?key/i.test(key)) {
              headers[key] = '[Filtered]';
            }
          }
        }
        // Scrub sensitive body fields
        if (event.request.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          for (const key of Object.keys(data)) {
            if (/password|token|secret|api[_-]?key|sk-/i.test(key)) {
              data[key] = '[Filtered]';
            }
          }
        }
        // Scrub sensitive query params
        if (event.request.query_string && typeof event.request.query_string === 'object') {
          const qs = event.request.query_string as Record<string, string>;
          for (const key of Object.keys(qs)) {
            if (/token|password|secret|key|apikey|authorization/i.test(key)) {
              qs[key] = '[Filtered]';
            }
          }
        }
      }

      return event;
    },
    beforeSendTransaction(event) {
      // Filter out health check transactions
      if (event.transaction === 'GET /api/health') {
        return null;
      }
      return event;
    },
  });
}
