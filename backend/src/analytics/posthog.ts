/**
 * PostHog Server-side Analytics
 * Tracks product events and user behavior on the backend
 */

import { PostHog } from 'posthog-node';
import logger from '../utils/logger';
import type { UserContext, PostHogEventProperties } from './types';

let posthogClient: PostHog | null = null;

/**
 * Initialize PostHog client
 */
export function initializePostHog(): void {
  const apiKey = process.env.POSTHOG_API_KEY;
  const enabled = process.env.POSTHOG_ENABLED !== 'false';

  if (!apiKey || !enabled) {
    logger.info('PostHog not configured, running without product analytics');
    return;
  }

  posthogClient = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 20,
    flushInterval: 10000,
  });

  logger.info('PostHog initialized', {
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  });
}

export function isPostHogInitialized(): boolean {
  return posthogClient !== null;
}

/**
 * Identify a user in PostHog
 */
export function identifyUser(user: UserContext): void {
  if (!posthogClient) return;
  try {
    posthogClient.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (e) {
    logger.debug('PostHog identify failed', e);
  }
}

/**
 * Track a generic event
 */
export function trackEvent(
  eventName: string,
  userId: string,
  properties?: PostHogEventProperties
): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture({
      distinctId: userId,
      event: eventName,
      properties,
    });
  } catch (e) {
    logger.debug('PostHog trackEvent failed', e);
  }
}

/**
 * Typed event helpers
 */
export const events = {
  userLoggedIn(userId: string, props?: { provider?: string }): void {
    try { trackEvent('user_logged_in', userId, props); } catch {}
  },

  userLoggedOut(userId: string): void {
    try { trackEvent('user_logged_out', userId); } catch {}
  },

  userRegistered(userId: string, props?: { email?: string; username?: string }): void {
    try { trackEvent('user_registered', userId, props); } catch {}
  },

  projectCreated(userId: string, props?: { projectId?: string; name?: string }): void {
    try { trackEvent('project_created', userId, props); } catch {}
  },

  projectDeleted(userId: string, props?: { projectId?: string }): void {
    try { trackEvent('project_deleted', userId, props); } catch {}
  },

  projectUpdated(userId: string, props?: { projectId?: string }): void {
    try { trackEvent('project_updated', userId, props); } catch {}
  },

  agentCreated(userId: string, props?: { agentId?: string; provider?: string; model?: string }): void {
    try { trackEvent('agent_created', userId, props); } catch {}
  },

  agentUpdated(userId: string, props?: { agentId?: string; provider?: string; model?: string }): void {
    try { trackEvent('agent_updated', userId, props); } catch {}
  },

  agentDeleted(userId: string, props?: { agentId?: string }): void {
    try { trackEvent('agent_deleted', userId, props); } catch {}
  },

  chatMessageSent(
    userId: string,
    props?: {
      tokensUsed?: number;
      promptTokens?: number;
      completionTokens?: number;
      responseTimeMs?: number;
      provider?: string;
      model?: string;
    }
  ): void {
    try { trackEvent('chat_message_sent', userId, props); } catch {}
  },

  fileUploaded(userId: string, props?: { projectId?: string; fileType?: string; fileSize?: number }): void {
    try { trackEvent('file_uploaded', userId, props); } catch {}
  },

  fileDeleted(userId: string, props?: { projectId?: string }): void {
    try { trackEvent('file_deleted', userId, props); } catch {}
  },

  tokenLimitExceeded(userId: string, props?: { limitType?: string }): void {
    try { trackEvent('token_limit_exceeded', userId, props); } catch {}
  },

  aiError(userId: string, props?: { provider?: string; model?: string; error?: string }): void {
    try { trackEvent('ai_error', userId, props); } catch {}
  },
};

/**
 * Graceful shutdown - flush pending events
 */
export async function shutdownPostHog(): Promise<void> {
  if (!posthogClient) return;
  try {
    await posthogClient.shutdown();
    logger.info('PostHog shutdown complete');
  } catch (e) {
    logger.error('PostHog shutdown error', e);
  }
}
