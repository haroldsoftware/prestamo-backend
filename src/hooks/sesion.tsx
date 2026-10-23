/**
 * Sesión.
 *
 * El access token vive en memoria (ver api/cliente.ts). Al montar la app se
 * intenta renovar con la cookie httpOnly: así una recarga no saca al usuario.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { alPerderSesion, api, fijarToken, renovarToken } from '../api/cliente'
import type { Yo } from '../api/tipos'

interface Sesion {
  usuario: Yo | null
  cargando: boolean
  entrar(email: string, password: string): Promise<void>
  entrarConGoogle(credencial: string): Promise<void>
  salir(): Promise<void>
  refrescarUsuario(): Promise<void>
}

const Ctx = createContext<Sesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Yo | null>(null)
  const [cargando, setCargando] = useState(true)
  const qc = useQueryClient()

  const cargarUsuario = useCallback(async () => {
    try {
      setUsuario(await api<Yo>('/me'))
    } catch {
      setUsuario(null)
    }
  }, [])

  useEffect(() => {
    let vivo = true
    void (async () => {
      const ok = await renovarToken()
      if (!vivo) return
      if (ok) await cargarUsuario()
      if (vivo) setCargando(false)
    })()
    alPerderSesion(() => {
      setUsuario(null)
      qc.clear()
    })
    return () => { vivo = false }
  }, [cargarUsuario, qc])

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api<{ accessToken: string; usuario: Yo }>('/auth/login', {
      metodo: 'POST', cuerpo: { email, password }, sinReintento: true,
    })
    fijarToken(r.accessToken)
    await cargarUsuario()
  }, [cargarUsuario])

  const entrarConGoogle = useCallback(async (credential: string) => {
    const r = await api<{ accessToken: string; usuario: Yo }>('/auth/google', {
      metodo: 'POST', cuerpo: { credential }, sinReintento: true,
    })
    fijarToken(r.accessToken)
    await cargarUsuario()
  }, [cargarUsuario])

  const salir = useCallback(async () => {
    try {
      await api('/auth/logout', { metodo: 'POST', sinReintento: true })
    } finally {
      fijarToken(null)
      setUsuario(null)
      qc.clear()
    }
  }, [qc])

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, entrarConGoogle, salir, refrescarUsuario: cargarUsuario }),
    [usuario, cargando, entrar, entrarConGoogle, salir, cargarUsuario],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useSesion(): Sesion {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return ctx
}
