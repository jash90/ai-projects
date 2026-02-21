import { useState, useEffect } from 'react'
import { posthog } from '@/analytics/posthog'
import { getAnalyticsConsent, setAnalyticsConsent } from '@/utils/consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getAnalyticsConsent() === null) {
      setVisible(true)
    }
  }, [])

  function handleAccept() {
    try { posthog.opt_in_capturing(); } catch {}
    setAnalyticsConsent('granted')
    setVisible(false)
  }

  function handleDecline() {
    try { posthog.opt_out_capturing(); } catch {}
    setAnalyticsConsent('denied')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-card-foreground">
          We use analytics to improve your experience. No personal data is collected without your consent.{' '}
          <a
            href="/privacy"
            className="underline text-primary hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
