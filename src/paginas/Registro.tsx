import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ErrorApi } from '../api/cliente'
import { Aviso } from '../componentes/base'

export function Registro() {
  const [datos, setDatos] = useState({ nombreCompleto: '', email: '', password: '' })
  const [estado, setEstado] = useState<'form' | 'enviando' | 'listo'>('form')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEstado('enviando')
    try {
      await api('/auth/registro', { metodo: 'POST', cuerpo: datos, sinReintento: true })
      setEstado('listo')
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos crear tu cuenta')
      setEstado('form')
    }
  }

  if (estado === 'listo') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="tarjeta">
          <h1 className="text-xl font-bold">Revisa tu correo</h1>
          <p className="mt-2 text-slate-600">
            Si <strong>{datos.email}</strong> estaba disponible, te enviamos un enlace para
            confirmarlo. El enlace vence en 48 horas.
          </p>
          <Link className="btn-primario mt-5 w-full" to="/entrar">Ir a entrar</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
      <form onSubmit={enviar} className="tarjeta mt-6 space-y-4">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div>
          <label className="etiqueta" htmlFor="nombre">Tu nombre completo</label>
          <input
            id="nombre" className="campo" required minLength={3} autoComplete="name"
            value={datos.nombreCompleto}
            onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })}
          />
          <p className="ayuda">Como aparece en tu cédula: es lo que verá la otra parte.</p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input
            id="email" type="email" className="campo" required autoComplete="email"
            value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })}
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" className="campo" required minLength={10}
            autoComplete="new-password" value={datos.password}
            onChange={(e) => setDatos({ ...datos, password: e.target.value })}
          />
          <p className="ayuda">Mínimo 10 caracteres.</p>
        </div>
        <button className="btn-primario w-full" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm">
          ¿Ya tienes cuenta? <Link className="text-marca-700 hover:underline" to="/entrar">Entra</Link>
        </p>
      </form>
    </div>
  )
}
