import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (!normalized.includes('node_modules')) return
          if (
            normalized.includes('/react/') ||
            normalized.includes('/react-dom/') ||
            normalized.includes('/react-router')
          ) {
            return 'react-vendor'
          }
          if (normalized.includes('/gsap/') || normalized.includes('/@gsap/')) {
            return 'gsap'
          }
          if (normalized.includes('/lucide-react/')) {
            return 'icons'
          }
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})