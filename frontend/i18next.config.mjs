import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'cs', 'ro', 'hu', 'uk', 'da', 'fi', 'no', 'sk', 'bg', 'hr', 'el'],
  defaultNamespace: 'common',
  namespaces: ['common', 'auth', 'dashboard', 'chat', 'files', 'admin', 'settings', 'errors', 'landing'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    output: 'public/locales/{{language}}/{{namespace}}.json',
    defaultValue: '__MISSING__',
    keyAsDefaultValue: false,
    useKeysAsDefaultValue: false,
  },
  sync: {
    remove: false,
  },
});
