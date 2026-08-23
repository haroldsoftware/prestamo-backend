/**
 * Invariantes del motor, verificadas con entradas generadas.
 *
 * Los tests de ejemplo prueban lo que se nos ocurrió; estos prueban lo que no.
 * Cada propiedad de aquí es una promesa que el sistema le hace al usuario.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { proyectar, reconstruirEstado } from './engine.js'
import { aplicarTasa, tasaDesdeDecimal } from './money.js'
import { plazoParaCuota } from './schedule.js'
import type { Asiento, Condiciones } from './types.js'

const arbCondiciones = fc
  .record({
    capital: fc.integer({ min: 100_000, max: 500_000_000 }),
    tasaPct: fc.integer({ min: 0, max: 500 }),      // 0% – 5% por período
    tasaMoraPct: fc.integer({ min: 0, max: 750 }),  // 0% – 7,5%
    diaCorte: fc.integer({ min: 1, max: 31 }),
    diasAntes: fc.integer({ min: 0, max: 5 }),
    diasDespues: fc.integer({ min: 0, max: 5 }),
    diasGracia: fc.integer({ min: 0, max: 10 }),
    habil: fc.boolean(),
    mes: fc.integer({ min: 1, max: 12 }),
    dia: fc.integer({ min: 1, max: 28 }),
    plazoObjetivo: fc.integer({ min: 1, max: 120 }),
  })
  .map(({ capital, tasaPct, tasaMoraPct, diaCorte, diasAntes, diasDespues, diasGracia, habil, mes, dia, plazoObjetivo }): Condiciones => {
    const tasaCorriente = tasaDesdeDecimal(tasaPct / 10_000)
    // La cuota cubre el interés del primer período MÁS una fracción del
    // capital. Así el capital baja siempre y el préstamo termina: una cuota
    // igual al interés sería una deuda eterna, que el motor bloquea aparte.
    const cuota = aplicarTasa(capital, tasaCorriente) + Math.ceil(capital / plazoObjetivo)
    return {
      montoPrincipal: capital,
      fechaDesembolso: `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      tasaCorriente,
      tasaMora: tasaDesdeDecimal(tasaMoraPct / 10_000),
      modoMora: tasaMoraPct === 0 ? 'SIN_MORA' : 'PERSONALIZADA',
      modoCalculo: 'CUOTA_FIJA',
      periodicidad: 'MENSUAL',
      diaCorte,
      ventana: { diasAntes, diasDespues },
      diasGracia,
      correrADiaHabil: habil,
      cuotaPactada: cuota,
    }
  })

const CONFIG = { numRuns: 300 }

/** Asiento de desembolso, que en el libro real abre el préstamo. */
const desembolso = (c: Condiciones): Asiento => ({
  tipo: 'DESEMBOLSO',
  fechaEfecto: c.fechaDesembolso,
  monto: c.montoPrincipal,
  periodoNumero: 0,
  contexto: {
    tasaAplicada: 0, baseCalculo: 0, diasCalculo: 0, diasDelPeriodo: 0,
    formula: 'desembolso',
    saldoAntes: { capital: 0, interesesPendientes: 0, moraPendiente: 0, vencido: 0 },
    saldoDespues: { capital: c.montoPrincipal, interesesPendientes: 0, moraPendiente: 0, vencido: 0 },
  },
})

describe('invariantes del motor', () => {
  it('el capital nunca es negativo', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every((f) => f.capitalFinal >= 0) && p.estadoFinal.capital >= 0
    }), CONFIG)
  })

  it('ningún saldo pendiente se vuelve negativo', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every((f) => f.interesesPendientes >= 0 && f.moraPendiente >= 0 && f.vencido >= 0)
    }), CONFIG)
  })

  it('la suma de abonos a capital nunca excede el principal', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 120 })
      const abonado = p.filas.reduce((a, f) => a + f.abonoACapital, 0)
      return abonado <= c.montoPrincipal
    }), CONFIG)
  })

  it('SIN ANATOCISMO: el interés solo depende del capital, nunca de intereses impagos', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every((f) => f.interesDelPeriodo === aplicarTasa(f.capitalInicial, c.tasaCorriente))
    }), CONFIG)
  })

  it('dos períodos con el mismo capital inicial causan el mismo interés', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { pagosPorPeriodo: { 2: 0, 3: 0 }, maxPeriodos: 8 })
      const porCapital = new Map<number, number>()
      for (const f of p.filas) {
        const previo = porCapital.get(f.capitalInicial)
        if (previo !== undefined && previo !== f.interesDelPeriodo) return false
        porCapital.set(f.capitalInicial, f.interesDelPeriodo)
      }
      return true
    }), CONFIG)
  })

  it('la prelación nunca abona a capital dejando mora o intereses vivos', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every(
        (f) => f.abonoACapital === 0 || (f.moraPendiente === 0 && f.interesesPendientes === 0),
      )
    }), CONFIG)
  })

  it('reconstruir el libro desde cero da el mismo saldo que la caché', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      // El libro real arranca con el desembolso; la proyección parte del estado
      // ya desembolsado. Se antepone para comparar peras con peras.
      const r = reconstruirEstado([desembolso(c), ...p.asientos])
      return (
        r.capital === p.estadoFinal.capital &&
        r.interesesPendientes === p.estadoFinal.interesesPendientes &&
        r.moraPendiente === p.estadoFinal.moraPendiente
      )
    }), CONFIG)
  })

  it('el libro cuadra: pagado = mora + intereses + capital aplicados', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every(
        (f) => f.pagado >= f.aplicadoAMora + f.aplicadoAIntereses + f.abonoACapital,
      )
    }), CONFIG)
  })

  it('pagando la cuota exacta el préstamo se liquida, y sin mora', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 600 })
      return p.estadoFinal.capital === 0 && p.totalMora === 0
    }), CONFIG)
  })

  it('el plazo real coincide con el calculado por la fórmula (±1 período)', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const teorico = plazoParaCuota(c.montoPrincipal, c.tasaCorriente, c.cuotaPactada!)
      const real = proyectar(c, { maxPeriodos: 800 }).periodosHastaLiquidar
      return real !== null && Math.abs(real - teorico) <= 1
    }), CONFIG)
  })

  it('pagar más nunca alarga el préstamo (monotonía)', () => {
    fc.assert(fc.property(arbCondiciones, fc.integer({ min: 1, max: 5 }), (c, mult) => {
      const base = proyectar(c, { maxPeriodos: 600 })
      const masRapido = proyectar(c, {
        maxPeriodos: 600,
        pagosPorPeriodo: Object.fromEntries(
          Array.from({ length: 600 }, (_, i) => [i + 1, c.cuotaPactada! * mult]),
        ),
      })
      const a = base.periodosHastaLiquidar ?? Infinity
      const b = masRapido.periodosHastaLiquidar ?? Infinity
      return b <= a && masRapido.totalIntereses <= base.totalIntereses
    }), CONFIG)
  })

  it('todos los montos son enteros: nunca aparece un centavo fantasma', () => {
    fc.assert(fc.property(arbCondiciones, (c) => {
      const p = proyectar(c, { maxPeriodos: 60 })
      return p.filas.every((f) =>
        [f.interesDelPeriodo, f.moraDelPeriodo, f.pagado, f.aplicadoAMora,
         f.aplicadoAIntereses, f.abonoACapital, f.capitalFinal].every(Number.isInteger),
      )
    }), CONFIG)
  })
})
