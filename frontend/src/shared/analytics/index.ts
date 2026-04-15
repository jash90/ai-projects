/**
 * Analytics barrel — Sentry + PostHog
 */

export {
  identifyUser,
  resetUser,
  trackEvent,
  trackPageView,
  events,
  initPostHog,
} from './posthog';

import { identifyUser as identifyPostHog, resetUser as resetPostHog } from './posthog';

/**
 * Set user in both Sentry and PostHog
 */
export async function setUser(user: { id: string; email?: string; username?: string; role?: string }): Promise<void> {
  try { identifyPostHog(user); } catch {}
  import('./sentry').then(({ setUser: s }) => { try { s(user); } catch {} })
}

/**
 * Clear user from both Sentry and PostHog
 */
export async function clearUser(): Promise<void> {
  try { resetPostHog(); } catch {}
  import('./sentry').then(({ clearUser: c }) => { try { c(); } catch {} })
}
