/**
 * Vocabulario según el tipo de registro: un préstamo y una venta a cuotas usan
 * el mismo motor, pero no se nombran igual. En una venta no se "presta" ni hay
 * interés: se vende algo y se paga por cuotas.
 */
import type { RolPrestamo, TipoRegistro } from '../api/tipos'

export function esVenta(p: { tipo?: TipoRegistro } | null | undefined): boolean {
  return p?.tipo === 'VENTA_CUOTAS'
}

const ROLES: Record<TipoRegistro, Record<string, string>> = {
  PRESTAMO: { PRESTAMISTA: 'Le prestaste', DEUDOR: 'Te prestó', CODEUDOR: 'Eres codeudor', OBSERVADOR: 'Observas' },
  VENTA_CUOTAS: { PRESTAMISTA: 'Le vendiste', DEUDOR: 'Te vendió', CODEUDOR: 'Eres codeudor', OBSERVADOR: 'Observas' },
}

/** "Le prestaste" / "Le vendiste" / … */
export function textoRol(p: { tipo?: TipoRegistro; rol: RolPrestamo | null }): string {
  return ROLES[p.tipo ?? 'PRESTAMO'][p.rol ?? ''] ?? (esVenta(p) ? 'Venta a cuotas' : 'Préstamo')
}

/** Lo que se muestra bajo el nombre: el concepto de la venta o la descripción. */
export function subtitulo(p: { tipo?: TipoRegistro; rol: RolPrestamo | null; concepto?: string; descripcion?: string }): string {
  const extra = esVenta(p) ? p.concepto : p.descripcion
  return `${textoRol(p)}${extra ? ` · ${extra}` : ''}`
}

export function nombreRegistro(p: { tipo?: TipoRegistro }, articulo = false): string {
  if (esVenta(p)) return articulo ? 'esta venta' : 'venta a cuotas'
  return articulo ? 'este préstamo' : 'préstamo'
}
