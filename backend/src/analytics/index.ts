/**
 * Analytics Module — Sentry + PostHog
 */

import logger from '../utils/logger';

import {
  initializeSentry,
  setupSentryErrorHandler,
  flushSentry,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  isSentryInitialized,
  Sentry,
} from './sentry';

import {
  initializePostHog,
  shutdownPostHog,
  identifyUser,
  trackEvent,
  events,
  isPostHogInitialized,
} from './posthog';

// Prometheus Metrics
import {
  initializeMetrics,
  getMetricsHandler,
  recordHttpRequest,
  recordAiRequest,
  recordError,
  setActiveConnections,
  recordDbQuery,
  setDbConnectionsActive,
  recordRedisOperation,
  isMetricsEnabled,
} from './metrics';

// Types
export type {
  AnalyticsConfig,
  UserContext,
  EventContext,
  PostHogEventProperties,
  BreadcrumbCategory,
  BreadcrumbLevel,
  BreadcrumbData,
} from './types';

/**
 * Initialize all analytics services
 */
export function initializeAnalytics(): void {
  logger.info('Initializing analytics services...');

  // Log Sentry status (init happens in ../instrument.ts before Express is imported)
  initializeSentry();

  // Initialize PostHog
  initializePostHog();
  logger.info('Analytics services initialized', {
    sentry: isSentryInitialized(),
    posthog: isPostHogInitialized(),
  });
}

export async function shutdownAnalytics(): Promise<void> {
  logger.info('Shutting down analytics services...');
  try {
    await flushSentry(2000);
    await shutdownPostHog();
    logger.info('Analytics services shutdown complete');
  } catch (error) {
    logger.error('Error during analytics shutdown', { error });
  }
}

export {
  // Sentry
  setupSentryErrorHandler,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  isSentryInitialized,
  flushSentry,
  Sentry,
  identifyUser,
  trackEvent,
  events,
  isPostHogInitialized,

  // Metrics
  getMetricsHandler,
  recordHttpRequest,
  recordAiRequest,
  recordError,
  setActiveConnections,
  recordDbQuery,
  setDbConnectionsActive,
  recordRedisOperation,
  isMetricsEnabled,
};
