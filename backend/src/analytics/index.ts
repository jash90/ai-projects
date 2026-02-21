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

export type {
  AnalyticsConfig,
  UserContext,
  EventContext,
  PostHogEventProperties,
  BreadcrumbCategory,
  BreadcrumbLevel,
  BreadcrumbData,
} from './types';

export function initializeAnalytics(): void {
  logger.info('Initializing analytics services...');
  initializeSentry();
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
};
