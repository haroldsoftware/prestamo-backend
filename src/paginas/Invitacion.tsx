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
import { Aviso, Cargando } from '../componentes/base'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { fechaLarga, pesos, porcentaje } from '../lib/formato'

export function Invitacion() {
  const { codigo = '' } = useParams()
  const { data, isLoading, error } = useInvitacion(codigo)

  if (isLoading) return <Cargando />

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="tarjeta text-center">
          <h1 className="text-xl font-bold">Esta invitación no está disponible</h1>
          <p className="mt-2 text-slate-600">Puede que haya vencido o que ya la hayan usado.</p>
          <Link className="btn-secundario mt-5" to="/entrar">Ir a entrar</Link>
        </div>
      </div>
    )
  }

  const c = data.condiciones

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{data.prestamista} registró un préstamo contigo</h1>
        <p className="mt-1 text-slate-600">
          Míralo con calma. No pasa nada hasta que tú lo aceptes.
        </p>
      </div>

      <div className="tarjeta">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Te prestaría</p>
            <p className="text-2xl font-bold tabular-nums">{pesos(c.montoPrincipal)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Pagarías cada mes</p>
            <p className="text-2xl font-bold tabular-nums">{c.cuota ? pesos(c.cuota) : 'Libre'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Durante</p>
            <p className="text-2xl font-bold">{c.plazo ? `${c.plazo} meses` : 'Sin plazo fijo'}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Interés</dt>
            <dd className="text-right font-medium">
              {c.tasaCorrienteMensualPct.toFixed(2)}% mensual
              <span className="block text-xs font-normal text-slate-500">
                {porcentaje(c.tasaCorrienteEA * 100)} efectivo anual
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Si te atrasas</dt>
            <dd className="text-right font-medium">
              {c.modoMora === 'SIN_MORA' ? 'No se cobra mora' : `${c.tasaMoraMensualPct.toFixed(2)}% mensual de mora`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Entrega de la plata</dt>
            <dd className="text-right font-medium">{fechaLarga(c.fechaDesembolso)}</dd>
          </div>
        </dl>

        {data.plan.totalIntereses > 0 && (
          <div className="mt-4">
            <Aviso tipo="info">
              En total pagarías <strong>{pesos(c.montoPrincipal + data.plan.totalIntereses)}</strong>:{' '}
              {pesos(c.montoPrincipal)} de lo prestado y{' '}
              <strong>{pesos(data.plan.totalIntereses)}</strong> de intereses.
            </Aviso>
          </div>
        )}
      </div>

      {c.excedeUsura && (
        <Aviso tipo="atencion" titulo="Esta tasa supera el tope legal">
          La tasa pactada está por encima de la tasa de usura vigente en Colombia. Cobrar por
          encima de ese tope es delito (art. 305 del Código Penal). Piénsalo bien antes de
          aceptar, y consulta la tasa vigente en la Superintendencia Financiera.
        </Aviso>
      )}

      <div className="tarjeta">
        <h2 className="font-semibold">Así quedarían tus primeros pagos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fíjate en cuánto de cada cuota es interés y cuánto baja realmente tu deuda.
        </p>
        <div className="mt-4">
          <TablaDesglose filas={data.plan.filas} />
        </div>
      </div>

      <div className="tarjeta text-center">
        <p className="font-medium">Para aceptar o proponer otra cuota, entra a tu cuenta</p>
        <p className="mt-1 text-sm text-slate-600">
          Si no tienes, créala con el correo <strong>{data.emailInvitado}</strong>.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="btn-primario" to={`/registro`}>Crear mi cuenta</Link>
          <Link className="btn-secundario" to={`/entrar?destino=/prestamos/${data.loanId}`}>Ya tengo cuenta</Link>
        </div>
      </div>
    </div>
  )
}
