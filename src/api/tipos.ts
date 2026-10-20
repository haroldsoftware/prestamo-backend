import type { Estado, FilaDesglose, Proyeccion } from '@core'

export type { Estado, FilaDesglose, Proyeccion }

export type TipoRegistro = 'PRESTAMO' | 'VENTA_CUOTAS'
/** PERSONAL: lo lleva una sola persona, sin notificar a nadie. */
export type ModoRegistro = 'COMPARTIDO' | 'PERSONAL'
export type RolPrestamo = 'PRESTAMISTA' | 'DEUDOR' | 'CODEUDOR' | 'OBSERVADOR'
export type EstadoPrestamo =
  | 'BORRADOR' | 'EN_NEGOCIACION' | 'PENDIENTE_ACEPTACION'
  | 'ACTIVO' | 'PAGADO' | 'RECHAZADO' | 'CANCELADO'
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'ANULADO' | 'SIN_RESPUESTA'

export interface Yo {
  id: string
  email: string
  nombreCompleto: string
  emailVerificado: boolean
  telefono?: string
  esPrestamista: boolean
  esDeudor: boolean
  esParticipante: boolean
}

export interface UsuraVigente {
  /** Interés bancario corriente certificado, efectivo anual (decimal: 0,19 = 19%). */
  interesBancarioCorrienteEA: number
  /** Tope de usura = 1,5 × el anterior, efectivo anual (decimal). */
  usuraEA: number
  fechaCertificacion: string
  fuente: string
}

export interface Condiciones {
  montoPrincipal: number
  fechaDesembolso: string
  tasaCorrienteMensualPct: number
  tasaCorrienteEA: number
  tasaMoraMensualPct: number
  tasaMoraEA: number
  modoMora: 'SIN_MORA' | 'PERSONALIZADA' | 'MAXIMO_LEGAL'
  modoCalculo: 'CUOTA_FIJA' | 'PLAZO_FIJO' | 'LIBRE'
  periodicidad: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'PERSONALIZADA'
  diaCorte?: number
  ventana: { diasAntes: number; diasDespues: number }
  diasGracia: number
  correrADiaHabil: boolean
  cuota: number
  plazo: number | null
  excedeUsura: boolean
  usuraVigenteAlPactar?: { valorEA: number; fechaCertificacion: string; fuente: string }
  autoConfirmarPagosDelPrestamista: boolean
}

export interface ResumenPrestamo {
  id: string
  tipo: TipoRegistro
  /** En una venta: qué se vendió. */
  concepto?: string
  modo: ModoRegistro
  /** ¿Lo creé yo? */
  esDueno: boolean
  invitacionPendiente: { email: string } | null
  compartidoDesde?: string
  rol: RolPrestamo | null
  estado: EstadoPrestamo
  descripcion?: string
  contraparte: { nombre: string; email?: string }
  montoPrincipal: number
  cuota: number
  plazo: number | null
  saldo: Estado
  enMora: boolean
  creadoEn: string
}

export interface Negociacion {
  version: number
  propuestoPor: string
  fecha: string
  cuotaPropuesta?: number
  plazoCalculado?: number
  tasaPropuesta?: number
  mensaje?: string
  respuesta: string
}

export interface Participante {
  email: string
  rol: 'CODEUDOR' | 'OBSERVADOR'
  nivel: 'COMPLETO' | 'RESUMIDO'
  estado: 'PENDIENTE_AUTORIZACION' | 'ACTIVO' | 'REVOCADO'
  solidario: boolean
  autorizaciones: number
}

export interface DetallePrestamo extends ResumenPrestamo {
  condiciones: Condiciones
  versionesCondiciones: number
  aceptaciones: Array<{ userId: string; fecha: string }>
  negociacion: Negociacion[]
  participantes: Participante[]
  pagare: { subidoEn: string } | null
  invitacion: { email: string; codigo: string } | null
}

export interface Pago {
  id: string
  loanId: string
  periodoNumero: number
  monto: number
  fechaPago: string
  metodo: 'TRANSFERENCIA' | 'EFECTIVO' | 'OTRO'
  intencion: 'CUOTA' | 'PARCIAL' | 'ABONO_CAPITAL'
  estado: EstadoPago
  autoConfirmado: boolean
  /** Registrado cuando era un registro personal: nadie más lo confirmó. */
  registroPersonal?: boolean
  nota?: string
  registradoPor: string
  registradoEn: string
  comprobante: { codigoTransaccion?: string; archivo?: { archivoKey: string } }
  confirmacion?: { userId: string; fecha: string }
  rechazo?: { userId: string; fecha: string; motivo: string }
}

export interface PagoPendiente {
  id: string
  loanId: string
  monto: number
  fechaPago: string
  metodo: string
  intencion: string
  nota?: string
  codigoTransaccion?: string
  tieneComprobante: boolean
  registradoPor: string
  registradoEn: string
}

export interface Dashboard {
  esPrestamista: boolean
  esDeudor: boolean
  pagosPorConfirmar: number
  pendientesDeAceptar: number
  presté: {
    cantidad: number
    capitalColocado: number
    interesesPorCobrar: number
    moraPorCobrar: number
    enMora: number
  }
  debo: {
    cantidad: number
    capital: number
    intereses: number
    mora: number
    vencido: number
    proximaCuota: {
      loanId: string
      monto: number
      corte: string
      ventanaInicio: string
      ventanaFin: string
      diasParaLaVentana: number
    } | null
  }
  posicionNeta: number
}

export interface Invitacion {
  loanId: string
  tipo?: TipoRegistro
  concepto?: string
  modo?: ModoRegistro
  saldoActual?: number
  rolInvitado?: 'PRESTAMISTA' | 'DEUDOR'
  estado: EstadoPrestamo
  descripcion?: string
  prestamista: string
  emailInvitado: string
  condiciones: Condiciones
  plan: Proyeccion
}

export interface EntradaAuditoria {
  _id: string
  accion: string
  descripcion: string
  fecha: string
  userId?: string
}
