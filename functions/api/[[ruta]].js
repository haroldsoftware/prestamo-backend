/**
 * Proxy de la API (Cloudflare Pages Function).
 *
 * Toda petición a https://<este dominio>/api/* se reenvía a Cloud Run.
 *
 * Por qué existe: el iPhone (Safari y las apps agregadas a la pantalla de
 * inicio) BLOQUEA las cookies de terceros. Con la API en *.run.app la cookie
 * de refresco era de terceros, así que cada vez que se abría la app la sesión
 * se perdía. Sirviendo la API desde el mismo dominio, la cookie es propia y
 * la sesión dura lo que diga REFRESH_TOKEN_TTL_DIAS.
 *
 * Configura en Cloudflare Pages → Settings → Variables:
 *   BACKEND_URL = https://prestamos-backend-389205780371.us-east1.run.app
 * (sin /api/v1 al final).
 */
const RESPALDO = 'https://prestamos-backend-389205780371.us-east1.run.app'

/** Cabeceras que no deben cruzar el proxy. */
const SALTAR = ['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-for', 'x-real-ip']

export async function onRequest({ request, env }) {
  const origen = (env.BACKEND_URL || RESPALDO).replace(/\/+$/, '')
  const url = new URL(request.url)
  const destino = `${origen}${url.pathname}${url.search}`

  const cabeceras = new Headers()
  for (const [k, v] of request.headers) {
    if (!SALTAR.includes(k.toLowerCase())) cabeceras.set(k, v)
  }
  // La IP real del usuario: el backend la usa para auditoría y límites de
  // peticiones. Sin esto, todo el mundo parecería venir de Cloudflare.
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) cabeceras.set('x-forwarded-for', ip)
  cabeceras.set('x-forwarded-host', url.host)
  cabeceras.set('x-forwarded-proto', 'https')

  const conCuerpo = !['GET', 'HEAD'].includes(request.method)
  const respuesta = await fetch(destino, {
    method: request.method,
    headers: cabeceras,
    body: conCuerpo ? request.body : undefined,
    redirect: 'manual',
  })

  // Se devuelve tal cual (incluidas las Set-Cookie). Sin caché en el borde:
  // son datos privados de cada usuario.
  const salida = new Response(respuesta.body, respuesta)
  salida.headers.set('Cache-Control', 'no-store')
  return salida
}
