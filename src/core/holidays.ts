/**
 * Festivos de Colombia, calculados — no tabulados.
 *
 * Se generan programáticamente para cualquier año: no hay tablas que se
 * queden desactualizadas ni dependencia de una API externa que puede estar
 * caída justo cuando hay que calcular una mora.
 *
 * Reglas:
 *  - Festivos de fecha fija: no se mueven.
 *  - Ley 51 de 1983 ("Ley Emiliani"): si no cae lunes, se traslada al lunes
 *    siguiente.
 *  - Festivos ligados a la Pascua: Jueves y Viernes Santo no se mueven;
 *    Ascensión, Corpus Christi y Sagrado Corazón ya están definidos como lunes.
 */

/** Fecha civil sin hora ni zona: 'YYYY-MM-DD'. */
export type FechaISO = string

export function aUTC(fecha: FechaISO): Date {
  const [a, m, d] = fecha.split('-').map(Number)
  if (!Number.isFinite(a) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new RangeError(`fecha inválida: ${fecha}`)
  }
  return new Date(Date.UTC(a as number, (m as number) - 1, d as number))
}

export function aISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10)
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const d = aUTC(fecha)
  d.setUTCDate(d.getUTCDate() + dias)
  return aISO(d)
}

export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUTC(hasta).getTime() - aUTC(desde).getTime()) / 86_400_000)
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(fecha: FechaISO): number {
  return aUTC(fecha).getUTCDay()
}

export function esFinDeSemana(fecha: FechaISO): boolean {
  const d = diaSemana(fecha)
  return d === 0 || d === 6
}

/** Domingo de Pascua (algoritmo gregoriano anónimo, Meeus/Jones/Butcher). */
export function domingoDePascua(anio: number): FechaISO {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return aISO(new Date(Date.UTC(anio, mes - 1, dia)))
}

/** Traslada al lunes siguiente si no cae lunes (Ley Emiliani). */
function trasladarALunes(fecha: FechaISO): FechaISO {
  const dow = diaSemana(fecha)
  if (dow === 1) return fecha
  // domingo (0) → +1 ; martes(2)..sábado(6) → hasta el próximo lunes
  return sumarDias(fecha, dow === 0 ? 1 : 8 - dow)
}

const FIJOS: ReadonlyArray<[number, number]> = [
  [1, 1],   // Año Nuevo
  [5, 1],   // Día del Trabajo
  [7, 20],  // Independencia
  [8, 7],   // Batalla de Boyacá
  [12, 8],  // Inmaculada Concepción
  [12, 25], // Navidad
]

const EMILIANI: ReadonlyArray<[number, number]> = [
  [1, 6],   // Reyes Magos
  [3, 19],  // San José
  [6, 29],  // San Pedro y San Pablo
  [8, 15],  // Asunción de la Virgen
  [10, 12], // Día de la Raza
  [11, 1],  // Todos los Santos
  [11, 11], // Independencia de Cartagena
]

/** Desplazamientos desde el Domingo de Pascua. Los tres últimos ya caen en lunes. */
const PASCUA: ReadonlyArray<number> = [
  -3, // Jueves Santo
  -2, // Viernes Santo
  43, // Ascensión del Señor
  64, // Corpus Christi
  71, // Sagrado Corazón de Jesús
]

const cache = new Map<number, ReadonlySet<FechaISO>>()

/** Conjunto de festivos de un año. Memoizado: el cálculo se hace una vez por año. */
export function festivosDe(anio: number): ReadonlySet<FechaISO> {
  const enCache = cache.get(anio)
  if (enCache) return enCache

  const fechas = new Set<FechaISO>()
  for (const [mes, dia] of FIJOS) {
    fechas.add(aISO(new Date(Date.UTC(anio, mes - 1, dia))))
  }
  for (const [mes, dia] of EMILIANI) {
    fechas.add(trasladarALunes(aISO(new Date(Date.UTC(anio, mes - 1, dia)))))
  }
  const pascua = domingoDePascua(anio)
  for (const offset of PASCUA) {
    fechas.add(sumarDias(pascua, offset))
  }

  cache.set(anio, fechas)
  return fechas
}

export function esFestivo(fecha: FechaISO): boolean {
  return festivosDe(aUTC(fecha).getUTCFullYear()).has(fecha)
}

/** Hábil = ni fin de semana ni festivo. */
export function esHabil(fecha: FechaISO): boolean {
  return !esFinDeSemana(fecha) && !esFestivo(fecha)
}

/** Devuelve la misma fecha si es hábil; si no, el siguiente día hábil. */
export function siguienteHabil(fecha: FechaISO): FechaISO {
  // Termina siempre: en Colombia nunca hay más de 4 días no hábiles seguidos,
  // y una fecha malformada lanza en esHabil antes de poder ciclar.
  let f = fecha
  while (!esHabil(f)) f = sumarDias(f, 1)
  return f
}
