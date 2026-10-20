/** @type {import('tailwindcss').Config} */

/**
 * Los colores salen de variables CSS (src/index.css) que cambian solas con el
 * modo claro/oscuro del teléfono. Aquí solo se les pone nombre: así ningún
 * componente necesita clases `dark:` y es imposible que una pantalla quede
 * blanca en modo oscuro por olvido.
 */
const token = (nombre) => `rgb(var(--c-${nombre}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: token('fondo'),
        superficie: { DEFAULT: token('superficie'), 2: token('superficie-2') },
        separador: token('separador'),
        texto: { DEFAULT: token('texto'), 2: token('texto-2'), 3: token('texto-3') },
        marca: {
          DEFAULT: token('marca'),
          solido: token('marca-solido'),
          sobre: token('sobre-marca'),
          suave: token('marca-suave'),
        },
        exito: { DEFAULT: token('exito'), suave: token('exito-suave') },
        atencion: { DEFAULT: token('atencion'), suave: token('atencion-suave') },
        peligro: { DEFAULT: token('peligro'), suave: token('peligro-suave') },
      },
      fontFamily: {
        // En iPhone esto es SF Pro: la app se siente nativa y no descarga fuentes.
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        cifra: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '28px' },
      spacing: {
        'seguro-arriba': 'env(safe-area-inset-top)',
        'seguro-abajo': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        entrada: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        desvanecer: { from: { opacity: '0' }, to: { opacity: '1' } },
        hoja: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        aviso: { from: { opacity: '0', transform: 'translateY(-16px) scale(0.96)' }, to: { opacity: '1', transform: 'none' } },
        brillo: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        rebote: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.18)' } },
      },
      animation: {
        entrada: 'entrada 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards',
        desvanecer: 'desvanecer 220ms ease-out both',
        hoja: 'hoja 420ms cubic-bezier(0.32, 0.72, 0, 1) both',
        aviso: 'aviso 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
        brillo: 'brillo 1.6s linear infinite',
        rebote: 'rebote 500ms ease-out',
      },
    },
  },
  plugins: [],
}
