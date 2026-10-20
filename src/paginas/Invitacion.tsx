/**
 * Vista pública de la invitación.
 *
 * Es la pantalla que decide si el producto funciona: sin el deudor registrado
 * no hay doble confirmación, y por tanto no hay producto. Por eso se puede ver
 * TODO —monto, tasa, plan de pagos— antes de crear una cuenta. Pedir el
 * registro antes de mostrar nada es la forma más rápida de perder a alguien.
 */
import { Link, useParams } from 'react-router-dom'
import { useInvitacion } from '../api/hooks'
import { Aviso, Cargando, Fila } from '../componentes/base'
import { MarcoAuth } from '../componentes/MarcoAuth'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { fechaLarga, pesos, porcentaje } from '../lib/formato'
import { esVenta } from '../lib/vocabulario'

export function Invitacion() {
  const { codigo = '' } = useParams()
  const { data, isLoading, error } = useInvitacion(codigo)

  if (isLoading) return <Cargando />

  if (error || !data) {
    return (
      <MarcoAuth titulo="Esta invitación no está disponible" subtitulo="Puede que haya vencido o que ya la hayan usado.">
        <div className="tarjeta p-5">
          <Link className="btn-primario w-full" to="/entrar">Ir a entrar</Link>
        </div>
      </MarcoAuth>
    )
  }

  const c = data.condiciones
  const venta = esVenta(data)

  return (
    <MarcoAuth
      titulo={venta ? `${data.prestamista} registró una venta a cuotas contigo` : `${data.prestamista} registró un préstamo contigo`}
      subtitulo="Míralo con calma. No pasa nada hasta que tú lo aceptes."
    >
      <div className="space-y-4">
        <div className="tarjeta p-5">
          <p className="text-[13px] font-medium text-texto-2">{venta ? `Valor total${data.concepto ? ` · ${data.concepto}` : ''}` : 'Te prestaría'}</p>
          <p className="cifra text-[38px] font-bold leading-tight">{pesos(c.montoPrincipal)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-superficie-2 p-3">
              <p className="text-[12px] text-texto-2">Pagarías cada mes</p>
              <p className="cifra text-[18px] font-bold">{c.cuota ? pesos(c.cuota) : 'Libre'}</p>
            </div>
            <div className="rounded-2xl bg-superficie-2 p-3">
              <p className="text-[12px] text-texto-2">Durante</p>
              <p className="text-[18px] font-bold">{c.plazo ? `${c.plazo} meses` : 'Sin plazo fijo'}</p>
            </div>
          </div>
        </div>

        <dl className="grupo">
          {venta ? (
            <>
              <Fila k="Qué se vendió" v={data.concepto ?? '—'} />
              <Fila k="Interés" v="Sin interés" />
              <Fila k="Fecha de la venta" v={fechaLarga(c.fechaDesembolso)} />
            </>
          ) : (
            <>
              <Fila k="Interés" v={`${c.tasaCorrienteMensualPct.toFixed(2)}% mensual`} extra={`${porcentaje(c.tasaCorrienteEA * 100)} efectivo anual`} />
              <Fila k="Si te atrasas" v={c.modoMora === 'SIN_MORA' ? 'No se cobra mora' : `${c.tasaMoraMensualPct.toFixed(2)}% mensual`} />
              <Fila k="Entrega de la plata" v={fechaLarga(c.fechaDesembolso)} />
            </>
          )}
        </dl>

        {data.plan.totalIntereses > 0 && (
          <Aviso tipo="info">
            En total pagarías <strong className="cifra">{pesos(c.montoPrincipal + data.plan.totalIntereses)}</strong>:{' '}
            {pesos(c.montoPrincipal)} de lo prestado y <strong className="cifra">{pesos(data.plan.totalIntereses)}</strong> de intereses.
          </Aviso>
        )}

        {c.excedeUsura && (
          <Aviso tipo="atencion" titulo="Esta tasa supera el tope legal">
            La tasa pactada está por encima de la tasa de usura vigente en Colombia. Cobrar por
            encima de ese tope es delito (art. 305 del Código Penal). Piénsalo bien antes de
            aceptar, y consulta la tasa vigente en la Superintendencia Financiera.
          </Aviso>
        )}

        <section>
          <h2 className="titulo-seccion">Así quedarían tus primeros pagos</h2>
          <TablaDesglose filas={data.plan.filas} />
        </section>

        <div className="tarjeta space-y-3 p-5 text-center">
          <p className="text-[16px] font-semibold">Para aceptar o proponer otra cuota, entra a tu cuenta</p>
          <p className="text-[14px] text-texto-2">
            Si no tienes, créala con el correo <strong className="text-texto">{data.emailInvitado}</strong>.
          </p>
          <Link className="btn-primario w-full" to="/registro">Crear mi cuenta</Link>
          <Link className="btn-secundario w-full" to={`/entrar?destino=/prestamos/${data.loanId}`}>Ya tengo cuenta</Link>
        </div>
      </div>
    </MarcoAuth>
  )
}
