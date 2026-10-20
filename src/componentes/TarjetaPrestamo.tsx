import { Link } from 'react-router-dom'
import type { ResumenPrestamo } from '../api/tipos'
import { pesos } from '../lib/formato'
import { Avatar, Insignia, Progreso } from './base'
import { IconoChevron } from './Iconos'

export const ROL_TEXTO: Record<string, string> = {
  PRESTAMISTA: 'Le prestaste',
  DEUDOR: 'Te prestó',
  CODEUDOR: 'Eres codeudor',
  OBSERVADOR: 'Observas',
}

/** Qué tanto se ha pagado del capital: la barra que da tranquilidad. */
export function avance(p: Pick<ResumenPrestamo, 'estado' | 'montoPrincipal' | 'saldo'>): number {
  if (p.estado === 'PAGADO') return 1
  if (p.estado !== 'ACTIVO' || !p.montoPrincipal) return 0
  return 1 - p.saldo.capital / p.montoPrincipal
}

export function TarjetaPrestamo({ p }: { p: ResumenPrestamo }) {
  const activo = p.estado === 'ACTIVO'
  const v = avance(p)
  return (
    <Link to={`/prestamos/${p.id}`} className="tarjeta presionable block">
      <div className="flex items-center gap-3.5">
        <Avatar nombre={p.contraparte.nombre} tam={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[16px] font-semibold">{p.contraparte.nombre}</p>
          </div>
          <p className="truncate text-[13px] text-texto-2">
            {ROL_TEXTO[p.rol ?? ''] ?? 'Préstamo'}
            {p.descripcion ? ` · ${p.descripcion}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="cifra text-[17px] font-bold">
            {pesos(activo ? p.saldo.capital : p.montoPrincipal)}
          </p>
          <div className="mt-0.5 flex justify-end">
            {p.enMora ? <Insignia estado="MORA" /> : <Insignia estado={p.estado} />}
          </div>
        </div>
        <IconoChevron tam={16} className="-mr-1 shrink-0 text-texto-3" />
      </div>
      {activo && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex justify-between text-[12px] text-texto-2">
            <span>{p.cuota > 0 ? `Cuota de ${pesos(p.cuota)}` : 'Pago libre'}</span>
            <span className="font-semibold">{Math.round(v * 100)}% pagado</span>
          </div>
          <Progreso valor={v} />
        </div>
      )}
    </Link>
  )
}
