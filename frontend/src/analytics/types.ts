/**
 * Frontend Analytics Types
 */

export interface AnalyticsConfig {
  sentry: {
    dsn?: string;
    environment: string;
    tracesSampleRate: number;
    replaySampleRate: number;
    replayErrorSampleRate: number;
    debug: boolean;
    enabled: boolean;
  };
  posthog: {
    apiKey?: string;
    host: string;
    enabled: boolean;
  };
}

export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface EventContext {
  userId?: string;
  projectId?: string;
  agentId?: string;
  conversationId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PageViewProperties {
  path: string;
  title?: string;
  referrer?: string;
  projectId?: string;
}

export interface ChatEventProperties {
  projectId: string;
  agentId: string;
  messageLength: number;
  hasFiles?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface ErrorEventProperties {
  errorType: string;
  errorMessage: string;
  componentStack?: string;
  path?: string;
  [key: string]: string | undefined;
}
