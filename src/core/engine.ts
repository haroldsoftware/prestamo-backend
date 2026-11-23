/**
 * El motor. Funciones puras, sin dependencias, sin estado.
 *
 * Corre idéntico en el backend (fuente de verdad) y en el navegador
 * (simulador instantáneo). Un test de contrato verifica que ambos den las
 * mismas cifras al peso — por eso este archivo no puede importar nada de Node
 * ni del DOM.
 */

import { generarPeriodos, type ConfigPeriodos, type Periodo } from './dates.js'
import { diasEntre, type FechaISO } from './holidays.js'
import {
  aplicarTasa, aplicarTasaProrrateada, divRedondeado, ESCALA_TASA_BIG, repartir, type Pesos, type Tasa,
} from './money.js'
import { periodosPorAnio } from './rates.js'
import { cuotaParaPlazo, plazoParaCuota } from './schedule.js'
import type { Asiento, Condiciones, Estado, FilaDesglose, Pago } from './types.js'

export const ESTADO_INICIAL_VACIO: Estado = {
  capital: 0,
  interesesPendientes: 0,
  moraPendiente: 0,
  vencido: 0,
}

export function estadoInicial(condiciones: Condiciones): Estado {
  return { ...ESTADO_INICIAL_VACIO, capital: condiciones.montoPrincipal }
}

export function configPeriodos(c: Condiciones): ConfigPeriodos {
  return {
    periodicidad: c.periodicidad,
    diaCorte: c.diaCorte,
    diasPersonalizados: c.diasPersonalizados,
    ventana: c.ventana,
    diasGracia: c.diasGracia,
    correrADiaHabil: c.correrADiaHabil,
  }
}

/** ¿Es un CDT (plata entregada a término con interés simple anual)? */
export function esCdt(c: Pick<Condiciones, 'modoCalculo'>): boolean {
  return c.modoCalculo === 'CDT_AL_VENCIMIENTO' || c.modoCalculo === 'CDT_INTERES_MENSUAL'
}

function tasaAnualCdt(c: Condiciones): Tasa {
  return c.tasaAnual ?? c.tasaCorriente * 12
}

/** Interés simple acumulado de `meses` meses: capital × tasaAnual × meses / 12. */
function interesAcumuladoCdt(capital: Pesos, tasaAnual: Tasa, meses: number): Pesos {
  if (meses <= 0) return 0
  return Number(divRedondeado(BigInt(capital) * BigInt(tasaAnual) * BigInt(meses), ESCALA_TASA_BIG * 12n))
}

/**
 * Interés del mes `numero` de un CDT.
 *
 * Se calcula como diferencia de acumulados para que el redondeo no se
 * acumule: 10 millones al 10 % anual dan $1.000.000 exactos en 12 meses, no
 * 12 × $83.333 = $999.996.
 */
export function interesMesCdt(capital: Pesos, tasaAnual: Tasa, numero: number): Pesos {
  if (capital <= 0) return 0
  return interesAcumuladoCdt(capital, tasaAnual, numero) - interesAcumuladoCdt(capital, tasaAnual, numero - 1)
}

/** Interés corriente que causa un período sobre el capital dado. */
export function interesCorrienteDelPeriodo(c: Condiciones, capital: Pesos, numero: number): Pesos {
  if (capital <= 0) return 0
  return esCdt(c) ? interesMesCdt(capital, tasaAnualCdt(c), numero) : aplicarTasa(capital, c.tasaCorriente)
}

/**
 * Lo que se vuelve exigible en un período de un CDT.
 *
 * Antes del vencimiento: nada (AL_VENCIMIENTO) o el interés del mes
 * (INTERES_MENSUAL). Desde el vencimiento: todo lo que se debe y aún no
 * estaba vencido — capital más intereses.
 */
export function exigibleCdt(c: Condiciones, numero: number, previo: Estado, interesDelPeriodo: Pesos): Pesos {
  const plazo = c.numeroCuotas ?? 1
  if (numero < plazo) return c.modoCalculo === 'CDT_INTERES_MENSUAL' ? interesDelPeriodo : 0
  return Math.max(0, previo.capital + previo.interesesPendientes + interesDelPeriodo - previo.vencido)
}

/** Cuota exigible por período según el modo de cálculo. */
export function cuotaExigible(c: Condiciones): Pesos {
  switch (c.modoCalculo) {
    case 'CDT_AL_VENCIMIENTO':
      // El único pago: capital + todos los intereses del plazo.
      if (c.numeroCuotas === undefined) throw new RangeError('un CDT requiere numeroCuotas (meses)')
      return c.montoPrincipal + interesAcumuladoCdt(c.montoPrincipal, tasaAnualCdt(c), c.numeroCuotas)
    case 'CDT_INTERES_MENSUAL':
      // Lo que se paga cada mes antes del vencimiento.
      if (c.numeroCuotas === undefined) throw new RangeError('un CDT requiere numeroCuotas (meses)')
      return interesMesCdt(c.montoPrincipal, tasaAnualCdt(c), 1)
    case 'CUOTA_FIJA':
      if (c.cuotaPactada === undefined) throw new RangeError('CUOTA_FIJA requiere cuotaPactada')
      return c.cuotaPactada
    case 'PLAZO_FIJO':
      if (c.numeroCuotas === undefined) throw new RangeError('PLAZO_FIJO requiere numeroCuotas')
      return cuotaParaPlazo(c.montoPrincipal, c.tasaCorriente, c.numeroCuotas)
    case 'LIBRE':
      // Sin cronograma: no hay exigible, luego no hay vencido, luego no hay mora.
      return 0
  }
}

/** Número de períodos que se proyectan por defecto. */
export function plazoEstimado(c: Condiciones): number {
  if (c.modoCalculo === 'PLAZO_FIJO' || esCdt(c)) return c.numeroCuotas ?? 0
  if (c.modoCalculo === 'LIBRE') return Math.ceil(periodosPorAnio(c.periodicidad, c.diasPersonalizados))
  return plazoParaCuota(c.montoPrincipal, c.tasaCorriente, cuotaExigible(c))
}

export interface ResultadoPeriodo {
  estado: Estado
  asientos: Asiento[]
  fila: FilaDesglose
}

/**
 * Procesa un período completo: causa, aplica pagos y devuelve el estado nuevo.
 *
 * Orden del ciclo (planeación §4.4):
 *   1. Interés corriente sobre el CAPITAL únicamente.
 *   2. Mora sobre lo vencido, prorrateada por días de atraso.
 *   3. Prelación legal: mora → intereses → capital (art. 1653 C.C.).
 */
export interface OpcionesPeriodo {
  /** Cuota exigible distinta a la pactada (celda editable del simulador). */
  cuotaDelPeriodo?: Pesos
  /**
   * Período anterior. Necesario para saber desde cuándo corre la mora: lo
   * vencido que entra a este período lleva en mora desde que cerró la ventana
   * del período anterior, no desde que empieza este.
   */
  periodoAnterior?: Periodo
}

export function procesarPeriodo(
  estadoPrevio: Estado,
  periodo: Periodo,
  condiciones: Condiciones,
  pagos: readonly Pago[],
  opciones: OpcionesPeriodo = {},
): ResultadoPeriodo {
  const asientos: Asiento[] = []
  const saldoAntes = { ...estadoPrevio }
  let { capital, interesesPendientes, moraPendiente, vencido } = estadoPrevio

  const snapshot = (): Estado => ({ capital, interesesPendientes, moraPendiente, vencido })

  const totalPagado = pagos.reduce((a, p) => a + p.monto, 0)

  // ── 1. Interés corriente. Base = SOLO capital. Sin anatocismo.
  let interesDelPeriodo = interesCorrienteDelPeriodo(condiciones, capital, periodo.numero)
  let diasInteres = periodo.dias

  // ── 2a. Mora sobre lo vencido, prorrateada por los días que realmente estuvo
  //        en mora dentro de ESTE período. En modo LIBRE no hay cronograma,
  //        luego no hay vencido, luego no hay mora.
  const diasBase = Math.max(1, periodo.dias)
  const diasAtraso = diasEnMoraDelPeriodo(periodo, opciones.periodoAnterior, condiciones)
  const moraDelPeriodo =
    vencido > 0 && condiciones.tasaMora > 0 && diasAtraso > 0
      ? aplicarTasaProrrateada(vencido, condiciones.tasaMora, diasAtraso, diasBase)
      : 0

  // CDT devuelto antes del corte: si el pago alcanza para liquidar todo, el
  // interés de este mes se cobra solo por los días que tuvo la plata.
  if (esCdt(condiciones) && interesDelPeriodo > 0 && pagos.length > 0) {
    const fechaPago = pagos.reduce((f, p) => (p.fecha > f ? p.fecha : f), pagos[0]!.fecha)
    if (fechaPago < periodo.corte && periodo.dias > 0) {
      const dias = Math.max(0, Math.min(diasEntre(periodo.inicio, fechaPago), periodo.dias))
      const parcial = Number(divRedondeado(BigInt(interesDelPeriodo) * BigInt(dias), BigInt(periodo.dias)))
      if (totalPagado >= capital + interesesPendientes + moraPendiente + moraDelPeriodo + parcial) {
        interesDelPeriodo = parcial
        diasInteres = dias
      }
    }
  }

  if (interesDelPeriodo > 0) {
    const antes = snapshot()
    interesesPendientes += interesDelPeriodo
    asientos.push({
      tipo: 'CAUSACION_INTERES',
      fechaEfecto: periodo.corte,
      monto: interesDelPeriodo,
      periodoNumero: periodo.numero,
      contexto: {
        tasaAplicada: condiciones.tasaCorriente,
        baseCalculo: capital,
        diasCalculo: diasInteres,
        diasDelPeriodo: periodo.dias,
        formula: esCdt(condiciones)
          ? (diasInteres < periodo.dias ? 'capital × tasaAnual / 12 × días/díasPeríodo' : 'capital × tasaAnual / 12')
          : 'capital × tasaCorriente',
        saldoAntes: antes,
        saldoDespues: snapshot(),
      },
    })
  }

  // ── 2b. Asiento de la mora.
  if (moraDelPeriodo > 0) {
    const antes = snapshot()
    moraPendiente += moraDelPeriodo
    asientos.push({
      tipo: 'CAUSACION_MORA',
      fechaEfecto: periodo.corte,
      monto: moraDelPeriodo,
      periodoNumero: periodo.numero,
      contexto: {
        tasaAplicada: condiciones.tasaMora,
        baseCalculo: vencido,
        diasCalculo: Math.min(diasAtraso, diasBase),
        diasDelPeriodo: diasBase,
        formula: 'vencido × tasaMora × días/díasPeríodo',
        saldoAntes: antes,
        saldoDespues: snapshot(),
      },
    })
  }

  // ── 3. Aplicar pagos con prelación legal.
  const { asignado, remanente } = repartir(totalPagado, [moraPendiente, interesesPendientes])
  const aMora = asignado[0] ?? 0
  const aIntereses = asignado[1] ?? 0
  const aCapital = Math.min(remanente, capital)

  if (aMora > 0) {
    const antes = snapshot()
    moraPendiente -= aMora
    asientos.push(asientoPago('PAGO_MORA', periodo, aMora, antes, snapshot(), 'prelación: 1º mora'))
  }
  if (aIntereses > 0) {
    const antes = snapshot()
    interesesPendientes -= aIntereses
    asientos.push(
      asientoPago('PAGO_INTERES', periodo, aIntereses, antes, snapshot(), 'prelación: 2º intereses'),
    )
  }
  if (aCapital > 0) {
    const antes = snapshot()
    capital -= aCapital
    asientos.push(
      asientoPago('ABONO_CAPITAL', periodo, aCapital, antes, snapshot(), 'prelación: 3º capital'),
    )
  }

  // ── 4. Actualizar lo vencido.
  const exigible = opciones.cuotaDelPeriodo ??
    (esCdt(condiciones)
      ? exigibleCdt(condiciones, periodo.numero, estadoPrevio, interesDelPeriodo)
      : cuotaExigible(condiciones))
  vencido = Math.max(0, vencido + exigible - totalPagado)

  const estado: Estado = { capital, interesesPendientes, moraPendiente, vencido }

  return {
    estado,
    asientos,
    fila: {
      numero: periodo.numero,
      corte: periodo.corte,
      ventanaInicio: periodo.ventanaInicio,
      ventanaFin: periodo.ventanaFin,
      capitalInicial: saldoAntes.capital,
      interesDelPeriodo,
      moraDelPeriodo,
      cuotaExigible: exigible,
      pagado: totalPagado,
      aplicadoAMora: aMora,
      aplicadoAIntereses: aIntereses,
      abonoACapital: aCapital,
      capitalFinal: capital,
      interesesPendientes,
      moraPendiente,
      vencido,
    },
  }
}

/**
 * Días que lo vencido estuvo efectivamente en mora dentro de este período.
 *
 * Lo vencido entra en mora cuando cierra la ventana del período anterior (más
 * los días de gracia). Si eso ocurre a mitad de este período, solo se cobra
 * mora por los días transcurridos desde entonces — no por el período completo.
 */
export function diasEnMoraDelPeriodo(
  periodo: Periodo,
  periodoAnterior: Periodo | undefined,
  condiciones: Condiciones,
): number {
  if (condiciones.modoCalculo === 'LIBRE' || !periodoAnterior) return 0
  const inicioMora =
    periodoAnterior.moraDesde > periodo.inicio ? periodoAnterior.moraDesde : periodo.inicio
  const dias = diasEntre(inicioMora, periodo.corte)
  return Math.max(0, Math.min(dias, periodo.dias))
}

function asientoPago(
  tipo: Asiento['tipo'],
  periodo: Periodo,
  monto: Pesos,
  saldoAntes: Estado,
  saldoDespues: Estado,
  formula: string,
): Asiento {
  return {
    tipo,
    fechaEfecto: periodo.corte,
    monto,
    periodoNumero: periodo.numero,
    contexto: {
      tasaAplicada: 0,
      baseCalculo: monto,
      diasCalculo: 0,
      diasDelPeriodo: periodo.dias,
      formula,
      saldoAntes,
      saldoDespues,
    },
  }
}

export interface OpcionesProyeccion {
  /** Pagos por número de período. Si falta, se asume que paga la cuota exacta. */
  pagosPorPeriodo?: Record<number, Pesos>
  /** Cuota distinta para un período (celda editable del simulador). */
  cuotaPorPeriodo?: Record<number, Pesos>
  /** Tope de períodos a proyectar. Corta la proyección de préstamos muy largos. */
  maxPeriodos?: number
  /** Estado de partida. Por defecto, el préstamo recién desembolsado. */
  desde?: Estado
  /** Número del primer período a proyectar. */
  primerPeriodo?: number
}

export interface Proyeccion {
  filas: FilaDesglose[]
  asientos: Asiento[]
  estadoFinal: Estado
  totalIntereses: Pesos
  totalMora: Pesos
  totalPagado: Pesos
  /** Períodos hasta liquidar. null si no se liquidó dentro del tope. */
  periodosHastaLiquidar: number | null
  fechaLiquidacion: FechaISO | null
}

const TOPE_DURO_PERIODOS = 1200

/**
 * Proyecta el préstamo período a período.
 *
 * Es la función que alimenta tanto la tabla de desglose inicial como el
 * simulador: la diferencia entre ambos es solo el estado de partida y los
 * pagos hipotéticos.
 */
export function proyectar(condiciones: Condiciones, opciones: OpcionesProyeccion = {}): Proyeccion {
  const estadoDeArranque = opciones.desde ?? estadoInicial(condiciones)
  const primerPeriodo = opciones.primerPeriodo ?? 1
  const cdt = esCdt(condiciones)
  const cuotaBase = cuotaExigible(condiciones)

  const maxPeriodos = Math.min(
    opciones.maxPeriodos ?? Math.max(plazoEstimado(condiciones) + 12, 12),
    TOPE_DURO_PERIODOS,
  )

  const periodos = generarPeriodos(
    condiciones.fechaDesembolso,
    configPeriodos(condiciones),
    primerPeriodo - 1 + maxPeriodos,
  ).slice(primerPeriodo - 1)

  const filas: FilaDesglose[] = []
  const asientos: Asiento[] = []
  let estado = estadoDeArranque
  let totalIntereses = 0
  let totalMora = 0
  let totalPagado = 0
  let periodosHastaLiquidar: number | null = null
  let fechaLiquidacion: FechaISO | null = null
  let periodoAnterior: Periodo | undefined

  for (const periodo of periodos) {
    if (estado.capital === 0 && estado.interesesPendientes === 0 && estado.moraPendiente === 0) break

    const interes = interesCorrienteDelPeriodo(condiciones, estado.capital, periodo.numero)
    const cuotaEditada = opciones.cuotaPorPeriodo?.[periodo.numero]
    // En un CDT lo exigible cambia mes a mes (nada, o el interés, hasta el vencimiento).
    const cuota = cuotaEditada ?? (cdt ? exigibleCdt(condiciones, periodo.numero, estado, interes) : cuotaBase)
    const pagoDefinido = opciones.pagosPorPeriodo?.[periodo.numero]

    // Sin instrucción explícita se asume el pago del período: la cuota, o lo que
    // falte para liquidar si es menos. Así la proyección "normal" termina.
    const porLiquidar = estado.capital + estado.interesesPendientes + estado.moraPendiente + interes
    const monto = pagoDefinido ?? Math.min(cuota, porLiquidar)

    const pagos: Pago[] = monto > 0 ? [{ fecha: periodo.corte, monto }] : []
    const resultado = procesarPeriodo(estado, periodo, condiciones, pagos, {
      cuotaDelPeriodo: cdt && cuotaEditada === undefined ? undefined : cuota,
      periodoAnterior,
    })
    periodoAnterior = periodo

    filas.push(resultado.fila)
    asientos.push(...resultado.asientos)
    totalIntereses += resultado.fila.interesDelPeriodo
    totalMora += resultado.fila.moraDelPeriodo
    totalPagado += resultado.fila.pagado
    estado = resultado.estado

    if (
      periodosHastaLiquidar === null &&
      estado.capital === 0 &&
      estado.interesesPendientes === 0 &&
      estado.moraPendiente === 0
    ) {
      periodosHastaLiquidar = periodo.numero
      fechaLiquidacion = periodo.corte
    }
  }

  return {
    filas,
    asientos,
    estadoFinal: estado,
    totalIntereses,
    totalMora,
    totalPagado,
    periodosHastaLiquidar,
    fechaLiquidacion,
  }
}

export interface Comparacion {
  periodosAhorrados: number
  interesesAhorrados: Pesos
  diasAhorrados: number
}

/** Compara un escenario simulado contra el plan original. Es lo que vende el simulador. */
export function compararEscenarios(original: Proyeccion, escenario: Proyeccion): Comparacion {
  const pO = original.periodosHastaLiquidar ?? original.filas.length
  const pE = escenario.periodosHastaLiquidar ?? escenario.filas.length
  return {
    periodosAhorrados: pO - pE,
    interesesAhorrados: original.totalIntereses - escenario.totalIntereses,
    diasAhorrados:
      original.fechaLiquidacion && escenario.fechaLiquidacion
        ? diasEntre(escenario.fechaLiquidacion, original.fechaLiquidacion)
        : 0,
  }
}

/** Reconstruye el estado desde los asientos. Debe coincidir con la caché, siempre. */
export function reconstruirEstado(asientos: readonly Asiento[]): Estado {
  const estado: Estado = { ...ESTADO_INICIAL_VACIO }
  for (const a of asientos) {
    switch (a.tipo) {
      case 'DESEMBOLSO': estado.capital += a.monto; break
      case 'CAUSACION_INTERES': estado.interesesPendientes += a.monto; break
      case 'CAUSACION_MORA': estado.moraPendiente += a.monto; break
      case 'PAGO_MORA': estado.moraPendiente -= a.monto; break
      case 'PAGO_INTERES': estado.interesesPendientes -= a.monto; break
      case 'ABONO_CAPITAL': estado.capital -= a.monto; break
      case 'AJUSTE_REDONDEO': estado.capital += a.monto; break
      case 'REVERSION': break
    }
  }
  return estado
}
