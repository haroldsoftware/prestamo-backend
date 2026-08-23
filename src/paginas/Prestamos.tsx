import { Link } from 'react-router-dom'
import { usePrestamos } from '../api/hooks'
import { Cargando, Insignia, Vacio } from '../componentes/base'
import { pesos } from '../lib/formato'

const ROL_TEXTO: Record<string, string> = {
  PRESTAMISTA: 'Presté',
  DEUDOR: 'Me prestaron',
  CODEUDOR: 'Soy codeudor',
  OBSERVADOR: 'Observo',
}

export function Prestamos() {
  const { data, isLoading } = usePrestamos()
  if (isLoading) return <Cargando />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tus préstamos</h1>
        <Link className="btn-primario" to="/prestamos/nuevo">Registrar uno</Link>
      </div>

      {!data?.length ? (
        <Vacio titulo="Todavía no tienes préstamos">
          Registra el primero y verás desde el día uno cuánto es interés y cuánto baja tu deuda.
        </Vacio>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Link key={p.id} to={`/prestamos/${p.id}`} className="tarjeta block transition hover:border-marca-300">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {ROL_TEXTO[p.rol ?? ''] ?? p.rol}
                    </span>
                    <Insignia estado={p.estado} />
                    {p.enMora && <span className="insignia bg-red-100 text-red-800">En mora</span>}
                  </div>
                  <p className="mt-1 font-semibold">{p.contraparte.nombre}</p>
                  {p.descripcion && <p className="text-sm text-slate-500">{p.descripcion}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {p.estado === 'ACTIVO' ? 'Saldo actual' : 'Monto'}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {pesos(p.estado === 'ACTIVO' ? p.saldo.capital : p.montoPrincipal)}
                  </p>
                  {p.cuota > 0 && (
                    <p className="text-xs text-slate-500">cuota de {pesos(p.cuota)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
