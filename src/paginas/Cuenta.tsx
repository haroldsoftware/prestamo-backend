import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useYo } from '../api/hooks'
import { Avatar } from '../componentes/base'
import { HojaInstalar, useInstalacion } from '../componentes/Instalar'
import {
  IconoAgregarInicio, IconoChevron, IconoCorreo, IconoEscudo, IconoSalir,
} from '../componentes/Iconos'
import { Pantalla } from '../componentes/Pantalla'
import { alternarMontos, useMontosOcultos } from '../hooks/privacidad'
import { useSesion } from '../hooks/sesion'

export function Cuenta() {
  const { usuario, salir } = useSesion()
  const { data: yo } = useYo()
  const navegar = useNavigate()
  const instalacion = useInstalacion()
  const [instalar, setInstalar] = useState(false)
  const oculto = useMontosOcultos()
  const nombre = yo?.nombreCompleto ?? usuario?.nombreCompleto ?? ''

  return (
    <Pantalla titulo="Cuenta">
      <div className="space-y-6">
        <div className="tarjeta flex items-center gap-4">
          <Avatar nombre={nombre || '?'} tam={60} />
          <div className="min-w-0">
            <p className="truncate text-[19px] font-semibold">{nombre}</p>
            <p className="truncate text-[15px] text-texto-2">{yo?.email ?? usuario?.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {yo?.emailVerificado
                ? <span className="insignia bg-exito-suave text-exito">Correo confirmado</span>
                : <span className="insignia bg-atencion-suave text-atencion">Correo sin confirmar</span>}
              {yo?.esPrestamista && <span className="insignia bg-superficie-2 text-texto-2">Prestas</span>}
              {yo?.esDeudor && <span className="insignia bg-superficie-2 text-texto-2">Debes</span>}
            </div>
          </div>
        </div>

        <section>
          <h2 className="titulo-seccion">Preferencias</h2>
          <div className="grupo">
            <label className="flex min-h-[52px] items-center gap-3.5 px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5e5ce6] text-white">
                <IconoEscudo tam={18} />
              </span>
              <span className="flex-1 text-[16px]">Ocultar montos</span>
              <Interruptor activo={oculto} onCambio={alternarMontos} etiqueta="Ocultar montos" />
            </label>
            {!instalacion.instalada && (
              <button className="flex min-h-[52px] w-full items-center gap-3.5 px-4 text-left active:bg-superficie-2" onClick={() => setInstalar(true)}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-solido text-white">
                  <IconoAgregarInicio tam={18} />
                </span>
                <span className="flex-1 text-[16px]">Agregar a la pantalla de inicio</span>
                <IconoChevron tam={16} className="text-texto-3" />
              </button>
            )}
            {yo && !yo.emailVerificado && (
              <div className="flex min-h-[52px] items-center gap-3.5 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff9f0a] text-white">
                  <IconoCorreo tam={18} />
                </span>
                <span className="flex-1 text-[15px] text-texto-2">
                  Busca en tu correo el enlace de confirmación. Sin él no puedes aceptar préstamos ni
                  confirmar pagos.
                </span>
              </div>
            )}
          </div>
          <p className="mx-4 mt-2 text-[13px] text-texto-2">
            Con los montos ocultos puedes abrir la app frente a otras personas sin mostrar cifras.
          </p>
        </section>

        <section>
          <div className="grupo">
            <button
              className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 text-[16px] font-semibold text-peligro active:bg-superficie-2"
              onClick={() => void salir().then(() => navegar('/entrar'))}
            >
              <IconoSalir tam={20} /> Cerrar sesión
            </button>
          </div>
        </section>

        <footer className="space-y-2 px-4 text-center text-[12px] leading-relaxed text-texto-3">
          <p className="font-semibold text-texto-2">Cuentas claras, amistades largas.</p>
          <p>
            Esta herramienta lleva el registro de préstamos entre personas. No mueve dinero, no es
            una entidad vigilada por la Superintendencia Financiera y no intermedia en los acuerdos.
          </p>
        </footer>
      </div>
      <HojaInstalar abierta={instalar} alCerrar={() => setInstalar(false)} />
    </Pantalla>
  )
}

function Interruptor({ activo, onCambio, etiqueta }: { activo: boolean; onCambio(): void; etiqueta: string }) {
  return (
    <button
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={(e) => { e.preventDefault(); onCambio() }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${activo ? 'bg-[#34c759]' : 'bg-superficie-2 ring-1 ring-separador'}`}
    >
      <span
        className={`absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200 ${activo ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
      />
    </button>
  )
}
