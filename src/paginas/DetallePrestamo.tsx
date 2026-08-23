import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { descargar, ErrorApi } from '../api/cliente'
import {
  useAceptar, useAnularPago, useAuditoria, useAutorizarParticipante, useConfirmarPago,
  useInvitarParticipante, useNegociar, usePagos, usePlan, usePrestamo, useRechazar,
  useRechazarPago, useRegistrarPago, useRevocarParticipante, useYo,
} from '../api/hooks'
import { Aviso, Cargando, Cifra, ConfirmacionEscrita, Insignia } from '../componentes/base'
import { TablaDesglose } from '../componentes/TablaDesglose'
import { aNumero, fechaLarga, hoyISO, numero, pesos, porcentaje } from '../lib/formato'

type Pestana = 'resumen' | 'plan' | 'pagos' | 'gente' | 'historial'

export function DetallePrestamo() {
  const { id = '' } = useParams()
  const { data: p, isLoading } = usePrestamo(id)
  const { data: yo } = useYo()
  const [pestana, setPestana] = useState<Pestana>('resumen')

  if (isLoading || !p) return <Cargando />

  const puedeVerMontos = p.rol !== 'OBSERVADOR' || true

  return (
    <div className="space-y-5">
      <div>
        <Link className="text-sm text-slate-500 hover:underline" to="/prestamos">← Todos los préstamos</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{p.contraparte.nombre}</h1>
          <Insignia estado={p.estado} />
          {p.enMora && <span className="insignia bg-red-100 text-red-800">En mora</span>}
        </div>
        {p.descripcion && <p className="text-slate-600">{p.descripcion}</p>}
      </div>

      {p.condiciones.excedeUsura && (
        <Aviso tipo="atencion" titulo="Esta tasa supera la usura vigente">
          Se pactó al {porcentaje(p.condiciones.tasaCorrienteEA * 100)} efectivo anual y el tope
          certificado era {porcentaje((p.condiciones.usuraVigenteAlPactar?.valorEA ?? 0) * 100)}.
          Cobrar por encima de la usura es delito en Colombia (art. 305 del Código Penal). Ambas
          partes aceptaron esta advertencia de forma expresa y quedó registrada.
        </Aviso>
      )}

      {p.estado === 'PENDIENTE_ACEPTACION' || p.estado === 'EN_NEGOCIACION' ? (
        <PanelAceptacion prestamo={p} miId={yo?.id ?? ''} />
      ) : null}

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Secciones">
        {([
          ['resumen', 'Resumen'], ['plan', 'Plan de pagos'], ['pagos', 'Pagos'],
          ['gente', 'Quién ve esto'], ['historial', 'Historial'],
        ] as const).map(([clave, texto]) => (
          <button
            key={clave}
            onClick={() => setPestana(clave)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              pestana === clave ? 'border-marca-600 text-marca-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            aria-current={pestana === clave ? 'page' : undefined}
          >
            {texto}
          </button>
        ))}
      </nav>

      {pestana === 'resumen' && <Resumen prestamo={p} />}
      {pestana === 'plan' && puedeVerMontos && <Plan id={id} />}
      {pestana === 'pagos' && <Pagos id={id} prestamo={p} miId={yo?.id ?? ''} />}
      {pestana === 'gente' && <Gente id={id} prestamo={p} />}
      {pestana === 'historial' && <Historial id={id} />}
    </div>
  )
}

function Resumen({ prestamo: p }: { prestamo: import('../api/tipos').DetallePrestamo }) {
  const c = p.condiciones
  return (
    <div className="space-y-5">
      {p.estado === 'ACTIVO' && (
        <div className="tarjeta grid gap-5 sm:grid-cols-4">
          <Cifra etiqueta="Deuda actual" valor={p.saldo.capital} explicacion="Capital sin pagar" />
          <Cifra
            etiqueta="Intereses pendientes" valor={p.saldo.interesesPendientes}
            explicacion="Ya causados" tono={p.saldo.interesesPendientes > 0 ? 'atencion' : 'normal'}
          />
          <Cifra
            etiqueta="Mora" valor={p.saldo.moraPendiente}
            explicacion={p.saldo.moraPendiente > 0 ? 'Por atrasos' : 'Sin mora'}
            tono={p.saldo.moraPendiente > 0 ? 'malo' : 'bueno'}
          />
          <Cifra
            etiqueta="Vencido" valor={p.saldo.vencido}
            explicacion={p.saldo.vencido > 0 ? 'Cuotas sin cubrir' : 'Al día'}
            tono={p.saldo.vencido > 0 ? 'malo' : 'bueno'}
          />
        </div>
      )}

      <div className="tarjeta">
        <h2 className="font-semibold">Las condiciones</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Dato k="Monto prestado" v={pesos(c.montoPrincipal)} />
          <Dato k="Entregado el" v={fechaLarga(c.fechaDesembolso)} />
          <Dato
            k="Interés"
            v={`${c.tasaCorrienteMensualPct.toFixed(2)}% mensual`}
            extra={`${porcentaje(c.tasaCorrienteEA * 100)} efectivo anual`}
          />
          <Dato
            k="Mora"
            v={c.modoMora === 'SIN_MORA' ? 'No se cobra mora' : `${c.tasaMoraMensualPct.toFixed(2)}% mensual`}
            extra={c.modoMora === 'SIN_MORA' ? 'El prestamista decidió no castigar el atraso' : 'Solo sobre lo vencido, por días'}
          />
          <Dato k="Cuota" v={c.cuota ? pesos(c.cuota) : 'Libre'} />
          <Dato k="Plazo" v={c.plazo ? `${c.plazo} cuotas` : 'Sin plazo fijo'} />
          <Dato
            k="Ventana de pago"
            v={`Día ${c.diaCorte}, ${c.ventana.diasAntes} antes y ${c.ventana.diasDespues} después`}
            extra={c.correrADiaHabil ? 'Corre al siguiente día hábil' : undefined}
          />
          <Dato
            k="Confirmación de pagos"
            v={c.autoConfirmarPagosDelPrestamista ? 'Los del prestamista se confirman solos' : 'Todo pago necesita confirmación'}
          />
        </dl>
        {p.versionesCondiciones > 1 && (
          <p className="mt-3 text-sm text-slate-500">
            Estas condiciones son la versión {p.versionesCondiciones}. El historial guarda todas.
          </p>
        )}
      </div>

      {p.estado === 'ACTIVO' && (
        <div className="flex flex-wrap gap-3">
          <Link className="btn-primario" to={`/prestamos/${p.id}/simular`}>Simular escenarios</Link>
          <button className="btn-secundario" onClick={() => void descargar(`/loans/${p.id}/export.pdf`, `estado-cuenta-${p.id}.pdf`)}>
            Descargar estado de cuenta (PDF)
          </button>
          <button className="btn-secundario" onClick={() => void descargar(`/loans/${p.id}/export.xlsx`, `libro-${p.id}.xlsx`)}>
            Descargar libro (Excel)
          </button>
        </div>
      )}
    </div>
  )
}

function Dato({ k, v, extra }: { k: string; v: string; extra?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium">
        {v}
        {extra && <span className="block text-xs font-normal text-slate-500">{extra}</span>}
      </dd>
    </div>
  )
}

function Plan({ id }: { id: string }) {
  const { data, isLoading, error } = usePlan(id)
  if (isLoading) return <Cargando />
  if (error) return <Aviso tipo="info">No tienes permiso para ver los montos de este préstamo.</Aviso>
  if (!data) return null
  return (
    <div className="tarjeta">
      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <span>Intereses totales: <strong>{pesos(data.totalIntereses)}</strong></span>
        {data.totalMora > 0 && <span>Mora acumulada: <strong>{pesos(data.totalMora)}</strong></span>}
        <span>Termina en: <strong>{data.periodosHastaLiquidar ?? '—'} cuotas</strong></span>
      </div>
      <TablaDesglose filas={data.filas} />
    </div>
  )
}

function PanelAceptacion({
  prestamo: p,
  miId,
}: {
  prestamo: import('../api/tipos').DetallePrestamo
  miId: string
}) {
  const aceptar = useAceptar(p.id)
  const rechazar = useRechazar(p.id)
  const negociar = useNegociar(p.id)
  const [cuota, setCuota] = useState(0)
  const [error, setError] = useState('')
  const yaAcepte = p.aceptaciones.some((a) => a.userId === miId)

  const TEXTO =
    `Acepto las condiciones de este préstamo: ${pesos(p.condiciones.montoPrincipal)} al ` +
    `${p.condiciones.tasaCorrienteMensualPct}% mensual, con cuota de ${pesos(p.condiciones.cuota)}. ` +
    `Entiendo que esta plataforma solo lleva el registro y no interviene en el acuerdo.`

  return (
    <div className="tarjeta border-marca-300 bg-marca-50/40">
      <h2 className="font-semibold">
        {yaAcepte ? 'Ya aceptaste: falta la otra parte' : 'Este préstamo espera tu decisión'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        El préstamo no empieza a correr hasta que ambos acepten. Lo que aceptes queda guardado
        con la fecha y el texto exacto que estás leyendo.
      </p>

      {error && <div className="mt-3"><Aviso tipo="error">{error}</Aviso></div>}

      {p.negociacion.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {p.negociacion.map((n) => (
            <li key={n.version} className="rounded-lg bg-white p-3">
              <span className="font-medium">
                {n.propuestoPor === miId ? 'Propusiste' : 'Te propusieron'}
              </span>{' '}
              {n.cuotaPropuesta ? `una cuota de ${pesos(n.cuotaPropuesta)}` : 'otras condiciones'}
              {n.plazoCalculado ? ` (${n.plazoCalculado} cuotas)` : ''}
              {n.mensaje && <p className="mt-1 text-slate-600">"{n.mensaje}"</p>}
            </li>
          ))}
        </ul>
      )}

      {!yaAcepte && (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="btn-primario"
              disabled={aceptar.isPending}
              onClick={() =>
                void aceptar.mutateAsync({ textoAceptado: TEXTO }).catch((e) =>
                  setError(e instanceof ErrorApi ? e.message : 'No pudimos registrar tu aceptación'),
                )
              }
            >
              Acepto estas condiciones
            </button>
            <button className="btn-secundario" onClick={() => void rechazar.mutateAsync()}>
              No acepto
            </button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-marca-700">
              Proponer otra cuota
            </summary>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="etiqueta" htmlFor="cuotaProp">¿Cuánto puedes pagar al mes?</label>
                <input
                  id="cuotaProp" className="campo w-44" inputMode="numeric" value={numero(cuota)}
                  onChange={(e) => setCuota(aNumero(e.target.value))}
                />
              </div>
              <button
                className="btn-secundario"
                disabled={!cuota || negociar.isPending}
                onClick={() =>
                  void negociar.mutateAsync({ cuotaPropuesta: cuota }).catch((e) =>
                    setError(e instanceof ErrorApi ? e.message : 'No pudimos enviar la propuesta'),
                  )
                }
              >
                Proponer
              </button>
            </div>
            <p className="ayuda">Calculamos el plazo y la otra parte decide.</p>
          </details>
        </>
      )}
    </div>
  )
}

function Pagos({
  id,
  prestamo: p,
  miId,
}: {
  id: string
  prestamo: import('../api/tipos').DetallePrestamo
  miId: string
}) {
  const { data: pagos, isLoading } = usePagos(id)
  const registrar = useRegistrarPago(id)
  const confirmar = useConfirmarPago(id)
  const rechazarPago = useRechazarPago(id)
  const anular = useAnularPago(id)
  const [form, setForm] = useState({
    monto: 0, fechaPago: hoyISO(), metodo: 'TRANSFERENCIA' as const,
    intencion: 'CUOTA' as 'CUOTA' | 'PARCIAL' | 'ABONO_CAPITAL',
    codigoTransaccion: '', nota: '',
  })
  const [error, setError] = useState('')
  const [motivos, setMotivos] = useState<Record<string, string>>({})

  if (isLoading) return <Cargando />

  return (
    <div className="space-y-5">
      {p.estado === 'ACTIVO' && (
        <div className="tarjeta">
          <h2 className="font-semibold">Registrar un pago</h2>
          <p className="mt-1 text-sm text-slate-600">
            Queda pendiente hasta que la otra parte lo confirme. Así ninguno puede dar por hecho
            algo que el otro no vio.
          </p>
          {error && <div className="mt-3"><Aviso tipo="error">{error}</Aviso></div>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="monto">¿Cuánto?</label>
              <input
                id="monto" className="campo" inputMode="numeric" value={numero(form.monto)}
                onChange={(e) => setForm({ ...form, monto: aNumero(e.target.value) })}
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="fechaPago">¿Cuándo?</label>
              <input
                id="fechaPago" type="date" className="campo" value={form.fechaPago}
                onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="intencion">¿Qué tipo de pago es?</label>
              <select
                id="intencion" className="campo" value={form.intencion}
                onChange={(e) => setForm({ ...form, intencion: e.target.value as typeof form.intencion })}
              >
                <option value="CUOTA">La cuota del mes</option>
                <option value="PARCIAL">Un abono parcial</option>
                <option value="ABONO_CAPITAL">Abono extra a la deuda</option>
              </select>
              {form.intencion === 'ABONO_CAPITAL' && (
                <p className="ayuda">
                  Ojo: por ley el pago cubre primero mora e intereses. Aplicarlo directo a la
                  deuda necesita el visto bueno del prestamista al confirmar.
                </p>
              )}
            </div>
            <div>
              <label className="etiqueta" htmlFor="codigo">Código de la transacción (opcional)</label>
              <input
                id="codigo" className="campo" value={form.codigoTransaccion}
                onChange={(e) => setForm({ ...form, codigoTransaccion: e.target.value })}
                placeholder="Referencia de la transferencia"
              />
              <p className="ayuda">Puedes agregarlo después si ahora no lo tienes.</p>
            </div>
          </div>
          <button
            className="btn-primario mt-4"
            disabled={!form.monto || registrar.isPending}
            onClick={() => {
              setError('')
              void registrar
                .mutateAsync({
                  monto: form.monto, fechaPago: form.fechaPago, metodo: form.metodo,
                  intencion: form.intencion,
                  codigoTransaccion: form.codigoTransaccion || undefined,
                  nota: form.nota || undefined,
                })
                .then(() => setForm({ ...form, monto: 0, codigoTransaccion: '', nota: '' }))
                .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No pudimos registrar el pago'))
            }}
          >
            {registrar.isPending ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {!pagos?.length && <p className="text-slate-500">Todavía no hay pagos registrados.</p>}
        {pagos?.map((pago) => {
          const esMio = pago.registradoPor === miId
          return (
            <div key={pago.id} className="tarjeta">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{pesos(pago.monto)}</p>
                  <p className="text-sm text-slate-500">
                    {fechaLarga(pago.fechaPago)} · {pago.metodo.toLowerCase()}
                    {pago.comprobante.codigoTransaccion && ` · cód. ${pago.comprobante.codigoTransaccion}`}
                  </p>
                  {pago.rechazo && (
                    <p className="mt-1 text-sm text-red-700">Rechazado: {pago.rechazo.motivo}</p>
                  )}
                </div>
                <Insignia estado={pago.estado} />
              </div>

              {pago.estado === 'PENDIENTE' && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {esMio ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-600">
                        Esperando que la otra parte lo confirme. Tú no puedes confirmar lo que
                        registraste.
                      </p>
                      <button className="btn-secundario" onClick={() => void anular.mutateAsync(pago.id)}>
                        Anular
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="btn-primario"
                          onClick={() =>
                            void confirmar.mutateAsync({
                              pagoId: pago.id,
                              textoAutorizacion:
                                pago.intencion === 'ABONO_CAPITAL'
                                  ? `Autorizo que este pago de ${pesos(pago.monto)} se aplique directamente a capital, aunque haya intereses pendientes.`
                                  : undefined,
                            })
                          }
                        >
                          {pago.intencion === 'ABONO_CAPITAL'
                            ? 'Confirmar y autorizar abono a capital'
                            : 'Confirmar que lo recibí'}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-56">
                          <label className="etiqueta" htmlFor={`motivo-${pago.id}`}>
                            Si no lo recibiste, di por qué
                          </label>
                          <input
                            id={`motivo-${pago.id}`} className="campo"
                            value={motivos[pago.id] ?? ''}
                            onChange={(e) => setMotivos({ ...motivos, [pago.id]: e.target.value })}
                            placeholder="Ese dinero no me llegó"
                          />
                        </div>
                        <button
                          className="btn-peligro"
                          disabled={(motivos[pago.id] ?? '').length < 5}
                          onClick={() =>
                            void rechazarPago.mutateAsync({ pagoId: pago.id, motivo: motivos[pago.id]! })
                          }
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Gente({ id, prestamo: p }: { id: string; prestamo: import('../api/tipos').DetallePrestamo }) {
  const invitar = useInvitarParticipante(id)
  const autorizar = useAutorizarParticipante(id)
  const revocar = useRevocarParticipante(id)
  const [form, setForm] = useState({
    email: '', rol: 'OBSERVADOR' as 'OBSERVADOR' | 'CODEUDOR',
    nivel: 'RESUMIDO' as 'COMPLETO' | 'RESUMIDO', solidario: false,
  })
  const [confirmar, setConfirmar] = useState<Record<string, string>>({})

  return (
    <div className="space-y-5">
      <div className="tarjeta">
        <h2 className="font-semibold">Quién más puede ver este préstamo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sumar a alguien necesita el sí de las dos partes. Quitarlo, en cambio, lo puede hacer
          cualquiera de las dos por su cuenta: son tus datos financieros.
        </p>

        {p.participantes.filter((x) => x.estado !== 'REVOCADO').length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Solo ustedes dos ven este préstamo.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {p.participantes.filter((x) => x.estado !== 'REVOCADO').map((x) => (
              <li key={x.email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-medium">{x.email}</p>
                  <p className="text-sm text-slate-500">
                    {x.rol === 'CODEUDOR' ? 'Codeudor: puede pagar y ver todo' : `Observador: ve ${x.nivel === 'COMPLETO' ? 'todo' : 'solo el estado'}`}
                    {x.estado === 'PENDIENTE_AUTORIZACION' && ` · falta ${2 - x.autorizaciones} autorización(es)`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {x.estado === 'PENDIENTE_AUTORIZACION' && (
                    <button className="btn-secundario" onClick={() => void autorizar.mutateAsync(x.email)}>
                      Autorizar
                    </button>
                  )}
                  <button className="btn-secundario" onClick={() => void revocar.mutateAsync(x.email)}>
                    Quitar acceso
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tarjeta">
        <h3 className="font-semibold">Invitar a alguien</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="emailPart">Correo</label>
            <input
              id="emailPart" type="email" className="campo" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="rolPart">¿Como qué?</label>
            <select
              id="rolPart" className="campo" value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as typeof form.rol })}
            >
              <option value="OBSERVADOR">Observador (solo mira)</option>
              <option value="CODEUDOR">Codeudor (también puede pagar)</option>
            </select>
          </div>
          {form.rol === 'OBSERVADOR' && (
            <div>
              <label className="etiqueta" htmlFor="nivelPart">¿Cuánto puede ver?</label>
              <select
                id="nivelPart" className="campo" value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value as typeof form.nivel })}
              >
                <option value="RESUMIDO">Solo si va al día o en mora</option>
                <option value="COMPLETO">Todo, incluidos los montos</option>
              </select>
            </div>
          )}
        </div>
        <button
          className="btn-primario mt-4"
          disabled={!form.email.includes('@') || invitar.isPending}
          onClick={() => void invitar.mutateAsync(form).then(() => setForm({ ...form, email: '' }))}
        >
          Invitar
        </button>
      </div>
    </div>
  )
}

function Historial({ id }: { id: string }) {
  const { data, isLoading } = useAuditoria(id)
  if (isLoading) return <Cargando />
  return (
    <div className="tarjeta">
      <h2 className="font-semibold">Todo lo que ha pasado</h2>
      <p className="mt-1 text-sm text-slate-600">
        Ambas partes ven exactamente este mismo historial.
      </p>
      <ol className="mt-4 space-y-3">
        {data?.entradas.map((e) => (
          <li key={e._id} className="border-l-2 border-slate-200 pl-4">
            <p className="text-sm">{e.descripcion}</p>
            <p className="text-xs text-slate-400">
              {new Date(e.fecha).toLocaleString('es-CO')}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
