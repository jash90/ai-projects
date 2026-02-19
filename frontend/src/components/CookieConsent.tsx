import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import posthog from 'posthog-js'
import { getAnalyticsConsent, setAnalyticsConsent, type ConsentStatus } from '@/utils/consent'

/**
 * GDPR/RODO cookie consent banner.
 *
 * Shown once when the user has not yet made a consent choice.
 * Granting consent enables PostHog analytics and Sentry session replay.
 * Denying consent opts out of all non-essential tracking.
 */
export default function CookieConsent() {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if the user hasn't decided yet
    if (getAnalyticsConsent() === null) {
      setVisible(true)
    }
  }, [])

  function handleConsent(status: ConsentStatus) {
    setAnalyticsConsent(status)
    setVisible(false)

    if (status === 'granted') {
      // Opt in to PostHog tracking
      if (typeof posthog !== 'undefined' && posthog.__loaded) {
        posthog.opt_in_capturing()
      }
    } else {
      // Opt out of PostHog tracking
      if (typeof posthog !== 'undefined' && posthog.__loaded) {
        posthog.opt_out_capturing()
      }
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t('consent.title', 'Cookie preferences')}
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-4 shadow-design-lg sm:p-6">
        <p className="text-sm text-card-foreground">
          {t(
            'consent.message',
            'We use cookies and analytics tools (PostHog, Sentry) to improve this application. Essential error tracking works without consent. Analytics and session recording require your permission.'
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => handleConsent('denied')}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t('consent.decline', 'Decline')}
          </button>
          <button
            type="button"
            onClick={() => handleConsent('granted')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t('consent.accept', 'Accept analytics')}
          </button>
        </div>
      </div>
    </div>
  )
}
