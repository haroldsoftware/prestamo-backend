import type { FechaISO } from './holidays.js'
import type { Pesos, Tasa } from './money.js'
import type { Periodicidad } from './rates.js'

/**
 * CDT_*: una persona entrega plata a otra por un plazo en meses y la recibe de
 * vuelta con un interés simple anual pactado. `numeroCuotas` es el plazo en
 * meses. AL_VENCIMIENTO: capital + intereses en un solo pago al final.
 * INTERES_MENSUAL: los intereses cada mes y el capital al final.
 */
export type ModoCalculo =
  | 'CUOTA_FIJA' | 'PLAZO_FIJO' | 'LIBRE'
  | 'CDT_AL_VENCIMIENTO' | 'CDT_INTERES_MENSUAL'
export type ModoMora = 'SIN_MORA' | 'PERSONALIZADA' | 'MAXIMO_LEGAL'
export type EfectoAbono = 'REDUCIR_PLAZO' | 'REDUCIR_CUOTA'

/** Condiciones económicas de un préstamo. Inmutables: cambiarlas crea otra versión. */
export interface Condiciones {
  montoPrincipal: Pesos
  fechaDesembolso: FechaISO
  /** Tasa corriente POR PERÍODO (no anual). */
  tasaCorriente: Tasa
  /** Tasa moratoria POR PERÍODO. 0 cuando el prestamista elige no cobrar mora. */
  tasaMora: Tasa
  modoMora: ModoMora
  modoCalculo: ModoCalculo
  periodicidad: Periodicidad
  diaCorte?: number
  diasPersonalizados?: number
  ventana: { diasAntes: number; diasDespues: number }
  diasGracia: number
  correrADiaHabil: boolean
  cuotaPactada?: Pesos
  numeroCuotas?: number
  /**
   * Solo CDT: tasa ANUAL de interés simple. Se guarda aparte porque dividirla
   * entre 12 pierde precisión (10 % / 12 no es exacto) y el total del plazo
   * debe dar al peso lo que se pactó.
   */
  tasaAnual?: Tasa
}

/**
 * Estado económico del préstamo en un instante.
 *
 * `interesesPendientes` se acumula y es exigible, pero NUNCA entra a la base de
 * cálculo del interés siguiente: no hay intereses sobre intereses
 * (anatocismo, art. 2235 C.C.). Ver planeación §4.4.
 */
export interface Estado {
  capital: Pesos
  interesesPendientes: Pesos
  moraPendiente: Pesos
  vencido: Pesos
}

export interface Pago {
  fecha: FechaISO
  monto: Pesos
  /**
   * El prestamista autorizó aplicar este pago directamente a capital (art. 1653
   * C.C.). Se registra para trazabilidad; la prelación se aplica igual, porque
   * el capital solo recibe dinero tras cubrir mora e intereses.
   */
  autorizaAbonoCapital?: boolean
  efectoAbono?: EfectoAbono
}

export type TipoAsiento =
  | 'DESEMBOLSO'
  | 'CAUSACION_INTERES'
  | 'CAUSACION_MORA'
  | 'PAGO_MORA'
  | 'PAGO_INTERES'
  | 'ABONO_CAPITAL'
  | 'AJUSTE_REDONDEO'
  | 'REVERSION'

/**
 * Asiento del libro. Deliberadamente redundante: guarda la fotografía completa
 * del contexto para que dentro de años se pueda entender un peso sin
 * reconstruir nada. Ver planeación §6.
 */
export interface Asiento {
  tipo: TipoAsiento
  fechaEfecto: FechaISO
  monto: Pesos
  periodoNumero: number
  contexto: {
    tasaAplicada: Tasa
    baseCalculo: Pesos
    diasCalculo: number
    diasDelPeriodo: number
    formula: string
    saldoAntes: Estado
    saldoDespues: Estado
  }
}

/** Una fila de la tabla de desglose que ve el usuario. */
export interface FilaDesglose {
  numero: number
  corte: FechaISO
  ventanaInicio: FechaISO
  ventanaFin: FechaISO
  capitalInicial: Pesos
  interesDelPeriodo: Pesos
  moraDelPeriodo: Pesos
  cuotaExigible: Pesos
  pagado: Pesos
  aplicadoAMora: Pesos
  aplicadoAIntereses: Pesos
  abonoACapital: Pesos
  capitalFinal: Pesos
  interesesPendientes: Pesos
  moraPendiente: Pesos
  vencido: Pesos
}
