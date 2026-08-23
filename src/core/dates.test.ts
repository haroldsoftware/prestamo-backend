import { describe, expect, it } from 'vitest'
import {
  corteEnMes, diasEnMora, esPagoOportuno, generarPeriodos, ultimoDiaDelMes,
  type ConfigPeriodos,
} from './dates.js'

const BASE: ConfigPeriodos = {
  periodicidad: 'MENSUAL',
  diaCorte: 30,
  ventana: { diasAntes: 2, diasDespues: 2 },
  diasGracia: 0,
  correrADiaHabil: false,
}

describe('límites de mes', () => {
  it('conoce el largo de cada mes', () => {
    expect(ultimoDiaDelMes(2026, 1)).toBe(28)  // feb 2026
    expect(ultimoDiaDelMes(2028, 1)).toBe(29)  // feb 2028 bisiesto
    expect(ultimoDiaDelMes(2026, 3)).toBe(30)  // abril
  })
  it('recorta el día de corte al último día del mes', () => {
    expect(corteEnMes(2026, 1, 31)).toBe('2026-02-28')
    expect(corteEnMes(2028, 1, 31)).toBe('2028-02-29')
    expect(corteEnMes(2026, 3, 31)).toBe('2026-04-30')
    expect(corteEnMes(2026, 0, 15)).toBe('2026-01-15')
  })
})

describe('generarPeriodos', () => {
  it('reproduce el ejemplo del objetivo inicial (28 → 02)', () => {
    const [p1] = generarPeriodos('2026-01-15', BASE, 1)
    expect(p1!.corte).toBe('2026-01-30')
    expect(p1!.ventanaInicio).toBe('2026-01-28')
    expect(p1!.ventanaFin).toBe('2026-02-01')
  })

  it('mantiene el día de corte mes a mes', () => {
    const ps = generarPeriodos('2026-01-15', BASE, 4)
    expect(ps.map((p) => p.corte)).toEqual(['2026-01-30', '2026-02-28', '2026-03-30', '2026-04-30'])
  })

  it('el corte 31 sobrevive a febrero sin desplazarse después', () => {
    const ps = generarPeriodos('2026-01-05', { ...BASE, diaCorte: 31 }, 4)
    // Febrero recorta a 28, pero marzo vuelve a 31: el día de corte no "se pega".
    expect(ps.map((p) => p.corte)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('cruza el fin de año', () => {
    const ps = generarPeriodos('2026-11-10', BASE, 3)
    expect(ps.map((p) => p.corte)).toEqual(['2026-11-30', '2026-12-30', '2027-01-30'])
  })

  it('soporta quincenal y semanal', () => {
    expect(generarPeriodos('2026-01-01', { ...BASE, periodicidad: 'QUINCENAL' }, 2).map((p) => p.corte))
      .toEqual(['2026-01-16', '2026-01-31'])
    expect(generarPeriodos('2026-01-01', { ...BASE, periodicidad: 'SEMANAL' }, 2).map((p) => p.corte))
      .toEqual(['2026-01-08', '2026-01-15'])
  })

  it('soporta periodicidad personalizada', () => {
    const ps = generarPeriodos('2026-01-01', { ...BASE, periodicidad: 'PERSONALIZADA', diasPersonalizados: 10 }, 2)
    expect(ps.map((p) => p.corte)).toEqual(['2026-01-11', '2026-01-21'])
  })

  it('exige diasPersonalizados en modo PERSONALIZADA', () => {
    expect(() => generarPeriodos('2026-01-01', { ...BASE, periodicidad: 'PERSONALIZADA' }, 1)).toThrow(RangeError)
  })

  it('corre la ventana al día hábil cuando se pide', () => {
    // Corte 2026-08-20 (jue), +2 = sábado 22 → se corre al lunes 24.
    const [p] = generarPeriodos('2026-08-01', { ...BASE, diaCorte: 20, correrADiaHabil: true }, 1)
    expect(p!.ventanaFin).toBe('2026-08-24')
  })

  it('sin correrADiaHabil la ventana cae donde caiga', () => {
    const [p] = generarPeriodos('2026-08-01', { ...BASE, diaCorte: 20 }, 1)
    expect(p!.ventanaFin).toBe('2026-08-22')
  })

  it('los días de gracia retrasan el inicio de la mora', () => {
    const [p] = generarPeriodos('2026-01-15', { ...BASE, diasGracia: 5 }, 1)
    expect(p!.ventanaFin).toBe('2026-02-01')
    expect(p!.moraDesde).toBe('2026-02-06')
  })

  it('sin día de corte usa el día del desembolso', () => {
    const cfg = { ...BASE }
    delete (cfg as Partial<ConfigPeriodos>).diaCorte
    const ps = generarPeriodos('2026-01-17', cfg, 3)
    expect(ps.map((p) => p.corte)).toEqual(['2026-02-17', '2026-03-17', '2026-04-17'])
  })

  it('rechaza cantidades inválidas', () => {
    expect(() => generarPeriodos('2026-01-01', BASE, -1)).toThrow(RangeError)
    expect(generarPeriodos('2026-01-01', BASE, 0)).toEqual([])
  })
})

describe('ventana y mora', () => {
  const [p] = generarPeriodos('2026-01-15', BASE, 1)

  it('reconoce el pago oportuno dentro de la ventana', () => {
    expect(esPagoOportuno(p!, '2026-01-28')).toBe(true)
    expect(esPagoOportuno(p!, '2026-01-30')).toBe(true)
    expect(esPagoOportuno(p!, '2026-02-01')).toBe(true)
  })
  it('fuera de la ventana no es oportuno', () => {
    expect(esPagoOportuno(p!, '2026-01-27')).toBe(false)
    expect(esPagoOportuno(p!, '2026-02-02')).toBe(false)
  })
  it('la mora solo corre después de la ventana', () => {
    expect(diasEnMora(p!, '2026-02-01')).toBe(0)
    expect(diasEnMora(p!, '2026-02-11')).toBe(10)
  })
})
