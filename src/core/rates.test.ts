import { describe, expect, it } from 'vitest'
import { tasaADecimal, tasaDesdeDecimal, tasaDesdePorcentaje } from './money.js'
import {
  aEfectivaAnual, aPeriodica, evaluarUsura, PERIODOS_POR_ANIO, periodosPorAnio, topeMoratorio,
} from './rates.js'

describe('periodosPorAnio', () => {
  it('conoce las periodicidades estándar', () => {
    expect(periodosPorAnio('MENSUAL')).toBe(12)
    expect(periodosPorAnio('QUINCENAL')).toBe(24)
    expect(periodosPorAnio('SEMANAL')).toBe(52)
    expect(PERIODOS_POR_ANIO.MENSUAL).toBe(12)
  })
  it('calcula la personalizada a partir de los días', () => {
    expect(periodosPorAnio('PERSONALIZADA', 365)).toBe(1)
    expect(periodosPorAnio('PERSONALIZADA', 30)).toBeCloseTo(12.17, 2)
  })
  it('exige los días en modo personalizado', () => {
    expect(() => periodosPorAnio('PERSONALIZADA')).toThrow(RangeError)
    expect(() => periodosPorAnio('PERSONALIZADA', 0)).toThrow(RangeError)
    expect(() => periodosPorAnio('PERSONALIZADA', -5)).toThrow(RangeError)
  })
})

describe('conversión mensual ↔ efectiva anual', () => {
  it('2% mensual son 26,82% E.A.', () => {
    // El dato que la UI muestra al lado de la tasa: la diferencia entre "2%"
    // y "casi 27%" es lo que la gente no dimensiona.
    expect(tasaADecimal(aEfectivaAnual(tasaDesdePorcentaje(2), 12))).toBeCloseTo(0.2682, 4)
  })
  it('1,5% mensual son 19,56% E.A.', () => {
    expect(tasaADecimal(aEfectivaAnual(tasaDesdePorcentaje(1.5), 12))).toBeCloseTo(0.1956, 4)
  })
  it('la conversión es reversible', () => {
    for (const pct of [0.5, 1, 2, 3, 5]) {
      const mensual = tasaDesdePorcentaje(pct)
      const vuelta = aPeriodica(aEfectivaAnual(mensual, 12), 12)
      expect(Math.abs(vuelta - mensual)).toBeLessThanOrEqual(2)
    }
  })
  it('tasa cero se mantiene en cero', () => {
    expect(aEfectivaAnual(0, 12)).toBe(0)
    expect(aPeriodica(0, 12)).toBe(0)
  })
})

describe('usura', () => {
  // Referencia realista: interés bancario corriente ~19% E.A. → usura ~28,5% E.A.
  const IBC = tasaDesdeDecimal(0.19)
  const USURA = topeMoratorio(IBC)

  it('el tope moratorio es 1,5 × el interés bancario corriente', () => {
    expect(tasaADecimal(USURA)).toBeCloseTo(0.285, 6)
  })

  it('no marca exceso cuando la tasa está por debajo', () => {
    const r = evaluarUsura(tasaDesdePorcentaje(1.5), 12, USURA) // 19,56% E.A.
    expect(r.excede).toBe(false)
    expect(r.excesoPuntos).toBe(0)
    expect(r.usuraEA).toBe(USURA)
  })

  it('marca exceso y cuantifica los puntos por encima', () => {
    const r = evaluarUsura(tasaDesdePorcentaje(3), 12, USURA) // 42,58% E.A.
    expect(r.excede).toBe(true)
    expect(r.excesoPuntos).toBeCloseTo(14.08, 1)
  })

  it('compara en efectiva anual, no en mensual', () => {
    // 2% mensual (26,82% E.A.) NO excede una usura de 28,5% E.A., aunque
    // comparar 2% contra 28,5% ingenuamente diría que sí.
    expect(evaluarUsura(tasaDesdePorcentaje(2), 12, USURA).excede).toBe(false)
  })
})
