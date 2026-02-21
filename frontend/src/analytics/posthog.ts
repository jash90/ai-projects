/**
 * PostHog Frontend Analytics
 * Product event tracking with GDPR consent
 */

import posthog from 'posthog-js';

export function isPostHogReady(): boolean {
  return !!(import.meta.env.VITE_POSTHOG_KEY) && posthog.__loaded;
}

export function identifyUser(user: { id: string; email?: string; username?: string; role?: string }): void {
  if (!isPostHogReady()) return;
  try {
    posthog.identify(user.id, {
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } catch {}
}

export function resetUser(): void {
  if (!isPostHogReady()) return;
  try { posthog.reset(); } catch {}
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) return;
  try { posthog.capture(eventName, properties); } catch {}
}

export function trackPageView(properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) return;
  try { posthog.capture('$pageview', properties); } catch {}
}

export const events = {
  pageViewed(path: string): void { try { trackEvent('page_viewed', { path }); } catch {} },

  projectCreated(props?: { projectId?: string; name?: string }): void {
    try { trackEvent('project_created', props); } catch {}
  },
  projectViewed(props?: { projectId?: string }): void {
    try { trackEvent('project_viewed', props); } catch {}
  },
  projectDeleted(props?: { projectId?: string }): void {
    try { trackEvent('project_deleted', props); } catch {}
  },

  agentCreated(props?: { agentId?: string; provider?: string; model?: string }): void {
    try { trackEvent('agent_created', props); } catch {}
  },
  agentUpdated(props?: { agentId?: string }): void {
    try { trackEvent('agent_updated', props); } catch {}
  },
  agentDeleted(props?: { agentId?: string }): void {
    try { trackEvent('agent_deleted', props); } catch {}
  },

  chatMessageSent(props?: { provider?: string; model?: string }): void {
    try { trackEvent('chat_message_sent', props); } catch {}
  },
  chatStreamStarted(props?: { provider?: string; model?: string }): void {
    try { trackEvent('chat_stream_started', props); } catch {}
  },
  chatStreamCompleted(props?: { provider?: string; model?: string; durationMs?: number }): void {
    try { trackEvent('chat_stream_completed', props); } catch {}
  },
  chatStreamFailed(props?: { error?: string }): void {
    try { trackEvent('chat_stream_failed', props); } catch {}
  },

  fileCreated(props?: { projectId?: string; name?: string }): void {
    try { trackEvent('file_created', props); } catch {}
  },
  fileUploaded(props?: { projectId?: string; fileType?: string }): void {
    try { trackEvent('file_uploaded', props); } catch {}
  },
  fileDeleted(props?: { projectId?: string }): void {
    try { trackEvent('file_deleted', props); } catch {}
  },

  themeChanged(theme: string): void { try { trackEvent('theme_changed', { theme }); } catch {} },

  loginCompleted(props?: { provider?: string }): void {
    try { trackEvent('login_completed', props); } catch {}
  },
  logoutCompleted(): void { try { trackEvent('logout_completed'); } catch {} },
  registrationCompleted(props?: { email?: string }): void {
    try { trackEvent('registration_completed', props); } catch {}
  },

  errorDisplayed(props?: { error?: string; componentStack?: string }): void {
    try { trackEvent('error_displayed', props); } catch {}
  },
};

export { posthog };
