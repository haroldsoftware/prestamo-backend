import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core/index.ts', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Solo desarrollo: evita CORS mientras trabajas en local. En producción el
    // navegador llama directo al backend con VITE_API_URL.
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separar React del resto: cambia mucho menos que el código de la app,
        // así el caché del navegador sirve entre despliegues.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          datos: ['@tanstack/react-query'],
        },
      },
    },
  },
})
