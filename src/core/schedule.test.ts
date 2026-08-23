import { describe, expect, it } from 'vitest'
import { tasaDesdePorcentaje } from './money.js'
import { CuotaInsuficienteError, cuotaMinima, cuotaParaPlazo, plazoParaCuota } from './schedule.js'

const R2 = tasaDesdePorcentaje(2)

describe('plazoParaCuota', () => {
  it('reproduce los plazos de la planeación §4.6', () => {
    expect(plazoParaCuota(10_000_000, R2, 1_000_000)).toBe(12)
    expect(plazoParaCuota(10_000_000, R2, 500_000)).toBe(26)
    expect(plazoParaCuota(10_000_000, R2, 250_000)).toBe(82)
  })

  it('BLOQUEA la cuota que nunca paga la deuda', () => {
    // 10.000.000 × 2% = 200.000. Una cuota de 200.000 solo paga el interés:
    // el capital jamás baja. Es la trampa que el sistema debe impedir.
    expect(() => plazoParaCuota(10_000_000, R2, 200_000)).toThrow(CuotaInsuficienteError)
    expect(() => plazoParaCuota(10_000_000, R2, 199_999)).toThrow(CuotaInsuficienteError)
  })

  it('el error explica cuál es la cuota mínima', () => {
    try {
      plazoParaCuota(10_000_000, R2, 200_000)
      expect.unreachable('debió lanzar')
    } catch (e) {
      const err = e as CuotaInsuficienteError
      expect(err.interesPrimerPeriodo).toBe(200_000)
      expect(err.cuotaMinima).toBe(200_001)
      expect(err.message).toMatch(/nunca se pagaría/)
    }
  })

  it('un peso por encima del interés ya es viable, aunque larguísimo', () => {
    // Con 200.001 la deuda sí baja, y al bajar el capital baja el interés, así
    // que el proceso se acelera: 617 períodos (51 años), no infinito.
    expect(plazoParaCuota(10_000_000, R2, 200_001)).toBe(617)
  })

  it('con tasa cero es simple división', () => {
    expect(plazoParaCuota(1_000_000, 0, 100_000)).toBe(10)
  })
})

describe('cuotaParaPlazo', () => {
  it('calcula la cuota francesa', () => {
    // 10M al 2% en 12 cuotas ≈ 945.596
    expect(cuotaParaPlazo(10_000_000, R2, 12)).toBe(945_596)
  })
  it('con tasa cero reparte el capital', () => {
    expect(cuotaParaPlazo(1_200_000, 0, 12)).toBe(100_000)
  })
  it('rechaza plazos inválidos', () => {
    expect(() => cuotaParaPlazo(1_000_000, R2, 0)).toThrow(RangeError)
    expect(() => cuotaParaPlazo(1_000_000, R2, 1.5)).toThrow(RangeError)
  })
})

describe('ida y vuelta cuota ↔ plazo', () => {
  it('la cuota calculada para n períodos liquida en ~n períodos', () => {
    for (const n of [6, 12, 24, 36, 60]) {
      const cuota = cuotaParaPlazo(10_000_000, R2, n)
      expect(Math.abs(plazoParaCuota(10_000_000, R2, cuota) - n)).toBeLessThanOrEqual(1)
    }
  })
})

describe('cuotaMinima', () => {
  it('es el interés del período más un peso', () => {
    expect(cuotaMinima(10_000_000, R2)).toBe(200_001)
  })
})
