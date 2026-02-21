// Sentry MUST be initialized before React imports
import { initializeSentry, captureException } from '@/analytics/sentry'
initializeSentry()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'
import App from './App.tsx'
import './index.css'
import CookieConsent from '@/components/CookieConsent'
import { isAnalyticsAllowed } from '@/utils/consent'
import { initWebVitals } from '@/utils/webVitals'

// Initialize i18n
import './lib/i18n'

// Initialize PWA
import './utils/pwa'

// Initialize PostHog if key is configured
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
if (posthogKey && import.meta.env.VITE_POSTHOG_ENABLED !== 'false') {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    opt_out_capturing_by_default: !isAnalyticsAllowed(),
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    respect_dnt: true,
    persistence: 'localStorage',
    session_recording: {
      maskAllInputs: true,
    },
  })
}

// Global error handlers for unhandled errors
window.addEventListener('error', (event) => {
  captureException(event.error || new Error(event.message), { source: 'window.onerror' })
})
window.addEventListener('unhandledrejection', (event) => {
  captureException(event.reason, { source: 'unhandledrejection' })
})

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

const AppContent = (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <CookieConsent />
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
    </QueryClientProvider>
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  posthogKey
    ? <PostHogProvider client={posthog}>{AppContent}</PostHogProvider>
    : AppContent
)

// Init web vitals after render (non-blocking)
initWebVitals()
