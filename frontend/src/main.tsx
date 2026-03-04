import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import { isAnalyticsAllowed } from '@/utils/consent'
import { initWebVitals } from '@/utils/webVitals'
import './index.css'

// Initialize i18n
import i18n from './lib/i18n'

// Initialize PWA — deferred to avoid blocking first paint
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(() => import('./utils/pwa'))
} else {
  setTimeout(() => import('./utils/pwa'), 0)
}

// Lazy-load CookieConsent — consent banner can appear after first paint
const CookieConsent = lazy(() => import('@/components/CookieConsent'))

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

// Defer analytics initialization to after first paint
function initAnalytics() {
  // Sentry — deferred init (Sentry.init() has non-trivial setup cost)
  import('@/analytics/sentry').then(({ initializeSentry, captureException }) => {
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
  })

  // PostHog — fully deferred; GDPR opt-out by default
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY
  if (posthogKey && import.meta.env.VITE_POSTHOG_ENABLED !== 'false') {
    const hasAnalyticsConsent = isAnalyticsAllowed()
    import('@/analytics/posthog').then(({ initPostHog }) => {
      initPostHog(posthogKey, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        opt_out_capturing_by_default: !hasAnalyticsConsent,
        autocapture: false,
        capture_pageview: false,
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
        respect_dnt: true,
        cross_subdomain_cookie: false,
        persistence: 'localStorage',
      })
    })
  }
}

// Run analytics init after first paint — doesn't block rendering
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(initAnalytics)
} else {
  setTimeout(initAnalytics, 0)
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
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
        {toasterElement}
      </QueryClientProvider>
    </I18nextProvider>
  </HelmetProvider>
)

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Render immediately — i18n loads only 'common' namespace (1 fetch, fast)
// useSuspense: false means components render with keys as fallback if not yet loaded
root.render(<React.StrictMode>{appContent}</React.StrictMode>)
