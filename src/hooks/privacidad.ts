/**
 * Ocultar montos (el botón del ojo).
 *
 * Abrir la app frente a otras personas no debería exponer cuánto te deben.
 * Se marca <html data-ocultar="1"> y el CSS desenfoca todo lo que lleva la
 * clase `.cifra`. La preferencia se recuerda en este teléfono.
 */
import { useSyncExternalStore } from 'react'
import { almacen } from '../pwa/registro'

const CLAVE = 'cc:ocultar-montos'
const oyentes = new Set<() => void>()

function aplicar(oculto: boolean) {
  document.documentElement.dataset.ocultar = oculto ? '1' : '0'
}

aplicar(almacen.leer(CLAVE) === '1')

function leer(): boolean {
  return document.documentElement.dataset.ocultar === '1'
}

export function alternarMontos(): void {
  const nuevo = !leer()
  aplicar(nuevo)
  almacen.guardar(CLAVE, nuevo ? '1' : '0')
  for (const o of oyentes) o()
}

export function useMontosOcultos(): boolean {
  return useSyncExternalStore(
    (fn) => { oyentes.add(fn); return () => oyentes.delete(fn) },
    leer,
    () => false,
  )
}
