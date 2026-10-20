/**
 * El simulador.
 *
 * Todo el cálculo ocurre AQUÍ, en el navegador, con el mismo motor que usa el
 * servidor (`@prestamo/core`). Editar una celda recalcula todas las filas de
 * abajo al instante, sin una sola petición — que es lo que hace que se sienta
 * como una hoja de cálculo y no como un formulario.
 */
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  compararEscenarios, proyectar, tasaDesdePorcentaje, type Condiciones as CondicionesMotor,
} from '@core'
import { usePrestamo } from '../api/hooks'
import { Aviso, EsqueletoPantalla } from '../componentes/base'
import { Pantalla } from '../componentes/Pantalla'
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

  if (isLoading || !p || !original || !escenario) {
    return <Pantalla titulo="¿Qué pasa si…?" atras={`/prestamos/${id}`} textoAtras="Préstamo"><EsqueletoPantalla /></Pantalla>
  }

  const hayCambios = Object.keys(pagos).length > 0

  return (
    <Pantalla
      titulo="¿Qué pasa si…?"
      atras={`/prestamos/${id}`}
      textoAtras="Préstamo"
      subtitulo="Cambia lo que pagarías en cualquier mes y mira cómo se mueve todo. No toca nada real."
    >
    <div className="space-y-5">
      <div className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4">
        <button className="btn-secundario btn-chico shrink-0 bg-superficie" onClick={() => aplicar('nada')}>No pago este mes</button>
        <button className="btn-secundario btn-chico shrink-0 bg-superficie" onClick={() => aplicar('doble')}>Pago doble</button>
        <button className="btn-secundario btn-chico shrink-0 bg-superficie" onClick={() => aplicar('prima')}>Abono la prima</button>
        {hayCambios && (
          <button className="btn-tonal btn-chico shrink-0" onClick={() => aplicar('limpiar')}>Empezar de nuevo</button>
        )}
      </div>

      {hayCambios && comparacion && (
        <div className="hero sticky z-10 rounded-4xl p-4 text-white" style={{ top: 'calc(env(safe-area-inset-top) + 56px)' }}>
          <h2 className="micro text-white/75">Comparado con el plan original</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Comparado
              etiqueta="Cuotas"
              valor={comparacion.periodosAhorrados}
              bueno={comparacion.periodosAhorrados > 0}
              sufijo={Math.abs(comparacion.periodosAhorrados) === 1 ? 'cuota' : 'cuotas'}
            />
            <div>
              <p className="text-[12px] text-white/75">Intereses</p>
              <p className={`cifra text-[16px] font-bold leading-tight ${comparacion.interesesAhorrados > 0 ? 'text-[#a7f3d0]' : comparacion.interesesAhorrados < 0 ? 'text-[#fecaca]' : ''}`}>
                {comparacion.interesesAhorrados > 0 ? 'Ahorras ' : comparacion.interesesAhorrados < 0 ? 'Pagas ' : ''}
                {pesos(Math.abs(comparacion.interesesAhorrados))}
                {comparacion.interesesAhorrados < 0 ? ' más' : ''}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-white/75">Terminarías</p>
              <p className="text-[16px] font-bold leading-tight capitalize">
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

      <div>
        <TablaDesglose
          filas={escenario.filas}
          editable
          pagosEditados={pagos}
          onCambiarPago={(periodo, monto) => setPagos({ ...pagos, [periodo]: monto })}
        />
      </div>
    </div>
    </Pantalla>
  )
}

function Comparado({
  etiqueta, valor, bueno, sufijo,
}: {
  etiqueta: string; valor: number; bueno: boolean; sufijo: string
}) {
  return (
    <div>
      <p className="text-[12px] text-white/75">{etiqueta}</p>
      <p className={`text-[16px] font-bold leading-tight ${valor === 0 ? '' : bueno ? 'text-[#a7f3d0]' : 'text-[#fecaca]'}`}>
        {valor === 0 ? 'Igual' : `${valor > 0 ? '−' : '+'}${Math.abs(valor)} ${sufijo}`}
      </p>
    </div>
  )
}
