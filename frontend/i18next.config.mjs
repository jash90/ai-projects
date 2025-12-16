import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'pl'],
  defaultNamespace: 'common',
  namespaces: ['common', 'auth', 'dashboard', 'chat', 'files', 'admin', 'settings', 'errors'],
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
