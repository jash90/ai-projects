import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Determine if we're running on the server
const isServer = typeof window === 'undefined';

// Conditionally import browser-only modules
let LanguageDetector: any;
let Backend: any;

if (!isServer) {
  // Only import browser-specific modules on client
  LanguageDetector = require('i18next-browser-languagedetector').default;
  Backend = require('i18next-http-backend').default;
}

const i18nInstance = i18n.createInstance();

// Initialize i18n differently based on environment
if (isServer) {
  // Server-side: minimal config, no plugins that require browser APIs
  i18nInstance
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'cs', 'ro', 'hu', 'uk', 'da', 'fi', 'no', 'sk', 'bg', 'hr', 'el'],
      lng: 'en', // Default language for SSR
      defaultNS: 'common',
      fallbackNS: 'common',
      ns: ['common', 'auth', 'dashboard', 'chat', 'files', 'agents', 'admin', 'settings', 'errors', 'project', 'landing'],
      resources: {}, // Empty resources - will be hydrated on client
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
} else {
  // Client-side: full config with browser plugins
  i18nInstance
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'cs', 'ro', 'hu', 'uk', 'da', 'fi', 'no', 'sk', 'bg', 'hr', 'el'],
      defaultNS: 'common',
      fallbackNS: 'common',
      ns: ['common', 'auth', 'dashboard', 'chat', 'files', 'agents', 'admin', 'settings', 'errors', 'project', 'landing'],
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18nInstance;
