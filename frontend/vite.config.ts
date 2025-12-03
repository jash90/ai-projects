import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
  })],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@claude-projects/shared': resolve(__dirname, '../shared-types/src/constants.ts'),
    },
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
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', 'framer-motion'],
          utils: ['axios', 'zustand', '@tanstack/react-query'],
        },
      },
    },
  },
})