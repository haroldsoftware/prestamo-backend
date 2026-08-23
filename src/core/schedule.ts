/**
 * Cálculo de cuota y plazo.
 *
 * El flujo real del producto: el deudor dice cuánto puede pagar al mes, el
 * sistema calcula el plazo, y el prestamista aprueba.
 */

import { aplicarTasa, tasaADecimal, type Pesos, type Tasa } from './money.js'

export class CuotaInsuficienteError extends Error {
  constructor(
    readonly cuota: Pesos,
    readonly interesPrimerPeriodo: Pesos,
    readonly cuotaMinima: Pesos,
  ) {
    super(
      `La cuota de ${cuota} no cubre el interés del primer período (${interesPrimerPeriodo}). ` +
        `La deuda nunca se pagaría. Cuota mínima: ${cuotaMinima}.`,
    )
    this.name = 'CuotaInsuficienteError'
  }
}

/**
 * Plazo (número de períodos) dada una cuota fija.
 *
 *     n = −ln(1 − K·r / C) / ln(1 + r)
 *
 * Lanza si la cuota no supera el interés del primer período: en ese caso la
 * deuda crece indefinidamente y el préstamo es una trampa. Bloquearlo no es
 * opcional.
 */
export function plazoParaCuota(capital: Pesos, tasa: Tasa, cuota: Pesos): number {
  const interes = aplicarTasa(capital, tasa)
  if (cuota <= interes) {
    throw new CuotaInsuficienteError(cuota, interes, interes + 1)
  }
  const r = tasaADecimal(tasa)
  if (r === 0) return Math.ceil(capital / cuota)
  return Math.ceil(-Math.log(1 - (capital * r) / cuota) / Math.log(1 + r))
}

/**
 * Cuota fija dado un plazo (sistema de amortización francés).
 *
 *     C = K · r / (1 − (1 + r)^(−n))
 */
export function cuotaParaPlazo(capital: Pesos, tasa: Tasa, periodos: number): Pesos {
  if (!Number.isInteger(periodos) || periodos <= 0) {
    throw new RangeError(`número de períodos inválido: ${periodos}`)
  }
  const r = tasaADecimal(tasa)
  if (r === 0) return Math.ceil(capital / periodos)
  return Math.ceil((capital * r) / (1 - Math.pow(1 + r, -periodos)))
}

/** Cuota mínima para que el capital baje al menos $1 por período. */
export function cuotaMinima(capital: Pesos, tasa: Tasa): Pesos {
  return aplicarTasa(capital, tasa) + 1
}
