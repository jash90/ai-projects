const CONSENT_KEY = 'analytics-consent';

export type ConsentValue = 'granted' | 'denied';

export function getAnalyticsConsent(): ConsentValue | null {
  try {
    return localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(consent: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {}
}

export function isAnalyticsAllowed(): boolean {
  return getAnalyticsConsent() === 'granted';
}
