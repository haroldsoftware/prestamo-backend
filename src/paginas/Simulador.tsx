/**
 * El simulador.
 *
 * Todo el cálculo ocurre AQUÍ, en el navegador, con el mismo motor que usa el
 * servidor (`@prestamo/core`). Editar una celda recalcula todas las filas de
 * abajo al instante, sin una sola petición — que es lo que hace que se sienta
 * como una hoja de cálculo y no como un formulario.
 */
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  compararEscenarios, proyectar, tasaDesdePorcentaje, type Condiciones as CondicionesMotor,
} from '@core'
import { usePrestamo } from '../api/hooks'
import { Aviso, Cargando } from '../componentes/base'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { pesos } from '../lib/formato'

export function Simulador() {
  const { id = '' } = useParams()
  const { data: p, isLoading } = usePrestamo(id)
  const [pagos, setPagos] = useState<Record<number, number>>({})

  const condiciones = useMemo((): CondicionesMotor | null => {
    if (!p) return null
    const c = p.condiciones
    return {
      montoPrincipal: c.montoPrincipal,
      fechaDesembolso: c.fechaDesembolso,
      tasaCorriente: tasaDesdePorcentaje(c.tasaCorrienteMensualPct),
      tasaMora: tasaDesdePorcentaje(c.tasaMoraMensualPct),
      modoMora: c.modoMora,
      modoCalculo: c.modoCalculo,
      periodicidad: c.periodicidad,
      diaCorte: c.diaCorte,
      ventana: c.ventana,
      diasGracia: c.diasGracia,
      correrADiaHabil: c.correrADiaHabil,
      cuotaPactada: c.modoCalculo === 'CUOTA_FIJA' ? c.cuota : undefined,
      numeroCuotas: c.modoCalculo === 'PLAZO_FIJO' ? (c.plazo ?? undefined) : undefined,
    }
  }, [p])

  const original = useMemo(() => (condiciones ? proyectar(condiciones) : null), [condiciones])
  const escenario = useMemo(
    () => (condiciones ? proyectar(condiciones, { pagosPorPeriodo: pagos }) : null),
    [condiciones, pagos],
  )
  const comparacion = useMemo(
    () => (original && escenario ? compararEscenarios(original, escenario) : null),
    [original, escenario],
  )

  /** Escenarios de un click: la mayoría de la gente no quiere editar celdas. */
  const aplicar = useCallback(
    (nombre: 'nada' | 'doble' | 'prima' | 'limpiar') => {
      if (!p || !original) return
      const cuota = p.condiciones.cuota
      if (nombre === 'limpiar') return setPagos({})
      if (nombre === 'nada') return setPagos((x) => ({ ...x, 1: 0 }))
      if (nombre === 'doble') return setPagos((x) => ({ ...x, 1: cuota * 2 }))
      // La prima en Colombia llega en junio y diciembre: se busca ese período.
      const junio = original.filas.find((f) => f.corte.slice(5, 7) === '06') ?? original.filas[5]
      if (junio) {
        setPagos((x) => ({ ...x, [junio.numero]: cuota + Math.round(p.condiciones.montoPrincipal * 0.5) }))
      }
    },
    [p, original],
  )

  if (isLoading || !p || !original || !escenario) return <Cargando />

  const hayCambios = Object.keys(pagos).length > 0

  return (
    <div className="space-y-5">
      <div>
        <Link className="text-sm text-slate-500 hover:underline" to={`/prestamos/${id}`}>
          ← Volver al préstamo
        </Link>
        <h1 className="mt-2 text-2xl font-bold">¿Qué pasa si…?</h1>
        <p className="text-slate-600">
          Cambia lo que pagarías en cualquier mes y mira cómo se mueve todo. Esto no toca nada
          real: es solo para ver.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-secundario" onClick={() => aplicar('nada')}>No pago este mes</button>
        <button className="btn-secundario" onClick={() => aplicar('doble')}>Pago doble</button>
        <button className="btn-secundario" onClick={() => aplicar('prima')}>Abono la prima</button>
        {hayCambios && (
          <button className="btn-secundario" onClick={() => aplicar('limpiar')}>Empezar de nuevo</button>
        )}
      </div>

      {hayCambios && comparacion && (
        <div className="tarjeta sticky top-2 z-10 border-marca-300 bg-marca-50/80 backdrop-blur">
          <h2 className="font-semibold">Comparado con el plan original</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Comparado
              etiqueta="Cuotas"
              valor={comparacion.periodosAhorrados}
              bueno={comparacion.periodosAhorrados > 0}
              sufijo={Math.abs(comparacion.periodosAhorrados) === 1 ? 'cuota' : 'cuotas'}
            />
            <div>
              <p className="text-sm text-slate-600">Intereses</p>
              <p className={`text-xl font-bold tabular-nums ${comparacion.interesesAhorrados > 0 ? 'text-emerald-700' : comparacion.interesesAhorrados < 0 ? 'text-red-700' : ''}`}>
                {comparacion.interesesAhorrados > 0 ? 'Ahorras ' : comparacion.interesesAhorrados < 0 ? 'Pagas ' : ''}
                {pesos(Math.abs(comparacion.interesesAhorrados))}
                {comparacion.interesesAhorrados < 0 ? ' más' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Terminarías</p>
              <p className="text-xl font-bold">
                {escenario.fechaLiquidacion
                  ? new Date(`${escenario.fechaLiquidacion}T12:00:00Z`).toLocaleDateString('es-CO', {
                      month: 'long', year: 'numeric',
                    })
                  : 'sin terminar'}
              </p>
            </div>
          </div>
        </div>
      )}

      {escenario.totalMora > 0 && (
        <Aviso tipo="atencion" titulo="En este escenario habría mora">
          Dejarías de pagar en algún mes y eso genera {pesos(escenario.totalMora)} de mora, que se
          cobra antes que cualquier otra cosa: el pago siguiente casi no bajaría tu deuda.
        </Aviso>
      )}

      <div className="tarjeta">
        <TablaDesglose
          filas={escenario.filas}
          editable
          pagosEditados={pagos}
          onCambiarPago={(periodo, monto) => setPagos({ ...pagos, [periodo]: monto })}
        />
      </div>
    </div>
  )
}

function Comparado({
  etiqueta, valor, bueno, sufijo,
}: {
  etiqueta: string; valor: number; bueno: boolean; sufijo: string
}) {
  return (
    <div>
      <p className="text-sm text-slate-600">{etiqueta}</p>
      <p className={`text-xl font-bold tabular-nums ${valor === 0 ? '' : bueno ? 'text-emerald-700' : 'text-red-700'}`}>
        {valor === 0 ? 'Igual' : `${valor > 0 ? '−' : '+'}${Math.abs(valor)} ${sufijo}`}
      </p>
    </div>
  )
}
