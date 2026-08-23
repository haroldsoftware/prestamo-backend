/**
 * La tabla de desglose.
 *
 * Es el corazón visual del producto: la misma tabla sirve para el plan inicial
 * y para el simulador. En modo simulación la columna "Pagado" es editable y
 * todo lo de abajo se recalcula al instante, en el navegador, con el mismo
 * motor que usa el servidor.
 *
 * En móvil colapsa a tarjetas: una tabla de 8 columnas en un teléfono no la
 * lee nadie.
 */
import type { FilaDesglose } from '@core'
import { useState } from 'react'
import { aNumero, fechaCorta, numero, pesos } from '../lib/formato'

interface Props {
  filas: FilaDesglose[]
  editable?: boolean
  onCambiarPago?(periodo: number, monto: number): void
  pagosEditados?: Record<number, number>
}

export function TablaDesglose({ filas, editable = false, onCambiarPago, pagosEditados = {} }: Props) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-slate-500">No hay períodos que mostrar.</p>
  }

  return (
    <>
      {/* Escritorio: tabla completa, con scroll horizontal propio si hace falta */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Desglose período a período: interés, mora, cuota y abono a capital
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-3">#</th>
              <th scope="col" className="py-2 pr-3">Corte</th>
              <th scope="col" className="py-2 pr-3 text-right">Deuda</th>
              <th scope="col" className="py-2 pr-3 text-right">Interés</th>
              <th scope="col" className="py-2 pr-3 text-right">Mora</th>
              <th scope="col" className="py-2 pr-3 text-right">Cuota</th>
              <th scope="col" className="py-2 pr-3 text-right">{editable ? 'Pagas' : 'Pagado'}</th>
              <th scope="col" className="py-2 pr-3 text-right">Abono a deuda</th>
              <th scope="col" className="py-2 text-right">Queda debiendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.numero} className={f.moraDelPeriodo > 0 ? 'bg-amber-50/60' : undefined}>
                <td className="py-2 pr-3 text-slate-500">{f.numero}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{fechaCorta(f.corte)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pesos(f.capitalInicial)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{pesos(f.interesDelPeriodo)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${f.moraDelPeriodo > 0 ? 'font-semibold text-amber-700' : 'text-slate-400'}`}>
                  {f.moraDelPeriodo > 0 ? pesos(f.moraDelPeriodo) : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{pesos(f.cuotaExigible)}</td>
                <td className="py-2 pr-3 text-right">
                  {editable ? (
                    <CeldaEditable
                      valor={pagosEditados[f.numero] ?? f.pagado}
                      onCambiar={(v) => onCambiarPago?.(f.numero, v)}
                      periodo={f.numero}
                    />
                  ) : (
                    <span className="tabular-nums">{pesos(f.pagado)}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums text-emerald-700">
                  {pesos(f.abonoACapital)}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{pesos(f.capitalFinal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta por período */}
      <div className="space-y-3 md:hidden">
        {filas.map((f) => (
          <div key={f.numero} className={`rounded-lg border p-3 ${f.moraDelPeriodo > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Cuota {f.numero}</span>
              <span className="text-sm text-slate-500">{fechaCorta(f.corte)}</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Debes</dt>
              <dd className="text-right tabular-nums">{pesos(f.capitalInicial)}</dd>
              <dt className="text-slate-500">Interés del mes</dt>
              <dd className="text-right tabular-nums">{pesos(f.interesDelPeriodo)}</dd>
              {f.moraDelPeriodo > 0 && (
                <>
                  <dt className="font-medium text-amber-800">Mora</dt>
                  <dd className="text-right font-medium tabular-nums text-amber-800">{pesos(f.moraDelPeriodo)}</dd>
                </>
              )}
              <dt className="text-slate-500">{editable ? 'Pagas' : 'Pagado'}</dt>
              <dd className="text-right">
                {editable ? (
                  <CeldaEditable
                    valor={pagosEditados[f.numero] ?? f.pagado}
                    onCambiar={(v) => onCambiarPago?.(f.numero, v)}
                    periodo={f.numero}
                  />
                ) : (
                  <span className="tabular-nums">{pesos(f.pagado)}</span>
                )}
              </dd>
              <dt className="text-slate-500">Baja tu deuda</dt>
              <dd className="text-right font-medium tabular-nums text-emerald-700">{pesos(f.abonoACapital)}</dd>
              <dt className="font-medium text-slate-700">Queda debiendo</dt>
              <dd className="text-right font-bold tabular-nums">{pesos(f.capitalFinal)}</dd>
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}

function CeldaEditable({
  valor,
  onCambiar,
  periodo,
}: {
  valor: number
  onCambiar(v: number): void
  periodo: number
}) {
  const [texto, setTexto] = useState(numero(valor))
  const [editando, setEditando] = useState(false)

  // Mientras no se esté editando, la celda sigue al valor calculado.
  if (!editando && texto !== numero(valor)) setTexto(numero(valor))

  return (
    <input
      className="w-28 rounded border border-slate-300 px-2 py-1 text-right tabular-nums
                 focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
      value={texto}
      inputMode="numeric"
      aria-label={`Cuánto pagas en el período ${periodo}`}
      onFocus={() => setEditando(true)}
      onChange={(e) => {
        const n = aNumero(e.target.value)
        setTexto(numero(n))
        onCambiar(n)
      }}
      onBlur={() => setEditando(false)}
    />
  )
}
