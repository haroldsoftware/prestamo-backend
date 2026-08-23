/**
 * Generación de períodos y ventanas de pago.
 *
 * Un período tiene una fecha de corte y una ventana durante la cual el pago se
 * considera oportuno. Ejemplo del objetivo inicial: "puede pagar entre el 28 de
 * X y el 02 de X+1" = diaCorte 30, diasAntes 2, diasDespues 2.
 */

import {
  aISO,
  aUTC,
  diasEntre,
  siguienteHabil,
  sumarDias,
  type FechaISO,
} from './holidays.js'
import type { Periodicidad } from './rates.js'

export interface ConfigPeriodos {
  periodicidad: Periodicidad
  /** Día del mes del corte (1–31). Se ajusta si el mes es más corto. */
  diaCorte?: number
  /** Solo para periodicidad PERSONALIZADA. */
  diasPersonalizados?: number
  ventana: { diasAntes: number; diasDespues: number }
  /** Días de gracia tras cerrar la ventana antes de que corra mora. */
  diasGracia: number
  /** Si el fin de la ventana cae en no hábil, correrlo al siguiente hábil. */
  correrADiaHabil: boolean
}

export interface Periodo {
  numero: number
  inicio: FechaISO
  corte: FechaISO
  ventanaInicio: FechaISO
  ventanaFin: FechaISO
  /** Desde esta fecha (exclusiva) empieza a correr mora. */
  moraDesde: FechaISO
  dias: number
}

/** Último día del mes (maneja bisiestos). */
export function ultimoDiaDelMes(anio: number, mes0: number): number {
  return new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate()
}

/**
 * Aplica un día de corte a un mes concreto, recortando al último día si el mes
 * es más corto. Corte 31 en febrero → 28 (o 29 en bisiesto).
 */
export function corteEnMes(anio: number, mes0: number, diaCorte: number): FechaISO {
  const dia = Math.min(diaCorte, ultimoDiaDelMes(anio, mes0))
  return aISO(new Date(Date.UTC(anio, mes0, dia)))
}

function avanzarCorte(anterior: FechaISO, cfg: ConfigPeriodos, indice: number, base: FechaISO): FechaISO {
  switch (cfg.periodicidad) {
    case 'MENSUAL': {
      const b = aUTC(base)
      const diaCorte = cfg.diaCorte ?? b.getUTCDate()
      const anioBase = b.getUTCFullYear()
      const mesBase = b.getUTCMonth()
      // El primer corte es el primero que cae DESPUÉS del desembolso. Si el día
      // de corte de ese mismo mes ya pasó (o es el día del desembolso), el
      // primer período cierra el mes siguiente.
      const candidato = corteEnMes(anioBase, mesBase, diaCorte)
      const desplazamiento = candidato > base ? 0 : 1
      const mes0 = mesBase + desplazamiento + (indice - 1)
      const anio = anioBase + Math.floor(mes0 / 12)
      return corteEnMes(anio, ((mes0 % 12) + 12) % 12, diaCorte)
    }
    case 'QUINCENAL':
      return sumarDias(anterior, 15)
    case 'SEMANAL':
      return sumarDias(anterior, 7)
    case 'PERSONALIZADA': {
      if (!cfg.diasPersonalizados || cfg.diasPersonalizados <= 0) {
        throw new RangeError('periodicidad PERSONALIZADA requiere diasPersonalizados > 0')
      }
      return sumarDias(anterior, cfg.diasPersonalizados)
    }
  }
}

/**
 * Genera los `cantidad` períodos siguientes a partir del desembolso.
 *
 * El período 1 va del desembolso al primer corte; de ahí en adelante, de corte
 * a corte.
 */
export function generarPeriodos(
  fechaDesembolso: FechaISO,
  cfg: ConfigPeriodos,
  cantidad: number,
): Periodo[] {
  if (!Number.isInteger(cantidad) || cantidad < 0) {
    throw new RangeError(`cantidad de períodos inválida: ${cantidad}`)
  }
  const periodos: Periodo[] = []
  let inicio = fechaDesembolso
  let corteAnterior = fechaDesembolso

  for (let i = 1; i <= cantidad; i++) {
    const corte = avanzarCorte(corteAnterior, cfg, i, fechaDesembolso)
    const ventanaInicio = sumarDias(corte, -cfg.ventana.diasAntes)
    let ventanaFin = sumarDias(corte, cfg.ventana.diasDespues)
    if (cfg.correrADiaHabil) ventanaFin = siguienteHabil(ventanaFin)

    periodos.push({
      numero: i,
      inicio,
      corte,
      ventanaInicio,
      ventanaFin,
      moraDesde: sumarDias(ventanaFin, cfg.diasGracia),
      dias: diasEntre(inicio, corte),
    })

    inicio = corte
    corteAnterior = corte
  }

  return periodos
}

/** ¿El pago cayó dentro de la ventana (oportuno)? */
export function esPagoOportuno(periodo: Periodo, fechaPago: FechaISO): boolean {
  return fechaPago >= periodo.ventanaInicio && fechaPago <= periodo.ventanaFin
}

/** Días de mora acumulados de un período a una fecha dada. 0 si aún no corre. */
export function diasEnMora(periodo: Periodo, hasta: FechaISO): number {
  const dias = diasEntre(periodo.moraDesde, hasta)
  return dias > 0 ? dias : 0
}
