import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, ErrorApi } from '../api/cliente'
import { Aviso } from '../componentes/base'
import { MarcoAuth } from '../componentes/MarcoAuth'

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [listo, setListo] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    await api('/auth/recuperar', { metodo: 'POST', cuerpo: { email }, sinReintento: true }).catch(() => {})
    setListo(true)
  }

  return (
    <MarcoAuth titulo="Recupera tu contraseña" subtitulo="Te enviamos un enlace para crear una nueva.">
      {listo ? (
        <div className="tarjeta space-y-4 p-5">
          <Aviso tipo="exito">
            Si ese correo tiene una cuenta, te enviamos instrucciones. El enlace vence en una hora.
          </Aviso>
          <Link className="btn-secundario mt-4 w-full" to="/entrar">Volver</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
          <div>
            <label className="etiqueta" htmlFor="email">Tu correo</label>
            <input
              id="email" type="email" inputMode="email" autoCapitalize="none" className="campo" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn-primario w-full">Enviar instrucciones</button>
          <p className="text-center text-sm">
            <Link className="enlace" to="/entrar">Volver a entrar</Link>
          </p>
        </form>
      )}
    </MarcoAuth>
  )
}

export function Restablecer() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const token = params.get('token') ?? ''

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api('/auth/restablecer', { metodo: 'POST', cuerpo: { token, password }, sinReintento: true })
      navegar('/entrar', { replace: true })
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos cambiar tu contraseña')
    }
  }

  return (
    <MarcoAuth titulo="Crea una contraseña nueva">
      <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña nueva</label>
          <input
            id="password" type="password" className="campo" required minLength={10}
            autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <p className="ayuda">
            Al cambiarla cerramos todas tus sesiones abiertas, por si alguien más entró.
          </p>
        </div>
        <button className="btn-primario w-full">Cambiar contraseña</button>
      </form>
    </MarcoAuth>
  )
}

export function VerificarEmail() {
  const [params] = useSearchParams()
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'error'>('verificando')

  useState(() => {
    void api('/auth/verificar-email', {
      metodo: 'POST', cuerpo: { token: params.get('token') ?? '' }, sinReintento: true,
    })
      .then(() => setEstado('ok'))
      .catch(() => setEstado('error'))
  })

  return (
    <MarcoAuth titulo="Confirmación de correo">
      <div className="tarjeta p-5 text-center">
        {estado === 'verificando' && <p>Confirmando tu correo…</p>}
        {estado === 'ok' && (
          <>
            <h1 className="text-xl font-bold text-exito">Correo confirmado</h1>
            <p className="mt-2 text-texto-2">Ya puedes aceptar préstamos y registrar pagos.</p>
            <Link className="btn-primario mt-5 w-full" to="/entrar">Entrar</Link>
          </>
        )}
        {estado === 'error' && (
          <>
            <h1 className="text-xl font-bold text-peligro">El enlace no sirve</h1>
            <p className="mt-2 text-texto-2">Puede que ya lo hayas usado o que haya vencido.</p>
            <Link className="btn-secundario mt-5 w-full" to="/entrar">Volver</Link>
          </>
        )}
      </div>
    </MarcoAuth>
  )
}
