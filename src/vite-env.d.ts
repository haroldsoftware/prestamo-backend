/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Vacía en desarrollo: el proxy de Vite la resuelve. */
  readonly VITE_API_URL?: string
  /** ID de cliente OAuth de Google. Vacío = sin botón de Google. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
