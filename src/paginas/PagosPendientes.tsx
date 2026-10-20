import { Link } from 'react-router-dom'
import { usePagosPendientes } from '../api/hooks'
import { Avatar, Esqueleto, Vacio } from '../componentes/base'
import { IconoChevron, IconoConfirmar } from '../componentes/Iconos'
import { Pantalla } from '../componentes/Pantalla'
import { fechaLarga, pesos } from '../lib/formato'

const METODO: Record<string, string> = { TRANSFERENCIA: 'Transferencia', EFECTIVO: 'Efectivo', OTRO: 'Otro medio' }
const INTENCION: Record<string, string> = { CUOTA: 'Cuota del mes', PARCIAL: 'Abono parcial', ABONO_CAPITAL: 'Abono a capital' }

export function PagosPendientes() {
  const { data, isLoading } = usePagosPendientes()

  return (
    <Pantalla
      titulo="Por confirmar"
      subtitulo="Nada de esto mueve un saldo hasta que tú lo confirmes."
    >
      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Esqueleto key={i} className="h-36 rounded-3xl" />)}</div>
      ) : !data?.length ? (
        <Vacio titulo="Estás al día" icono={<IconoConfirmar tam={32} />}>
          Cuando alguien registre un pago que te toque confirmar, aparecerá aquí.
        </Vacio>
      ) : (
        <div className="space-y-3">
          {data.map((p, i) => (
            <Link
              key={p.id}
              to={`/prestamos/${p.loanId}?pestana=pagos`}
              className="tarjeta presionable block animate-entrada"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar nombre={p.registradoPor} tam={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{p.registradoPor}</p>
                  <p className="text-[13px] text-texto-2">dice que pagó el {fechaLarga(p.fechaPago)}</p>
                </div>
                <IconoChevron tam={16} className="text-texto-3" />
              </div>
              <p className="cifra mt-3 text-[30px] font-bold">{pesos(p.monto)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="insignia bg-superficie-2 text-texto-2">{INTENCION[p.intencion] ?? p.intencion}</span>
                <span className="insignia bg-superficie-2 text-texto-2">{METODO[p.metodo] ?? p.metodo}</span>
                {p.codigoTransaccion && <span className="insignia bg-superficie-2 text-texto-2">Cód. {p.codigoTransaccion}</span>}
                {p.tieneComprobante && <span className="insignia bg-marca-suave text-marca">Con comprobante</span>}
              </div>
              {p.nota && <p className="mt-2 text-[14px] italic text-texto-2">“{p.nota}”</p>}
              <div className="btn-primario mt-4 w-full">Revisar y decidir</div>
            </Link>
          ))}
        </div>
      )}
    </Pantalla>
  )
}
