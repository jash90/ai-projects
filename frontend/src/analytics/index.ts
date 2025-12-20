/**
 * Frontend Analytics Module
 * Unified initialization and export for Sentry and PostHog
 *
 * Note: PostHog is initialized via PostHogProvider in main.tsx
 * Sentry is initialized directly before React renders
 */

// Import Sentry functions
import { setUser as setSentryUser, clearUser as clearSentryUser } from './sentry';
// Import PostHog functions (init handled by PostHogProvider in main.tsx)
import { identifyUser as identifyPostHogUser, resetUser as resetPostHogUser } from './posthog';
import type { UserContext } from './types';

/**
 * Set user context across all analytics services
 * Call this after successful authentication
 */
export function setUser(user: UserContext): void {
  setSentryUser(user);
  identifyPostHogUser(user);
}

/**
 * Clear user context from all analytics services
 * Call this on logout
 */
export function clearUser(): void {
  clearSentryUser();
  resetPostHogUser();
}

// Re-export everything for convenience
export * from './sentry';
export * from './posthog';
export * from './types';
