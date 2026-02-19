/**
 * PostHog Integration - Product analytics for backend
 */

import { PostHog } from 'posthog-node';
import logger from '../utils/logger';
import { analyticsConfig } from '../utils/config';
import type { UserContext, PostHogEventProperties } from './types';

let client: PostHog | null = null;

/**
 * Initialize PostHog client
 */
export function initializePostHog(): void {
  const { apiKey, host, enabled } = analyticsConfig.posthog;

  if (!apiKey || !enabled) {
    logger.info('PostHog not enabled, skipping initialization');
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    logger.info('PostHog disabled in test environment');
    return;
  }

  try {
    client = new PostHog(apiKey, {
      host,
      flushAt: 20, // Flush after 20 events
      flushInterval: 10000, // Or every 10 seconds
    });

    logger.info('PostHog initialized successfully', { host });
  } catch (error) {
    logger.error('Failed to initialize PostHog', { error });
  }
}

/**
 * Identify a user
 */
export function identifyUser(user: UserContext): void {
  if (!client) return;

  client.identify({
    distinctId: user.id,
    properties: {
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
}

/**
 * Track an event
 */
export function trackEvent(
  eventName: string,
  userId: string,
  properties?: PostHogEventProperties
): void {
  if (!client) return;

  try {
    client.capture({
      distinctId: userId,
      event: eventName,
      properties: {
        ...properties,
        $lib: 'posthog-node',
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    logger.debug('PostHog trackEvent failed', { eventName, error });
  }
}

/**
 * Predefined events for consistent tracking
 */
export const events = {
  // User events
  userLoggedIn: (userId: string, method: string = 'email') => {
    trackEvent('user_logged_in', userId, { method });
  },

  userLoggedOut: (userId: string) => {
    trackEvent('user_logged_out', userId);
  },

  userRegistered: (userId: string, method: string = 'email') => {
    trackEvent('user_registered', userId, { method });
  },

  // Project events
  projectCreated: (userId: string, projectId: string, projectName: string) => {
    trackEvent('project_created', userId, { projectId, projectName });
  },

  projectDeleted: (userId: string, projectId: string) => {
    trackEvent('project_deleted', userId, { projectId });
  },

  projectUpdated: (userId: string, projectId: string) => {
    trackEvent('project_updated', userId, { projectId });
  },

  // Agent events
  agentCreated: (
    userId: string,
    agentId: string,
    provider: string,
    model: string
  ) => {
    trackEvent('agent_created', userId, { agentId, provider, model });
  },

  agentUpdated: (userId: string, agentId: string) => {
    trackEvent('agent_updated', userId, { agentId });
  },

  agentDeleted: (userId: string, agentId: string) => {
    trackEvent('agent_deleted', userId, { agentId });
  },

  // Chat events
  chatMessageSent: (
    userId: string,
    projectId: string,
    agentId: string,
    provider: string,
    model: string,
    tokensUsed: number,
    promptTokens: number,
    completionTokens: number,
    responseTimeMs: number
  ) => {
    trackEvent('chat_message_sent', userId, {
      projectId,
      agentId,
      provider,
      model,
      tokensUsed,
      promptTokens,
      completionTokens,
      responseTimeMs,
    });
  },

  // File events
  fileUploaded: (
    userId: string,
    projectId: string,
    fileType: string,
    fileSize: number
  ) => {
    trackEvent('file_uploaded', userId, { projectId, fileType, fileSize });
  },

  fileDeleted: (userId: string, projectId: string, fileType: string) => {
    trackEvent('file_deleted', userId, { projectId, fileType });
  },

  // Token limit events
  tokenLimitExceeded: (
    userId: string,
    limitType: 'global' | 'monthly',
    currentUsage: number,
    limit: number
  ) => {
    trackEvent('token_limit_exceeded', userId, {
      limitType,
      currentUsage,
      limit,
    });
  },

  // AI error events
  aiError: (
    userId: string,
    provider: string,
    errorType: string,
    errorMessage: string
  ) => {
    trackEvent('ai_error', userId, { provider, errorType, errorMessage });
  },

  // Subscription events
  subscriptionCreated: (userId: string, planId: string, planName: string) => {
    trackEvent('subscription_created', userId, { planId, planName });
  },

  subscriptionCancelled: (userId: string, planId: string) => {
    trackEvent('subscription_cancelled', userId, { planId });
  },
};

/**
 * Shutdown PostHog - flush pending events
 */
export async function shutdownPostHog(): Promise<void> {
  if (!client) return;

  const shutdownTimeoutMs = parseInt(process.env.POSTHOG_SHUTDOWN_TIMEOUT_MS || '10000', 10);

  try {
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('PostHog shutdown timed out')), shutdownTimeoutMs)
    );
    await Promise.race([client.shutdown(), timeout]);
    logger.info('PostHog shutdown complete');
  } catch (error) {
    logger.warn('PostHog shutdown issue', { error });
  }
}

/**
 * Check if PostHog is initialized
 */
export function isPostHogInitialized(): boolean {
  return client !== null;
}
