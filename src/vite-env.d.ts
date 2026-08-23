/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Vacía en desarrollo: el proxy de Vite la resuelve. */
  readonly VITE_API_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
