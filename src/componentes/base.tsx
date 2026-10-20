/** Piezas de UI reutilizables. */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { pesos } from '../lib/formato'
import { IconoAlerta, IconoCerrar, IconoCheck, IconoInfo } from './Iconos'

export function Cargando({ texto }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-texto-2" role="status">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-separador border-t-marca" />
      <span className="text-[15px]">{texto ?? 'Cargando…'}</span>
    </div>
  )
}

/** Marcador de carga con la forma del contenido: se percibe más rápido que un spinner. */
export function Esqueleto({ className = '' }: { className?: string }) {
  return <div className={`esqueleto ${className}`} aria-hidden="true" />
}

export function EsqueletoPantalla() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando">
      <Esqueleto className="h-40 rounded-4xl" />
      <Esqueleto className="h-20 rounded-3xl" />
      <Esqueleto className="h-20 rounded-3xl" />
      <Esqueleto className="h-20 rounded-3xl" />
    </div>
  )
}

export function Aviso({
  tipo = 'info',
  titulo,
  children,
}: {
  tipo?: 'info' | 'exito' | 'atencion' | 'error'
  titulo?: string
  children: ReactNode
}) {
  const estilos = {
    info: 'bg-superficie text-texto',
    exito: 'bg-exito-suave text-texto',
    atencion: 'bg-atencion-suave text-texto',
    error: 'bg-peligro-suave text-texto',
  }[tipo]
  const icono = {
    info: <IconoInfo tam={20} className="text-texto-2" />,
    exito: <IconoCheck tam={20} className="text-exito" />,
    atencion: <IconoAlerta tam={20} className="text-atencion" />,
    error: <IconoAlerta tam={20} className="text-peligro" />,
  }[tipo]
  return (
    <div
      className={`flex gap-3 rounded-2xl px-4 py-3.5 text-[15px] leading-snug ${estilos}`}
      role={tipo === 'error' ? 'alert' : undefined}
    >
      <span className="mt-px shrink-0">{icono}</span>
      <div className="min-w-0 flex-1">
        {titulo && <p className="mb-0.5 font-semibold">{titulo}</p>}
        <div className="text-texto-2 [&_strong]:text-texto">{children}</div>
      </div>
    </div>
  )
}

/** Una cifra con su explicación en lenguaje llano. Nunca un número solo. */
export function Cifra({
  etiqueta,
  valor,
  explicacion,
  tono = 'normal',
}: {
  etiqueta: string
  valor: number | string
  explicacion?: string
  tono?: 'normal' | 'bueno' | 'atencion' | 'malo'
}) {
  const color = {
    normal: 'text-texto',
    bueno: 'text-exito',
    atencion: 'text-atencion',
    malo: 'text-peligro',
  }[tono]
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-texto-2">{etiqueta}</p>
      <p className={`cifra mt-0.5 truncate text-[22px] font-bold ${color}`}>
        {typeof valor === 'number' ? pesos(valor) : valor}
      </p>
      {explicacion && <p className="mt-0.5 text-[12px] leading-tight text-texto-3">{explicacion}</p>}
    </div>
  )
}

const ESTILO_ESTADO: Record<string, string> = {
  ACTIVO: 'bg-exito-suave text-exito',
  PAGADO: 'bg-superficie-2 text-texto-2',
  PENDIENTE_ACEPTACION: 'bg-atencion-suave text-atencion',
  EN_NEGOCIACION: 'bg-marca-suave text-marca',
  RECHAZADO: 'bg-peligro-suave text-peligro',
  CANCELADO: 'bg-superficie-2 text-texto-2',
  PENDIENTE: 'bg-atencion-suave text-atencion',
  CONFIRMADO: 'bg-exito-suave text-exito',
  ANULADO: 'bg-superficie-2 text-texto-2',
  SIN_RESPUESTA: 'bg-superficie-2 text-texto-2',
  MORA: 'bg-peligro-suave text-peligro',
}
const TEXTO_ESTADO: Record<string, string> = {
  ACTIVO: 'Al día',
  PAGADO: 'Pagado',
  PENDIENTE_ACEPTACION: 'Falta aceptar',
  EN_NEGOCIACION: 'En negociación',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Por confirmar',
  CONFIRMADO: 'Confirmado',
  ANULADO: 'Anulado',
  SIN_RESPUESTA: 'Sin respuesta',
  MORA: 'En mora',
}

export function Insignia({ estado }: { estado: string }) {
  return (
    <span className={`insignia ${ESTILO_ESTADO[estado] ?? 'bg-superficie-2 text-texto-2'}`}>
      {TEXTO_ESTADO[estado] ?? estado}
    </span>
  )
}

export function Vacio({ titulo, icono, children }: { titulo: string; icono?: ReactNode; children?: ReactNode }) {
  return (
    <div className="tarjeta flex flex-col items-center px-6 py-12 text-center">
      {icono && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-marca-suave text-marca">
          {icono}
        </div>
      )}
      <p className="text-[19px] font-semibold">{titulo}</p>
      {children && <div className="mt-2 max-w-xs text-[15px] text-texto-2">{children}</div>}
    </div>
  )
}

/** Iniciales con un color estable por persona. */
export function Avatar({ nombre, tam = 44 }: { nombre: string; tam?: number }) {
  const partes = nombre.trim().split(/\s+/)
  const iniciales = ((partes[0]?.[0] ?? '?') + (partes.length > 1 ? partes.at(-1)![0] : '')).toUpperCase()
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      className="avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
      style={{ width: tam, height: tam, fontSize: tam * 0.38, ['--h' as string]: h }}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  )
}

export function Progreso({ valor, className = '' }: { valor: number; className?: string }) {
  const v = Math.max(0, Math.min(1, valor))
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-superficie-2 ${className}`} role="progressbar"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="h-full rounded-full bg-marca transition-[width] duration-700 ease-out" style={{ width: `${v * 100}%` }} />
    </div>
  )
}

/** Chips desplazables (pestañas). El activo va en negro, como en Lukas. */
export function Segmentos<T extends string>({
  opciones, valor, onCambio, etiqueta,
}: {
  opciones: ReadonlyArray<readonly [T, string, number?]>
  valor: T
  onCambio(v: T): void
  etiqueta: string
}) {
  return (
    <div className="sin-barra -mx-4 overflow-x-auto px-4" role="tablist" aria-label={etiqueta}>
      <div className="inline-flex gap-2 pb-1">
        {opciones.map(([clave, texto, contador]) => {
          const activo = clave === valor
          return (
            <button
              key={clave}
              role="tab"
              aria-selected={activo}
              onClick={() => onCambio(clave)}
              className={`flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition duration-200 active:scale-95 ${
                activo ? 'bg-texto text-fondo' : 'bg-superficie text-texto-2 ring-1 ring-separador'
              }`}
            >
              {texto}
              {contador ? (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-atencion px-1 text-[11px] font-bold text-white">
                  {contador}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Recuadro con ícono en color pastel, como los de "Vista rápida". */
export function IconoEnCaja({ color, children, tam = 44 }: { color: string; children: ReactNode; tam?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[14px]"
      style={{ width: tam, height: tam, color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {children}
    </span>
  )
}

/** Fila de una lista agrupada: etiqueta a la izquierda, valor a la derecha. */
export function Fila({ k, v, extra }: { k: string; v: ReactNode; extra?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-[15px] text-texto-2">{k}</dt>
      <dd className="text-right text-[15px] font-medium">
        {v}
        {extra && <span className="block text-[12px] font-normal text-texto-3">{extra}</span>}
      </dd>
    </div>
  )
}

/**
 * Hoja inferior (bottom sheet). Se cierra tocando el fondo, con Escape o
 * deslizándola hacia abajo desde la manija.
 */
export function Hoja({
  abierta, alCerrar, titulo, children,
}: {
  abierta: boolean
  alCerrar(): void
  titulo: string
  children: ReactNode
}) {
  const [arrastre, setArrastre] = useState(0)
  const [saliendo, setSaliendo] = useState(false)
  const inicio = useRef<number | null>(null)

  const cerrar = useCallback(() => {
    setSaliendo(true)
    window.setTimeout(() => {
      setSaliendo(false)
      setArrastre(0)
      alCerrar()
    }, 220)
  }, [alCerrar])

  useEffect(() => {
    if (!abierta) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('keydown', tecla)
    }
  }, [abierta, cerrar])

  if (!abierta) return null

  const desplazamiento = saliendo ? '100%' : `${arrastre}px`

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <div
        className="absolute inset-0 animate-desvanecer bg-black/45 transition-opacity duration-200"
        style={{ opacity: saliendo ? 0 : 1 }}
        onClick={cerrar}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg animate-hoja">
        <div
          className="flex max-h-[92dvh] flex-col rounded-t-4xl bg-superficie shadow-2xl"
          style={{
            transform: `translateY(${desplazamiento})`,
            transition: inicio.current === null ? 'transform 240ms cubic-bezier(0.32,0.72,0,1)' : 'none',
          }}
        >
          <div
            className="shrink-0 touch-none px-5 pb-2 pt-2.5"
            onTouchStart={(e) => { inicio.current = e.touches[0]!.clientY }}
            onTouchMove={(e) => {
              if (inicio.current === null) return
              setArrastre(Math.max(0, e.touches[0]!.clientY - inicio.current))
            }}
            onTouchEnd={() => {
              inicio.current = null
              if (arrastre > 110) cerrar()
              else setArrastre(0)
            }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-separador" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-bold">{titulo}</h2>
              <button
                onClick={cerrar}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-superficie-2 text-texto-2 active:opacity-60"
                aria-label="Cerrar"
              >
                <IconoCerrar tam={16} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ───────────────────────── Avisos flotantes (toasts) ───────────────────────── */

type TipoToast = 'exito' | 'error' | 'info'
interface Toast { id: number; texto: string; tipo: TipoToast; accion?: { texto: string; fn(): void } }
const CtxToast = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})

export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])
  const mostrar = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setLista((x) => [...x.slice(-2), { ...t, id }])
    window.setTimeout(() => setLista((x) => x.filter((y) => y.id !== id)), t.accion ? 10_000 : 3_200)
  }, [])

  return (
    <CtxToast.Provider value={mostrar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        aria-live="polite"
      >
        {lista.map((t) => (
          <div
            key={t.id}
            className="vidrio pointer-events-auto flex w-full max-w-sm animate-aviso items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium shadow-lg ring-1 ring-separador"
          >
            {t.tipo === 'exito' && <IconoCheck tam={20} className="shrink-0 text-exito" />}
            {t.tipo === 'error' && <IconoAlerta tam={20} className="shrink-0 text-peligro" />}
            {t.tipo === 'info' && <IconoInfo tam={20} className="shrink-0 text-marca" />}
            <span className="flex-1">{t.texto}</span>
            {t.accion && (
              <button className="enlace shrink-0" onClick={t.accion.fn}>{t.accion.texto}</button>
            )}
          </div>
        ))}
      </div>
    </CtxToast.Provider>
  )
}

export function useToast() {
  return useContext(CtxToast)
}

/**
 * Confirmación escrita para acciones irreversibles.
 *
 * Un toque se da sin pensar; escribir una palabra obliga a leer.
 */
export function ConfirmacionEscrita({
  palabra,
  valor,
  onChange,
}: {
  palabra: string
  valor: string
  onChange(v: string): void
}) {
  return (
    <div>
      <label className="etiqueta">
        Para confirmar, escribe <span className="font-mono font-bold text-texto">{palabra}</span>
      </label>
      <input
        className="campo font-mono uppercase tracking-widest"
        value={valor}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label={`Escribe ${palabra} para confirmar`}
      />
    </div>
  )
}
