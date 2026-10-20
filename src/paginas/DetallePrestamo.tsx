import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { descargar, ErrorApi } from '../api/cliente'
import {
  useAceptar, useAnularPago, useAuditoria, useAutorizarParticipante, useConfirmarPago,
  useInvitarParticipante, useNegociar, usePagos, usePlan, usePrestamo, useRechazar,
  useInvitarContraparte, useRechazarPago, useRegistrarPago, useRevocarParticipante, useUnirse, useYo,
} from '../api/hooks'
import type { DetallePrestamo as TDetalle, Pago } from '../api/tipos'
import {
  Aviso, Avatar, Esqueleto, Fila, Hoja, IconoEnCaja, Insignia, Segmentos, useToast,
} from '../componentes/base'
import {
  IconoAlerta, IconoCheck, IconoChevron, IconoDescargar, IconoGrafico, IconoMas, IconoPersonas,
} from '../componentes/Iconos'
import { Pantalla } from '../componentes/Pantalla'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { avance } from '../componentes/TarjetaPrestamo'
import { esPersonal, esVenta, nombreRegistro, subtitulo } from '../lib/vocabulario'
import { aNumero, fechaLarga, hoyISO, numero, pesos, porcentaje } from '../lib/formato'

type Pestana = 'resumen' | 'plan' | 'pagos' | 'gente' | 'historial'
const PESTANAS: Pestana[] = ['resumen', 'plan', 'pagos', 'gente', 'historial']

const METODO: Record<string, string> = { TRANSFERENCIA: 'Transferencia', EFECTIVO: 'Efectivo', OTRO: 'Otro medio' }
const INTENCION: Record<string, string> = { CUOTA: 'Cuota del mes', PARCIAL: 'Abono parcial', ABONO_CAPITAL: 'Abono a capital' }

const mensaje = (e: unknown, porDefecto: string) => (e instanceof ErrorApi ? e.message : porDefecto)

export function DetallePrestamo() {
  const { id = '' } = useParams()
  const { data: p, isLoading } = usePrestamo(id)
  const { data: yo } = useYo()
  const { data: pagos } = usePagos(id)
  const [busqueda] = useSearchParams()
  const inicial = busqueda.get('pestana') as Pestana | null
  const [pestana, setPestana] = useState<Pestana>(inicial && PESTANAS.includes(inicial) ? inicial : 'resumen')
  const [registrando, setRegistrando] = useState(false)
  const [exportando, setExportando] = useState(false)

  if (isLoading || !p) {
    return (
      <Pantalla titulo="Cargando…" atras="/prestamos" textoAtras="Cuentas">
        <div className="space-y-4">
          <Esqueleto className="h-16 w-2/3 rounded-2xl" />
          <Esqueleto className="h-48 rounded-4xl" />
          <Esqueleto className="h-24 rounded-3xl" />
        </div>
      </Pantalla>
    )
  }

  const miId = yo?.id ?? ''
  const porConfirmar = (pagos ?? []).filter((x) => x.estado === 'PENDIENTE' && x.registradoPor !== miId).length
  const negociando = p.estado === 'PENDIENTE_ACEPTACION' || p.estado === 'EN_NEGOCIACION'
  // Invitado a un registro personal: solo mira hasta aceptar el saldo.
  const invitadoSinUnirse = esPersonal(p) && !p.esDueno
  const puedeRegistrar = p.estado === 'ACTIVO' && !invitadoSinUnirse && ['PRESTAMISTA', 'DEUDOR', 'CODEUDOR'].includes(p.rol ?? '')

  return (
    <Pantalla
      titulo={p.contraparte.nombre}
      atras="/prestamos"
      textoAtras="Cuentas"
      encabezado={
        <div className="flex items-center gap-4">
          <Avatar nombre={p.contraparte.nombre} tam={60} />
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{p.contraparte.nombre}</h1>
            <p className="truncate text-[14px] text-texto-2">
              {subtitulo(p)}
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {esVenta(p) && <span className="insignia bg-[#8b5cf6]/12 text-[#7c3aed] dark:text-[#c4b5fd]">Venta a cuotas</span>}
              {esPersonal(p) && <span className="insignia bg-superficie-2 text-texto-2">Personal</span>}
              <Insignia estado={p.estado} />
              {p.enMora && <Insignia estado="MORA" />}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {p.condiciones.excedeUsura && (
          <Aviso tipo="atencion" titulo="Esta tasa supera la usura vigente">
            Se pactó al {porcentaje(p.condiciones.tasaCorrienteEA * 100)} efectivo anual y el tope
            certificado era {porcentaje((p.condiciones.usuraVigenteAlPactar?.valorEA ?? 0) * 100)}.
            Cobrar por encima de la usura es delito en Colombia (art. 305 del Código Penal).{' '}
            {negociando
              ? 'Para aceptar, cada parte debe confirmar esta advertencia de forma expresa.'
              : 'Ambas partes aceptaron esta advertencia de forma expresa y quedó registrada.'}
          </Aviso>
        )}

        {negociando && <PanelAceptacion prestamo={p} miId={miId} />}

        {esPersonal(p) && p.esDueno && <PanelPersonal prestamo={p} />}
        {invitadoSinUnirse && <PanelUnirse prestamo={p} />}

        {p.estado === 'ACTIVO' && <HeroSaldo p={p} />}

        {(puedeRegistrar || p.estado === 'ACTIVO') && (
          <div className="grid grid-cols-3 gap-3">
            {puedeRegistrar && (
              <Accion icono={<IconoMas tam={22} strokeWidth={2.3} />} texto="Registrar pago" principal onClick={() => setRegistrando(true)} />
            )}
            <Accion icono={<IconoGrafico tam={22} />} texto="Simular" a={`/prestamos/${p.id}/simular`} />
            <Accion icono={<IconoDescargar tam={22} />} texto="Exportar" onClick={() => setExportando(true)} />
          </div>
        )}

        {porConfirmar > 0 && pestana !== 'pagos' && (
          <button
            onClick={() => setPestana('pagos')}
            className="tarjeta presionable flex w-full items-center gap-3.5 text-left ring-1 ring-atencion/40"
          >
            <IconoEnCaja color="#e8930c"><IconoAlerta tam={22} /></IconoEnCaja>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">
                {porConfirmar === 1 ? 'Un pago espera tu confirmación' : `${porConfirmar} pagos esperan tu confirmación`}
              </p>
              <p className="text-[13px] text-texto-2">No cuenta hasta que lo confirmes. Toca para revisarlo.</p>
            </div>
            <IconoChevron tam={16} className="text-texto-3" />
          </button>
        )}

        <div className="sticky z-20 -mx-4 px-4 py-2 vidrio" style={{ top: 'calc(env(safe-area-inset-top) + 48px)' }}>
          <Segmentos<Pestana>
            etiqueta="Secciones"
            valor={pestana}
            onCambio={setPestana}
            opciones={[
              ['resumen', 'Resumen'],
              ['plan', 'Plan de pagos'],
              ['pagos', 'Pagos', porConfirmar],
              ['gente', 'Personas'],
              ['historial', 'Historial'],
            ]}
          />
        </div>

        <div key={pestana} className="animate-entrada">
          {pestana === 'resumen' && <Resumen prestamo={p} />}
          {pestana === 'plan' && <Plan id={id} venta={esVenta(p)} />}
          {pestana === 'pagos' && (
            <Pagos id={id} prestamo={p} miId={miId} alRegistrar={puedeRegistrar ? () => setRegistrando(true) : undefined} />
          )}
          {pestana === 'gente' && (esPersonal(p)
            ? <Aviso tipo="info" titulo="Solo tú ves este registro">Para sumar a alguien más, primero invita a la otra parte y que acepte.</Aviso>
            : <Gente id={id} prestamo={p} />)}
          {pestana === 'historial' && <Historial id={id} />}
        </div>
      </div>

      <HojaRegistrarPago
        abierta={registrando}
        alCerrar={() => setRegistrando(false)}
        id={id}
        alListo={() => { setRegistrando(false); setPestana('pagos') }}
      />
      <HojaExportar abierta={exportando} alCerrar={() => setExportando(false)} id={p.id} />
    </Pantalla>
  )
}

function Accion({
  icono, texto, onClick, a, principal,
}: { icono: ReactNode; texto: string; onClick?: () => void; a?: string; principal?: boolean }) {
  const clase = `presionable flex flex-col items-center gap-2 rounded-3xl px-2 py-3.5 text-[13px] font-semibold ${
    principal ? 'bg-marca-solido text-marca-sobre shadow-lg shadow-marca/25' : 'bg-superficie text-texto shadow-[var(--sombra-tarjeta)]'
  }`
  const contenido = (
    <>
      <span className={principal ? '' : 'text-marca'}>{icono}</span>
      {texto}
    </>
  )
  return a ? <Link to={a} className={clase}>{contenido}</Link> : <button onClick={onClick} className={clase}>{contenido}</button>
}

function HeroSaldo({ p }: { p: TDetalle }) {
  const v = avance(p)
  return (
    <div className="hero rounded-4xl p-5 text-white">
      <p className="text-[15px] font-medium text-white/85">
        {p.rol === 'PRESTAMISTA' ? 'Te debe hoy' : 'Debes hoy'}
      </p>
      <p className="cifra mt-1 text-[40px] font-bold leading-none tracking-tight">{pesos(p.saldo.capital)}</p>
      <p className="mt-1.5 text-[13px] text-white/75">
        {esVenta(p) ? `de ${pesos(p.montoPrincipal)} en total · saldo por pagar` : `de ${pesos(p.montoPrincipal)} prestados · capital sin pagar`}
      </p>

      <div className="mt-4">
        <div className="mb-2 flex justify-between">
          <span className="micro text-white/65">{p.rol === 'PRESTAMISTA' ? (esVenta(p) ? 'Cobrado' : 'Recuperado') : 'Pagado'}</span>
          <span className="micro text-white/90">{Math.round(v * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#67e8f9] transition-[width] duration-1000"
            style={{ width: `${Math.max(2, v * 100)}%` }} />
        </div>
      </div>

      {esVenta(p) ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <MiniCifra etiqueta="Cuota" valor={p.cuota} alerta={false} />
          <MiniCifra etiqueta="Vencido" valor={p.saldo.vencido} alerta={p.saldo.vencido > 0} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <MiniCifra etiqueta="Intereses" valor={p.saldo.interesesPendientes} alerta={false} />
          <MiniCifra etiqueta="Mora" valor={p.saldo.moraPendiente} alerta={p.saldo.moraPendiente > 0} />
          <MiniCifra etiqueta="Vencido" valor={p.saldo.vencido} alerta={p.saldo.vencido > 0} />
        </div>
      )}
    </div>
  )
}

function MiniCifra({ etiqueta, valor, alerta }: { etiqueta: string; valor: number; alerta: boolean }) {
  return (
    <div className="vidrio-claro rounded-2xl px-3 py-2.5">
      <p className="micro text-[10px] text-white/70">{etiqueta}</p>
      <p className={`cifra mt-1 truncate text-[15px] font-bold ${alerta ? 'text-[#fecaca]' : ''}`}>{pesos(valor)}</p>
    </div>
  )
}

function Resumen({ prestamo: p }: { prestamo: TDetalle }) {
  const c = p.condiciones
  return (
    <div className="space-y-5">
      <section>
        <h2 className="titulo-seccion">Las condiciones</h2>
        <dl className="grupo">
          {esVenta(p) ? (
            <>
              <Fila k="Qué se vendió" v={p.concepto ?? '—'} />
              <Fila k="Valor total" v={<span className="cifra">{pesos(c.montoPrincipal)}</span>} />
              <Fila k="Fecha de la venta" v={fechaLarga(c.fechaDesembolso)} />
              <Fila k="Interés" v="Sin interés" extra="Una venta a cuotas no lleva interés ni mora" />
            </>
          ) : (
            <>
              <Fila k="Monto prestado" v={<span className="cifra">{pesos(c.montoPrincipal)}</span>} />
              <Fila k="Entregado el" v={fechaLarga(c.fechaDesembolso)} />
              <Fila k="Interés" v={`${c.tasaCorrienteMensualPct.toFixed(2)}% mensual`} extra={`${porcentaje(c.tasaCorrienteEA * 100)} efectivo anual`} />
              <Fila
                k="Mora"
                v={c.modoMora === 'SIN_MORA' ? 'No se cobra' : `${c.tasaMoraMensualPct.toFixed(2)}% mensual`}
                extra={c.modoMora === 'SIN_MORA' ? 'Se decidió no castigar el atraso' : 'Solo sobre lo vencido, por días'}
              />
            </>
          )}
          <Fila k="Cuota" v={c.cuota ? <span className="cifra">{pesos(c.cuota)}</span> : 'Libre'} />
          <Fila k="Plazo" v={c.plazo ? `${c.plazo} cuotas` : 'Sin plazo fijo'} />
          <Fila
            k="Ventana de pago"
            v={`Día ${c.diaCorte ?? '—'}`}
            extra={`${c.ventana.diasAntes} días antes y ${c.ventana.diasDespues} después${c.correrADiaHabil ? ' · corre a día hábil' : ''}`}
          />
          <Fila
            k="Confirmación"
            v={c.autoConfirmarPagosDelPrestamista ? 'Automática' : 'Siempre doble'}
            extra={c.autoConfirmarPagosDelPrestamista ? 'Los pagos que registra el prestamista se confirman solos' : 'Todo pago lo confirma la otra parte'}
          />
        </dl>
        {p.versionesCondiciones > 1 && (
          <p className="mx-4 mt-2 text-[13px] text-texto-2">
            Esta es la versión {p.versionesCondiciones} de las condiciones. El historial guarda todas.
          </p>
        )}
      </section>
    </div>
  )
}

/** Dueño de un registro personal: qué significa y cómo compartirlo. */
function PanelPersonal({ prestamo: p }: { prestamo: TDetalle }) {
  const invitar = useInvitarContraparte(p.id)
  const toast = useToast()
  const [abierta, setAbierta] = useState(false)
  const [email, setEmail] = useState('')
  const nombre = p.contraparte.nombre
  return (
    <div className="tarjeta">
      <div className="flex items-start gap-3.5">
        <IconoEnCaja color="#64748b"><IconoPersonas tam={22} /></IconoEnCaja>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">Registro personal</p>
          <p className="text-[14px] text-texto-2">
            Solo tú lo ves. Los pagos que registras quedan en firme sin que nadie los confirme, así
            que sirve para tu control pero no como prueba ante {nombre}.
          </p>
        </div>
      </div>
      {p.invitacionPendiente ? (
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl bg-superficie-2 px-4 py-3">
          <p className="min-w-0 text-[14px]">
            Invitación enviada a <strong className="break-all">{p.invitacionPendiente.email}</strong>. Falta que acepte.
          </p>
          <button className="enlace shrink-0 text-[14px]" onClick={() => { setEmail(p.invitacionPendiente!.email); setAbierta(true) }}>Cambiar</button>
        </div>
      ) : (
        <button className="btn-tonal mt-3.5 w-full" onClick={() => setAbierta(true)}>
          <span className="truncate">Invitar a {nombre}</span>
        </button>
      )}
      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo={`Invitar a ${nombre}`}>
        <div className="space-y-4">
          <p className="text-[15px] text-texto-2">
            Le llega un correo con las condiciones, el historial y el saldo de hoy (
            <strong className="cifra text-texto">{pesos(p.saldo.capital)}</strong>). Cuando lo acepte, cada pago nuevo
            lo confirmará la otra parte. Hasta entonces, todo sigue como ahora.
          </p>
          <div>
            <label className="etiqueta" htmlFor="emailContraparte">Correo de {nombre}</label>
            <input id="emailContraparte" type="email" inputMode="email" autoCapitalize="none" className="campo"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <button
            className="btn-primario w-full"
            disabled={!email.includes('@') || invitar.isPending}
            onClick={() => void invitar.mutateAsync(email)
              .then(() => { setAbierta(false); toast({ tipo: 'exito', texto: `Invitación enviada a ${email}` }) })
              .catch((e) => toast({ tipo: 'error', texto: mensaje(e, 'No pudimos enviar la invitación') }))}
          >
            {invitar.isPending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </Hoja>
    </div>
  )
}

/** Invitado a un registro personal: acepta el saldo de hoy o dice que no lo reconoce. */
function PanelUnirse({ prestamo: p }: { prestamo: TDetalle }) {
  const unirse = useUnirse(p.id)
  const rechazar = useRechazar(p.id)
  const toast = useToast()
  const navegar = useNavigate()
  const [error, setError] = useState('')
  const quien = p.contraparte.nombre
  const que = esVenta(p) ? `la venta a cuotas${p.concepto ? ` de ${p.concepto}` : ''}` : 'el préstamo'
  // Texto EXACTO que queda como constancia.
  const TEXTO =
    `Acepto que ${que} con ${quien} tiene hoy un saldo de ${pesos(p.saldo.capital)}, sobre un total de ` +
    `${pesos(p.montoPrincipal)}${p.condiciones.cuota ? ` con cuotas de ${pesos(p.condiciones.cuota)}` : ''}. ` +
    `Sé que los pagos registrados hasta hoy los registró ${quien} sin mi confirmación, y que desde ahora ` +
    `cada pago nuevo lo confirmará la otra parte.`
  return (
    <div className="tarjeta ring-2 ring-marca/40">
      <div className="flex items-center gap-3">
        <IconoEnCaja color="#2f9488"><IconoPersonas tam={22} /></IconoEnCaja>
        <h2 className="text-[17px] font-bold">{quien} te invitó a llevar esta cuenta juntos</h2>
      </div>
      <p className="mt-3 rounded-2xl bg-superficie-2 px-4 py-3 text-[14px] leading-snug">{TEXTO}</p>
      {error && <div className="mt-3"><Aviso tipo="error">{error}</Aviso></div>}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          className="btn-primario px-3" disabled={unirse.isPending}
          onClick={() => void unirse.mutateAsync(TEXTO)
            .then(() => toast({ tipo: 'exito', texto: 'Listo: ahora llevan la cuenta juntos' }))
            .catch((e) => setError(mensaje(e, 'No pudimos registrar tu aceptación')))}
        >
          {unirse.isPending ? 'Aceptando…' : 'Acepto este saldo'}
        </button>
        <button
          className="btn-peligro px-3" disabled={rechazar.isPending}
          onClick={() => void rechazar.mutateAsync()
            .then(() => { toast({ tipo: 'info', texto: 'Listo: no verás más este registro' }); navegar('/prestamos', { replace: true }) })
            .catch((e) => setError(mensaje(e, 'No pudimos registrar tu respuesta')))}
        >
          No lo reconozco
        </button>
      </div>
    </div>
  )
}

function HojaExportar({ abierta, alCerrar, id }: { abierta: boolean; alCerrar(): void; id: string }) {
  const toast = useToast()
  const [cargando, setCargando] = useState<string | null>(null)
  const bajar = (ruta: string, nombre: string) => {
    setCargando(nombre)
    descargar(ruta, nombre)
      .then(() => alCerrar())
      .catch((e) => toast({ tipo: 'error', texto: mensaje(e, 'No pudimos generar el archivo') }))
      .finally(() => setCargando(null))
  }
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Exportar">
      <div className="grupo">
        {([
          [`/loans/${id}/export.pdf`, `estado-cuenta-${id}.pdf`, 'Estado de cuenta', 'PDF para compartir o imprimir', '#e5484d'],
          [`/loans/${id}/export.xlsx`, `libro-${id}.xlsx`, 'Libro de movimientos', 'Excel con cada asiento', '#1e8458'],
        ] as const).map(([ruta, nombre, titulo, ayuda, color]) => (
          <button key={ruta} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-superficie-2"
            onClick={() => bajar(ruta, nombre)} disabled={cargando !== null}>
            <IconoEnCaja color={color} tam={40}><IconoDescargar tam={20} /></IconoEnCaja>
            <div className="flex-1">
              <p className="text-[16px] font-semibold">{titulo}</p>
              <p className="text-[13px] text-texto-2">{ayuda}</p>
            </div>
            {cargando === nombre
              ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-separador border-t-marca" />
              : <IconoChevron tam={16} className="text-texto-3" />}
          </button>
        ))}
      </div>
    </Hoja>
  )
}

function Plan({ id, venta }: { id: string; venta: boolean }) {
  const { data, isLoading, error } = usePlan(id)
  if (isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Esqueleto key={i} className="h-32 rounded-3xl" />)}</div>
  if (error) return <Aviso tipo="info">No tienes permiso para ver los montos.</Aviso>
  if (!data) return null
  return (
    <div className="space-y-4">
      {venta ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Dato etiqueta="Total a pagar" valor={pesos(data.filas.reduce((s, f) => s + f.cuotaExigible, 0))} cifra />
          <Dato etiqueta="Termina en" valor={data.periodosHastaLiquidar ? `${data.periodosHastaLiquidar} cuotas` : '—'} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          <Dato etiqueta="Intereses" valor={pesos(data.totalIntereses)} cifra />
          <Dato etiqueta="Mora" valor={data.totalMora > 0 ? pesos(data.totalMora) : 'Ninguna'} cifra={data.totalMora > 0} />
          <Dato etiqueta="Termina en" valor={data.periodosHastaLiquidar ? `${data.periodosHastaLiquidar} cuotas` : '—'} />
        </div>
      )}
      <TablaDesglose filas={data.filas} />
    </div>
  )
}

function Dato({ etiqueta, valor, cifra }: { etiqueta: string; valor: string; cifra?: boolean }) {
  return (
    <div className="tarjeta px-3 py-3">
      <p className="text-[12px] leading-tight text-texto-2">{etiqueta}</p>
      <p className={`${cifra ? 'cifra' : ''} mt-1 truncate text-[16px] font-bold`}>{valor}</p>
    </div>
  )
}

function PanelAceptacion({ prestamo: p, miId }: { prestamo: TDetalle; miId: string }) {
  const aceptar = useAceptar(p.id)
  const rechazar = useRechazar(p.id)
  const negociar = useNegociar(p.id)
  const toast = useToast()
  const [cuota, setCuota] = useState(0)
  const [error, setError] = useState('')
  const [aceptaUsura, setAceptaUsura] = useState(false)
  const [proponiendo, setProponiendo] = useState(false)
  const yaAcepte = p.aceptaciones.some((a) => a.userId === miId)

  // Este es el texto EXACTO que queda como constancia: en una venta debe decir
  // que se paga un bien o servicio, no que se recibe un préstamo.
  const TEXTO = esVenta(p)
    ? `Acepto pagar ${pesos(p.condiciones.montoPrincipal)} por ${p.concepto ?? 'lo acordado'}` +
      (p.condiciones.plazo ? ` en ${p.condiciones.plazo} cuotas de ${pesos(p.condiciones.cuota)}` : '') +
      `, sin interés. Entiendo que esta plataforma solo lleva el registro y no interviene en el acuerdo.`
    : `Acepto las condiciones de este préstamo: ${pesos(p.condiciones.montoPrincipal)} al ` +
      `${p.condiciones.tasaCorrienteMensualPct}% mensual, con cuota de ${pesos(p.condiciones.cuota)}. ` +
      `Entiendo que esta plataforma solo lleva el registro y no interviene en el acuerdo.`

  // Si la tasa pactada supera la usura, el backend exige una constancia aparte
  // (ADVERTENCIA_USURA) además de la de condiciones: sin ella devuelve 400 y la
  // aceptación no avanza. Este es el texto EXACTO que se muestra y se envía.
  const usuraEA = p.condiciones.usuraVigenteAlPactar?.valorEA
  const TEXTO_USURA =
    `Acepto este préstamo sabiendo que la tasa pactada es de ` +
    `${porcentaje(p.condiciones.tasaCorrienteEA * 100)} efectivo anual y que la tasa de usura ` +
    `vigente al pactarlo era de ${porcentaje((usuraEA ?? 0) * 100)} efectivo anual` +
    `${usuraEA !== undefined ? `, es decir ${porcentaje((p.condiciones.tasaCorrienteEA - usuraEA) * 100)} puntos por encima` : ''}.\n\n` +
    `Cobrar intereses por encima de la tasa de usura es delito en Colombia (artículo 305 del ` +
    `Código Penal) y puede acarrear la pérdida de los intereses pactados.\n\n` +
    `Declaro que leí esta advertencia, que la entiendo, y que aun así acepto estas condiciones. ` +
    `Esta plataforma no certifica la tasa vigente: la verifico con la Superintendencia Financiera.`

  return (
    <div className="tarjeta ring-2 ring-marca/40">
      <div className="flex items-center gap-3">
        <IconoEnCaja color="#2f9488"><IconoCheck tam={22} /></IconoEnCaja>
        <h2 className="text-[17px] font-bold">
          {yaAcepte ? 'Ya aceptaste: falta la otra parte' : `${esVenta(p) ? 'Esta venta' : 'Este préstamo'} espera tu decisión`}
        </h2>
      </div>
      <p className="mt-2 text-[14px] text-texto-2">
        No empieza a correr hasta que ambos acepten. Lo que aceptes queda guardado con la fecha y el
        texto exacto que estás leyendo.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="col-span-2"><Dato etiqueta={esVenta(p) ? 'Valor total' : 'Monto'} valor={pesos(p.condiciones.montoPrincipal)} cifra /></div>
        {esVenta(p)
          ? <Dato etiqueta="Cuotas" valor={p.condiciones.plazo ? String(p.condiciones.plazo) : 'Libre'} />
          : <Dato etiqueta="Interés" valor={`${p.condiciones.tasaCorrienteMensualPct}% mes`} />}
        <Dato etiqueta="Cuota" valor={p.condiciones.cuota ? pesos(p.condiciones.cuota) : 'Libre'} cifra={Boolean(p.condiciones.cuota)} />
      </div>

      {error && <div className="mt-3"><Aviso tipo="error">{error}</Aviso></div>}

      {p.negociacion.length > 0 && (
        <ul className="mt-4 space-y-2">
          {p.negociacion.map((n) => (
            <li key={n.version} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] ${
              n.propuestoPor === miId ? 'ml-auto bg-marca-solido text-marca-sobre' : 'bg-superficie-2'
            }`}>
              <span className="font-semibold">{n.propuestoPor === miId ? 'Propusiste' : 'Te propusieron'}</span>{' '}
              {n.cuotaPropuesta ? `una cuota de ${pesos(n.cuotaPropuesta)}` : 'otras condiciones'}
              {n.plazoCalculado ? ` (${n.plazoCalculado} cuotas)` : ''}
              {n.mensaje && <p className="mt-1 opacity-80">“{n.mensaje}”</p>}
            </li>
          ))}
        </ul>
      )}

      {!yaAcepte && (
        <>
          {p.condiciones.excedeUsura && (
            <div className="mt-4">
              <Aviso tipo="atencion" titulo="Advertencia de usura — léela antes de aceptar">
                <p className="whitespace-pre-line">{TEXTO_USURA}</p>
                <label className="mt-3 flex items-start gap-2.5 font-semibold text-texto">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[rgb(var(--c-marca-solido))]" checked={aceptaUsura}
                    onChange={(e) => setAceptaUsura(e.target.checked)} />
                  <span>Leí y acepto esta advertencia.</span>
                </label>
                <p className="mt-2 text-[12px]">Tu aceptación queda registrada con fecha, hora y el texto exacto.</p>
              </Aviso>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            <button
              className="btn-primario w-full"
              disabled={aceptar.isPending || (p.condiciones.excedeUsura && !aceptaUsura)}
              onClick={() =>
                void aceptar
                  .mutateAsync({
                    textoAceptado: TEXTO,
                    textoAdvertenciaUsura: p.condiciones.excedeUsura ? TEXTO_USURA : undefined,
                  })
                  .then(() => toast({ tipo: 'exito', texto: 'Aceptaste las condiciones' }))
                  .catch((e) => setError(mensaje(e, 'No pudimos registrar tu aceptación')))
              }
            >
              {aceptar.isPending ? 'Aceptando…' : 'Acepto estas condiciones'}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button className="btn-tonal" onClick={() => setProponiendo(true)}>Proponer cuota</button>
              <button
                className="btn-peligro"
                disabled={rechazar.isPending}
                onClick={() => void rechazar.mutateAsync().catch((e) => setError(mensaje(e, 'No pudimos rechazarlo')))}
              >
                No acepto
              </button>
            </div>
          </div>
        </>
      )}

      <Hoja abierta={proponiendo} alCerrar={() => setProponiendo(false)} titulo="Proponer otra cuota">
        <div className="space-y-4">
          <div>
            <label className="etiqueta" htmlFor="cuotaProp">¿Cuánto puedes pagar al mes?</label>
            <input
              id="cuotaProp" className="campo cifra text-[28px] font-bold" inputMode="numeric"
              value={cuota ? `$${numero(cuota)}` : ''} placeholder="$0"
              onChange={(e) => setCuota(aNumero(e.target.value))}
            />
            <p className="ayuda">Calculamos el plazo y la otra parte decide.</p>
          </div>
          <button
            className="btn-primario w-full"
            disabled={!cuota || negociar.isPending}
            onClick={() =>
              void negociar.mutateAsync({ cuotaPropuesta: cuota })
                .then(() => { setProponiendo(false); toast({ tipo: 'exito', texto: 'Propuesta enviada' }) })
                .catch((e) => setError(mensaje(e, 'No pudimos enviar la propuesta')))
            }
          >
            Enviar propuesta
          </button>
        </div>
      </Hoja>
    </div>
  )
}

function HojaRegistrarPago({
  abierta, alCerrar, id, alListo,
}: { abierta: boolean; alCerrar(): void; id: string; alListo(): void }) {
  const registrar = useRegistrarPago(id)
  const toast = useToast()
  const VACIO = {
    monto: 0, fechaPago: hoyISO(), metodo: 'TRANSFERENCIA' as 'TRANSFERENCIA' | 'EFECTIVO' | 'OTRO',
    intencion: 'CUOTA' as 'CUOTA' | 'PARCIAL' | 'ABONO_CAPITAL',
    codigoTransaccion: '', nota: '',
  }
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Registrar un pago">
      <div className="space-y-4">
        <p className="text-[14px] text-texto-2">
          Queda pendiente hasta que la otra parte lo confirme. Así ninguno da por hecho algo que el
          otro no vio.
        </p>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="rounded-3xl bg-superficie-2 px-4 py-5 text-center">
          <label className="text-[13px] font-medium text-texto-2" htmlFor="monto">¿Cuánto?</label>
          <input
            id="monto" inputMode="numeric" autoComplete="off"
            className="cifra mt-1 w-full bg-transparent text-center text-[44px] font-bold outline-none placeholder:text-texto-3"
            value={form.monto ? `$${numero(form.monto)}` : ''} placeholder="$0"
            onChange={(e) => setForm({ ...form, monto: aNumero(e.target.value) })}
          />
        </div>

        <div>
          <span className="etiqueta">¿Qué tipo de pago es?</span>
          <div className="grid grid-cols-3 gap-2">
            {(['CUOTA', 'PARCIAL', 'ABONO_CAPITAL'] as const).map((v) => (
              <button key={v} onClick={() => setForm({ ...form, intencion: v })}
                className={`rounded-2xl px-2 py-3 text-[14px] font-semibold transition active:scale-95 ${
                  form.intencion === v ? 'bg-texto text-fondo' : 'bg-superficie-2 text-texto-2'
                }`}>
                {INTENCION[v]}
              </button>
            ))}
          </div>
          {form.intencion === 'ABONO_CAPITAL' && (
            <p className="ayuda">
              Por ley el pago cubre primero mora e intereses. Aplicarlo directo a la deuda necesita el
              visto bueno del prestamista al confirmar.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta" htmlFor="fechaPago">¿Cuándo?</label>
            <input id="fechaPago" type="date" className="campo" value={form.fechaPago}
              onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="metodo">¿Cómo?</label>
            <select id="metodo" className="campo" value={form.metodo}
              onChange={(e) => setForm({ ...form, metodo: e.target.value as typeof form.metodo })}>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="codigo">Código de la transacción (opcional)</label>
          <input id="codigo" className="campo" value={form.codigoTransaccion} placeholder="Referencia de la transferencia"
            onChange={(e) => setForm({ ...form, codigoTransaccion: e.target.value })} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="nota">Nota (opcional)</label>
          <input id="nota" className="campo" value={form.nota} placeholder="Ej.: cuota de octubre"
            onChange={(e) => setForm({ ...form, nota: e.target.value })} />
        </div>

        <button
          className="btn-primario w-full"
          disabled={!form.monto || registrar.isPending}
          onClick={() => {
            setError('')
            void registrar
              .mutateAsync({
                monto: form.monto, fechaPago: form.fechaPago, metodo: form.metodo,
                intencion: form.intencion,
                codigoTransaccion: form.codigoTransaccion || undefined,
                nota: form.nota || undefined,
              })
              .then((pago) => {
                setForm(VACIO)
                toast({
                  tipo: 'exito',
                  texto: pago.estado === 'CONFIRMADO' ? 'Pago registrado y confirmado' : 'Pago registrado. Falta que lo confirme la otra parte',
                })
                alListo()
              })
              .catch((e) => setError(mensaje(e, 'No pudimos registrar el pago')))
          }}
        >
          {registrar.isPending ? 'Registrando…' : `Registrar ${form.monto ? pesos(form.monto) : 'pago'}`}
        </button>
      </div>
    </Hoja>
  )
}

function Pagos({
  id, prestamo: p, miId, alRegistrar,
}: { id: string; prestamo: TDetalle; miId: string; alRegistrar?: () => void }) {
  const { data: pagos, isLoading } = usePagos(id)
  const confirmar = useConfirmarPago(id)
  const rechazarPago = useRechazarPago(id)
  const anular = useAnularPago(id)
  const toast = useToast()
  const [rechazando, setRechazando] = useState<Pago | null>(null)
  const [motivo, setMotivo] = useState('')
  const [erroresPago, setErroresPago] = useState<Record<string, string>>({})
  const soyPrestamista = p.rol === 'PRESTAMISTA'
  const ocupado = confirmar.isPending || rechazarPago.isPending || anular.isPending

  // Errores visibles por pago: antes las acciones fallaban en silencio y
  // parecía que el botón "no hacía nada".
  const ejecutar = (pagoId: string, accion: () => Promise<unknown>, porDefecto: string, exito: string) => {
    setErroresPago((x) => ({ ...x, [pagoId]: '' }))
    return accion()
      .then(() => toast({ tipo: 'exito', texto: exito }))
      .catch((e) => {
        setErroresPago((x) => ({ ...x, [pagoId]: mensaje(e, porDefecto) }))
        throw e
      })
  }

  if (isLoading) return <div className="space-y-3">{[0, 1].map((i) => <Esqueleto key={i} className="h-28 rounded-3xl" />)}</div>

  const pendientes = (pagos ?? []).filter((x) => x.estado === 'PENDIENTE')
  const resto = (pagos ?? []).filter((x) => x.estado !== 'PENDIENTE')

  return (
    <div className="space-y-5">
      {alRegistrar && (
        <button onClick={alRegistrar} className="btn-tonal w-full">
          <IconoMas tam={20} strokeWidth={2.4} /> Registrar un pago
        </button>
      )}

      {!pagos?.length && <p className="py-8 text-center text-[15px] text-texto-2">Todavía no hay pagos registrados.</p>}

      {pendientes.length > 0 && (
        <section>
          <h3 className="titulo-seccion">Pendientes</h3>
          <div className="space-y-3">
            {pendientes.map((pago) => {
              const esMio = pago.registradoPor === miId
              return (
                <div key={pago.id} className={`tarjeta ${esMio ? '' : 'ring-1 ring-atencion/40'}`}>
                  <CabeceraPago pago={pago} />
                  {erroresPago[pago.id] && <div className="mt-3"><Aviso tipo="error">{erroresPago[pago.id]}</Aviso></div>}
                  {esMio ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-separador pt-3">
                      <p className="text-[13px] text-texto-2">Esperando que la otra parte lo confirme.</p>
                      <button className="btn-secundario btn-chico" disabled={ocupado}
                        onClick={() => void ejecutar(pago.id, () => anular.mutateAsync(pago.id), 'No pudimos anular el pago', 'Pago anulado').catch(() => {})}>
                        Anular
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2.5">
                      <button
                        className="btn-primario" disabled={ocupado}
                        onClick={() =>
                          void ejecutar(pago.id, () => confirmar.mutateAsync({
                            pagoId: pago.id,
                            textoAutorizacion: pago.intencion === 'ABONO_CAPITAL'
                              ? `Autorizo que este pago de ${pesos(pago.monto)} se aplique directamente a capital, aunque haya intereses pendientes.`
                              : undefined,
                          }), 'No pudimos confirmar el pago', 'Pago confirmado. El saldo ya se actualizó').catch(() => {})
                        }
                      >
                        <IconoCheck tam={20} />
                        {confirmar.isPending ? 'Confirmando…'
                          : pago.intencion === 'ABONO_CAPITAL' ? 'Confirmar y autorizar abono'
                            : soyPrestamista ? 'Lo recibí' : 'Confirmo este pago'}
                      </button>
                      <button className="btn-peligro" disabled={ocupado} onClick={() => { setMotivo(''); setRechazando(pago) }}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {resto.length > 0 && (
        <section>
          <h3 className="titulo-seccion">Historial de pagos</h3>
          <div className="grupo">
            {resto.map((pago) => (
              <div key={pago.id} className="px-4 py-3.5">
                <CabeceraPago pago={pago} compacta />
                {pago.rechazo && <p className="mt-1.5 text-[13px] text-peligro">Rechazado: {pago.rechazo.motivo}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <Hoja abierta={rechazando !== null} alCerrar={() => setRechazando(null)} titulo="Rechazar el pago">
        {rechazando && (
          <div className="space-y-4">
            <p className="text-[15px] text-texto-2">
              Vas a rechazar el pago de <strong className="cifra text-texto">{pesos(rechazando.monto)}</strong> del{' '}
              {fechaLarga(rechazando.fechaPago)}. La otra parte verá tu motivo.
            </p>
            <div>
              <label className="etiqueta" htmlFor="motivo">¿Por qué lo rechazas?</label>
              <textarea id="motivo" rows={3} className="campo resize-none" value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={soyPrestamista ? 'Ese dinero no me llegó' : 'Yo no hice ese pago'} />
              <p className="ayuda">Mínimo 5 caracteres.</p>
            </div>
            <button
              className="btn-peligro w-full"
              disabled={rechazarPago.isPending || motivo.trim().length < 5}
              onClick={() =>
                void ejecutar(rechazando.id, () => rechazarPago.mutateAsync({ pagoId: rechazando.id, motivo }), 'No pudimos rechazar el pago', 'Pago rechazado')
                  .then(() => setRechazando(null)).catch(() => setRechazando(null))
              }
            >
              {rechazarPago.isPending ? 'Rechazando…' : 'Rechazar pago'}
            </button>
          </div>
        )}
      </Hoja>
    </div>
  )
}

function CabeceraPago({ pago, compacta }: { pago: Pago; compacta?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`cifra font-bold ${compacta ? 'text-[17px]' : 'text-[26px]'}`}>{pesos(pago.monto)}</p>
        <p className="text-[13px] text-texto-2">
          {fechaLarga(pago.fechaPago)} · {METODO[pago.metodo] ?? pago.metodo}
          {pago.comprobante.codigoTransaccion && ` · cód. ${pago.comprobante.codigoTransaccion}`}
        </p>
        {!compacta && (
          <p className="mt-1 text-[13px] text-texto-3">
            {INTENCION[pago.intencion] ?? pago.intencion}{pago.nota ? ` · “${pago.nota}”` : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Insignia estado={pago.estado} />
        {pago.registroPersonal && <span className="insignia bg-superficie-2 text-texto-3">Sin confirmación</span>}
      </div>
    </div>
  )
}

function Gente({ id, prestamo: p }: { id: string; prestamo: TDetalle }) {
  const invitar = useInvitarParticipante(id)
  const autorizar = useAutorizarParticipante(id)
  const revocar = useRevocarParticipante(id)
  const toast = useToast()
  const [abierta, setAbierta] = useState(false)
  const [form, setForm] = useState({
    email: '', rol: 'OBSERVADOR' as 'OBSERVADOR' | 'CODEUDOR',
    nivel: 'RESUMIDO' as 'COMPLETO' | 'RESUMIDO', solidario: false,
  })
  const visibles = p.participantes.filter((x) => x.estado !== 'REVOCADO')
  const fallo = (e: unknown) => toast({ tipo: 'error', texto: mensaje(e, 'No se pudo completar') })

  return (
    <div className="space-y-5">
      <section>
        <h3 className="titulo-seccion">Quién más ve {nombreRegistro(p, true)}</h3>
        {visibles.length === 0 ? (
          <div className="tarjeta flex items-center gap-3.5">
            <IconoEnCaja color="#0ea5e9"><IconoPersonas tam={22} /></IconoEnCaja>
            <p className="text-[15px] text-texto-2">Solo ustedes dos ven {nombreRegistro(p, true)}.</p>
          </div>
        ) : (
          <ul className="grupo">
            {visibles.map((x) => (
              <li key={x.email} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar nombre={x.email} tam={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{x.email}</p>
                    <p className="text-[13px] text-texto-2">
                      {x.rol === 'CODEUDOR' ? 'Codeudor: puede pagar y ver todo' : `Observador: ve ${x.nivel === 'COMPLETO' ? 'todo' : 'solo el estado'}`}
                      {x.estado === 'PENDIENTE_AUTORIZACION' && ` · falta ${2 - x.autorizaciones} autorización(es)`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {x.estado === 'PENDIENTE_AUTORIZACION' && (
                    <button className="btn-tonal btn-chico" onClick={() => void autorizar.mutateAsync(x.email).catch(fallo)}>Autorizar</button>
                  )}
                  <button className="btn-peligro btn-chico" onClick={() => void revocar.mutateAsync(x.email).catch(fallo)}>Quitar acceso</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mx-4 mt-2 text-[13px] text-texto-2">
          Sumar a alguien necesita el sí de las dos partes. Quitarlo lo puede hacer cualquiera por su
          cuenta: son sus datos financieros.
        </p>
      </section>

      <button className="btn-tonal w-full" onClick={() => setAbierta(true)}>
        <IconoMas tam={20} strokeWidth={2.4} /> Invitar a alguien
      </button>

      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo="Invitar a alguien">
        <div className="space-y-4">
          <div>
            <label className="etiqueta" htmlFor="emailPart">Correo</label>
            <input id="emailPart" type="email" inputMode="email" autoCapitalize="none" className="campo" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <span className="etiqueta">¿Como qué?</span>
            <div className="grid grid-cols-2 gap-2">
              {([['OBSERVADOR', 'Observador', 'Solo mira'], ['CODEUDOR', 'Codeudor', 'También puede pagar']] as const).map(([v, t, a]) => (
                <button key={v} onClick={() => setForm({ ...form, rol: v })}
                  className={`rounded-2xl p-3 text-left transition active:scale-95 ${form.rol === v ? 'bg-texto text-fondo' : 'bg-superficie-2'}`}>
                  <span className="block text-[15px] font-semibold">{t}</span>
                  <span className="text-[12px] opacity-70">{a}</span>
                </button>
              ))}
            </div>
          </div>
          {form.rol === 'OBSERVADOR' && (
            <div>
              <label className="etiqueta" htmlFor="nivelPart">¿Cuánto puede ver?</label>
              <select id="nivelPart" className="campo" value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value as typeof form.nivel })}>
                <option value="RESUMIDO">Solo si va al día o en mora</option>
                <option value="COMPLETO">Todo, incluidos los montos</option>
              </select>
            </div>
          )}
          <button
            className="btn-primario w-full"
            disabled={!form.email.includes('@') || invitar.isPending}
            onClick={() => void invitar.mutateAsync(form)
              .then(() => { setForm({ ...form, email: '' }); setAbierta(false); toast({ tipo: 'exito', texto: 'Invitación enviada' }) })
              .catch(fallo)}
          >
            {invitar.isPending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </Hoja>
    </div>
  )
}

function Historial({ id }: { id: string }) {
  const { data, isLoading } = useAuditoria(id)
  if (isLoading) return <Esqueleto className="h-60 rounded-3xl" />
  return (
    <section>
      <h3 className="titulo-seccion">Todo lo que ha pasado</h3>
      <div className="tarjeta">
        <ol className="relative">
          {data?.entradas.map((e, i) => (
            <li key={e._id} className="relative pb-5 pl-7 last:pb-0">
              {i < (data.entradas.length - 1) && <span className="absolute left-[7px] top-4 h-full w-px bg-separador" />}
              <span className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-marca bg-superficie" />
              <p className="text-[15px] leading-snug">{e.descripcion}</p>
              <p className="mt-0.5 text-[12px] text-texto-3">
                {new Date(e.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <p className="mx-4 mt-2 text-[13px] text-texto-2">Ambas partes ven exactamente este mismo historial.</p>
    </section>
  )
}
