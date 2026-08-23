import { describe, expect, it } from 'vitest'
import { generarPeriodos } from './dates.js'
import {
  compararEscenarios, configPeriodos, cuotaExigible, estadoInicial, plazoEstimado,
  procesarPeriodo, proyectar, reconstruirEstado,
} from './engine.js'
import { tasaDesdePorcentaje } from './money.js'
import type { Condiciones } from './types.js'

/** Condiciones del caso de oro de la planeación §4.9. */
const ORO: Condiciones = {
  montoPrincipal: 10_000_000,
  fechaDesembolso: '2026-01-01',
  tasaCorriente: tasaDesdePorcentaje(2),
  tasaMora: tasaDesdePorcentaje(3),
  modoMora: 'PERSONALIZADA',
  modoCalculo: 'CUOTA_FIJA',
  periodicidad: 'MENSUAL',
  diaCorte: 31,
  ventana: { diasAntes: 2, diasDespues: 2 },
  diasGracia: 0,
  correrADiaHabil: false,
  cuotaPactada: 1_000_000,
}

describe('CASO DE ORO — planeación §4.9', () => {
  // Cualquier cambio que altere estas cifras rompe el build a propósito.
  const pagos = { 1: 1_000_000, 2: 1_000_000, 3: 0, 4: 1_000_000, 5: 5_000_000, 6: 1_000_000 }
  const p = proyectar(ORO, { pagosPorPeriodo: pagos, maxPeriodos: 6 })

  it('produce exactamente la tabla documentada', () => {
    const real = p.filas.map((f) => [
      f.numero, f.capitalInicial, f.interesDelPeriodo, f.moraDelPeriodo, f.pagado,
      f.aplicadoAMora, f.aplicadoAIntereses, f.abonoACapital, f.capitalFinal, f.vencido,
    ])
    expect(real).toEqual([
      [1, 10_000_000, 200_000,      0, 1_000_000,      0, 200_000,   800_000, 9_200_000,         0],
      [2,  9_200_000, 184_000,      0, 1_000_000,      0, 184_000,   816_000, 8_384_000,         0],
      [3,  8_384_000, 167_680,      0,         0,      0,       0,         0, 8_384_000, 1_000_000],
      [4,  8_384_000, 167_680, 28_000, 1_000_000, 28_000, 335_360,   636_640, 7_747_360, 1_000_000],
      [5,  7_747_360, 154_947, 28_065, 5_000_000, 28_065, 154_947, 4_816_988, 2_930_372,         0],
      [6,  2_930_372,  58_607,      0, 1_000_000,      0,  58_607,   941_393, 1_988_979,         0],
    ])
  })

  it('SIN ANATOCISMO: saltarse un mes no aumenta el interés del siguiente', () => {
    // El mes 3 dejó $167.680 de interés impago. Si hubiera capitalización, el
    // interés del mes 4 se calcularía sobre 8.384.000 + 167.680 y daría 171.034.
    // Como no la hay, el interés del mes 4 es idéntico al del mes 3.
    expect(p.filas[3]!.interesDelPeriodo).toBe(p.filas[2]!.interesDelPeriodo)
    expect(p.filas[3]!.interesDelPeriodo).toBe(167_680)
    expect(p.filas[3]!.interesDelPeriodo).not.toBe(171_034)
  })

  it('la mora se prorratea por los días que realmente estuvo vencido', () => {
    // El vencido del mes 3 entra en mora el 2026-04-02 (cierre de ventana), no
    // el 2026-03-31 (inicio del período 4): son 28 de los 30 días del período.
    // 1.000.000 × 3% × 28/30 = 28.000, no 30.000.
    expect(p.filas[3]!.moraDelPeriodo).toBe(28_000)
    // Período 5: 29 de 31 días → 30.000 × 29/31 = 28.064,5 → 28.065 (HALF_UP).
    expect(p.filas[4]!.moraDelPeriodo).toBe(28_065)
  })

  it('la prima del mes 5 desploma el capital', () => {
    expect(p.filas[4]!.abonoACapital).toBe(4_816_988)
    expect(p.filas[4]!.capitalFinal).toBeLessThan(p.filas[4]!.capitalInicial / 2)
  })

  it('el atraso cobra mora y reduce el abono a capital', () => {
    expect(p.filas[3]!.moraDelPeriodo).toBe(28_000)
    // Con el mismo pago de 1.000.000, el mes 2 abonó 816.000 y el mes 4 solo 636.640.
    expect(p.filas[3]!.abonoACapital).toBeLessThan(p.filas[1]!.abonoACapital)
  })
})

describe('prelación legal (art. 1653 C.C.)', () => {
  it('cubre mora, luego intereses, y solo entonces capital', () => {
    const [periodo] = generarPeriodos(ORO.fechaDesembolso, configPeriodos(ORO), 1)
    const r = procesarPeriodo(
      { capital: 1_000_000, interesesPendientes: 50_000, moraPendiente: 10_000, vencido: 0 },
      periodo!, ORO, [{ fecha: periodo!.corte, monto: 100_000 }],
    )
    expect(r.fila.aplicadoAMora).toBe(10_000)
    expect(r.fila.aplicadoAIntereses).toBe(70_000) // 50.000 previos + 20.000 causados
    expect(r.fila.abonoACapital).toBe(20_000)
  })

  it('nunca abona a capital si queda mora o interés sin cubrir', () => {
    const [periodo] = generarPeriodos(ORO.fechaDesembolso, configPeriodos(ORO), 1)
    const r = procesarPeriodo(
      { capital: 1_000_000, interesesPendientes: 500_000, moraPendiente: 100_000, vencido: 0 },
      periodo!, ORO, [{ fecha: periodo!.corte, monto: 200_000 }],
    )
    expect(r.fila.abonoACapital).toBe(0)
    expect(r.estado.moraPendiente).toBe(0)
    expect(r.estado.interesesPendientes).toBeGreaterThan(0)
  })

  it('un pago mayor al saldo no deja capital negativo', () => {
    const [periodo] = generarPeriodos(ORO.fechaDesembolso, configPeriodos(ORO), 1)
    const r = procesarPeriodo(
      { capital: 100_000, interesesPendientes: 0, moraPendiente: 0, vencido: 0 },
      periodo!, ORO, [{ fecha: periodo!.corte, monto: 10_000_000 }],
    )
    expect(r.estado.capital).toBe(0)
  })
})

describe('mora', () => {
  it('no se cobra si el prestamista eligió SIN_MORA', () => {
    const sinMora: Condiciones = { ...ORO, tasaMora: 0, modoMora: 'SIN_MORA' }
    const p = proyectar(sinMora, { pagosPorPeriodo: { 1: 0, 2: 0 }, maxPeriodos: 3 })
    expect(p.totalMora).toBe(0)
  })

  it('en modo LIBRE no hay cuota exigible ni mora', () => {
    const libre: Condiciones = { ...ORO, modoCalculo: 'LIBRE', cuotaPactada: undefined }
    expect(cuotaExigible(libre)).toBe(0)
    const p = proyectar(libre, { pagosPorPeriodo: { 1: 0, 2: 0, 3: 0 }, maxPeriodos: 3 })
    expect(p.totalMora).toBe(0)
    expect(p.filas.every((f) => f.vencido === 0)).toBe(true)
    expect(p.totalIntereses).toBeGreaterThan(0) // el interés corriente sí corre
  })
})

describe('modos de cálculo', () => {
  it('PLAZO_FIJO deriva la cuota del plazo', () => {
    const c: Condiciones = { ...ORO, modoCalculo: 'PLAZO_FIJO', numeroCuotas: 12, cuotaPactada: undefined }
    expect(cuotaExigible(c)).toBe(945_596)
    expect(plazoEstimado(c)).toBe(12)
  })
  it('CUOTA_FIJA sin cuota pactada falla ruidosamente', () => {
    expect(() => cuotaExigible({ ...ORO, cuotaPactada: undefined })).toThrow(RangeError)
  })
  it('PLAZO_FIJO sin número de cuotas falla ruidosamente', () => {
    expect(() => cuotaExigible({ ...ORO, modoCalculo: 'PLAZO_FIJO', numeroCuotas: undefined })).toThrow(RangeError)
  })
})

describe('proyección normal', () => {
  it('pagando la cuota exacta el préstamo se liquida en el plazo calculado', () => {
    const p = proyectar(ORO)
    expect(p.periodosHastaLiquidar).toBe(12)
    expect(p.estadoFinal.capital).toBe(0)
    expect(p.estadoFinal.interesesPendientes).toBe(0)
    expect(p.totalMora).toBe(0)
  })

  it('el total de intereses coincide con lo verificado a mano', () => {
    expect(proyectar(ORO).totalIntereses).toBe(1_270_327)
  })

  it('no proyecta períodos después de liquidar', () => {
    const p = proyectar(ORO)
    expect(p.filas.at(-1)!.capitalFinal).toBe(0)
    expect(p.filas.length).toBe(12)
  })
})

describe('simulador — comparación de escenarios', () => {
  it('abonar la prima acorta el plazo y ahorra intereses', () => {
    const original = proyectar(ORO)
    const conPrima = proyectar(ORO, { pagosPorPeriodo: { 6: 5_000_000 } })
    const cmp = compararEscenarios(original, conPrima)
    expect(cmp.periodosAhorrados).toBeGreaterThan(0)
    expect(cmp.interesesAhorrados).toBeGreaterThan(0)
    expect(cmp.diasAhorrados).toBeGreaterThan(0)
  })

  it('si un escenario no liquida, no inventa días ahorrados', () => {
    const original = proyectar(ORO)
    // Nunca paga nada: el préstamo no se liquida dentro del horizonte.
    const nuncaPaga = proyectar(ORO, {
      maxPeriodos: 6,
      pagosPorPeriodo: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i + 1, 0])),
    })
    expect(nuncaPaga.periodosHastaLiquidar).toBeNull()
    expect(compararEscenarios(original, nuncaPaga).diasAhorrados).toBe(0)
  })

  it('la celda editable cambia la cuota de un solo período', () => {
    const p = proyectar(ORO, { cuotaPorPeriodo: { 3: 2_000_000 }, maxPeriodos: 4 })
    expect(p.filas[2]!.cuotaExigible).toBe(2_000_000)
    expect(p.filas[1]!.cuotaExigible).toBe(1_000_000)
  })

  it('puede partir del estado real de hoy, no del origen', () => {
    const p = proyectar(ORO, {
      desde: { capital: 5_000_000, interesesPendientes: 0, moraPendiente: 0, vencido: 0 },
      primerPeriodo: 7,
      maxPeriodos: 3,
    })
    expect(p.filas[0]!.numero).toBe(7)
    expect(p.filas[0]!.capitalInicial).toBe(5_000_000)
  })
})

describe('libro contable', () => {
  it('reconstruir desde los asientos da el mismo estado que la caché', () => {
    const p = proyectar(ORO, { pagosPorPeriodo: { 3: 0, 5: 5_000_000 } })
    const asientos = [
      { tipo: 'DESEMBOLSO' as const, fechaEfecto: ORO.fechaDesembolso, monto: ORO.montoPrincipal,
        periodoNumero: 0,
        contexto: { tasaAplicada: 0, baseCalculo: 0, diasCalculo: 0, diasDelPeriodo: 0,
          formula: 'desembolso', saldoAntes: estadoInicial({ ...ORO, montoPrincipal: 0 }),
          saldoDespues: estadoInicial(ORO) } },
      ...p.asientos,
    ]
    const reconstruido = reconstruirEstado(asientos)
    expect(reconstruido.capital).toBe(p.estadoFinal.capital)
    expect(reconstruido.interesesPendientes).toBe(p.estadoFinal.interesesPendientes)
    expect(reconstruido.moraPendiente).toBe(p.estadoFinal.moraPendiente)
  })

  it('cada asiento guarda su contexto completo', () => {
    const p = proyectar(ORO, { maxPeriodos: 1 })
    const causacion = p.asientos.find((a) => a.tipo === 'CAUSACION_INTERES')!
    expect(causacion.contexto.baseCalculo).toBe(10_000_000)
    expect(causacion.contexto.tasaAplicada).toBe(ORO.tasaCorriente)
    expect(causacion.contexto.formula).toBe('capital × tasaCorriente')
    expect(causacion.contexto.saldoAntes.capital).toBe(10_000_000)
  })

  it('ignora las reversiones al reconstruir', () => {
    expect(reconstruirEstado([]).capital).toBe(0)
  })
})
