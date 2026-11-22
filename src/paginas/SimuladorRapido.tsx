/**
 * Simulador rápido.
 *
 * Para cuando solo se quiere saber "¿cuánto queda la cuota?" o "¿en cuántos
 * meses termina?" sin crear un préstamo: monto, interés y plazo o cuota. No
 * guarda nada ni habla con el servidor; usa el mismo motor que un préstamo real,
 * con lo demás fijo (mensual, sin mora, sin gracia, desembolso hoy).
 */
import { useMemo, useState } from 'react'
import { cuotaMinima, proyectar, tasaDesdePorcentaje, type Condiciones as CondicionesMotor } from '@core'
import { Aviso, Cifra, Segmentos } from '../componentes/base'
import { Pantalla } from '../componentes/Pantalla'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { aNumero, hoyISO, numero, periodos, pesos } from '../lib/formato'

type Modo = 'PLAZO_FIJO' | 'CUOTA_FIJA'

const MAX_CUOTAS = 600

export function SimuladorRapido() {
  const [monto, setMonto] = useState(1_000_000)
  const [tasaTexto, setTasaTexto] = useState('5')
  const [modo, setModo] = useState<Modo>('PLAZO_FIJO')
  const [cuotas, setCuotas] = useState(12)
  const [cuota, setCuota] = useState(100_000)

  const tasaPct = Number(tasaTexto.replace(',', '.'))
  const tasaValida = Number.isFinite(tasaPct) && tasaPct >= 0 && tasaPct <= 100

  const resultado = useMemo(() => {
    if (!monto || !tasaValida) return null
    if (modo === 'PLAZO_FIJO' && (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS)) return null
    if (modo === 'CUOTA_FIJA' && !cuota) return null
    const tasa = tasaDesdePorcentaje(tasaPct)
    // Si la cuota no cubre ni el interés del primer mes, la deuda nunca baja.
    if (modo === 'CUOTA_FIJA' && cuota < cuotaMinima(monto, tasa)) {
      return {
        error: `Con ${pesos(cuota)} al mes no alcanza ni para el interés. La cuota debe ser de al menos ${pesos(cuotaMinima(monto, tasa))}, y mientras más alta, más rápido termina.`,
      } as const
    }
    const c: CondicionesMotor = {
      montoPrincipal: monto,
      fechaDesembolso: hoyISO(),
      tasaCorriente: tasa,
      tasaMora: 0,
      modoMora: 'SIN_MORA',
      modoCalculo: modo,
      periodicidad: 'MENSUAL',
      diaCorte: Number(hoyISO().slice(8, 10)),
      ventana: { diasAntes: 0, diasDespues: 0 },
      diasGracia: 0,
      correrADiaHabil: false,
      cuotaPactada: modo === 'CUOTA_FIJA' ? cuota : undefined,
      numeroCuotas: modo === 'PLAZO_FIJO' ? cuotas : undefined,
    }
    try {
      return { ok: proyectar(c, { maxPeriodos: MAX_CUOTAS + 12 }) } as const
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo calcular' } as const
    }
  }, [monto, tasaPct, tasaValida, modo, cuotas, cuota])

  const plan = resultado && 'ok' in resultado ? resultado.ok : null
  const cuotaMensual = plan?.filas[0]?.cuotaExigible ?? 0
  const nCuotas = plan?.periodosHastaLiquidar ?? null
  const ultima = plan && nCuotas ? plan.filas[nCuotas - 1]?.pagado : undefined

  return (
    <Pantalla
      titulo="Simulador"
      atras="/"
      textoAtras="Inicio"
      subtitulo="Prueba montos, tasas y plazos al instante. No se guarda nada."
    >
      <div className="space-y-5">
        <div className="tarjeta space-y-5">
          <div>
            <label className="etiqueta" htmlFor="sim-monto">Monto a prestar</label>
            <input
              id="sim-monto" className="campo cifra text-[28px] font-bold" inputMode="numeric"
              value={numero(monto)} onChange={(e) => setMonto(aNumero(e.target.value))} placeholder="1.000.000"
            />
          </div>

          <div>
            <label className="etiqueta" htmlFor="sim-tasa">Interés mensual</label>
            <div className="flex items-center gap-2">
              <input
                id="sim-tasa" className="campo w-32" inputMode="decimal"
                value={tasaTexto} onChange={(e) => setTasaTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <span className="text-texto-2">% al mes</span>
            </div>
            {!tasaValida && <p className="error">Escribe un porcentaje entre 0 y 100.</p>}
          </div>

          <div>
            <span className="etiqueta">¿Qué defines tú?</span>
            <Segmentos<Modo>
              etiqueta="Plazo o cuota"
              valor={modo}
              onCambio={setModo}
              opciones={[['PLAZO_FIJO', 'Número de cuotas'], ['CUOTA_FIJA', 'Cuota fija']] as const}
            />
          </div>

          {modo === 'PLAZO_FIJO' ? (
            <div>
              <label className="etiqueta" htmlFor="sim-cuotas">¿En cuántas cuotas mensuales?</label>
              <input
                id="sim-cuotas" className="campo w-32" inputMode="numeric"
                value={cuotas ? String(cuotas) : ''} onChange={(e) => setCuotas(aNumero(e.target.value))}
              />
              {cuotas > MAX_CUOTAS && <p className="error">Máximo {MAX_CUOTAS} cuotas.</p>}
            </div>
          ) : (
            <div>
              <label className="etiqueta" htmlFor="sim-cuota">¿Cuánto pagaría cada mes?</label>
              <input
                id="sim-cuota" className="campo" inputMode="numeric"
                value={numero(cuota)} onChange={(e) => setCuota(aNumero(e.target.value))}
              />
            </div>
          )}
        </div>

        {resultado && 'error' in resultado && (
          <Aviso tipo="atencion" titulo="Así no se pagaría nunca">{resultado.error}</Aviso>
        )}

        {plan && (
          <>
            <div className="tarjeta grid grid-cols-2 gap-4">
              <Cifra
                etiqueta="Cuota mensual" valor={cuotaMensual}
                explicacion={ultima !== undefined && ultima !== cuotaMensual ? `La última sería de ${pesos(ultima)}` : undefined}
              />
              <Cifra
                etiqueta="Plazo" valor={nCuotas ? periodos(nCuotas) : 'Más de 50 años'}
              />
              <Cifra etiqueta="Total de intereses" valor={plan.totalIntereses} tono="atencion" />
              <Cifra etiqueta="Total a pagar" valor={plan.totalPagado} />
            </div>

            <TablaDesglose filas={plan.filas} />
          </>
        )}
      </div>
    </Pantalla>
  )
}
