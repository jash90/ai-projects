// Sentry MUST be initialized before React imports
import { initializeSentry, captureException } from '@/analytics/sentry'
initializeSentry()

window.addEventListener('error', (event) => {
  captureException(event.error ?? event.message, {
    mechanism: 'global_error_handler',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  captureException(event.reason ?? 'Unhandled promise rejection', {
    mechanism: 'unhandled_rejection',
  })
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { HelmetProvider } from 'react-helmet-async'
import { PostHogProvider } from 'posthog-js/react'
import { Toaster } from 'react-hot-toast'
import posthog from 'posthog-js'
import App from './App.tsx'
import CookieConsent from '@/components/CookieConsent'
import { isAnalyticsAllowed } from '@/utils/consent'
import { initWebVitals } from '@/utils/webVitals'
import './index.css'

// Initialize i18n
import i18n from './lib/i18n'

// Initialize PWA
import './utils/pwa'

// Initialize Web Vitals tracking
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// PostHog configuration
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
// Session recording controlled by env var (default: disabled)
const enableSessionRecording = import.meta.env.VITE_POSTHOG_ENABLE_SESSION_RECORDING === 'true'

// GDPR/RODO: opt out by default until user explicitly consents
const hasAnalyticsConsent = isAnalyticsAllowed()

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  // Privacy-respecting configuration
  // Tracking is gated on explicit user consent (GDPR/RODO)
  opt_out_capturing_by_default: !hasAnalyticsConsent,
  autocapture: false, // Disabled - use manual event tracking instead
  capture_pageview: false, // Handled manually in App.tsx for SPA route changes
  capture_pageleave: true,
  disable_session_recording: import.meta.env.VITE_POSTHOG_ENABLE_SESSION_RECORDING === 'false',
  session_recording: {
    maskAllInputs: true,
    maskInputOptions: {
      password: true,
      email: true,
      tel: true,
      creditCard: true,
      ssn: true,
    },
  },
  respect_dnt: true, // Respect browser Do Not Track setting
  cross_subdomain_cookie: false, // Limit cookie scope
  persistence: 'localStorage' as const, // Avoid cookies where possible
}

// Defer Web Vitals tracking to avoid blocking first paint.
// PerformanceObserver will still capture buffered FCP/LCP entries.
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(() => initWebVitals())
} else {
  setTimeout(() => initWebVitals(), 0)
}

const toasterElement = (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 4000,
      style: {
        background: 'hsl(var(--card))',
        color: 'hsl(var(--card-foreground))',
        border: '1px solid hsl(var(--border))',
      },
      success: {
        iconTheme: {
          primary: 'hsl(var(--primary))',
          secondary: 'hsl(var(--primary-foreground))',
        },
      },
      error: {
        iconTheme: {
          primary: 'hsl(var(--destructive))',
          secondary: 'hsl(var(--destructive-foreground))',
        },
      },
    }}
  />
)

const appContent = (
  <HelmetProvider>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <App />
        <CookieConsent />
        {toasterElement}
      </QueryClientProvider>
    </I18nextProvider>
  </HelmetProvider>
)

const root = ReactDOM.createRoot(document.getElementById('root')!)

function renderApp() {
  root.render(
    <React.StrictMode>
      {posthogKey && import.meta.env.VITE_POSTHOG_ENABLED !== 'false' ? (
        <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
          {appContent}
        </PostHogProvider>
      ) : (
        appContent
      )}
    </React.StrictMode>,
  )
}

// Wait for i18n to load all translations before rendering to prevent flash
if (i18n.isInitialized) {
  renderApp()
} else {
  i18n.on('initialized', renderApp)
}
