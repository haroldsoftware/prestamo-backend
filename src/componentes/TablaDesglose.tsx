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

/** Porcentaje de la cuota que representa una parte (para la barra). */
function share(parte: number, f: FilaDesglose): number {
  const total = f.interesDelPeriodo + f.moraDelPeriodo + f.abonoACapital
  return total > 0 ? (parte / total) * 100 : 0
}

export function TablaDesglose({ filas, editable = false, onCambiarPago, pagosEditados = {} }: Props) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-texto-2">No hay períodos que mostrar.</p>
  }

  return (
    <>
      {/* Escritorio: tabla completa, con scroll horizontal propio si hace falta */}
      <div className="tarjeta hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Desglose período a período: interés, mora, cuota y abono a capital
          </caption>
          <thead>
            <tr className="border-b border-separador text-left text-xs uppercase tracking-wide text-texto-2">
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
          <tbody className="divide-y divide-separador">
            {filas.map((f) => (
              <tr key={f.numero} className={f.moraDelPeriodo > 0 ? 'bg-atencion-suave/60' : undefined}>
                <td className="py-2 pr-3 text-texto-2">{f.numero}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{fechaCorta(f.corte)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pesos(f.capitalInicial)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-texto-2">{pesos(f.interesDelPeriodo)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${f.moraDelPeriodo > 0 ? 'font-semibold text-atencion' : 'text-texto-3'}`}>
                  {f.moraDelPeriodo > 0 ? pesos(f.moraDelPeriodo) : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-texto-2">{pesos(f.cuotaExigible)}</td>
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
                <td className="py-2 pr-3 text-right font-medium tabular-nums text-marca">
                  {pesos(f.abonoACapital)}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{pesos(f.capitalFinal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta por período */}
      <div className="space-y-2.5 md:hidden">
        {filas.map((f) => {
          const pagadoPct = f.capitalInicial > 0 ? Math.min(1, f.abonoACapital / f.capitalInicial) : 0
          return (
            <div key={f.numero} className={`tarjeta ${f.moraDelPeriodo > 0 ? 'ring-1 ring-atencion/50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold ${
                  f.moraDelPeriodo > 0 ? 'bg-atencion-suave text-atencion' : 'bg-marca-suave text-marca'
                }`}>
                  {f.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-texto-2">Corte {fechaCorta(f.corte)}</p>
                  <p className="cifra text-[17px] font-bold">{pesos(f.cuotaExigible)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-texto-2">Queda debiendo</p>
                  <p className="cifra text-[15px] font-semibold">{pesos(f.capitalFinal)}</p>
                </div>
              </div>
              {/* Cuánto de la cuota es interés y cuánto baja la deuda, de un vistazo */}
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-superficie-2">
                <div className="bg-atencion/70" style={{ width: `${share(f.interesDelPeriodo + f.moraDelPeriodo, f)}%` }} />
                <div className="bg-marca" style={{ width: `${share(f.abonoACapital, f)}%` }} />
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                <dt className="flex items-center gap-1.5 text-texto-2"><span className="h-2 w-2 rounded-full bg-atencion/70" />Interés{f.moraDelPeriodo > 0 ? ' + mora' : ''}</dt>
                <dd className="cifra text-right">{pesos(f.interesDelPeriodo + f.moraDelPeriodo)}</dd>
                <dt className="flex items-center gap-1.5 text-texto-2"><span className="h-2 w-2 rounded-full bg-marca" />Baja la deuda</dt>
                <dd className="cifra text-right font-semibold text-marca">{pesos(f.abonoACapital)}</dd>
                <dt className="text-texto-2">{editable ? 'Pagas' : 'Pagado'}</dt>
                <dd className="text-right">
                  {editable ? (
                    <CeldaEditable
                      valor={pagosEditados[f.numero] ?? f.pagado}
                      onCambiar={(v) => onCambiarPago?.(f.numero, v)}
                      periodo={f.numero}
                    />
                  ) : (
                    <span className="cifra">{pesos(f.pagado)}</span>
                  )}
                </dd>
              </dl>
              <span className="sr-only">Abono equivalente al {Math.round(pagadoPct * 100)}% de la deuda del período</span>
            </div>
          )
        })}
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
      className="cifra w-28 rounded-lg border border-transparent bg-superficie-2 px-2 py-1.5 text-right text-[16px]
                 outline-none focus:border-marca focus:bg-superficie"
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
