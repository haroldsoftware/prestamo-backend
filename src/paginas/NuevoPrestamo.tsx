/**
 * Asistente de creación en cuatro pasos.
 *
 * El paso final muestra el plan de pagos COMPLETO antes de confirmar: nadie
 * debería aceptar un préstamo sin ver cuánto va a pagar de intereses en total.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { proyectar, tasaDesdePorcentaje, type Condiciones as CondicionesMotor } from '@core'
import { ErrorApi } from '../api/cliente'
import { useCrearPrestamo } from '../api/hooks'
import { Aviso, ConfirmacionEscrita } from '../componentes/base'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { aNumero, hoyISO, numero, pesos, porcentaje } from '../lib/formato'

type Entrada = {
  emailDeudor: string
  descripcion: string
  montoPrincipal: number
  fechaDesembolso: string
  tasaCorrienteMensualPct: number
  modoMora: 'SIN_MORA' | 'PERSONALIZADA' | 'MAXIMO_LEGAL'
  tasaMoraMensualPct: number
  modoCalculo: 'CUOTA_FIJA' | 'PLAZO_FIJO' | 'LIBRE'
  periodicidad: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL'
  diaCorte: number
  diasAntes: number
  diasDespues: number
  diasGracia: number
  correrADiaHabil: boolean
  cuotaPactada: number
  numeroCuotas: number
  autoConfirmarPagosDelPrestamista: boolean
}

const INICIAL: Entrada = {
  emailDeudor: '', descripcion: '', montoPrincipal: 0, fechaDesembolso: hoyISO(),
  tasaCorrienteMensualPct: 2, modoMora: 'SIN_MORA', tasaMoraMensualPct: 3,
  modoCalculo: 'CUOTA_FIJA', periodicidad: 'MENSUAL', diaCorte: 30,
  diasAntes: 2, diasDespues: 2, diasGracia: 0, correrADiaHabil: false,
  cuotaPactada: 0, numeroCuotas: 12, autoConfirmarPagosDelPrestamista: false,
}

export function NuevoPrestamo() {
  const [paso, setPaso] = useState(1)
  const [d, setD] = useState<Entrada>(INICIAL)
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const crear = useCrearPrestamo()
  const navegar = useNavigate()

  const set = <K extends keyof Entrada>(k: K, v: Entrada[K]) => setD((x) => ({ ...x, [k]: v }))

  const condicionesMotor = useMemo((): CondicionesMotor | null => {
    if (!d.montoPrincipal) return null
    return {
      montoPrincipal: d.montoPrincipal,
      fechaDesembolso: d.fechaDesembolso,
      tasaCorriente: tasaDesdePorcentaje(d.tasaCorrienteMensualPct),
      tasaMora: d.modoMora === 'SIN_MORA' ? 0 : tasaDesdePorcentaje(d.tasaMoraMensualPct),
      modoMora: d.modoMora,
      modoCalculo: d.modoCalculo,
      periodicidad: d.periodicidad,
      diaCorte: d.diaCorte,
      ventana: { diasAntes: d.diasAntes, diasDespues: d.diasDespues },
      diasGracia: d.diasGracia,
      correrADiaHabil: d.correrADiaHabil,
      cuotaPactada: d.modoCalculo === 'CUOTA_FIJA' ? d.cuotaPactada : undefined,
      numeroCuotas: d.modoCalculo === 'PLAZO_FIJO' ? d.numeroCuotas : undefined,
    }
  }, [d])

  // El plan se calcula EN EL NAVEGADOR con el mismo motor del servidor: el
  // usuario ve el efecto de cada cambio al instante, sin esperar una petición.
  const previa = useMemo(() => {
    if (!condicionesMotor) return null
    try {
      return proyectar(condicionesMotor, { maxPeriodos: 400 })
    } catch (e) {
      return { errorMensaje: e instanceof Error ? e.message : 'No se pudo calcular' } as const
    }
  }, [condicionesMotor])

  const planValido = previa && !('errorMensaje' in previa) ? previa : null
  const errorPlan = previa && 'errorMensaje' in previa ? previa.errorMensaje : null

  async function enviar() {
    setError('')
    try {
      const creado = await crear.mutateAsync({
        emailDeudor: d.emailDeudor,
        descripcion: d.descripcion || undefined,
        condiciones: {
          montoPrincipal: d.montoPrincipal,
          fechaDesembolso: d.fechaDesembolso,
          tasaCorrienteMensualPct: d.tasaCorrienteMensualPct,
          modoMora: d.modoMora,
          tasaMoraMensualPct: d.modoMora === 'PERSONALIZADA' ? d.tasaMoraMensualPct : undefined,
          modoCalculo: d.modoCalculo,
          periodicidad: d.periodicidad,
          diaCorte: d.diaCorte,
          ventana: { diasAntes: d.diasAntes, diasDespues: d.diasDespues },
          diasGracia: d.diasGracia,
          correrADiaHabil: d.correrADiaHabil,
          cuotaPactada: d.modoCalculo === 'CUOTA_FIJA' ? d.cuotaPactada : undefined,
          numeroCuotas: d.modoCalculo === 'PLAZO_FIJO' ? d.numeroCuotas : undefined,
          autoConfirmarPagosDelPrestamista: d.autoConfirmarPagosDelPrestamista,
        },
      })
      navegar(`/prestamos/${(creado as { id: string }).id}`)
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos registrar el préstamo')
    }
  }

  const pasos = ['A quién', 'Cuánto', 'Condiciones', 'Revisa']

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Registrar un préstamo</h1>

      <ol className="flex gap-2 text-sm" aria-label="Pasos">
        {pasos.map((t, i) => (
          <li
            key={t}
            className={`flex-1 rounded-lg px-3 py-2 text-center ${
              i + 1 === paso ? 'bg-marca-600 text-white font-semibold'
              : i + 1 < paso ? 'bg-marca-50 text-marca-700' : 'bg-slate-100 text-slate-500'
            }`}
            aria-current={i + 1 === paso ? 'step' : undefined}
          >
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      <div className="tarjeta space-y-4">
        {paso === 1 && (
          <>
            <div>
              <label className="etiqueta" htmlFor="deudor">¿A quién le prestas?</label>
              <input
                id="deudor" type="email" className="campo" value={d.emailDeudor}
                onChange={(e) => set('emailDeudor', e.target.value)} placeholder="correo@ejemplo.com"
              />
              <p className="ayuda">
                Le enviaremos la invitación a ese correo. Podrá ver las condiciones antes de
                registrarse, y el préstamo solo empieza cuando la acepte.
              </p>
            </div>
            <div>
              <label className="etiqueta" htmlFor="desc">¿Para qué es? (opcional)</label>
              <input
                id="desc" className="campo" value={d.descripcion}
                onChange={(e) => set('descripcion', e.target.value)} placeholder="Arreglo del carro"
              />
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div>
              <label className="etiqueta" htmlFor="monto">¿Cuánto le prestas?</label>
              <input
                id="monto" className="campo text-lg" inputMode="numeric" value={numero(d.montoPrincipal)}
                onChange={(e) => set('montoPrincipal', aNumero(e.target.value))} placeholder="1.000.000"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="fecha">¿Cuándo le entregas la plata?</label>
              <input
                id="fecha" type="date" className="campo" value={d.fechaDesembolso}
                onChange={(e) => set('fechaDesembolso', e.target.value)}
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="tasa">Interés mensual</label>
              <div className="flex items-center gap-2">
                <input
                  id="tasa" type="number" step="0.1" min="0" max="50" className="campo w-32"
                  value={d.tasaCorrienteMensualPct}
                  onChange={(e) => set('tasaCorrienteMensualPct', Number(e.target.value))}
                />
                <span className="text-slate-600">% al mes</span>
              </div>
              <p className="ayuda">
                Equivale a{' '}
                <strong>{porcentaje((Math.pow(1 + d.tasaCorrienteMensualPct / 100, 12) - 1) * 100)}</strong>{' '}
                efectivo anual, que es como se compara con la tasa de usura.
              </p>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <fieldset>
              <legend className="etiqueta">¿Cómo se define el pago?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['CUOTA_FIJA', 'Cuota fija', 'Defines la cuota; el plazo sale solo'],
                  ['PLAZO_FIJO', 'Plazo fijo', 'Defines cuántas cuotas'],
                  ['LIBRE', 'Libre', 'Abona cuando pueda, sin cronograma'],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`cursor-pointer rounded-lg border p-3 text-sm ${
                      d.modoCalculo === valor ? 'border-marca-500 bg-marca-50' : 'border-slate-300'
                    }`}
                  >
                    <input
                      type="radio" name="modo" className="sr-only" checked={d.modoCalculo === valor}
                      onChange={() => set('modoCalculo', valor)}
                    />
                    <span className="block font-semibold">{titulo}</span>
                    <span className="text-xs text-slate-500">{ayuda}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {d.modoCalculo === 'CUOTA_FIJA' && (
              <div>
                <label className="etiqueta" htmlFor="cuota">¿Cuánto va a pagar cada mes?</label>
                <input
                  id="cuota" className="campo" inputMode="numeric" value={numero(d.cuotaPactada)}
                  onChange={(e) => set('cuotaPactada', aNumero(e.target.value))}
                />
                {errorPlan && <p className="error">{errorPlan}</p>}
                {planValido?.periodosHastaLiquidar && (
                  <p className="ayuda">
                    Terminaría de pagar en <strong>{planValido.periodosHastaLiquidar} meses</strong> y
                    habría pagado <strong>{pesos(planValido.totalIntereses)}</strong> de intereses.
                  </p>
                )}
              </div>
            )}

            {d.modoCalculo === 'PLAZO_FIJO' && (
              <div>
                <label className="etiqueta" htmlFor="cuotas">¿En cuántas cuotas?</label>
                <input
                  id="cuotas" type="number" min="1" max="600" className="campo w-32"
                  value={d.numeroCuotas} onChange={(e) => set('numeroCuotas', Number(e.target.value))}
                />
                {planValido && (
                  <p className="ayuda">
                    La cuota quedaría en <strong>{pesos(planValido.filas[0]?.cuotaExigible ?? 0)}</strong>.
                  </p>
                )}
              </div>
            )}

            {/* Decisión consciente: no hay valor preseleccionado */}
            <fieldset>
              <legend className="etiqueta">Si se atrasa, ¿cobras mora?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['SIN_MORA', 'No cobro mora', 'Entre conocidos es una opción válida'],
                  ['PERSONALIZADA', 'Una tasa que yo elijo', 'Tú defines cuánto'],
                  ['MAXIMO_LEGAL', 'El máximo legal', '1,5 veces el interés bancario corriente'],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`cursor-pointer rounded-lg border p-3 text-sm ${
                      d.modoMora === valor ? 'border-marca-500 bg-marca-50' : 'border-slate-300'
                    }`}
                  >
                    <input
                      type="radio" name="mora" className="sr-only" checked={d.modoMora === valor}
                      onChange={() => set('modoMora', valor)}
                    />
                    <span className="block font-semibold">{titulo}</span>
                    <span className="text-xs text-slate-500">{ayuda}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {d.modoMora === 'PERSONALIZADA' && (
              <div>
                <label className="etiqueta" htmlFor="mora">Interés de mora mensual</label>
                <input
                  id="mora" type="number" step="0.1" min="0" max="75" className="campo w-32"
                  value={d.tasaMoraMensualPct}
                  onChange={(e) => set('tasaMoraMensualPct', Number(e.target.value))}
                />
                <p className="ayuda">Solo corre sobre lo que quede vencido, y por días de atraso.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiqueta" htmlFor="corte">Día de pago de cada mes</label>
                <input
                  id="corte" type="number" min="1" max="31" className="campo w-24"
                  value={d.diaCorte} onChange={(e) => set('diaCorte', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="etiqueta">Margen para pagar</label>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="number" min="0" max="15" className="campo w-20" value={d.diasAntes}
                    onChange={(e) => set('diasAntes', Number(e.target.value))} aria-label="Días antes"
                  />
                  <span>días antes y</span>
                  <input
                    type="number" min="0" max="15" className="campo w-20" value={d.diasDespues}
                    onChange={(e) => set('diasDespues', Number(e.target.value))} aria-label="Días después"
                  />
                  <span>después</span>
                </div>
                <p className="ayuda">
                  Puede pagar entre el {Math.max(1, d.diaCorte - d.diasAntes)} y el{' '}
                  {d.diaCorte + d.diasDespues > 30 ? d.diaCorte + d.diasDespues - 30 : d.diaCorte + d.diasDespues}
                  {d.diaCorte + d.diasDespues > 30 ? ' del mes siguiente' : ''}.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox" className="mt-1" checked={d.correrADiaHabil}
                onChange={(e) => set('correrADiaHabil', e.target.checked)}
              />
              <span>
                <strong>Correr al siguiente día hábil</strong> si el plazo cae en fin de semana o
                festivo colombiano.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox" className="mt-1" checked={d.autoConfirmarPagosDelPrestamista}
                onChange={(e) => set('autoConfirmarPagosDelPrestamista', e.target.checked)}
              />
              <span>
                <strong>Mis registros de pago se confirman solos.</strong> Cuando tú registras un
                pago estás diciendo que lo recibiste, así que no necesita confirmación. Déjalo
                apagado si prefieres que la otra parte revise el monto antes — corregir un pago
                mal registrado es más molesto que confirmarlo.
              </span>
            </label>
          </>
        )}

        {paso === 4 && (
          <>
            {error && <Aviso tipo="error">{error}</Aviso>}
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-sm text-slate-500">Le prestas a</p><p className="font-semibold">{d.emailDeudor}</p></div>
              <div><p className="text-sm text-slate-500">Monto</p><p className="font-semibold">{pesos(d.montoPrincipal)}</p></div>
              <div><p className="text-sm text-slate-500">Interés</p><p className="font-semibold">{d.tasaCorrienteMensualPct}% mensual</p></div>
            </div>

            {planValido && (
              <>
                <Aviso tipo="info">
                  Con estas condiciones pagaría <strong>{pesos(planValido.totalIntereses)}</strong> de
                  intereses en total, y terminaría en{' '}
                  <strong>{planValido.periodosHastaLiquidar ?? '—'} cuotas</strong>. En total
                  entregaría {pesos(d.montoPrincipal + planValido.totalIntereses)}.
                </Aviso>
                <details className="rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-4 py-3 font-medium">
                    Ver el desglose cuota por cuota
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <TablaDesglose filas={planValido.filas.slice(0, 24)} />
                  </div>
                </details>
              </>
            )}

            <ConfirmacionEscrita palabra="CREAR" valor={confirmacion} onChange={setConfirmacion} />
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button
          className="btn-secundario" onClick={() => setPaso((p) => Math.max(1, p - 1))}
          disabled={paso === 1}
        >
          Atrás
        </button>
        {paso < 4 ? (
          <button
            className="btn-primario" onClick={() => setPaso((p) => p + 1)}
            disabled={
              (paso === 1 && !d.emailDeudor.includes('@')) ||
              (paso === 2 && d.montoPrincipal <= 0) ||
              (paso === 3 && (Boolean(errorPlan) || (d.modoCalculo === 'CUOTA_FIJA' && !d.cuotaPactada)))
            }
          >
            Siguiente
          </button>
        ) : (
          <button
            className="btn-primario" onClick={() => void enviar()}
            disabled={confirmacion !== 'CREAR' || crear.isPending}
          >
            {crear.isPending ? 'Registrando…' : 'Registrar préstamo'}
          </button>
        )}
      </div>
    </div>
  )
}
