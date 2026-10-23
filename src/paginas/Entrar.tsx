import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../hooks/sesion'
import { Aviso } from '../componentes/base'
import { BotonGoogle, SeparadorO } from '../componentes/BotonGoogle'
import { CampoContrasena } from '../componentes/CampoContrasena'
import { MarcoAuth } from '../componentes/MarcoAuth'

export function Entrar() {
  const { entrar } = useSesion()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const destino = params.get('destino') ?? '/'

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await entrar(email, password)
      navegar(destino, { replace: true })
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos iniciar tu sesión')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MarcoAuth titulo="Entra a tu cuenta" subtitulo="Lleva la cuenta de lo que prestas y lo que debes.">
      <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <BotonGoogle destino={destino} texto="signin_with" onError={setError} />
        <SeparadorO />
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input
            id="email" type="email" inputMode="email" autoCapitalize="none" className="campo" value={email} required
            autoComplete="email" onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <CampoContrasena
            id="password" value={password} required
            autoComplete="current-password" onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <Link className="enlace block text-center text-[15px]" to="/recuperar">Olvidé mi contraseña</Link>
      </form>
      <p className="mt-6 text-center text-[15px] text-texto-2">
        ¿Primera vez? <Link className="enlace" to="/registro">Crea tu cuenta</Link>
      </p>
    </MarcoAuth>
  )
}
