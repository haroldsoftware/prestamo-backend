import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePagosPendientes, useYo } from '../api/hooks'
import { useVerificarMotor } from '../hooks/verificarMotor'
import { actualizarAhora, alHaberActualizacion } from '../pwa/registro'
import { Aviso } from './base'
import {
  IconoActualizar, IconoConfirmar, IconoCuenta, IconoInicio, IconoMas, IconoPrestamos,
} from './Iconos'

/** Avisos de toda la app (correo sin confirmar, motor distinto) que cada pantalla pinta bajo su título. */
const AvisosGlobales = createContext<ReactNode>(null)
export const useAvisosGlobales = () => useContext(AvisosGlobales)

export function Layout() {
  const ubicacion = useLocation()
  const { data: pendientes } = usePagosPendientes()
  const { data: yo } = useYo()
  const motor = useVerificarMotor()
  const [hayVersion, setHayVersion] = useState(false)
  useEffect(() => alHaberActualizacion(setHayVersion), [])

  // Cada pantalla empieza arriba, como en una app.
  useEffect(() => { window.scrollTo(0, 0) }, [ubicacion.pathname])

  const avisos = (
    (motor.estado === 'divergente' || (yo && !yo.emailVerificado)) ? (
            <div className="mt-4 space-y-3">
              {motor.estado === 'divergente' && (
                <Aviso tipo="error" titulo="Las cifras podrían no ser confiables">
                  El motor de cálculo de la app y el del servidor no son la misma versión
                  ({motor.local} vs. {motor.remoto}). Avísale a quien mantiene el sistema antes de
                  tomar decisiones con esto.
                </Aviso>
              )}
              {yo && !yo.emailVerificado && (
                <Aviso tipo="atencion" titulo="Falta confirmar tu correo">
                  Te enviamos un enlace al registrarte. Sin confirmarlo no puedes aceptar préstamos o ventas
                  ni registrar o confirmar pagos.
                </Aviso>
              )}
            </div>
          ) : null
  )

  // Los flujos de "crear" se sienten modales: sin barra de pestañas.
  const sinTabs = ubicacion.pathname === '/prestamos/nuevo'

  return (
    <div className="min-h-[100dvh]">
      <JalarParaActualizar />

      <main className={`mx-auto max-w-2xl px-4 ${sinTabs ? 'pb-[calc(env(safe-area-inset-bottom)+110px)]' : 'pb-tabbar'}`}>
        <div key={ubicacion.pathname} className="animate-entrada">
          <AvisosGlobales.Provider value={avisos}>
            <Outlet />
          </AvisosGlobales.Provider>
        </div>
      </main>

      {hayVersion && (
        <div
          className="fixed inset-x-0 z-40 flex justify-center px-4"
          style={{ bottom: `calc(${sinTabs ? '0px' : 'var(--altura-tabbar)'} + env(safe-area-inset-bottom) + 12px)` }}
        >
          <button
            onClick={actualizarAhora}
            className="vidrio flex animate-aviso items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold text-marca shadow-lg ring-1 ring-separador active:scale-95"
          >
            <IconoActualizar tam={18} /> Hay una versión nueva · Actualizar
          </button>
        </div>
      )}

      {!sinTabs && <BarraPestanas pendientes={pendientes?.length ?? 0} />}
    </div>
  )
}

function BarraPestanas({ pendientes }: { pendientes: number }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      aria-label="Principal"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        {/* Píldora flotante con las secciones */}
        <div className="vidrio-barra grid h-[var(--altura-tabbar)] flex-1 grid-cols-4 items-center gap-1 rounded-full p-1.5">
          <Pestana a="/" texto="Inicio" exacto icono={<IconoInicio />} />
          <Pestana a="/prestamos" texto="Cuentas" icono={<IconoPrestamos />} />
          <Pestana a="/pagos" texto="Confirmar" icono={<IconoConfirmar />} contador={pendientes} />
          <Pestana a="/cuenta" texto="Cuenta" icono={<IconoCuenta />} />
        </div>
        {/* Acción principal, separada como el botón de búsqueda de iOS */}
        <NavLink
          to="/prestamos/nuevo"
          className="flex h-[var(--altura-tabbar)] w-[var(--altura-tabbar)] shrink-0 items-center justify-center rounded-full bg-marca-solido text-marca-sobre shadow-lg shadow-marca/30 transition active:scale-90"
          aria-label="Registrar un préstamo o una venta"
        >
          <IconoMas tam={28} strokeWidth={2.4} />
        </NavLink>
      </div>
    </nav>
  )
}

function Pestana({
  a, texto, icono, exacto, contador,
}: {
  a: string; texto: string; icono: ReactNode; exacto?: boolean; contador?: number
}) {
  const ubicacion = useLocation()
  // "Préstamos" queda activa dentro de un préstamo, pero no en "nuevo".
  const activaManual = a === '/prestamos'
    ? ubicacion.pathname.startsWith('/prestamos') && ubicacion.pathname !== '/prestamos/nuevo'
    : undefined
  return (
    <NavLink
      to={a}
      end={exacto}
      className={({ isActive }) => {
        const activa = activaManual ?? isActive
        return `relative flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition duration-200 active:scale-90 ${
          activa ? 'bg-texto/[0.07] text-marca' : 'text-texto'
        }`
      }}
    >
      <span className="relative">
        {icono}
        {contador ? (
          <span
            key={contador}
            className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] animate-rebote items-center justify-center rounded-full bg-peligro px-1 text-[11px] font-bold text-white ring-2 ring-superficie"
          >
            {contador}
          </span>
        ) : null}
      </span>
      {texto}
    </NavLink>
  )
}

/**
 * "Jalar para actualizar". Instalada en el iPhone, la app no tiene botón de
 * recargar: sin esto no habría forma de traer un pago recién registrado.
 */
function JalarParaActualizar() {
  const qc = useQueryClient()
  const [distancia, setDistancia] = useState(0)
  const [cargando, setCargando] = useState(false)
  const inicio = useRef<number | null>(null)
  const UMBRAL = 72

  useEffect(() => {
    const alTocar = (e: TouchEvent) => {
      if (window.scrollY > 0 || cargando || document.body.style.overflow === 'hidden') return
      inicio.current = e.touches[0]!.clientY
    }
    const alMover = (e: TouchEvent) => {
      if (inicio.current === null) return
      const d = e.touches[0]!.clientY - inicio.current
      if (d <= 0 || window.scrollY > 0) { setDistancia(0); return }
      // Resistencia: cuanto más se jala, menos avanza.
      setDistancia(Math.min(120, d * 0.5))
    }
    const alSoltar = () => {
      if (inicio.current === null) return
      inicio.current = null
      setDistancia((d) => {
        if (d >= UMBRAL) {
          setCargando(true)
          void qc.refetchQueries({ type: 'active' }).finally(() => {
            window.setTimeout(() => setCargando(false), 350)
          })
        }
        return 0
      })
    }
    window.addEventListener('touchstart', alTocar, { passive: true })
    window.addEventListener('touchmove', alMover, { passive: true })
    window.addEventListener('touchend', alSoltar)
    return () => {
      window.removeEventListener('touchstart', alTocar)
      window.removeEventListener('touchmove', alMover)
      window.removeEventListener('touchend', alSoltar)
    }
  }, [qc, cargando])

  const visible = cargando || distancia > 4
  const progreso = Math.min(1, distancia / UMBRAL)
  const y = cargando ? 56 : distancia

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(calc(env(safe-area-inset-top) + ${y - 40}px))`,
        opacity: visible ? 1 : 0,
        transition: inicio.current === null ? 'transform 250ms ease, opacity 200ms' : 'none',
      }}
      aria-hidden={!visible}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-superficie shadow-md ring-1 ring-separador">
        <IconoActualizar
          tam={20}
          className={`text-marca ${cargando ? 'animate-spin' : ''}`}
          style={{ transform: cargando ? undefined : `rotate(${progreso * 270}deg)`, opacity: 0.4 + progreso * 0.6 }}
        />
      </div>
      {cargando && <span className="sr-only" role="status">Actualizando</span>}
    </div>
  )
}
