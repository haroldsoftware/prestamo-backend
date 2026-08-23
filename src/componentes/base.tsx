/** Piezas de UI reutilizables. */
import type { ReactNode } from 'react'
import { pesos } from '../lib/formato'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-marca-600" />
      {texto}
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
    info: 'bg-slate-50 border-slate-200 text-slate-700',
    exito: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    atencion: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  }[tipo]
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${estilos}`} role={tipo === 'error' ? 'alert' : undefined}>
      {titulo && <p className="font-semibold mb-1">{titulo}</p>}
      {children}
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
    normal: 'text-slate-900',
    bueno: 'text-emerald-700',
    atencion: 'text-amber-700',
    malo: 'text-red-700',
  }[tono]
  return (
    <div>
      <p className="text-sm text-slate-600">{etiqueta}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>
        {typeof valor === 'number' ? pesos(valor) : valor}
      </p>
      {explicacion && <p className="mt-1 text-xs text-slate-500">{explicacion}</p>}
    </div>
  )
}

export function Insignia({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    ACTIVO: 'bg-emerald-100 text-emerald-800',
    PAGADO: 'bg-slate-200 text-slate-700',
    PENDIENTE_ACEPTACION: 'bg-amber-100 text-amber-800',
    EN_NEGOCIACION: 'bg-marca-100 text-marca-800',
    RECHAZADO: 'bg-red-100 text-red-800',
    CANCELADO: 'bg-slate-200 text-slate-600',
    PENDIENTE: 'bg-amber-100 text-amber-800',
    CONFIRMADO: 'bg-emerald-100 text-emerald-800',
    ANULADO: 'bg-slate-200 text-slate-600',
    SIN_RESPUESTA: 'bg-slate-200 text-slate-600',
  }
  const texto: Record<string, string> = {
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
  }
  return (
    <span className={`insignia ${estilos[estado] ?? 'bg-slate-100 text-slate-700'}`}>
      {texto[estado] ?? estado}
    </span>
  )
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="tarjeta text-center py-12">
      <p className="text-lg font-semibold text-slate-800">{titulo}</p>
      {children && <div className="mt-3 text-sm text-slate-600">{children}</div>}
    </div>
  )
}

/**
 * Confirmación escrita para acciones irreversibles.
 *
 * Un click se da sin pensar; escribir una palabra obliga a leer.
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
        Para confirmar, escribe <span className="font-mono font-bold">{palabra}</span>
      </label>
      <input
        className="campo"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-label={`Escribe ${palabra} para confirmar`}
      />
    </div>
  )
}
