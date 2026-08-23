/**
 * Conversión entre tasas periódicas y efectiva anual, y validación contra usura.
 *
 * En Colombia la gente pacta "al 2% mensual" pero la ley y la Superfinanciera
 * hablan en efectivo anual. El sistema guarda y muestra ambas siempre.
 */

import { ESCALA_TASA, tasaADecimal, tasaDesdeDecimal, type Tasa } from './money.js'

export type Periodicidad = 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'PERSONALIZADA'

/** Períodos por año de cada periodicidad. Base 360/30 para lo mensual, como el mercado. */
export const PERIODOS_POR_ANIO: Record<Exclude<Periodicidad, 'PERSONALIZADA'>, number> = {
  MENSUAL: 12,
  QUINCENAL: 24,
  SEMANAL: 52,
}

export function periodosPorAnio(periodicidad: Periodicidad, diasPersonalizados?: number): number {
  if (periodicidad === 'PERSONALIZADA') {
    if (!diasPersonalizados || diasPersonalizados <= 0) {
      throw new RangeError('periodicidad PERSONALIZADA requiere diasPersonalizados > 0')
    }
    return 365 / diasPersonalizados
  }
  return PERIODOS_POR_ANIO[periodicidad]
}

/** Tasa periódica → efectiva anual.  EA = (1 + r)^n − 1 */
export function aEfectivaAnual(tasaPeriodica: Tasa, periodos: number): Tasa {
  const r = tasaADecimal(tasaPeriodica)
  return tasaDesdeDecimal(Math.pow(1 + r, periodos) - 1)
}

/** Efectiva anual → tasa periódica.  r = (1 + EA)^(1/n) − 1 */
export function aPeriodica(efectivaAnual: Tasa, periodos: number): Tasa {
  const ea = tasaADecimal(efectivaAnual)
  return tasaDesdeDecimal(Math.pow(1 + ea, 1 / periodos) - 1)
}

export interface EvaluacionUsura {
  /** Tasa pactada, llevada a efectiva anual. */
  pactadaEA: Tasa
  /** Tasa de usura vigente al momento de pactar, en efectiva anual. */
  usuraEA: Tasa
  excede: boolean
  /** Cuántos puntos porcentuales por encima (0 si no excede). */
  excesoPuntos: number
}

/**
 * Compara la tasa pactada contra la usura vigente.
 *
 * No bloquea: informa. La decisión de pactar por encima es de las partes, y
 * queda registrada con constancia estricta (ver planeación §4.11). Cobrar por
 * encima de la usura es delito (art. 305 C.P.), y la responsabilidad es de
 * quien pacta — pero eso hay que poder probarlo.
 */
export function evaluarUsura(
  tasaPeriodica: Tasa,
  periodos: number,
  usuraVigenteEA: Tasa,
): EvaluacionUsura {
  const pactadaEA = aEfectivaAnual(tasaPeriodica, periodos)
  const excede = pactadaEA > usuraVigenteEA
  return {
    pactadaEA,
    usuraEA: usuraVigenteEA,
    excede,
    excesoPuntos: excede ? ((pactadaEA - usuraVigenteEA) / ESCALA_TASA) * 100 : 0,
  }
}

/** Tope legal de la tasa moratoria: 1,5 × interés bancario corriente. */
export function topeMoratorio(interesBancarioCorrienteEA: Tasa): Tasa {
  return Math.round(interesBancarioCorrienteEA * 1.5)
}
