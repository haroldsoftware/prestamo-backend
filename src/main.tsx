import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ProveedorToasts } from './componentes/base'
import { ProveedorSesion } from './hooks/sesion'
import './hooks/privacidad'
import { registrarServiceWorker } from './pwa/registro'
import './index.css'

registrarServiceWorker()

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Un 401 o un 404 no se reintenta: reintentar no los va a arreglar.
      retry: (intentos, error) => {
        const status = (error as { status?: number })?.status
        if (status === 401 || status === 403 || status === 404) return false
        return intentos < 2
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ProveedorToasts>
          <ProveedorSesion>
            <App />
          </ProveedorSesion>
        </ProveedorToasts>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
