/**
 * Inicio.
 *
 * Regla del producto: si no eres prestamista, no ves NADA de prestamista.
 * Nada de tarjetas en cero para roles que no tienes — eso hace sentir al
 * usuario que le falta algo.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, usePagosPendientes, usePrestamos } from '../api/hooks'
import type { Dashboard, ResumenPrestamo } from '../api/tipos'
import { EsqueletoPantalla, IconoEnCaja } from '../componentes/base'
import { EncabezadoApp } from '../componentes/EncabezadoApp'
import {
  IconoAlerta, IconoCalendario, IconoChevron, IconoConfirmar, IconoFlechaAbajo, IconoFlechaArriba,
  IconoGrafico, IconoMas, IconoPersonas, IconoReloj,
} from '../componentes/Iconos'
import { TarjetaInstalar } from '../componentes/Instalar'
import { TarjetaPrestamo } from '../componentes/TarjetaPrestamo'
import { fechaLarga, hoyISO, pesos } from '../lib/formato'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function hoyTexto() {
  const iso = hoyISO()
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay()
  const f = fechaLarga(iso).replace(/ de \d{4}$/, '')
  const texto = `${DIAS[d]}, ${f}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function Inicio() {
  const { data, isLoading } = useDashboard()
  const { data: pendientes } = usePagosPendientes()
  const { data: prestamos } = usePrestamos()

  const encabezado = (
    <EncabezadoApp abajo={<p className="text-[13px] font-medium text-texto-2">{hoyTexto()}</p>} />
  )

  if (isLoading || !data) {
    return <>{encabezado}<div className="mt-4"><EsqueletoPantalla /></div></>
  }

  const sinNada = !data.esPrestamista && !data.esDeudor && data.pendientesDeAceptar === 0
  const nPendientes = pendientes?.length ?? 0

  if (sinNada) {
    return (
      <>
        {encabezado}
        <div className="mt-4 space-y-4">
          <div className="hero rounded-4xl p-6 text-white">
            <p className="micro text-white/70">Bienvenido</p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight">Cuentas claras,<br />amistades largas.</h1>
            <p className="mt-3 text-[15px] text-white/85">
              Registra un préstamo o una venta a cuotas y lleva la cuenta sin discusiones: cuánto falta, cuánto es interés y
              qué pasa si abonas de más. Cada pago lo confirman las dos partes.
            </p>
            <Link to="/prestamos/nuevo" className="btn mt-5 w-full bg-white text-[#1f6a63]">
              <IconoMas tam={20} strokeWidth={2.4} /> Registrar un préstamo o venta
            </Link>
          </div>
          <div className="tarjeta text-[15px] text-texto-2">
            <p className="font-semibold text-texto">¿Te prestaron a ti?</p>
            Pídele a quien te prestó que lo registre con tu correo. Te llegará una invitación para
            revisar las condiciones antes de aceptar.
          </div>
          <TarjetaInstalar />
        </div>
      </>
    )
  }

  const activos = (prestamos ?? []).filter((p) => p.estado === 'ACTIVO')
  const recientes = [...(prestamos ?? [])]
    .filter((p) => !['RECHAZADO', 'CANCELADO'].includes(p.estado))
    .sort((a, b) => Number(b.estado === 'ACTIVO') - Number(a.estado === 'ACTIVO') || b.creadoEn.localeCompare(a.creadoEn))
    .slice(0, 3)

  return (
    <>
      {encabezado}
      <div className="mt-3 space-y-5">
        <Hero data={data} activos={activos} />

        {nPendientes > 0 && (
          <Link to="/pagos" className="tarjeta presionable flex items-center gap-3.5 ring-1 ring-atencion/40">
            <IconoEnCaja color="#e8930c"><IconoConfirmar tam={24} /></IconoEnCaja>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">
                {nPendientes === 1 ? 'Un pago espera tu confirmación' : `${nPendientes} pagos esperan tu confirmación`}
              </p>
              <p className="text-[13px] text-texto-2">No cuentan en el saldo hasta que los confirmes.</p>
            </div>
            <IconoChevron tam={18} className="text-texto-3" />
          </Link>
        )}

        {data.esDeudor && data.debo.proximaCuota && <ProximaCuota c={data.debo.proximaCuota} />}

        <section>
          <h2 className="mb-3 text-[20px] font-bold tracking-tight">Vista rápida</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.esPrestamista && (
              <Mosaico
                color="#3b82f6" icono={<IconoGrafico tam={22} />}
                etiqueta="Intereses por cobrar" valor={pesos(data.presté.interesesPorCobrar)} cifra
              />
            )}
            {data.esDeudor && (
              <Mosaico
                color="#8b5cf6" icono={<IconoCalendario tam={22} />}
                etiqueta="Intereses pendientes" valor={pesos(data.debo.intereses)} cifra
              />
            )}
            <Mosaico
              color="#e8930c" icono={<IconoReloj tam={22} />} a="/pagos"
              etiqueta="Por confirmar" valor={nPendientes === 0 ? 'Nada' : String(nPendientes)}
            />
            {data.esPrestamista && (
              <Mosaico
                color={data.presté.enMora > 0 ? '#e5484d' : '#1e8458'}
                icono={data.presté.enMora > 0 ? <IconoAlerta tam={22} /> : <IconoConfirmar tam={22} />}
                etiqueta="En mora"
                valor={data.presté.enMora > 0 ? `${data.presté.enMora} · ${pesos(data.presté.moraPorCobrar)}` : 'Todos al día'}
              />
            )}
            {data.esDeudor && (
              <Mosaico
                color={data.debo.mora > 0 ? '#e5484d' : '#1e8458'}
                icono={data.debo.mora > 0 ? <IconoAlerta tam={22} /> : <IconoConfirmar tam={22} />}
                etiqueta="Tu mora" valor={data.debo.mora > 0 ? pesos(data.debo.mora) : 'Vas al día'} cifra={data.debo.mora > 0}
              />
            )}
            {data.pendientesDeAceptar > 0 && (
              <Mosaico
                color="#0ea5e9" icono={<IconoPersonas tam={22} />} a="/prestamos"
                etiqueta="Sin aceptar" valor={`${data.pendientesDeAceptar} por aceptar`}
              />
            )}
          </div>
        </section>

        {recientes.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[20px] font-bold tracking-tight">Tus cuentas</h2>
              <Link to="/prestamos" className="enlace text-[15px]">Ver todos</Link>
            </div>
            <div className="space-y-3">
              {recientes.map((p) => <TarjetaPrestamo key={p.id} p={p} />)}
            </div>
          </section>
        )}

        <TarjetaInstalar />
      </div>
    </>
  )
}

/** La tarjeta grande: lo que la persona quiere saber al abrir la app. */
function Hero({ data, activos }: { data: Dashboard; activos: ResumenPrestamo[] }) {
  const meDeben = data.presté.capitalColocado + data.presté.interesesPorCobrar + data.presté.moraPorCobrar
  const debo = data.debo.capital + data.debo.intereses + data.debo.mora
  const ambos = data.esPrestamista && data.esDeudor

  const mios = activos.filter((p) => (data.esPrestamista && !ambos ? p.rol === 'PRESTAMISTA' : ambos ? true : p.rol === 'DEUDOR'))
  const principal = mios.reduce((s, p) => s + p.montoPrincipal, 0)
  const pendiente = mios.reduce((s, p) => s + p.saldo.capital, 0)
  const avance = principal > 0 ? Math.max(0, Math.min(1, 1 - pendiente / principal)) : 0

  const titulo = ambos ? 'Tu posición neta' : data.esPrestamista ? 'Te deben' : 'Debes'
  const valor = ambos ? data.posicionNeta : data.esPrestamista ? meDeben : debo
  const etiquetaAvance = data.esPrestamista && !ambos ? 'Recuperado' : 'Pagado'

  return (
    <div className="hero relative overflow-hidden rounded-4xl p-5 text-white">
      <p className="text-[15px] font-medium text-white/85">{titulo}</p>
      <p className="cifra mt-1 text-[40px] font-bold leading-none tracking-tight">
        {ambos && valor > 0 ? '+' : ''}{pesos(valor)}
      </p>
      {ambos && (
        <p className="mt-1.5 text-[13px] text-white/75">
          {valor >= 0 ? 'Te deben más de lo que debes.' : 'Debes más de lo que te deben.'}
        </p>
      )}

      {!ambos && (
        <div className="mt-4 flex items-center justify-between">
          <span className="micro text-white/65">{data.esPrestamista ? 'Intereses por cobrar' : 'Intereses pendientes'}</span>
          <span className="cifra text-[15px] font-semibold text-[#a7f3d0]">
            {pesos(data.esPrestamista ? data.presté.interesesPorCobrar : data.debo.intereses)}
          </span>
        </div>
      )}

      {principal > 0 && !ambos && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between">
            <span className="micro text-white/65">{etiquetaAvance}</span>
            <span className="micro text-white/90">{Math.round(avance * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#67e8f9] transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.max(avance * 100, 2)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {ambos ? (
          <>
            <SubTarjeta etiqueta="Te deben" icono={<IconoFlechaAbajo tam={14} />} tono="#a7f3d0" valor={pesos(meDeben)} />
            <SubTarjeta etiqueta="Debes" icono={<IconoFlechaArriba tam={14} />} tono="#fecaca" valor={pesos(debo)} />
          </>
        ) : data.esPrestamista ? (
          <>
            <SubTarjeta etiqueta="Prestado" icono={<IconoFlechaArriba tam={14} />} tono="#a7f3d0" valor={pesos(data.presté.capitalColocado)} />
            <SubTarjeta etiqueta="Activos" icono={<IconoGrafico tam={14} />} tono="#bae6fd" valor={String(data.presté.cantidad)} sinCifra />
          </>
        ) : (
          <>
            <SubTarjeta etiqueta="Capital" icono={<IconoFlechaAbajo tam={14} />} tono="#fecaca" valor={pesos(data.debo.capital)} />
            <SubTarjeta etiqueta="Activas" icono={<IconoGrafico tam={14} />} tono="#bae6fd" valor={String(data.debo.cantidad)} sinCifra />
          </>
        )}
      </div>
    </div>
  )
}

function SubTarjeta({
  etiqueta, valor, icono, tono, sinCifra,
}: { etiqueta: string; valor: string; icono: ReactNode; tono: string; sinCifra?: boolean }) {
  return (
    <div className="vidrio-claro rounded-3xl p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15" style={{ color: tono }}>{icono}</span>
        <span className="micro text-white/75">{etiqueta}</span>
      </div>
      <p className={`${sinCifra ? '' : 'cifra'} mt-2 truncate text-[21px] font-bold`}>{valor}</p>
    </div>
  )
}

function ProximaCuota({ c }: { c: NonNullable<Dashboard['debo']['proximaCuota']> }) {
  const abierta = c.diasParaLaVentana <= 0
  const corta = (iso: string) => fechaLarga(iso).replace(/ de \d{4}$/, '')
  return (
    <div className="tarjeta">
      <div className="flex items-center gap-3">
        <IconoEnCaja color="#1e8458"><IconoCalendario tam={22} /></IconoEnCaja>
        <p className="flex-1 text-[17px] font-semibold">Tu próxima cuota</p>
        <span className={`insignia ${abierta ? 'bg-exito-suave text-exito' : 'bg-superficie-2 text-texto-2'}`}>
          {abierta ? 'Ventana abierta' : `En ${c.diasParaLaVentana} día${c.diasParaLaVentana === 1 ? '' : 's'}`}
        </span>
      </div>
      <p className="cifra mt-3 text-[32px] font-bold text-exito">{pesos(c.monto)}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-separador pt-3">
        <p className="text-[14px] text-texto-2">Del {corta(c.ventanaInicio)} al {corta(c.ventanaFin)}</p>
        <Link className="btn-primario btn-chico" to={`/prestamos/${c.loanId}?pestana=pagos`}>Registrar pago</Link>
      </div>
    </div>
  )
}

function Mosaico({
  color, icono, etiqueta, valor, a, cifra,
}: { color: string; icono: ReactNode; etiqueta: string; valor: string; a?: string; cifra?: boolean }) {
  const contenido = (
    <>
      <div className="flex items-start justify-between">
        <IconoEnCaja color={color}>{icono}</IconoEnCaja>
        {a && <IconoChevron tam={16} className="text-texto-3" />}
      </div>
      <p className="mt-3 text-[13px] text-texto-2">{etiqueta}</p>
      <p className={`${cifra ? 'cifra' : ''} mt-0.5 truncate text-[19px] font-bold`}>{valor}</p>
    </>
  )
  return a
    ? <Link to={a} className="tarjeta presionable block">{contenido}</Link>
    : <div className="tarjeta">{contenido}</div>
}
