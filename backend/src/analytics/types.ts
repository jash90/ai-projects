/**
 * Analytics Types - TypeScript interfaces for Sentry, PostHog, and Prometheus
 */

export interface AnalyticsConfig {
  sentry: {
    dsn: string | undefined;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
    debug: boolean;
    enabled: boolean;
  };
  posthog: {
    apiKey: string | undefined;
    host: string;
    enabled: boolean;
  };
  metrics: {
    enabled: boolean;
    path: string;
    prefix: string;
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

export interface PostHogEventProperties {
  userId?: string;
  projectId?: string;
  agentId?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  responseTimeMs?: number;
  fileType?: string;
  fileSize?: number;
  errorType?: string;
  errorMessage?: string;
  limitType?: string;
  currentUsage?: number;
  limit?: number;
  method?: string;
  [key: string]: unknown;
}

export interface MetricLabels {
  method?: string;
  path?: string;
  status_code?: string;
  provider?: string;
  model?: string;
  type?: string;
  error_type?: string;
  error_code?: string;
}

export type BreadcrumbCategory =
  | 'http'
  | 'auth'
  | 'navigation'
  | 'ui.click'
  | 'console'
  | 'database'
  | 'ai'
  | 'file'
  | 'socket';

export type BreadcrumbLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface BreadcrumbData {
  category: BreadcrumbCategory;
  message: string;
  level?: BreadcrumbLevel;
  data?: Record<string, unknown>;
}
