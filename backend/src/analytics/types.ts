export interface AnalyticsConfig {
  sentry: {
    dsn?: string;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
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
  provider?: string;
  model?: string;
  [key: string]: unknown;
}

export type BreadcrumbCategory = 'auth' | 'http' | 'ai' | 'db' | 'navigation' | 'ui';
export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export interface BreadcrumbData {
  category: BreadcrumbCategory;
  message: string;
  level?: BreadcrumbLevel;
  data?: Record<string, unknown>;
}

export interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}
