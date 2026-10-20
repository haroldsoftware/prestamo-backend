/** Marco de las pantallas sin sesión: marca arriba, formulario abajo. */
import type { ReactNode } from 'react'

export function MarcoAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <div className="hero rounded-b-[36px] px-6 pb-16 pt-[calc(env(safe-area-inset-top)+36px)] text-white">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <img src="/apple-touch-icon.png" alt="" className="h-12 w-12 rounded-[14px] ring-1 ring-white/30" />
            <div>
              <p className="text-[20px] font-bold leading-tight">Cuentas Claras</p>
              <p className="text-[13px] text-white/75">Cuentas claras, amistades largas.</p>
            </div>
          </div>
          <h1 className="mt-8 text-[30px] font-bold leading-tight tracking-tight">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-[15px] text-white/85">{subtitulo}</p>}
        </div>
      </div>
      <div className="mx-auto -mt-10 max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <div className="animate-entrada">{children}</div>
      </div>
    </div>
  )
}
