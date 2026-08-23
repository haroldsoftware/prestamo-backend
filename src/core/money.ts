/**
 * Aritmética de dinero. Enteros en pesos colombianos, sin decimales.
 *
 * Regla absoluta del proyecto: NUNCA usar `float` para dinero. Toda
 * multiplicación monto × tasa se hace con BigInt y se redondea una sola vez,
 * al final. Dos redondeos encadenados producen centavos fantasma que, sumados
 * a lo largo de un préstamo, hacen que el libro no cuadre.
 */

/** Monto en pesos colombianos. Siempre entero, nunca negativo salvo indicación. */
export type Pesos = number

/**
 * Escala de las tasas: una tasa se guarda como entero de "partes por 10^10".
 * 2% mensual  → 0.02  → 200_000_000
 *
 * 10^10 cabe exacto en un double (2^53 ≈ 9.0e15), así que las tasas se pueden
 * manipular como `number` sin pérdida, y solo se convierten a BigInt al operar
 * contra dinero.
 */
export const ESCALA_TASA = 10_000_000_000
const ESCALA_TASA_BIG = BigInt(ESCALA_TASA)

/** Tasa periódica expresada en partes por 10^10. */
export type Tasa = number

export function esEnteroSeguro(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER
}

export function assertPesos(n: number, etiqueta = 'monto'): asserts n is Pesos {
  if (!esEnteroSeguro(n)) {
    throw new RangeError(`${etiqueta} debe ser un entero seguro de pesos, se recibió: ${n}`)
  }
}

/**
 * División con redondeo HALF_UP (0.5 sube), sobre enteros grandes.
 * Definido para denominador positivo; el signo del numerador se respeta
 * redondeando siempre "hacia arriba en magnitud" en el empate.
 */
export function divRedondeado(numerador: bigint, denominador: bigint): bigint {
  if (denominador <= 0n) throw new RangeError('el denominador debe ser positivo')
  if (numerador >= 0n) return (2n * numerador + denominador) / (2n * denominador)
  return -((2n * -numerador + denominador) / (2n * denominador))
}

/** Convierte una tasa decimal (0.02) a la representación entera interna. */
export function tasaDesdeDecimal(decimal: number): Tasa {
  if (!Number.isFinite(decimal)) throw new RangeError(`tasa inválida: ${decimal}`)
  const escalada = Math.round(decimal * ESCALA_TASA)
  if (!esEnteroSeguro(escalada)) throw new RangeError(`tasa fuera de rango: ${decimal}`)
  return escalada
}

/** Convierte una tasa porcentual (2 → 2%) a la representación interna. */
export function tasaDesdePorcentaje(porcentaje: number): Tasa {
  return tasaDesdeDecimal(porcentaje / 100)
}

/** Devuelve la tasa como decimal (0.02). Solo para presentación y fórmulas de plazo. */
export function tasaADecimal(tasa: Tasa): number {
  return tasa / ESCALA_TASA
}

/**
 * monto × tasa, redondeado una sola vez.
 * Este es el cálculo que produce los intereses de cada período.
 */
export function aplicarTasa(monto: Pesos, tasa: Tasa): Pesos {
  assertPesos(monto)
  const r = divRedondeado(BigInt(monto) * BigInt(tasa), ESCALA_TASA_BIG)
  return Number(r)
}

/**
 * monto × tasa × (dias / diasBase), redondeado UNA sola vez al final.
 * Se usa para prorratear la mora por días efectivos de atraso.
 */
export function aplicarTasaProrrateada(
  monto: Pesos,
  tasa: Tasa,
  dias: number,
  diasBase: number,
): Pesos {
  assertPesos(monto)
  if (!Number.isInteger(dias) || dias < 0) throw new RangeError(`dias inválido: ${dias}`)
  if (!Number.isInteger(diasBase) || diasBase <= 0) {
    throw new RangeError(`diasBase inválido: ${diasBase}`)
  }
  if (dias === 0) return 0
  const numerador = BigInt(monto) * BigInt(tasa) * BigInt(dias)
  const denominador = ESCALA_TASA_BIG * BigInt(diasBase)
  return Number(divRedondeado(numerador, denominador))
}

/** Suma segura: falla ruidosamente si se sale del rango entero exacto. */
export function sumar(...montos: Pesos[]): Pesos {
  const total = montos.reduce((a, b) => a + b, 0)
  assertPesos(total, 'suma')
  return total
}

/** Reparte `monto` entre destinos en orden, devolviendo lo asignado y el remanente. */
export function repartir(monto: Pesos, destinos: Pesos[]): { asignado: Pesos[]; remanente: Pesos } {
  assertPesos(monto)
  let restante = monto
  const asignado: Pesos[] = []
  for (const destino of destinos) {
    const cubre = Math.min(restante, Math.max(0, destino))
    asignado.push(cubre)
    restante -= cubre
  }
  return { asignado, remanente: restante }
}
