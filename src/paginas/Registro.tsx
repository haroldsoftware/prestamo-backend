import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ErrorApi } from '../api/cliente'
import { Aviso } from '../componentes/base'
import { IconoCorreo } from '../componentes/Iconos'
import { MarcoAuth } from '../componentes/MarcoAuth'

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
      <MarcoAuth titulo="Revisa tu correo">
        <div className="tarjeta p-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marca-suave text-marca">
            <IconoCorreo tam={30} />
          </div>
          <p className="mt-4 text-[15px] text-texto-2">
            Si <strong className="text-texto">{datos.email}</strong> estaba disponible, te enviamos un
            enlace para confirmarlo. Vence en 48 horas.
          </p>
          <Link className="btn-primario mt-5 w-full" to="/entrar">Ir a entrar</Link>
        </div>
      </MarcoAuth>
    )
  }

  return (
    <MarcoAuth titulo="Crea tu cuenta" subtitulo="Es gratis y toma un minuto.">
      <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
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
            id="email" type="email" inputMode="email" autoCapitalize="none" className="campo" required autoComplete="email"
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
      </form>
      <p className="mt-6 text-center text-[15px] text-texto-2">
        ¿Ya tienes cuenta? <Link className="enlace" to="/entrar">Entra</Link>
      </p>
    </MarcoAuth>
  )
}
