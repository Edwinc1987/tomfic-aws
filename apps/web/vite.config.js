import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Keep the existing repository-root .env convention after moving the app.
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  plugins: [
    react(),
    // PWA: instala un service worker que precachea la app (JS/CSS/HTML/SVG) para
    // que TOMFIC abra SIN internet (recargar o reabrir en bodega sin señal) y sea
    // instalable como app. registerType 'autoUpdate' activa la versión nueva en el
    // siguiente arranque tras cada despliegue (no deja al usuario en una versión vieja).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'TOMFIC · Tomas físicas de inventario',
        short_name: 'TOMFIC',
        description: 'Tomas físicas y control de inventarios: cuenta desde el móvil y exporta diferencias.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#2563eb',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea el shell de la app. Los chunks pesados (xlsx/zxing) también
        // entran para que el escáner y las exportaciones funcionen offline.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa las dos librerías más pesadas e independientes en su propio
        // chunk: el navegador las cachea entre despliegues y no reprocesa un
        // único bundle gigante. React se deja en el chunk principal a propósito
        // (separarlo suele romper el orden de inicialización).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'xlsx';
            if (id.includes('@zxing')) return 'zxing';
            if (id.includes('ankareport')) return 'ankareport';
          }
        },
      },
    },
  },
})
