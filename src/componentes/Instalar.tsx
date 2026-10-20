/**
 * Invitación a instalar la app en la pantalla de inicio.
 *
 * En iPhone no hay botón de instalar: hay que hacerlo desde el menú Compartir
 * de Safari. Se explica con los mismos íconos que verá la persona.
 */
import { useEffect, useState } from 'react'
import {
  alPoderInstalar, almacen, esAppInstalada, esIOS, esSafariIOS, instalarNativo,
} from '../pwa/registro'
import { Hoja } from './base'
import { IconoAgregarInicio, IconoCerrar, IconoCompartir } from './Iconos'

const CLAVE_DESCARTE = 'cc:instalar-descartado'

export function useInstalacion() {
  const [puedeNativo, setPuedeNativo] = useState(false)
  useEffect(() => alPoderInstalar(setPuedeNativo), [])
  const instalada = esAppInstalada()
  return {
    instalada,
    ios: esIOS(),
    disponible: !instalada && (esIOS() || puedeNativo),
    puedeNativo,
  }
}

/** Tarjeta para Inicio. Se puede descartar y no vuelve a salir. */
export function TarjetaInstalar() {
  const { disponible } = useInstalacion()
  const [descartada, setDescartada] = useState(() => almacen.leer(CLAVE_DESCARTE) === '1')
  const [abierta, setAbierta] = useState(false)
  if (!disponible || descartada) return null

  return (
    <>
      <div className="tarjeta relative flex items-center gap-3.5">
        <img src="/apple-touch-icon.png" alt="" className="h-12 w-12 rounded-[13px] shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Ten Cuentas Claras a un toque</p>
          <p className="text-[13px] text-texto-2">Agrégala a tu pantalla de inicio como una app.</p>
        </div>
        <button className="btn-tonal btn-chico shrink-0" onClick={() => setAbierta(true)}>Instalar</button>
        <button
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-superficie-2 text-texto-3 ring-2 ring-fondo"
          aria-label="No mostrar más"
          onClick={() => { almacen.guardar(CLAVE_DESCARTE, '1'); setDescartada(true) }}
        >
          <IconoCerrar tam={12} />
        </button>
      </div>
      <HojaInstalar abierta={abierta} alCerrar={() => setAbierta(false)} />
    </>
  )
}

export function HojaInstalar({ abierta, alCerrar }: { abierta: boolean; alCerrar(): void }) {
  const { ios, puedeNativo } = useInstalacion()

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Instalar en tu teléfono">
      {ios ? (
        <div className="space-y-4">
          {!esSafariIOS() && (
            <p className="rounded-2xl bg-atencion-suave px-4 py-3 text-[15px]">
              Abre esta página en <strong>Safari</strong>: en el iPhone solo Safari puede agregarla
              a la pantalla de inicio.
            </p>
          )}
          <ol className="grupo">
            <Paso n={1} icono={<IconoCompartir tam={22} className="text-[#0a84ff]" />}>
              Toca <strong>Compartir</strong> en la barra de Safari (abajo, o arriba en iPad).
            </Paso>
            <Paso n={2} icono={<IconoAgregarInicio tam={22} />}>
              Desliza y elige <strong>Agregar a inicio</strong>.
            </Paso>
            <Paso n={3} icono={<img src="/apple-touch-icon.png" alt="" className="h-6 w-6 rounded-md" />}>
              Toca <strong>Agregar</strong>. Ábrela desde el ícono y listo: pantalla completa, sin
              barras del navegador.
            </Paso>
          </ol>
          <p className="px-1 text-[13px] text-texto-2">
            Tu sesión queda guardada en el teléfono: no tendrás que entrar cada vez.
          </p>
        </div>
      ) : puedeNativo ? (
        <div className="space-y-4">
          <p className="text-[15px] text-texto-2">
            Se instala como una app más: con ícono, en pantalla completa y sin ocupar casi espacio.
          </p>
          <button className="btn-primario w-full" onClick={() => void instalarNativo().then(alCerrar)}>
            Instalar Cuentas Claras
          </button>
        </div>
      ) : (
        <p className="text-[15px] text-texto-2">
          Abre el menú de tu navegador y elige <strong>Instalar app</strong> o{' '}
          <strong>Agregar a la pantalla de inicio</strong>.
        </p>
      )}
    </Hoja>
  )
}

function Paso({ n, icono, children }: { n: number; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie-2">{icono}</span>
      <p className="text-[15px] leading-snug">
        <span className="mr-1 font-semibold text-texto-3">{n}.</span>
        {children}
      </p>
    </li>
  )
}
