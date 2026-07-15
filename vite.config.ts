/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/**/*'],
      workbox: {
        // heic2any (HEIC->JPEG for the photo-assist feature) is huge and only
        // needed when that feature is used, which already requires network
        // access — don't bloat the offline precache with it.
        globIgnores: ['**/heic2any-*.js'],
      },
      manifest: {
        name: 'mileSTONES Run Scoring',
        short_name: 'mileSTONES',
        description: 'Offline scoring app for Amazfit mileSTONES trail run',
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
