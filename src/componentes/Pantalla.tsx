/**
 * Marco de cada pantalla, al estilo iOS: título grande que al hacer scroll se
 * convierte en una barra compacta translúcida, con botón de volver y una
 * acción a la derecha.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconoAtras } from './Iconos'
import { useAvisosGlobales } from './Layout'

export function Pantalla({
  titulo,
  subtitulo,
  atras,
  textoAtras = 'Atrás',
  accion,
  encabezado,
  children,
}: {
  titulo: string
  subtitulo?: ReactNode
  /** Ruta a la que vuelve si no hay historial (p. ej. al abrir un enlace directo). */
  atras?: string
  textoAtras?: string
  accion?: ReactNode
  /** Contenido propio en lugar del título grande (p. ej. un avatar). */
  encabezado?: ReactNode
  children: ReactNode
}) {
  const navegar = useNavigate()
  const avisos = useAvisosGlobales()
  const centinela = useRef<HTMLDivElement>(null)
  const [compacto, setCompacto] = useState(false)

  useEffect(() => {
    const el = centinela.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => setCompacto(!e!.isIntersecting),
      { rootMargin: '-60px 0px 0px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const volver = () => {
    // Si se entró por un enlace directo no hay a dónde "volver": se va a la ruta padre.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navegar(-1)
    else navegar(atras ?? '/')
  }

  return (
    <>
      <header
        className={`sticky top-0 z-30 -mx-4 px-4 pt-seguro-arriba transition-colors duration-200 ${
          compacto ? 'vidrio border-b border-separador/70' : 'border-b border-transparent'
        }`}
      >
        <div className="relative flex h-12 items-center justify-between">
          <div className="z-10 min-w-[64px]">
            {atras !== undefined && (
              <button
                onClick={volver}
                className="-ml-2 flex items-center gap-0.5 py-2 pr-2 text-[17px] text-marca active:opacity-50"
              >
                <IconoAtras tam={22} />
                <span className="max-w-[110px] truncate">{textoAtras}</span>
              </button>
            )}
          </div>
          <p
            className={`pointer-events-none absolute inset-x-20 truncate text-center text-[17px] font-semibold transition-all duration-200 ${
              compacto ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
            aria-hidden={!compacto}
          >
            {titulo}
          </p>
          <div className="z-10 flex min-w-[64px] justify-end">{accion}</div>
        </div>
      </header>

      <div ref={centinela} className="pb-1 pt-1">
        {encabezado ?? (
          <>
            <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight">{titulo}</h1>
            {subtitulo && <div className="mt-1.5 text-[15px] text-texto-2">{subtitulo}</div>}
          </>
        )}
      </div>

      {avisos}
      <div className="mt-5">{children}</div>
    </>
  )
}
