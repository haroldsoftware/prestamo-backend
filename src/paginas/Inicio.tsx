/**
 * Dashboard condicional.
 *
 * Regla del producto: si no eres prestamista, no ves NADA de prestamista.
 * Nada de tarjetas en cero para roles que no tienes — eso hace sentir al
 * usuario que le falta algo.
 */
import { Link } from 'react-router-dom'
import { useDashboard, usePagosPendientes } from '../api/hooks'
import { Aviso, Cargando, Cifra } from '../componentes/base'
import { fechaLarga, pesos } from '../lib/formato'

export function Inicio() {
  const { data, isLoading } = useDashboard()
  const { data: pendientes } = usePagosPendientes()

  if (isLoading || !data) return <Cargando />

  const sinNada = !data.esPrestamista && !data.esDeudor && data.pendientesDeAceptar === 0

  if (sinNada) {
    return (
      <div className="tarjeta py-12 text-center">
        <h1 className="text-2xl font-bold">Empieza por aquí</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Registra un préstamo para llevar la cuenta con claridad: cuánto falta, cuánto es
          interés y qué pasa si abonas de más.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="btn-primario" to="/prestamos/nuevo">Presté plata</Link>
          <Link className="btn-secundario" to="/prestamos">Me prestaron plata</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tu resumen</h1>
        <Link className="btn-primario" to="/prestamos/nuevo">Registrar un préstamo</Link>
      </div>

      {(pendientes?.length ?? 0) > 0 && (
        <Aviso tipo="atencion" titulo={`Tienes ${pendientes!.length} pago(s) esperando tu confirmación`}>
          Nadie puede dar por hecho un pago sin que tú lo confirmes.{' '}
          <Link className="font-semibold underline" to="/pagos">Revisarlos</Link>
        </Aviso>
      )}

      {data.pendientesDeAceptar > 0 && (
        <Aviso tipo="info" titulo={`${data.pendientesDeAceptar} préstamo(s) sin aceptar`}>
          Un préstamo no empieza a correr hasta que ambas partes aceptan las condiciones.{' '}
          <Link className="font-semibold underline" to="/prestamos">Verlos</Link>
        </Aviso>
      )}

      {/* Ambos roles: la posición neta arriba, que es lo que la persona quiere saber */}
      {data.esPrestamista && data.esDeudor && (
        <div className="tarjeta bg-slate-900 text-white">
          <p className="text-sm text-slate-300">Tu posición neta</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{pesos(data.posicionNeta)}</p>
          <p className="mt-1 text-sm text-slate-400">
            {data.posicionNeta >= 0
              ? 'Te deben más de lo que debes.'
              : 'Debes más de lo que te deben.'}
          </p>
        </div>
      )}

      {data.esDeudor && (
        <section className="tarjeta">
          <h2 className="text-lg font-semibold">Lo que debo</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Cifra
              etiqueta="Deuda actual"
              valor={data.debo.capital}
              explicacion="Sin contar los intereses de este mes"
            />
            <Cifra
              etiqueta="Intereses pendientes"
              valor={data.debo.intereses}
              explicacion="Ya causados, todavía sin pagar"
              tono={data.debo.intereses > 0 ? 'atencion' : 'normal'}
            />
            <Cifra
              etiqueta="Mora"
              valor={data.debo.mora}
              explicacion={data.debo.mora > 0 ? 'Por cuotas atrasadas' : 'Vas al día'}
              tono={data.debo.mora > 0 ? 'malo' : 'bueno'}
            />
          </div>

          {data.debo.proximaCuota && (
            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Tu próxima cuota</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{pesos(data.debo.proximaCuota.monto)}</p>
              <p className="mt-1 text-sm text-slate-600">
                Puedes pagar entre el {fechaLarga(data.debo.proximaCuota.ventanaInicio)} y el{' '}
                {fechaLarga(data.debo.proximaCuota.ventanaFin)}.
                {data.debo.proximaCuota.diasParaLaVentana > 0 &&
                  ` Faltan ${data.debo.proximaCuota.diasParaLaVentana} días para que se abra.`}
                {data.debo.proximaCuota.diasParaLaVentana <= 0 && ' La ventana ya está abierta.'}
              </p>
              <Link
                className="btn-primario mt-3"
                to={`/prestamos/${data.debo.proximaCuota.loanId}`}
              >
                Registrar el pago
              </Link>
            </div>
          )}
        </section>
      )}

      {data.esPrestamista && (
        <section className="tarjeta">
          <h2 className="text-lg font-semibold">Lo que me deben</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Cifra
              etiqueta="Capital colocado"
              valor={data.presté.capitalColocado}
              explicacion={`En ${data.presté.cantidad} préstamo(s) activo(s)`}
            />
            <Cifra
              etiqueta="Intereses por cobrar"
              valor={data.presté.interesesPorCobrar}
              explicacion="Causados y sin pagar"
            />
            <Cifra
              etiqueta="Préstamos en mora"
              valor={String(data.presté.enMora)}
              explicacion={data.presté.enMora > 0 ? `${pesos(data.presté.moraPorCobrar)} en mora` : 'Todos al día'}
              tono={data.presté.enMora > 0 ? 'malo' : 'bueno'}
            />
          </div>
        </section>
      )}
    </div>
  )
}
