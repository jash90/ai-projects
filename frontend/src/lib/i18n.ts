import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'cs', 'ro', 'hu', 'uk', 'da', 'fi', 'no', 'sk', 'bg', 'hr', 'el'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'chat', 'files', 'agents', 'admin', 'settings', 'errors', 'project', 'landing', 'subscription'],
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
  });

export default i18n;
