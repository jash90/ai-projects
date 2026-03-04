import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { resolve } from 'path'
import compression from 'vite-plugin-compression'

// NOTE: Static pre-rendering of public pages (/en/, /en/login, /en/register, …)
// is not yet wired up here because vite-plugin-prerender@1.0.8 ships a CJS
// bundle that is incompatible with Vite 6's ESM config loader.
// When a compatible pre-render plugin is available, generate routes like:
//   SUPPORTED_LANGUAGES.flatMap(lang => ['', '/login', '/register'].map(p => `/${lang}${p}`))
// and pass them to the plugin.  The nginx try_files rule already serves
// pre-rendered index.html files if they exist in dist/<lang>/.

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    // Sentry plugin for source map upload (production only)
    mode === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
    }),
    // Pre-compressed assets (gzip + brotli) for nginx gzip_static / brotli_static
    mode === 'production' && compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    mode === 'production' && compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      // React ecosystem
      'react-router-dom',
      'react-i18next',
      'react-helmet-async',
      'react-hot-toast',
      'react-hook-form',
      'react-markdown',
      '@tanstack/react-query',
      // Analytics (loaded lazily but pre-bundled for faster dynamic import)
      '@sentry/react',
      // i18n
      'i18next',
      'i18next-browser-languagedetector',
      'i18next-http-backend',
      // Utilities
      'axios',
      'zustand',
      'zod',
      'clsx',
      'date-fns',
      'socket.io-client',
      'lucide-react',
      'dompurify',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['axios', 'zustand', '@tanstack/react-query'],
          i18n: ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
          sentry: ['@sentry/react'],
          socket: ['socket.io-client'],
          markdown: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight'],
          mermaid: ['mermaid'],
        },
      },
    },
  },
}))
