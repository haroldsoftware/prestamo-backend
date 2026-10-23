/**
 * Botón "Continuar con Google" (Google Identity Services).
 *
 * Google entrega un ID token firmado; se lo pasamos al backend, que verifica la
 * firma y la audiencia y abre la sesión con la misma cookie que el login
 * normal. El botón lo pinta Google (es requisito de su marca), dentro de un
 * iframe suyo.
 *
 * Sin VITE_GOOGLE_CLIENT_ID no se muestra nada: la app sigue funcionando solo
 * con correo y contraseña.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../hooks/sesion'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCRIPT = 'https://accounts.google.com/gsi/client'

interface Gsi {
  accounts: {
    id: {
      initialize(opciones: {
        client_id: string
        callback: (r: { credential: string }) => void
        ux_mode?: 'popup' | 'redirect'
        use_fedcm_for_button?: boolean
      }): void
      renderButton(elemento: HTMLElement, opciones: Record<string, unknown>): void
    }
  }
}

declare global {
  interface Window { google?: Gsi }
}

let cargando: Promise<Gsi> | null = null

function cargarGsi(): Promise<Gsi> {
  cargando ??= new Promise((resolver, rechazar) => {
    if (window.google?.accounts) return resolver(window.google)
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (window.google ? resolver(window.google) : rechazar(new Error('GSI no cargó')))
    s.onerror = () => {
      cargando = null // permite reintentar al volver a la pantalla
      rechazar(new Error('GSI no cargó'))
    }
    document.head.appendChild(s)
  })
  return cargando
}

export function BotonGoogle({
  destino = '/',
  texto = 'continue_with',
  onError,
}: {
  destino?: string
  texto?: 'signin_with' | 'signup_with' | 'continue_with'
  onError(mensaje: string): void
}) {
  const { entrarConGoogle } = useSesion()
  const navegar = useNavigate()
  const contenedor = useRef<HTMLDivElement>(null)
  const [entrando, setEntrando] = useState(false)

  // Las funciones cambian de identidad en cada render; el callback de Google
  // se registra una sola vez, así que lee siempre la versión más reciente.
  const actual = useRef({ entrarConGoogle, navegar, destino, onError })
  actual.current = { entrarConGoogle, navegar, destino, onError }

  useEffect(() => {
    if (!CLIENT_ID) return
    let vivo = true
    cargarGsi()
      .then((g) => {
        if (!vivo || !contenedor.current) return
        g.accounts.id.initialize({
          client_id: CLIENT_ID,
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            const a = actual.current
            setEntrando(true)
            try {
              await a.entrarConGoogle(credential)
              a.navegar(a.destino, { replace: true })
            } catch (err) {
              a.onError(err instanceof ErrorApi ? err.message : 'No pudimos entrar con Google')
            } finally {
              setEntrando(false)
            }
          },
        })
        const oscuro = window.matchMedia('(prefers-color-scheme: dark)').matches
        g.accounts.id.renderButton(contenedor.current, {
          type: 'standard',
          theme: oscuro ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: texto,
          locale: 'es',
          width: Math.min(400, contenedor.current.clientWidth || 320),
        })
      })
      .catch(() => {
        if (vivo) actual.current.onError('No pudimos cargar el inicio de sesión con Google. Revisa tu conexión.')
      })
    return () => { vivo = false }
  }, [texto])

  if (!CLIENT_ID) return null

  return (
    <div>
      <div ref={contenedor} className={`flex min-h-[44px] justify-center ${entrando ? 'pointer-events-none opacity-50' : ''}`} />
      {entrando && <p className="ayuda mt-2 text-center">Entrando…</p>}
    </div>
  )
}

/** Separador "o" entre el botón de Google y el formulario. */
export function SeparadorO() {
  if (!CLIENT_ID) return null
  return (
    <div className="flex items-center gap-3 text-[13px] text-texto-2" aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-25" />
      o con tu correo
      <span className="h-px flex-1 bg-current opacity-25" />
    </div>
  )
}
