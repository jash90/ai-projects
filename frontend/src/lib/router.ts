/**
 * Language-aware routing helpers.
 *
 * Only the landing page and dashboard carry a /:lang prefix in the URL.
 * All other app pages (/login, /register, /settings, /usage, /admin,
 * /projects/:id) use plain paths without a language segment.
 *
 * `useLangPrefix()` returns the active language code so callers can build
 * lang-prefixed paths explicitly, e.g. `/${lang}/dashboard`.
 */
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languages'

/**
 * Returns the current language code, resolved in priority order:
 * 1. `:lang` URL param (when inside a `/:lang` route)
 * 2. i18next active language
 * 3. localStorage `i18nextLng`
 * 4. `DEFAULT_LANGUAGE` ('en')
 */
export function useLangPrefix(): string {
  const params = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()

  if (params.lang && isSupportedLanguage(params.lang)) return params.lang

  const i18nLang = i18n.language?.split('-')[0]
  if (i18nLang && isSupportedLanguage(i18nLang)) return i18nLang

  const stored = localStorage.getItem('i18nextLng')?.split('-')[0]
  if (stored && isSupportedLanguage(stored)) return stored

  return DEFAULT_LANGUAGE
}
