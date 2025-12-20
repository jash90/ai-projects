// Sentry must be imported and initialized first for proper instrumentation
import { initializeSentry } from './analytics/sentry'

// Initialize Sentry before anything else
initializeSentry()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PostHogProvider } from 'posthog-js/react'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

// Initialize i18n
import './lib/i18n'

// Initialize PWA
import './utils/pwa'

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
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaults: '2025-11-30' as const,
  // Full tracking configuration
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true,
  disable_session_recording: false,
  session_recording: {
    maskAllInputs: false,
    maskInputOptions: {},
  },
  respect_dnt: false,
  cross_subdomain_cookie: true,
  persistence: 'localStorage+cookie' as const,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={posthogKey || ''} options={posthogOptions}>
      <QueryClientProvider client={queryClient}>
        <App />
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
    </PostHogProvider>
  </React.StrictMode>,
)