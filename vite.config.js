import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
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
          }
        },
      },
    },
  },
})
