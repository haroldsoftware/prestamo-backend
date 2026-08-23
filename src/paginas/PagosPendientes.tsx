import { Link } from 'react-router-dom'
import { usePagosPendientes } from '../api/hooks'
import { Cargando, Vacio } from '../componentes/base'
import { fechaLarga, pesos } from '../lib/formato'

export function PagosPendientes() {
  const { data, isLoading } = usePagosPendientes()
  if (isLoading) return <Cargando />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pagos por confirmar</h1>
        <p className="text-slate-600">
          Nada de esto afecta ningún saldo hasta que tú lo confirmes.
        </p>
      </div>

      {!data?.length ? (
        <Vacio titulo="No hay nada esperándote">
          Cuando alguien registre un pago que te toque confirmar, aparecerá aquí.
        </Vacio>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="tarjeta">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{pesos(p.monto)}</p>
                  <p className="text-sm text-slate-600">
                    {p.registradoPor} dice que pagó el {fechaLarga(p.fechaPago)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.metodo.toLowerCase()}
                    {p.codigoTransaccion && ` · cód. ${p.codigoTransaccion}`}
                    {p.tieneComprobante && ' · adjuntó comprobante'}
                  </p>
                  {p.nota && <p className="mt-1 text-sm italic text-slate-600">"{p.nota}"</p>}
                </div>
                <Link className="btn-primario" to={`/prestamos/${p.loanId}`}>
                  Revisar y decidir
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
