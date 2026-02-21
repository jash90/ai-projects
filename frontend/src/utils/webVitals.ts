import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { trackEvent } from '@/analytics/posthog';

function reportVital(name: string, value: number, rating: string): void {
  try {
    trackEvent(`web_vital_${name.toLowerCase()}`, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      rating,
      metric_name: name,
    });
  } catch {}
}

export function initWebVitals(): void {
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 0);

  schedule(() => {
    onCLS(({ name, value, rating }) => reportVital(name, value, rating));
    onINP(({ name, value, rating }) => reportVital(name, value, rating));
    onLCP(({ name, value, rating }) => reportVital(name, value, rating));
    onFCP(({ name, value, rating }) => reportVital(name, value, rating));
    onTTFB(({ name, value, rating }) => reportVital(name, value, rating));
  });
}
