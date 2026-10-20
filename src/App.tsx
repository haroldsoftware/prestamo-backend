import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Layout } from './componentes/Layout'
import { Cargando } from './componentes/base'
import { Cuenta } from './paginas/Cuenta'
import { useSesion } from './hooks/sesion'
import { DetallePrestamo } from './paginas/DetallePrestamo'
import { Entrar } from './paginas/Entrar'
import { Inicio } from './paginas/Inicio'
import { Invitacion } from './paginas/Invitacion'
import { NuevoPrestamo } from './paginas/NuevoPrestamo'
import { PagosPendientes } from './paginas/PagosPendientes'
import { Prestamos } from './paginas/Prestamos'
import { Recuperar, Restablecer, VerificarEmail } from './paginas/Recuperar'
import { Registro } from './paginas/Registro'
import { Simulador } from './paginas/Simulador'

/** Guarda de rutas. Recuerda a dónde iba el usuario para volver tras entrar. */
function Privada({ children }: { children: ReactElement }) {
  const { usuario, cargando } = useSesion()
  const ubicacion = useLocation()
  if (cargando) return <Cargando texto="Un momento…" />
  if (!usuario) {
    return <Navigate to={`/entrar?destino=${encodeURIComponent(ubicacion.pathname)}`} replace />
  }
  return children
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/restablecer" element={<Restablecer />} />
      <Route path="/verificar-email" element={<VerificarEmail />} />
      <Route path="/invitacion/:codigo" element={<Invitacion />} />

      <Route element={<Privada><Layout /></Privada>}>
        <Route index element={<Inicio />} />
        <Route path="prestamos" element={<Prestamos />} />
        <Route path="prestamos/nuevo" element={<NuevoPrestamo />} />
        <Route path="prestamos/:id" element={<DetallePrestamo />} />
        <Route path="prestamos/:id/simular" element={<Simulador />} />
        <Route path="pagos" element={<PagosPendientes />} />
        <Route path="cuenta" element={<Cuenta />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
