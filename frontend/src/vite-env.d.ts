/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  // Sentry
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  readonly VITE_SENTRY_REPLAY_SAMPLE_RATE?: string
  readonly VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE?: string
  readonly VITE_SENTRY_DEBUG?: string
  // PostHog
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_POSTHOG_ENABLED?: string
  readonly VITE_POSTHOG_ENABLE_SESSION_RECORDING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
