import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { trackEvent } from '@/analytics/posthog';

/**
 * Initialize Web Vitals tracking
 *
 * Tracks Core Web Vitals (CLS, INP, LCP) and other performance metrics (FCP, TTFB)
 * and sends them to PostHog for analysis.
 *
 * Core Web Vitals thresholds:
 * - LCP (Largest Contentful Paint): Good < 2.5s, Needs improvement < 4s, Poor >= 4s
 * - INP (Interaction to Next Paint): Good < 200ms, Needs improvement < 500ms, Poor >= 500ms
 * - CLS (Cumulative Layout Shift): Good < 0.1, Needs improvement < 0.25, Poor >= 0.25
 */
export const initWebVitals = () => {
  // Cumulative Layout Shift - measures visual stability
  onCLS((metric: Metric) => {
    trackEvent('web_vital_cls', {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    if (import.meta.env.DEV && metric.rating === 'poor') {
      console.warn('[Web Vitals] Poor CLS detected:', metric.value);
    }
  });

  // Interaction to Next Paint - measures interactivity (replaces FID)
  onINP((metric: Metric) => {
    trackEvent('web_vital_inp', {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    if (import.meta.env.DEV && metric.rating === 'poor') {
      console.warn('[Web Vitals] Poor INP detected:', metric.value);
    }
  });

  // Largest Contentful Paint - measures loading performance
  onLCP((metric: Metric) => {
    trackEvent('web_vital_lcp', {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    if (import.meta.env.DEV && metric.rating === 'poor') {
      console.warn('[Web Vitals] Poor LCP detected:', metric.value);
    }
  });

  // First Contentful Paint - measures when first content is rendered
  onFCP((metric: Metric) => {
    trackEvent('web_vital_fcp', {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });
  });

  // Time to First Byte - measures server response time
  onTTFB((metric: Metric) => {
    trackEvent('web_vital_ttfb', {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    if (import.meta.env.DEV && metric.rating === 'poor') {
      console.warn('[Web Vitals] Poor TTFB detected:', metric.value);
    }
  });

  if (import.meta.env.DEV) {
    console.log('[Web Vitals] Initialized - tracking CLS, INP, LCP, FCP, TTFB');
  }
};
