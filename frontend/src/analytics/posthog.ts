/**
 * PostHog Frontend Integration
 * Product analytics with user identification and event tracking
 *
 * Note: PostHog is initialized via PostHogProvider in main.tsx
 * These functions work with the provider-initialized instance
 */

import posthog from 'posthog-js';
import type { UserContext, PageViewProperties, ChatEventProperties, ErrorEventProperties } from './types';

/**
 * Check if PostHog is available and initialized
 */
function isPostHogReady(): boolean {
  return typeof posthog !== 'undefined' && posthog.__loaded === true;
}

/**
 * Identify user after authentication
 */
export function identifyUser(user: UserContext): void {
  if (!isPostHogReady()) return;

  posthog.identify(user.id, {
    email: user.email,
    username: user.username,
    role: user.role,
  });

  // Set super properties that will be sent with every event
  posthog.register({
    user_role: user.role,
  });
}

/**
 * Reset user on logout
 */
export function resetUser(): void {
  if (!isPostHogReady()) return;
  posthog.reset();
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;
  posthog.capture(eventName, properties);
}

/**
 * Track page view manually
 */
export function trackPageView(properties?: PageViewProperties): void {
  if (!isPostHogReady()) return;
  posthog.capture('$pageview', properties);
}

/**
 * Set user property
 */
export function setUserProperty(key: string, value: unknown): void {
  if (!isPostHogReady()) return;
  posthog.setPersonProperties({ [key]: value });
}

/**
 * Check if PostHog is enabled
 */
export function isPostHogEnabled(): boolean {
  return isPostHogReady();
}

/**
 * Get PostHog distinct ID (useful for backend correlation)
 */
export function getDistinctId(): string | undefined {
  if (!isPostHogReady()) return undefined;
  return posthog.get_distinct_id();
}

// ============================================
// Predefined Events for Consistent Tracking
// ============================================

export const events = {
  // Page Views
  pageViewed: (path: string, title?: string, projectId?: string) => {
    trackEvent('page_viewed', { path, title, projectId });
  },

  // Project Events
  projectCreated: (projectId: string, name: string) => {
    trackEvent('project_created', { projectId, name });
  },

  projectViewed: (projectId: string, name: string) => {
    trackEvent('project_viewed', { projectId, name });
  },

  projectDeleted: (projectId: string) => {
    trackEvent('project_deleted', { projectId });
  },

  // Agent Events
  agentCreated: (agentId: string, projectId: string, provider: string, model: string) => {
    trackEvent('agent_created', { agentId, projectId, provider, model });
  },

  agentUpdated: (agentId: string, changes: Record<string, unknown>) => {
    trackEvent('agent_updated', { agentId, ...changes });
  },

  agentDeleted: (agentId: string) => {
    trackEvent('agent_deleted', { agentId });
  },

  // Chat Events
  chatMessageSent: (properties: ChatEventProperties) => {
    trackEvent('chat_message_sent', properties);
  },

  chatStreamStarted: (agentId: string, projectId: string) => {
    trackEvent('chat_stream_started', { agentId, projectId });
  },

  chatStreamCompleted: (agentId: string, projectId: string, durationMs: number) => {
    trackEvent('chat_stream_completed', { agentId, projectId, durationMs });
  },

  chatStreamFailed: (agentId: string, projectId: string, error: string, durationMs: number) => {
    trackEvent('chat_stream_failed', { agentId, projectId, error, durationMs });
  },

  // File Events
  fileCreated: (projectId: string, fileName: string) => {
    trackEvent('file_created', { projectId, fileName });
  },

  fileUploaded: (projectId: string, fileType: string, sizeBytes: number) => {
    trackEvent('file_uploaded', { projectId, fileType, sizeBytes });
  },

  fileDeleted: (projectId: string, fileId: string) => {
    trackEvent('file_deleted', { projectId, fileId });
  },

  // Settings Events
  themeChanged: (theme: string) => {
    trackEvent('theme_changed', { theme });
    setUserProperty('preferred_theme', theme);
  },

  languageChanged: (language: string) => {
    trackEvent('language_changed', { language });
    setUserProperty('preferred_language', language);
  },

  // Auth Events
  loginCompleted: (method: string) => {
    trackEvent('login_completed', { method });
  },

  logoutCompleted: () => {
    trackEvent('logout_completed');
  },

  registrationCompleted: () => {
    trackEvent('registration_completed');
  },

  // Error Events
  errorDisplayed: (properties: ErrorEventProperties) => {
    trackEvent('error_displayed', properties);
  },

  // Feature Usage
  featureUsed: (featureName: string, context?: Record<string, unknown>) => {
    trackEvent('feature_used', { featureName, ...context });
  },
};

// Export posthog for advanced usage
export { posthog };
