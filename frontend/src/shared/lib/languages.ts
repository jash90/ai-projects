export const SUPPORTED_LANGUAGES = [
  'en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'cs',
  'ro', 'hu', 'uk', 'da', 'fi', 'no', 'sk', 'bg', 'hr', 'el',
] as const

export const DEFAULT_LANGUAGE = 'en'

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
}
