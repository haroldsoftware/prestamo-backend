import { describe, expect, it } from 'vitest'
import {
  diaSemana, diasEntre, domingoDePascua, esFestivo, esFinDeSemana, esHabil,
  festivosDe, siguienteHabil, sumarDias,
} from './holidays.js'

describe('domingoDePascua', () => {
  // Valores de referencia verificables contra cualquier calendario litúrgico.
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('Pascua de %i es %s', (anio, esperado) => {
    expect(domingoDePascua(anio)).toBe(esperado)
  })
  it('siempre cae en domingo', () => {
    for (let a = 2020; a <= 2060; a++) expect(diaSemana(domingoDePascua(a))).toBe(0)
  })
})

describe('festivos de Colombia', () => {
  it('2026 tiene los 18 festivos de ley', () => {
    expect(festivosDe(2026).size).toBe(18)
  })

  it('los fijos no se mueven', () => {
    for (const f of ['2026-01-01', '2026-05-01', '2026-07-20', '2026-08-07', '2026-12-08', '2026-12-25']) {
      expect(esFestivo(f)).toBe(true)
    }
  })

  it('Ley Emiliani traslada al lunes siguiente', () => {
    // Reyes 2026 cae martes 6 → se corre al lunes 12.
    expect(esFestivo('2026-01-06')).toBe(false)
    expect(esFestivo('2026-01-12')).toBe(true)
    // San José 2026 cae jueves 19 → lunes 23.
    expect(esFestivo('2026-03-19')).toBe(false)
    expect(esFestivo('2026-03-23')).toBe(true)
    // Todos los Santos 2026 cae domingo 1 → lunes 2.
    expect(esFestivo('2026-11-02')).toBe(true)
  })

  it('un Emiliani que ya cae lunes no se mueve', () => {
    // 12 de octubre de 2026 es lunes.
    expect(diaSemana('2026-10-12')).toBe(1)
    expect(esFestivo('2026-10-12')).toBe(true)
  })

  it('los festivos de Pascua caen donde deben', () => {
    // Pascua 2026 = 5 de abril.
    expect(esFestivo('2026-04-02')).toBe(true) // Jueves Santo
    expect(esFestivo('2026-04-03')).toBe(true) // Viernes Santo
    expect(esFestivo('2026-05-18')).toBe(true) // Ascensión
    expect(esFestivo('2026-06-08')).toBe(true) // Corpus Christi
    expect(esFestivo('2026-06-15')).toBe(true) // Sagrado Corazón
  })

  it('todos los móviles de Pascua trasladados caen en lunes', () => {
    for (let a = 2020; a <= 2060; a++) {
      const pascua = domingoDePascua(a)
      for (const off of [43, 64, 71]) expect(diaSemana(sumarDias(pascua, off))).toBe(1)
    }
  })

  it('tiene 18 festivos, salvo cuando dos coinciden', () => {
    // San Pedro y San Pablo (trasladado) puede caer el mismo lunes que el
    // Sagrado Corazón. Esos años Colombia tiene 17 festivos, no 18. No es un
    // bug del cálculo: es cómo funciona el calendario.
    for (let a = 2020; a <= 2060; a++) {
      expect(festivosDe(a).size).toBeGreaterThanOrEqual(17)
      expect(festivosDe(a).size).toBeLessThanOrEqual(18)
    }
  })

  it('documenta los años en que San Pedro coincide con el Sagrado Corazón', () => {
    const colisiones: number[] = []
    for (let a = 2020; a <= 2060; a++) if (festivosDe(a).size === 17) colisiones.push(a)
    expect(colisiones).toEqual([2025, 2030, 2038, 2041, 2052, 2057])
  })

  it('memoiza sin cambiar el resultado', () => {
    expect(festivosDe(2026)).toBe(festivosDe(2026))
  })
})

describe('días hábiles', () => {
  it('reconoce fines de semana', () => {
    expect(esFinDeSemana('2026-08-22')).toBe(true)  // sábado
    expect(esFinDeSemana('2026-08-23')).toBe(true)  // domingo
    expect(esFinDeSemana('2026-08-24')).toBe(false) // lunes
  })
  it('un festivo no es hábil', () => {
    expect(esHabil('2026-12-25')).toBe(false)
  })
  it('siguienteHabil salta el fin de semana', () => {
    expect(siguienteHabil('2026-08-22')).toBe('2026-08-24')
  })
  it('siguienteHabil salta fin de semana + festivo encadenados', () => {
    // Sábado 10 y domingo 11 de octubre de 2026, lunes 12 festivo → martes 13.
    expect(siguienteHabil('2026-10-10')).toBe('2026-10-13')
  })
  it('devuelve la misma fecha si ya es hábil', () => {
    expect(siguienteHabil('2026-08-25')).toBe('2026-08-25')
  })
})

describe('aritmética de fechas', () => {
  it('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('maneja el 29 de febrero de un bisiesto', () => {
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29')
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01')
  })
  it('diasEntre es exacto', () => {
    expect(diasEntre('2026-01-01', '2026-12-31')).toBe(364)
    expect(diasEntre('2028-01-01', '2029-01-01')).toBe(366) // bisiesto
  })
  it('rechaza fechas malformadas', () => {
    expect(() => sumarDias('no-es-fecha', 1)).toThrow(RangeError)
  })
})
