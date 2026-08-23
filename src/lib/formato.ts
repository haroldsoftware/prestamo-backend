/**
 * Formato de cifras y fechas.
 *
 * Regla del producto: cero jerga. Se dice "lo que debes hoy", no "saldo
 * insoluto de capital". Y todo monto lleva separador de miles: $1.234.567 se
 * lee de un vistazo, 1234567 no.
 */

export function pesos(monto: number | undefined | null): string {
  if (monto === undefined || monto === null) return '—'
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

/** Sin el símbolo, para inputs. */
export function numero(monto: number | undefined | null): string {
  if (monto === undefined || monto === null) return ''
  return Math.round(monto).toLocaleString('es-CO')
}

export function aNumero(texto: string): number {
  const limpio = texto.replace(/[^\d]/g, '')
  return limpio ? Number(limpio) : 0
}

export function porcentaje(valor: number | undefined, decimales = 2): string {
  if (valor === undefined) return '—'
  return `${valor.toFixed(decimales)}%`
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-03-15' → '15 de marzo de 2026'. Sin Date, para no pelear con zonas. */
export function fechaLarga(iso: string | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${d} de ${MESES[m - 1]} de ${a}`
}

export function fechaCorta(iso: string | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function hoyISO(): string {
  const ahora = new Date()
  // Colombia es UTC-5 todo el año: no hay horario de verano que corrija.
  const bogota = new Date(ahora.getTime() - 5 * 3_600_000)
  return bogota.toISOString().slice(0, 10)
}

export function diasEntreISO(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)
}

/** "3 meses", "1 mes", "12 meses" — con la unidad correcta. */
export function periodos(n: number | null | undefined, periodicidad = 'MENSUAL'): string {
  if (n === null || n === undefined) return 'sin plazo fijo'
  const unidad = { MENSUAL: 'mes', QUINCENAL: 'quincena', SEMANAL: 'semana' }[periodicidad] ?? 'período'
  const plural = unidad === 'mes' ? 'meses' : `${unidad}s`
  return `${n} ${n === 1 ? unidad : plural}`
}
