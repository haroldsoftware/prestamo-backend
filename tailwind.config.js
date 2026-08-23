/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde sobrio para "al día", ámbar para la ventana de pago abierta,
        // rojo solo para mora. Nada de rojo agresivo por defecto: el producto
        // no está para hacer sentir mal a nadie.
        marca: {
          50: '#eef6ff', 100: '#d9eaff', 200: '#bcdaff', 300: '#8ec3ff',
          400: '#59a1ff', 500: '#337dff', 600: '#1d5cf5', 700: '#1848e1',
          800: '#1a3db6', 900: '#1b378f',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'] },
    },
  },
  plugins: [],
}
