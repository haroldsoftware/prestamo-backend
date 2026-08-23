import { describe, expect, it } from 'vitest'
import {
  aplicarTasa, aplicarTasaProrrateada, assertPesos, divRedondeado, ESCALA_TASA,
  esEnteroSeguro, repartir, sumar, tasaADecimal, tasaDesdeDecimal, tasaDesdePorcentaje,
} from './money.js'

describe('divRedondeado — HALF_UP', () => {
  it('redondea el empate hacia arriba', () => {
    expect(divRedondeado(5n, 10n)).toBe(1n)   // 0.5 → 1
    expect(divRedondeado(15n, 10n)).toBe(2n)  // 1.5 → 2
    expect(divRedondeado(25n, 10n)).toBe(3n)  // 2.5 → 3 (no "half-even")
  })
  it('redondea por debajo y por encima del empate', () => {
    expect(divRedondeado(4n, 10n)).toBe(0n)
    expect(divRedondeado(6n, 10n)).toBe(1n)
  })
  it('respeta el signo', () => {
    expect(divRedondeado(-5n, 10n)).toBe(-1n)
    expect(divRedondeado(-4n, 10n)).toBe(0n)
  })
  it('exige denominador positivo', () => {
    expect(() => divRedondeado(1n, 0n)).toThrow(RangeError)
    expect(() => divRedondeado(1n, -2n)).toThrow(RangeError)
  })
})

describe('tasas', () => {
  it('convierte decimal y porcentaje a la escala interna', () => {
    expect(tasaDesdeDecimal(0.02)).toBe(0.02 * ESCALA_TASA)
    expect(tasaDesdePorcentaje(2)).toBe(tasaDesdeDecimal(0.02))
  })
  it('ida y vuelta sin pérdida apreciable', () => {
    expect(tasaADecimal(tasaDesdeDecimal(0.0235))).toBeCloseTo(0.0235, 10)
  })
  it('rechaza tasas absurdas que se salen del entero seguro', () => {
    // 10.000.000 × 10^10 desborda el rango exacto de un double.
    expect(() => tasaDesdeDecimal(10_000_000)).toThrow(/fuera de rango/)
  })
  it('rechaza valores no finitos', () => {
    expect(() => tasaDesdeDecimal(Number.NaN)).toThrow(RangeError)
    expect(() => tasaDesdeDecimal(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('aplicarTasa', () => {
  it('calcula el interés del ejemplo de la planeación', () => {
    expect(aplicarTasa(10_000_000, tasaDesdePorcentaje(2))).toBe(200_000)
    expect(aplicarTasa(8_384_000, tasaDesdePorcentaje(2))).toBe(167_680)
  })
  it('es exacto con montos grandes donde el float fallaría', () => {
    // 999_999_999_999 × 0.0333 — con float el producto pierde precisión entera.
    const r = aplicarTasa(999_999_999_999, tasaDesdeDecimal(0.0333))
    expect(Number.isInteger(r)).toBe(true)
    expect(r).toBe(33_299_999_999.967 > 0 ? 33_300_000_000 : 0)
  })
  it('rechaza montos no enteros', () => {
    expect(() => aplicarTasa(100.5, tasaDesdePorcentaje(2))).toThrow(RangeError)
  })
})

describe('aplicarTasaProrrateada', () => {
  it('prorratea por días', () => {
    expect(aplicarTasaProrrateada(1_000_000, tasaDesdePorcentaje(3), 30, 30)).toBe(30_000)
    expect(aplicarTasaProrrateada(1_000_000, tasaDesdePorcentaje(3), 15, 30)).toBe(15_000)
  })
  it('cero días es cero', () => {
    expect(aplicarTasaProrrateada(1_000_000, tasaDesdePorcentaje(3), 0, 30)).toBe(0)
  })
  it('redondea una sola vez (no acumula error)', () => {
    // 3 tramos de 10 días deben sumar lo mismo que un tramo de 30, ±1 peso.
    const total = aplicarTasaProrrateada(1_234_567, tasaDesdePorcentaje(2.7), 30, 30)
    const tramos = 3 * aplicarTasaProrrateada(1_234_567, tasaDesdePorcentaje(2.7), 10, 30)
    expect(Math.abs(total - tramos)).toBeLessThanOrEqual(2)
  })
  it('valida los días', () => {
    expect(() => aplicarTasaProrrateada(1000, 1, -1, 30)).toThrow(RangeError)
    expect(() => aplicarTasaProrrateada(1000, 1, 1, 0)).toThrow(RangeError)
  })
})

describe('repartir — prelación', () => {
  it('cubre en orden y devuelve el remanente', () => {
    const { asignado, remanente } = repartir(1_000_000, [30_000, 335_360])
    expect(asignado).toEqual([30_000, 335_360])
    expect(remanente).toBe(634_640)
  })
  it('no asigna más de lo que hay', () => {
    const { asignado, remanente } = repartir(20_000, [30_000, 100_000])
    expect(asignado).toEqual([20_000, 0])
    expect(remanente).toBe(0)
  })
  it('ignora destinos negativos', () => {
    const { asignado } = repartir(1000, [-500])
    expect(asignado).toEqual([0])
  })
})

describe('guardas', () => {
  it('esEnteroSeguro', () => {
    expect(esEnteroSeguro(5)).toBe(true)
    expect(esEnteroSeguro(5.5)).toBe(false)
    expect(esEnteroSeguro(Number.NaN)).toBe(false)
    expect(esEnteroSeguro(Number.MAX_SAFE_INTEGER + 2)).toBe(false)
  })
  it('assertPesos falla con mensaje útil', () => {
    expect(() => assertPesos(1.5, 'cuota')).toThrow(/cuota/)
  })
  it('sumar valida el total', () => {
    expect(sumar(1, 2, 3)).toBe(6)
  })
})
