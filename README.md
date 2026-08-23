# Préstamos — Frontend

Interfaz de la plataforma de préstamos P2P. **Repositorio independiente**: no
depende de ningún workspace ni de otro repo. Se construye y se despliega solo.

Backend: repositorio `prestamo-backend` (Cloud Run).
Se comunican **únicamente por HTTP/JSON**.

## Arrancar

```bash
npm install
npm run dev          # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` hacia `http://localhost:8080`: mismo
origen, sin CORS ni problemas de cookies. Solo levanta el backend aparte.

## Desplegar en Cloudflare Pages

Desde el panel, conectando el repositorio:

| Ajuste | Valor |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` |
| Variable de entorno | `VITE_API_URL` = `https://TU-SERVICIO.run.app/api/v1` |

O desde la terminal:

```bash
echo "VITE_API_URL=https://TU-SERVICIO.run.app/api/v1" > .env.production
npm run build
npx wrangler pages deploy dist --project-name prestamos
```

`VITE_API_URL` se lee **en el build**, no en runtime: cambiarla exige volver a
desplegar. Y necesita el `/api/v1` al final, o todo dará 404.

`public/_redirects` manda todas las rutas a `index.html` — sin eso, recargar en
`/prestamos/01JX...` daría 404. `public/_headers` trae la CSP y las cabeceras
de seguridad; **ajusta `connect-src` con la URL real de Cloud Run**.

## El motor financiero está duplicado

`src/core/` es una copia del motor que también vive en el backend. Está aquí
para que el simulador recalcule **en el navegador**, al instante, sin una sola
petición — que es lo que hace que se sienta como una hoja de cálculo.

El riesgo de duplicar es que las copias diverjan. Hay un detector: cada build
genera una huella (`scripts/huella-motor.mjs`) y la app la compara con la que
publica el backend en `/api/v1/version`. Si no coinciden, sale un aviso rojo
arriba de la pantalla.

**Si tocas `src/core/`, sincroniza el otro repo:**

```bash
cd ../prestamo-backend
./scripts/sincronizar-motor.sh ../prestamo-frontend
npm test
```

Las 118 pruebas del motor corren también aquí (`npm test`): esta copia es
responsabilidad de este repositorio.

## Principios de la interfaz

**Cero jerga.** "Lo que debes hoy", no "saldo insoluto de capital".

**Ningún número solo.** Cada cifra viene con una frase que la explica: *"De tus
$1.000.000: $30.000 fueron a mora, $335.360 a intereses y $634.640 bajaron tu
deuda."*

**Dashboard condicional.** Si no eres prestamista, no ves nada de prestamista.
Nada de tarjetas en cero.

**El token no toca localStorage.** El access token vive solo en memoria; el
refresh va en una cookie `httpOnly`. Guardarlo en `localStorage` lo dejaría al
alcance de cualquier script inyectado.

## Mapa

```
src/
├── core/          Motor financiero (copia sincronizada)
├── api/           Cliente HTTP, tipos y hooks de TanStack Query
├── componentes/   Layout, piezas base, TablaDesglose
├── hooks/         Sesión, verificación del motor
├── lib/           Formato de pesos y fechas (es-CO)
└── paginas/       Una por pantalla
```
