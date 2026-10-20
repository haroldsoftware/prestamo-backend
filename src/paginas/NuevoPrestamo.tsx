/**
 * Asistente de creación en cuatro pasos.
 *
 * El paso final muestra el plan de pagos COMPLETO antes de confirmar: nadie
 * debería aceptar un préstamo sin ver cuánto va a pagar de intereses en total.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  evaluarUsura, periodosPorAnio, proyectar, tasaADecimal, tasaDesdeDecimal, tasaDesdePorcentaje,
  type Condiciones as CondicionesMotor,
} from '@core'
import { ErrorApi } from '../api/cliente'
import { useCrearPrestamo, useUsuraVigente } from '../api/hooks'
import { Aviso, ConfirmacionEscrita } from '../componentes/base'
import { Pantalla } from '../componentes/Pantalla'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { aNumero, hoyISO, numero, pesos, porcentaje } from '../lib/formato'

type Entrada = {
  tipo: 'PRESTAMO' | 'VENTA_CUOTAS'
  concepto: string
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
  tipo: 'PRESTAMO', concepto: '',
  emailDeudor: '', descripcion: '', montoPrincipal: 0, fechaDesembolso: hoyISO(),
  tasaCorrienteMensualPct: 2, modoMora: 'SIN_MORA', tasaMoraMensualPct: 3,
  modoCalculo: 'CUOTA_FIJA', periodicidad: 'MENSUAL', diaCorte: 30,
  diasAntes: 2, diasDespues: 2, diasGracia: 0, correrADiaHabil: false,
  cuotaPactada: 0, numeroCuotas: 12, autoConfirmarPagosDelPrestamista: false,
}

/**
 * Respaldo para el caso raro en que el servidor exija la aceptación y el
 * cálculo local no la haya detectado: la constancia nunca queda vacía.
 */
const TEXTO_ADVERTENCIA_GENERICO =
  'La tasa pactada supera la tasa de usura vigente. Cobrar intereses por encima de ese tope ' +
  'es delito en Colombia (artículo 305 del Código Penal). Declaro que leí esta advertencia y ' +
  'que asumo la responsabilidad de pactar esta tasa.'

export function NuevoPrestamo() {
  const [paso, setPaso] = useState(1)
  const [params] = useSearchParams()
  const [d, setD] = useState<Entrada>(() => ({ ...INICIAL, tipo: params.get('tipo') === 'venta' ? 'VENTA_CUOTAS' : 'PRESTAMO' }))
  // Una venta a cuotas no lleva interés ni mora: se ignoran esos campos.
  const venta = d.tipo === 'VENTA_CUOTAS'
  const tasaPct = venta ? 0 : d.tasaCorrienteMensualPct
  const modoMora: Entrada['modoMora'] = venta ? 'SIN_MORA' : d.modoMora
  const [confirmacion, setConfirmacion] = useState('')
  const [aceptaUsura, setAceptaUsura] = useState(false)
  const [servidorExigeUsura, setServidorExigeUsura] = useState(false)
  const [error, setError] = useState('')
  const crear = useCrearPrestamo()
  const { data: usura } = useUsuraVigente()
  const navegar = useNavigate()
  // Cada paso empieza arriba, como una pantalla nueva.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [paso])

  const set = <K extends keyof Entrada>(k: K, v: Entrada[K]) => {
    // Si cambia la tasa o la periodicidad, la advertencia que el usuario aceptó
    // ya no es la que aplica: hay que volver a mostrarla y volver a aceptarla.
    if (k === 'tasaCorrienteMensualPct' || k === 'periodicidad') setAceptaUsura(false)
    setD((x) => ({ ...x, [k]: v }))
  }

  const condicionesMotor = useMemo((): CondicionesMotor | null => {
    if (!d.montoPrincipal) return null
    return {
      montoPrincipal: d.montoPrincipal,
      fechaDesembolso: d.fechaDesembolso,
      tasaCorriente: tasaDesdePorcentaje(tasaPct),
      tasaMora: modoMora === 'SIN_MORA' ? 0 : tasaDesdePorcentaje(d.tasaMoraMensualPct),
      modoMora,
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

  // El mismo cálculo que hace el servidor antes de aceptar la creación: si la
  // tasa pactada supera la usura vigente, el backend exige una aceptación
  // explícita (400 requiereAceptacionUsura). Se evalúa aquí para que el usuario
  // lo vea ANTES de darle a crear, no después de un error.
  const evalUsura = useMemo(() => {
    if (!usura || venta) return null
    return evaluarUsura(
      tasaDesdePorcentaje(d.tasaCorrienteMensualPct),
      periodosPorAnio(d.periodicidad),
      tasaDesdeDecimal(usura.usuraEA),
    )
  }, [usura, venta, d.tasaCorrienteMensualPct, d.periodicidad])

  const excedeUsura = Boolean(evalUsura?.excede)

  // Texto EXACTO de la advertencia: es el mismo que se muestra en pantalla y el
  // que se manda al backend como constancia (ADVERTENCIA_USURA). Si divergieran,
  // la constancia no probaría lo que el usuario realmente leyó.
  // El servidor puede exigirla aunque el cálculo local diga que no (certificación
  // recién actualizada), así que manda cualquiera de las dos señales.
  const pedirAceptacionUsura = excedeUsura || servidorExigeUsura

  const textoAdvertencia = useMemo(() => {
    if (!evalUsura || !usura || !evalUsura.excede) return null
    return [
      `La tasa que estás pactando es de ${d.tasaCorrienteMensualPct}% mensual, ` +
        `equivalente a ${porcentaje(tasaADecimal(evalUsura.pactadaEA) * 100)} efectivo anual.`,
      `La tasa de usura vigente es ${porcentaje(usura.usuraEA * 100)} efectivo anual ` +
        `(certificación: ${usura.fechaCertificacion}, fuente: ${usura.fuente}).`,
      `Tu tasa la supera en ${porcentaje(evalUsura.excesoPuntos)} puntos porcentuales.`,
      'Cobrar intereses por encima de la tasa de usura es delito en Colombia ' +
        '(artículo 305 del Código Penal) y puede acarrear la pérdida de los intereses pactados.',
      'Declaro que leí esta advertencia, que la tasa la fijé yo, y que asumo la ' +
        'responsabilidad de pactarla por encima del tope legal. Esta plataforma no ' +
        'certifica la tasa vigente: la verifico directamente con la Superintendencia Financiera.',
    ].join('\n\n')
  }, [evalUsura, usura, d.tasaCorrienteMensualPct])

  async function enviar() {
    setError('')
    try {
      const creado = await crear.mutateAsync({
        tipo: d.tipo,
        concepto: venta ? d.concepto.trim() : undefined,
        emailDeudor: d.emailDeudor,
        descripcion: d.descripcion || undefined,
        condiciones: {
          montoPrincipal: d.montoPrincipal,
          fechaDesembolso: d.fechaDesembolso,
          tasaCorrienteMensualPct: tasaPct,
          modoMora,
          tasaMoraMensualPct: modoMora === 'PERSONALIZADA' ? d.tasaMoraMensualPct : undefined,
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
        aceptaAdvertenciaUsura: pedirAceptacionUsura && aceptaUsura ? true : undefined,
        textoAdvertenciaAceptado:
          pedirAceptacionUsura && aceptaUsura ? textoAdvertencia ?? TEXTO_ADVERTENCIA_GENERICO : undefined,
      })
      navegar(`/prestamos/${(creado as { id: string }).id}`)
    } catch (err) {
      // El servidor tiene la última palabra sobre la usura vigente: si la
      // certificación cambió mientras el formulario estaba abierto, pide la
      // aceptación aunque el cálculo local dijera que no hacía falta.
      const detalle = err instanceof ErrorApi ? (err.detalle as { requiereAceptacionUsura?: boolean } | undefined) : undefined
      if (detalle?.requiereAceptacionUsura) {
        setServidorExigeUsura(true)
        setAceptaUsura(false)
      }
      setError(err instanceof ErrorApi ? err.message : 'No pudimos registrar el préstamo')
    }
  }

  const pasos = ['A quién', 'Cuánto', 'Condiciones', 'Revisa']

  return (
    <Pantalla
      titulo={venta ? 'Nueva venta a cuotas' : 'Nuevo préstamo'}
      atras="/"
      textoAtras="Cancelar"
      subtitulo={`Paso ${paso} de 4 · ${pasos[paso - 1]}`}
    >
      <div className="space-y-5">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Pasos">
        {pasos.map((t, i) => (
          <li key={t} aria-current={i + 1 === paso ? 'step' : undefined}>
            <span className="sr-only">{i + 1}. {t}</span>
            <span className={`block h-1.5 rounded-full transition-colors duration-300 ${i + 1 <= paso ? 'bg-marca' : 'bg-superficie-2'}`} />
          </li>
        ))}
      </ol>

      <div key={paso} className="tarjeta animate-entrada space-y-5 p-5">
        {paso === 1 && (
          <>
            <fieldset>
              <legend className="etiqueta">¿Qué quieres registrar?</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['PRESTAMO', 'Un préstamo', 'Le prestas plata a alguien'],
                  ['VENTA_CUOTAS', 'Una venta a cuotas', 'Vendiste algo y te lo pagan por partes'],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`block cursor-pointer rounded-2xl p-3.5 text-[15px] transition active:scale-[0.98] ${
                      d.tipo === valor ? 'bg-texto text-fondo' : 'bg-superficie-2'
                    }`}
                  >
                    <input type="radio" name="tipo" className="sr-only" checked={d.tipo === valor} onChange={() => set('tipo', valor)} />
                    <span className="block font-semibold">{titulo}</span>
                    <span className="text-[13px] opacity-70">{ayuda}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="etiqueta" htmlFor="deudor">{venta ? '¿A quién le vendes?' : '¿A quién le prestas?'}</label>
              <input
                id="deudor" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" className="campo" value={d.emailDeudor}
                onChange={(e) => set('emailDeudor', e.target.value)} placeholder="correo@ejemplo.com"
              />
              <p className="ayuda">
                Le enviaremos la invitación a ese correo. Podrá ver las condiciones antes de
                registrarse, y {venta ? 'la venta' : 'el préstamo'} solo empieza cuando la acepte.
              </p>
            </div>
            {venta ? (
              <div>
                <label className="etiqueta" htmlFor="concepto">¿Qué vendiste?</label>
                <input
                  id="concepto" className="campo" value={d.concepto} maxLength={200}
                  onChange={(e) => set('concepto', e.target.value)} placeholder="Desarrollo de software"
                />
                <p className="ayuda">Así aparece en la constancia que acepta el comprador.</p>
              </div>
            ) : (
              <div>
                <label className="etiqueta" htmlFor="desc">¿Para qué es? (opcional)</label>
                <input
                  id="desc" className="campo" value={d.descripcion}
                  onChange={(e) => set('descripcion', e.target.value)} placeholder="Arreglo del carro"
                />
              </div>
            )}
          </>
        )}

        {paso === 2 && (
          <>
            <div>
              <label className="etiqueta" htmlFor="monto">{venta ? '¿Cuál es el valor total?' : '¿Cuánto le prestas?'}</label>
              <input
                id="monto" className="campo cifra text-[28px] font-bold" inputMode="numeric" value={numero(d.montoPrincipal)}
                onChange={(e) => set('montoPrincipal', aNumero(e.target.value))} placeholder="1.000.000"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="fecha">{venta ? '¿Fecha de la venta?' : '¿Cuándo le entregas la plata?'}</label>
              <input
                id="fecha" type="date" className="campo" value={d.fechaDesembolso}
                onChange={(e) => set('fechaDesembolso', e.target.value)}
              />
            </div>
            {venta ? (
              <p className="rounded-2xl bg-marca-suave px-4 py-3 text-[14px] text-texto">
                <strong>Sin interés.</strong> Una venta a cuotas solo cobra el valor acordado, repartido en cuotas.
              </p>
            ) : (
            <div>
              <label className="etiqueta" htmlFor="tasa">Interés mensual</label>
              <div className="flex items-center gap-2">
                <input
                  id="tasa" type="number" step="0.1" min="0" max="50" className="campo w-32"
                  value={d.tasaCorrienteMensualPct}
                  onChange={(e) => set('tasaCorrienteMensualPct', Number(e.target.value))}
                />
                <span className="text-texto-2">% al mes</span>
              </div>
              <p className="ayuda">
                Equivale a{' '}
                <strong>{porcentaje((Math.pow(1 + d.tasaCorrienteMensualPct / 100, 12) - 1) * 100)}</strong>{' '}
                efectivo anual, que es como se compara con la tasa de usura.
              </p>
              {usura && !excedeUsura && (
                <p className="ayuda">
                  La usura vigente es {porcentaje(usura.usuraEA * 100)} efectivo anual. Estás por debajo.
                </p>
              )}
              {excedeUsura && (
                <div className="mt-3">
                  <Aviso tipo="atencion" titulo="Esta tasa supera la usura vigente">
                    Va {porcentaje(evalUsura?.excesoPuntos ?? 0)} puntos por encima del tope de{' '}
                    {porcentaje((usura?.usuraEA ?? 0) * 100)} efectivo anual. Puedes seguir, pero
                    en el último paso tendrás que aceptar la advertencia de forma expresa.
                  </Aviso>
                </div>
              )}
            </div>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <fieldset>
              <legend className="etiqueta">¿Cómo se define el pago?</legend>
              <div className="grid gap-2">
                {([
                  ['CUOTA_FIJA', 'Cuota fija', 'Defines la cuota; el plazo sale solo'],
                  ['PLAZO_FIJO', 'Plazo fijo', 'Defines cuántas cuotas'],
                  ['LIBRE', 'Libre', 'Abona cuando pueda, sin cronograma'],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`block cursor-pointer rounded-2xl p-3.5 text-[15px] transition active:scale-[0.98] ${
                      d.modoCalculo === valor ? 'bg-texto text-fondo' : 'bg-superficie-2'
                    }`}
                  >
                    <input
                      type="radio" name="modo" className="sr-only" checked={d.modoCalculo === valor}
                      onChange={() => set('modoCalculo', valor)}
                    />
                    <span className="block font-semibold">{titulo}</span>
                    <span className="text-[13px] opacity-70">{ayuda}</span>
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

            {!venta && (<>
            {/* Decisión consciente: no hay valor preseleccionado */}
            <fieldset>
              <legend className="etiqueta">Si se atrasa, ¿cobras mora?</legend>
              <div className="grid gap-2">
                {([
                  ['SIN_MORA', 'No cobro mora', 'Entre conocidos es una opción válida'],
                  ['PERSONALIZADA', 'Una tasa que yo elijo', 'Tú defines cuánto'],
                  ['MAXIMO_LEGAL', 'El máximo legal', '1,5 veces el interés bancario corriente'],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`block cursor-pointer rounded-2xl p-3.5 text-[15px] transition active:scale-[0.98] ${
                      d.modoMora === valor ? 'bg-texto text-fondo' : 'bg-superficie-2'
                    }`}
                  >
                    <input
                      type="radio" name="mora" className="sr-only" checked={d.modoMora === valor}
                      onChange={() => set('modoMora', valor)}
                    />
                    <span className="block font-semibold">{titulo}</span>
                    <span className="text-[13px] opacity-70">{ayuda}</span>
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

            </>)}

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

            <label className="flex items-start gap-3 rounded-2xl bg-superficie-2 p-3.5 text-[14px] leading-snug">
              <input
                type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-marca-solido))]" checked={d.correrADiaHabil}
                onChange={(e) => set('correrADiaHabil', e.target.checked)}
              />
              <span>
                <strong>Correr al siguiente día hábil</strong> si el plazo cae en fin de semana o
                festivo colombiano.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-superficie-2 p-3.5 text-[14px] leading-snug">
              <input
                type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-marca-solido))]" checked={d.autoConfirmarPagosDelPrestamista}
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
            <div className="grid grid-cols-1 gap-3">
              <div><p className="text-sm text-texto-2">{venta ? 'Le vendes a' : 'Le prestas a'}</p><p className="font-semibold">{d.emailDeudor}</p></div>
              {venta && <div><p className="text-sm text-texto-2">Qué vendiste</p><p className="font-semibold">{d.concepto}</p></div>}
              <div><p className="text-sm text-texto-2">{venta ? 'Valor total' : 'Monto'}</p><p className="font-semibold">{pesos(d.montoPrincipal)}</p></div>
              <div><p className="text-sm text-texto-2">Interés</p><p className="font-semibold">{venta ? 'Sin interés' : `${d.tasaCorrienteMensualPct}% mensual`}</p></div>
            </div>

            {planValido && (
              <>
                {venta ? (
                  <Aviso tipo="info">
                    Pagaría <strong>{pesos(d.montoPrincipal)}</strong> en{' '}
                    <strong>{planValido.periodosHastaLiquidar ?? '—'} cuotas</strong>
                    {planValido.filas[0] ? <> de <strong>{pesos(planValido.filas[0].cuotaExigible)}</strong></> : null}, sin interés.
                  </Aviso>
                ) : (
                <Aviso tipo="info">
                  Con estas condiciones pagaría <strong>{pesos(planValido.totalIntereses)}</strong> de
                  intereses en total, y terminaría en{' '}
                  <strong>{planValido.periodosHastaLiquidar ?? '—'} cuotas</strong>. En total
                  entregaría {pesos(d.montoPrincipal + planValido.totalIntereses)}.
                </Aviso>
                )}
                <details className="rounded-2xl bg-superficie-2">
                  <summary className="cursor-pointer px-4 py-3.5 font-semibold text-marca">
                    Ver el desglose cuota por cuota
                  </summary>
                  <div className="p-3">
                    <TablaDesglose filas={planValido.filas.slice(0, 24)} />
                  </div>
                </details>
              </>
            )}

            {pedirAceptacionUsura && (
              <Aviso tipo="atencion" titulo="Advertencia de usura — léela antes de continuar">
                {/* Se muestra el MISMO texto que se envía como constancia. */}
                <p className="whitespace-pre-line">{textoAdvertencia ?? TEXTO_ADVERTENCIA_GENERICO}</p>
                <label className="mt-3 flex items-start gap-2 font-medium">
                  <input
                    type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-marca-solido))]" checked={aceptaUsura}
                    onChange={(e) => setAceptaUsura(e.target.checked)}
                  />
                  <span>
                    Leí y acepto esta advertencia. Pacto esta tasa bajo mi responsabilidad.
                  </span>
                </label>
                <p className="mt-2 text-xs">
                  Tu aceptación queda registrada con fecha, hora y el texto exacto que acabas de leer.
                </p>
              </Aviso>
            )}

            <ConfirmacionEscrita palabra="CREAR" valor={confirmacion} onChange={setConfirmacion} />
          </>
        )}
      </div>

      {createPortal(
      <div className="vidrio fixed inset-x-0 bottom-0 z-30 border-t border-separador/70 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
      <div className="mx-auto grid max-w-2xl grid-cols-[auto_1fr] gap-3">
        <button
          className="btn-secundario" onClick={() => setPaso((p) => Math.max(1, p - 1))}
          disabled={paso === 1}
        >
          Atrás
        </button>
        {paso < 4 ? (
          <button
            className="btn-primario w-full" onClick={() => setPaso((p) => p + 1)}
            disabled={
              (paso === 1 && (!d.emailDeudor.includes('@') || (venta && d.concepto.trim().length < 2))) ||
              (paso === 2 && d.montoPrincipal <= 0) ||
              (paso === 3 && (Boolean(errorPlan) || (d.modoCalculo === 'CUOTA_FIJA' && !d.cuotaPactada)))
            }
          >
            Siguiente
          </button>
        ) : (
          <button
            className="btn-primario w-full" onClick={() => void enviar()}
            disabled={
              confirmacion !== 'CREAR' ||
              crear.isPending ||
              (pedirAceptacionUsura && !aceptaUsura)
            }
          >
            {crear.isPending ? 'Registrando…' : venta ? 'Registrar venta' : 'Registrar préstamo'}
          </button>
        )}
      </div>
      </div>,
        document.body,
      )}
      </div>
    </Pantalla>
  )
}
