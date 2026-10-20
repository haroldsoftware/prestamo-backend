/**
 * Encabezado de las pantallas principales: ícono y nombre de la app, el ojo
 * para ocultar montos y el avatar que lleva a la cuenta.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../hooks/sesion'
import { alternarMontos, useMontosOcultos } from '../hooks/privacidad'
import { Avatar } from './base'
import { useAvisosGlobales } from './Layout'

export function BotonOjo() {
  const oculto = useMontosOcultos()
  return (
    <button
      onClick={alternarMontos}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-superficie text-texto ring-1 ring-separador transition active:scale-90"
      aria-label={oculto ? 'Mostrar montos' : 'Ocultar montos'}
      aria-pressed={oculto}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" fill={oculto ? 'none' : 'currentColor'} />
        {oculto && <path d="M4 4l16 16" />}
      </svg>
    </button>
  )
}

export function EncabezadoApp({ abajo }: { abajo?: ReactNode }) {
  const { usuario } = useSesion()
  const avisos = useAvisosGlobales()
  return (
    <header className="-mx-4 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div className="flex items-center gap-3">
        <img
          src="/apple-touch-icon.png" alt=""
          className="h-11 w-11 rounded-[13px] shadow-[0_6px_16px_-6px_rgb(31_106_99/0.7)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-bold leading-tight tracking-tight">Cuentas Claras</p>
          {abajo}
        </div>
        <BotonOjo />
        <Link to="/cuenta" className="relative transition active:scale-90" aria-label="Tu cuenta">
          <Avatar nombre={usuario?.nombreCompleto ?? '?'} tam={44} />
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-[#34c759] ring-2 ring-fondo" />
        </Link>
      </div>
      {avisos}
    </header>
  )
}
