import { useEffect } from 'react'
import { useParams, useLocation, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/shared/lib/languages'

export default function LanguageLayout() {
  const { lang } = useParams<{ lang: string }>()
  const location = useLocation()
  const { i18n } = useTranslation()

  // Sync i18n with the lang segment in the URL
  useEffect(() => {
    if (lang && isSupportedLanguage(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  // Invalid lang → treat entire path as legacy and redirect to /<defaultLang><path>
  // e.g. /dashboard → /en/dashboard
  if (!lang || !isSupportedLanguage(lang)) {
    return <Navigate to={`/${DEFAULT_LANGUAGE}${location.pathname}`} replace />
  }

  // Strip lang prefix to get the canonical page path, e.g. /en/dashboard → /dashboard
  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')

  return (
    <>
      <Helmet>
        <html lang={lang} />
        {SUPPORTED_LANGUAGES.map((l) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={l}
            href={`${window.location.origin}/${l}${pathWithoutLang === '/' ? '' : pathWithoutLang}`}
          />
        ))}
      </Helmet>
      <Outlet />
    </>
  )
}
