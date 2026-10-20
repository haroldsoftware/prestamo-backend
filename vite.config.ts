import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Service worker sin dependencias.
 *
 * Toma `src/pwa/sw.js` como plantilla y, al construir, le inyecta la lista
 * exacta de archivos del build y una versión derivada de su contenido. Así
 * cada despliegue produce un sw.js distinto (el navegador detecta la
 * actualización) y el caché viejo se borra completo al activarse el nuevo.
 */
function serviceWorker(): Plugin {
  return {
    name: 'cuentas-claras-sw',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      const archivos = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const precache = ['/', '/manifest.webmanifest', '/apple-touch-icon.png', ...archivos.map((f) => `/${f}`)]
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12)
      const plantilla = readFileSync(fileURLToPath(new URL('./src/pwa/sw.js', import.meta.url)), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: plantilla
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core/index.ts', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Solo desarrollo: mismo origen hacia el backend local. En producción hace
    // lo mismo la función de Cloudflare en functions/api/[[ruta]].js.
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
