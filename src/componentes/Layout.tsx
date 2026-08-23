import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePagosPendientes, useYo } from '../api/hooks'
import { useSesion } from '../hooks/sesion'
import { useVerificarMotor } from '../hooks/verificarMotor'
import { Aviso } from './base'

export function Layout() {
  const { usuario, salir } = useSesion()
  const navegar = useNavigate()
  const { data: pendientes } = usePagosPendientes()
  const { data: yo } = useYo()
  const motor = useVerificarMotor()

  const enlaces = [
    { a: '/', texto: 'Inicio', exacto: true },
    { a: '/prestamos', texto: 'Préstamos' },
    { a: '/pagos', texto: 'Por confirmar', contador: pendientes?.length },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-marca-700">Préstamos</NavLink>
          <nav className="flex flex-1 gap-1" aria-label="Principal">
            {enlaces.map((e) => (
              <NavLink
                key={e.a}
                to={e.a}
                end={e.exacto}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {e.texto}
                {e.contador ? (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {e.contador}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{usuario?.nombreCompleto}</span>
            <button
              className="text-sm text-slate-500 underline hover:text-slate-800"
              onClick={() => void salir().then(() => navegar('/entrar'))}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {motor.estado === 'divergente' && (
          <div className="mb-5">
            <Aviso tipo="error" titulo="Las cifras podrían no ser confiables">
              El motor de cálculo de esta página y el del servidor no son la misma versión
              ({motor.local} vs. {motor.remoto}). Puede que veas números que no coinciden con tu
              saldo real. Avísale a quien mantiene el sistema antes de tomar decisiones con esto.
            </Aviso>
          </div>
        )}

        {yo && !yo.emailVerificado && (
          <div className="mb-5">
            <Aviso tipo="atencion" titulo="Falta confirmar tu correo">
              Te enviamos un enlace cuando te registraste. Necesitas confirmarlo para aceptar
              préstamos o registrar pagos — sin eso, lo que aceptes no sirve como prueba.
            </Aviso>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-400">
        Esta herramienta lleva el registro de préstamos entre personas. No mueve dinero, no es
        una entidad vigilada por la Superintendencia Financiera y no intermedia en los acuerdos.
      </footer>
    </div>
  )
}
