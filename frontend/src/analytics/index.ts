/**
 * Analytics barrel — Sentry + PostHog
 */

export {
  initializeSentry,
  setUser as setSentryUser,
  clearUser as clearSentryUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  SentryRoutes,
  Sentry,
} from './sentry';

export {
  identifyUser,
  resetUser,
  trackEvent,
  trackPageView,
  events,
  posthog,
} from './posthog';

import { setUser as setSentryUserFn, clearUser as clearSentryUserFn } from './sentry';
import { identifyUser as identifyPostHog, resetUser as resetPostHog } from './posthog';

/**
 * Set user in both Sentry and PostHog
 */
export function setUser(user: { id: string; email?: string; username?: string; role?: string }): void {
  try { setSentryUserFn(user); } catch {}
  try { identifyPostHog(user); } catch {}
}

/**
 * Clear user from both Sentry and PostHog
 */
export function clearUser(): void {
  try { clearSentryUserFn(); } catch {}
  try { resetPostHog(); } catch {}
}
