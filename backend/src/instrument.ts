/**
 * Sentry Instrumentation - MUST be imported before any other modules.
 *
 * In @sentry/node v8+, Sentry.init() must run before Express/http are imported
 * so that the SDK can patch those modules for automatic performance monitoring.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/express/install/esm/
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

// Parse SENTRY_SEND_DEFAULT_PII env var (default: false for privacy compliance)
// WARNING: Enabling this sends user IP addresses to Sentry. Verify legal/privacy
// requirements (GDPR, RODO, CCPA) before enabling in production.
const sendDefaultPii = process.env.SENTRY_SEND_DEFAULT_PII === 'true';

if (dsn && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    debug: process.env.SENTRY_DEBUG === 'true',
    sendDefaultPii,

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

    // Filter out 4xx client errors and scrub PII from error messages
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        // Only filter expected client errors (400 bad request, 404 not found)
        // Keep 401/403/409/422 for security and bug detection
        if (statusCode === 400 || statusCode === 404) {
          return null;
        }
      }

      // Scrub potential PII (passwords, tokens, keys) from error messages
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) {
            ex.value = ex.value
              .replace(/password[=:]\s*\S+/gi, 'password=[Filtered]')
              .replace(/token[=:]\s*\S+/gi, 'token=[Filtered]')
              .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[Filtered]')
              .replace(/secret[=:]\s*\S+/gi, 'secret=[Filtered]')
              .replace(/Bearer\s+\S+/gi, 'Bearer [Filtered]')
              .replace(/sk-[a-zA-Z0-9-]{20,}/g, 'sk-[Filtered]')
              .replace(/sk-ant-[a-zA-Z0-9-]{20,}/g, 'sk-ant-[Filtered]')
              .replace(/sk-or-[a-zA-Z0-9-]{20,}/g, 'sk-or-[Filtered]');
          }
        }
      }

      return event;
    },
  });
}
