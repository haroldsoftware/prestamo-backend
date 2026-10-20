/**
 * Cliente HTTP.
 *
 * El access token vive SOLO en memoria — nunca en localStorage, donde
 * cualquier script inyectado lo leería. El refresh viaja en una cookie
 * httpOnly que JavaScript no puede tocar. Al recargar la página se pide un
 * token nuevo con esa cookie.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

let accessToken: string | null = null
let alExpirar: (() => void) | null = null

export function fijarToken(token: string | null): void {
  accessToken = token
}

export function hayToken(): boolean {
  return accessToken !== null
}

export function alPerderSesion(fn: () => void): void {
  alExpirar = fn
}

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalle?: unknown,
  ) {
    super(mensaje)
    this.name = 'ErrorApi'
  }
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  cuerpo?: unknown
  cabeceras?: Record<string, string>
  sinReintento?: boolean
}

async function crudo(ruta: string, opciones: Opciones = {}): Promise<Response> {
  return fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    credentials: 'include',
    headers: {
      ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...opciones.cabeceras,
    },
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
  })
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  let respuesta = await crudo(ruta, opciones)

  // Un 401 puede ser solo que el access token venció (dura lo que diga
  // ACCESS_TOKEN_TTL_MIN en el backend). Se intenta renovar una vez con la
  // cookie httpOnly, en silencio, para que el usuario no vea nada.
  if (respuesta.status === 401 && !opciones.sinReintento && !ruta.startsWith('/auth/')) {
    const renovado = await renovarToken()
    if (renovado) {
      respuesta = await crudo(ruta, opciones)
    } else {
      accessToken = null
      alExpirar?.()
    }
  }

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as
      | { error?: string; mensaje?: string; detalle?: unknown }
      | null
    throw new ErrorApi(
      respuesta.status,
      cuerpo?.error ?? 'ERROR',
      cuerpo?.mensaje ?? 'Algo salió mal. Intenta de nuevo.',
      cuerpo?.detalle,
    )
  }

  if (respuesta.status === 204) return undefined as T
  const tipo = respuesta.headers.get('content-type') ?? ''
  return (tipo.includes('json') ? respuesta.json() : respuesta.blob()) as Promise<T>
}

export async function renovarToken(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!r.ok) return false
    const { accessToken: nuevo } = (await r.json()) as { accessToken: string }
    accessToken = nuevo
    return true
  } catch {
    return false
  }
}

/**
 * Descarga un archivo generado por la API (PDF, Excel).
 *
 * En el iPhone, sobre todo con la app instalada, un <a download> no tiene a
 * dónde ir: se usa la hoja nativa de Compartir (guardar en Archivos, enviar
 * por WhatsApp, etc.). En el resto, descarga normal.
 */
export async function descargar(ruta: string, nombre: string): Promise<void> {
  const blob = await api<Blob>(ruta)
  const archivo = new File([blob], nombre, { type: blob.type || 'application/octet-stream' })
  const nav = navigator as Navigator & { canShare?(d: ShareData): boolean }
  const tactil = window.matchMedia('(pointer: coarse)').matches
  if (tactil && nav.share && nav.canShare?.({ files: [archivo] })) {
    try {
      await nav.share({ files: [archivo], title: nombre })
      return
    } catch (e) {
      // Cancelar la hoja de compartir no es un error.
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
