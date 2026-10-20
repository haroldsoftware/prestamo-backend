/**
 * Íconos de línea al estilo SF Symbols. SVG en línea: cero peticiones, se
 * pintan con currentColor y escalan sin pixelarse.
 */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { tam?: number }

function Base({ tam = 24, children, ...resto }: P) {
  return (
    <svg
      width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...resto}
    >
      {children}
    </svg>
  )
}

export const IconoInicio = (p: P) => (
  <Base {...p}><path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z" /></Base>
)
export const IconoPrestamos = (p: P) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h3" />
    <path d="M7 3.5h10" />
  </Base>
)
export const IconoMas = (p: P) => (<Base {...p}><path d="M12 5v14M5 12h14" /></Base>)
export const IconoConfirmar = (p: P) => (
  <Base {...p}>
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" />
  </Base>
)
export const IconoCuenta = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20.2c1.3-3.4 4.2-5.2 7.5-5.2s6.2 1.8 7.5 5.2" />
  </Base>
)
export const IconoAtras = (p: P) => (<Base {...p} strokeWidth={2.3}><path d="M15 4.5 7.5 12l7.5 7.5" /></Base>)
export const IconoChevron = (p: P) => (<Base {...p} strokeWidth={2.2}><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></Base>)
export const IconoCerrar = (p: P) => (<Base {...p} strokeWidth={2.2}><path d="M6 6l12 12M18 6 6 18" /></Base>)
export const IconoCheck = (p: P) => (<Base {...p} strokeWidth={2.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>)
export const IconoAlerta = (p: P) => (
  <Base {...p}>
    <path d="M10.3 4.2 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4.2M12 17h.01" />
  </Base>
)
export const IconoInfo = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8h.01" /></Base>
)
export const IconoCompartir = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4" />
    <path d="M7.5 10.5H6A1.5 1.5 0 0 0 4.5 12v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
  </Base>
)
export const IconoAgregarInicio = (p: P) => (
  <Base {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></Base>
)
export const IconoDescargar = (p: P) => (
  <Base {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></Base>
)
export const IconoGrafico = (p: P) => (
  <Base {...p}><path d="M4 19.5h16M7 16V11M12 16V6.5M17 16v-3.5" /></Base>
)
export const IconoPersonas = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8.5" r="3.3" />
    <path d="M3 19.5c.9-3 3.2-4.6 6-4.6s5.1 1.6 6 4.6" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M18 14.9c1.5.6 2.6 2 3 4.6" />
  </Base>
)
export const IconoReloj = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></Base>
)
export const IconoCalendario = (p: P) => (
  <Base {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></Base>
)
export const IconoFlechaArriba = (p: P) => (<Base {...p} strokeWidth={2.2}><path d="M12 19V5M6 11l6-6 6 6" /></Base>)
export const IconoFlechaAbajo = (p: P) => (<Base {...p} strokeWidth={2.2}><path d="M12 5v14M6 13l6 6 6-6" /></Base>)
export const IconoSalir = (p: P) => (
  <Base {...p}><path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></Base>
)
export const IconoCorreo = (p: P) => (
  <Base {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></Base>
)
export const IconoEscudo = (p: P) => (
  <Base {...p}><path d="M12 3.2 5 6v5.6c0 4.3 2.9 7.8 7 9.2 4.1-1.4 7-4.9 7-9.2V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></Base>
)
export const IconoActualizar = (p: P) => (
  <Base {...p}><path d="M20 11.5A8 8 0 0 0 6.2 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 13.8 5.2L20 15.5M20 20v-4.5h-4.5" /></Base>
)
