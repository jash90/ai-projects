/**
 * Analytics Consent Management
 *
 * Manages user consent for analytics/tracking (GDPR/RODO compliance).
 * - Sentry error tracking runs under "legitimate interest" (always on)
 * - Sentry session replay requires consent
 * - PostHog product analytics requires consent
 */

const CONSENT_KEY = 'analytics-consent';

export type ConsentStatus = 'granted' | 'denied';

/**
 * Get the current consent status.
 * Returns null if the user hasn't made a choice yet.
 */
export function getAnalyticsConsent(): ConsentStatus | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === 'granted' || value === 'denied') return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the user's consent choice.
 */
export function setAnalyticsConsent(consent: ConsentStatus): void {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // localStorage unavailable — consent can't be persisted
  }
}

/**
 * Check if analytics tracking is allowed.
 */
export function isAnalyticsAllowed(): boolean {
  return getAnalyticsConsent() === 'granted';
}
