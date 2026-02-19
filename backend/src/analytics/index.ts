/**
 * Analytics Module - Main entry point
 *
 * Initializes Sentry, PostHog, and Prometheus metrics
 */

import logger from '../utils/logger';

// Sentry
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

// PostHog
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
  MetricLabels,
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

  // Initialize Prometheus metrics
  initializeMetrics();

  logger.info('Analytics services initialized', {
    sentry: isSentryInitialized(),
    posthog: isPostHogInitialized(),
    metrics: isMetricsEnabled(),
  });
}

/**
 * Graceful shutdown of all analytics services
 */
export async function shutdownAnalytics(): Promise<void> {
  logger.info('Shutting down analytics services...');

  try {
    // Flush Sentry events
    await flushSentry(2000);

    // Shutdown PostHog
    await shutdownPostHog();

    logger.info('Analytics services shutdown complete');
  } catch (error) {
    logger.error('Error during analytics shutdown', { error });
  }
}

// Re-export Sentry functions
export {
  // Sentry
  setupSentryErrorHandler,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  isSentryInitialized,
  Sentry,

  // PostHog
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
