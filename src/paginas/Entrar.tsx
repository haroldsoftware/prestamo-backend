import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../hooks/sesion'
import { Aviso } from '../componentes/base'

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
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Entra a tu cuenta</h1>
      <p className="mt-1 text-slate-600">Lleva la cuenta de lo que prestas y lo que debes.</p>

      <form onSubmit={enviar} className="tarjeta mt-6 space-y-4">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input
            id="email" type="email" className="campo" value={email} required autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" className="campo" value={password} required
            autoComplete="current-password" onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="flex justify-between text-sm">
          <Link className="text-marca-700 hover:underline" to="/recuperar">Olvidé mi contraseña</Link>
          <Link className="text-marca-700 hover:underline" to="/registro">Crear cuenta</Link>
        </div>
      </form>
    </div>
  )
}
