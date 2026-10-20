/** Consultas y mutaciones. TanStack Query maneja caché e invalidación. */
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { api } from './cliente'
import type {
  Dashboard, DetallePrestamo, EntradaAuditoria, Invitacion, Pago, PagoPendiente,
  Proyeccion, ResumenPrestamo, UsuraVigente, Yo,
} from './tipos'

export const claves = {
  yo: ['yo'] as const,
  dashboard: ['dashboard'] as const,
  prestamos: ['prestamos'] as const,
  prestamo: (id: string) => ['prestamo', id] as const,
  plan: (id: string) => ['plan', id] as const,
  pagos: (id: string) => ['pagos', id] as const,
  auditoria: (id: string) => ['auditoria', id] as const,
  pendientes: ['pagos-pendientes'] as const,
  invitacion: (codigo: string) => ['invitacion', codigo] as const,
  usura: ['usura-vigente'] as const,
}

export function useYo(opciones?: Partial<UseQueryOptions<Yo>>) {
  return useQuery({ queryKey: claves.yo, queryFn: () => api<Yo>('/me'), ...opciones })
}

/**
 * Tasa de usura vigente (endpoint público).
 *
 * Cambia una vez por trimestre: no tiene sentido volver a pedirla en cada
 * navegación, pero tampoco cachearla para siempre.
 */
export function useUsuraVigente() {
  return useQuery({
    queryKey: claves.usura,
    queryFn: () => api<UsuraVigente>('/config/usura'),
    staleTime: 60 * 60 * 1000,
  })
}

export function useDashboard() {
  return useQuery({ queryKey: claves.dashboard, queryFn: () => api<Dashboard>('/dashboard') })
}

export function usePrestamos() {
  return useQuery({
    queryKey: claves.prestamos,
    queryFn: async () => (await api<{ prestamos: ResumenPrestamo[] }>('/loans')).prestamos,
  })
}

export function usePrestamo(id: string) {
  return useQuery({
    queryKey: claves.prestamo(id),
    queryFn: () => api<DetallePrestamo>(`/loans/${id}`),
    enabled: Boolean(id),
  })
}

export function usePlan(id: string, habilitado = true) {
  return useQuery({
    queryKey: claves.plan(id),
    queryFn: () => api<Proyeccion>(`/loans/${id}/plan`),
    enabled: Boolean(id) && habilitado,
  })
}

export function usePagos(id: string) {
  return useQuery({
    queryKey: claves.pagos(id),
    queryFn: async () => {
      const { pagos } = await api<{ pagos: Array<Pago & { _id?: string }> }>(`/loans/${id}/payments`)
      // El backend debe mandar `id`; versiones anteriores mandaban solo `_id` de
      // Mongo, y sin id los botones de confirmar/rechazar llamaban a
      // /payments/undefined. Se normaliza para no depender del orden de despliegue.
      return pagos.map(({ _id, ...p }) => ({ ...p, id: p.id ?? _id ?? '' }))
    },
    enabled: Boolean(id),
  })
}

export function useAuditoria(id: string) {
  return useQuery({
    queryKey: claves.auditoria(id),
    queryFn: () => api<{ entradas: EntradaAuditoria[] }>(`/loans/${id}/auditoria`),
    enabled: Boolean(id),
  })
}

export function usePagosPendientes() {
  return useQuery({
    queryKey: claves.pendientes,
    queryFn: async () => (await api<{ pagos: PagoPendiente[] }>('/pagos/pendientes')).pagos,
  })
}

export function useInvitacion(codigo: string) {
  return useQuery({
    queryKey: claves.invitacion(codigo),
    queryFn: () => api<Invitacion>(`/invitacion/${codigo}`),
    enabled: Boolean(codigo),
    retry: false,
  })
}

/** Invalida todo lo que un cambio en un préstamo puede haber tocado. */
function useRefrescarPrestamo(id: string) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: claves.prestamo(id) })
    void qc.invalidateQueries({ queryKey: claves.plan(id) })
    void qc.invalidateQueries({ queryKey: claves.pagos(id) })
    void qc.invalidateQueries({ queryKey: claves.auditoria(id) })
    void qc.invalidateQueries({ queryKey: claves.pendientes })
    void qc.invalidateQueries({ queryKey: claves.dashboard })
    void qc.invalidateQueries({ queryKey: claves.prestamos })
  }
}

export function useCrearPrestamo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: unknown) => api<DetallePrestamo>('/loans', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: claves.prestamos })
      void qc.invalidateQueries({ queryKey: claves.dashboard })
    },
  })
}

export function useAceptar(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (cuerpo: { textoAceptado: string; textoAdvertenciaUsura?: string }) =>
      api<DetallePrestamo>(`/loans/${id}/aceptar`, { metodo: 'POST', cuerpo }),
    onSuccess: refrescar,
  })
}

export function useRechazar(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: () => api(`/loans/${id}/rechazar`, { metodo: 'POST' }),
    onSuccess: refrescar,
  })
}

export function useNegociar(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (cuerpo: { cuotaPropuesta?: number; tasaCorrienteMensualPct?: number; mensaje?: string }) =>
      api<DetallePrestamo>(`/loans/${id}/negociacion`, { metodo: 'POST', cuerpo }),
    onSuccess: refrescar,
  })
}

export function useRegistrarPago(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (cuerpo: unknown) =>
      api<Pago>(`/loans/${id}/payments`, {
        metodo: 'POST',
        cuerpo,
        // Un doble click o un reintento de red no puede duplicar un pago.
        cabeceras: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    onSuccess: refrescar,
  })
}

export function useConfirmarPago(loanId: string) {
  const refrescar = useRefrescarPrestamo(loanId)
  return useMutation({
    mutationFn: ({ pagoId, ...cuerpo }: { pagoId: string; textoAutorizacion?: string }) =>
      api<Pago>(`/payments/${pagoId}/confirmar`, { metodo: 'POST', cuerpo }),
    onSuccess: refrescar,
  })
}

export function useRechazarPago(loanId: string) {
  const refrescar = useRefrescarPrestamo(loanId)
  return useMutation({
    mutationFn: ({ pagoId, motivo }: { pagoId: string; motivo: string }) =>
      api<Pago>(`/payments/${pagoId}/rechazar`, { metodo: 'POST', cuerpo: { motivo } }),
    onSuccess: refrescar,
  })
}

export function useAnularPago(loanId: string) {
  const refrescar = useRefrescarPrestamo(loanId)
  return useMutation({
    mutationFn: (pagoId: string) => api(`/payments/${pagoId}`, { metodo: 'DELETE' }),
    onSuccess: refrescar,
  })
}

export function useInvitarContraparte(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (email: string) => api<DetallePrestamo>(`/loans/${id}/invitar`, { metodo: 'POST', cuerpo: { email } }),
    onSuccess: refrescar,
  })
}

export function useUnirse(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (textoAceptado: string) => api<DetallePrestamo>(`/loans/${id}/unirse`, { metodo: 'POST', cuerpo: { textoAceptado } }),
    onSuccess: refrescar,
  })
}

export function useInvitarParticipante(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (cuerpo: { email: string; rol: string; nivel: string; solidario: boolean }) =>
      api(`/loans/${id}/participantes`, { metodo: 'POST', cuerpo }),
    onSuccess: refrescar,
  })
}

export function useAutorizarParticipante(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (email: string) =>
      api(`/loans/${id}/participantes/${encodeURIComponent(email)}/autorizar`, { metodo: 'POST' }),
    onSuccess: refrescar,
  })
}

export function useRevocarParticipante(id: string) {
  const refrescar = useRefrescarPrestamo(id)
  return useMutation({
    mutationFn: (email: string) =>
      api(`/loans/${id}/participantes/${encodeURIComponent(email)}`, { metodo: 'DELETE' }),
    onSuccess: refrescar,
  })
}
