import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrestamos } from '../api/hooks'
import { Esqueleto, Segmentos, Vacio } from '../componentes/base'
import { IconoMas, IconoPrestamos } from '../componentes/Iconos'
import { Pantalla } from '../componentes/Pantalla'
import { TarjetaPrestamo } from '../componentes/TarjetaPrestamo'
import { pesos } from '../lib/formato'
import { esVenta } from '../lib/vocabulario'

type Filtro = 'todos' | 'preste' | 'debo' | 'ventas' | 'pendientes' | 'cerrados'

export function Prestamos() {
  const { data, isLoading } = usePrestamos()
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const grupos = useMemo(() => {
    const lista = data ?? []
    const abiertos = lista.filter((p) => !['PAGADO', 'RECHAZADO', 'CANCELADO'].includes(p.estado))
    return {
      todos: abiertos,
      preste: abiertos.filter((p) => !esVenta(p) && p.rol === 'PRESTAMISTA'),
      debo: abiertos.filter((p) => !esVenta(p) && (p.rol === 'DEUDOR' || p.rol === 'CODEUDOR')),
      ventas: abiertos.filter((p) => esVenta(p)),
      pendientes: lista.filter((p) => p.estado === 'PENDIENTE_ACEPTACION' || p.estado === 'EN_NEGOCIACION'),
      cerrados: lista.filter((p) => ['PAGADO', 'RECHAZADO', 'CANCELADO'].includes(p.estado)),
    }
  }, [data])

  const lista = grupos[filtro]
  const total = lista.filter((p) => p.estado === 'ACTIVO').reduce((s, p) => s + p.saldo.capital, 0)

  const opciones = ([
    ['todos', 'Activos'],
    ['preste', 'Presté'],
    ['debo', 'Me prestaron'],
    ['ventas', 'Ventas a cuotas'],
    ['pendientes', 'Sin aceptar', grupos.pendientes.length],
    ['cerrados', 'Terminados'],
  ] as const).filter(([k]) => k === 'todos' || grupos[k].length > 0)

  return (
    <Pantalla
      titulo="Cuentas"
      accion={
        <Link to="/prestamos/nuevo" className="flex h-9 w-9 items-center justify-center rounded-full bg-marca-suave text-marca active:scale-90" aria-label="Registrar un préstamo o una venta">
          <IconoMas tam={20} strokeWidth={2.4} />
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Esqueleto className="h-10 w-2/3 rounded-full" />
          {[0, 1, 2].map((i) => <Esqueleto key={i} className="h-28 rounded-3xl" />)}
        </div>
      ) : !data?.length ? (
        <Vacio titulo="Todavía no tienes cuentas" icono={<IconoPrestamos tam={30} />}>
          Registra un préstamo o una venta a cuotas y verás desde el día uno cuánto falta por pagar.
          <Link className="btn-primario mt-5 w-full" to="/prestamos/nuevo">Registrar</Link>
        </Vacio>
      ) : (
        <div className="space-y-4">
          {opciones.length > 1 && (
            <Segmentos<Filtro> etiqueta="Filtrar cuentas" opciones={opciones} valor={filtro} onCambio={setFiltro} />
          )}

          {total > 0 && (
            <p className="px-1 text-[14px] text-texto-2">
              Saldo pendiente: <span className="cifra font-semibold text-texto">{pesos(total)}</span>
            </p>
          )}

          {lista.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-texto-2">No hay nada en este grupo.</p>
          ) : (
            <div className="space-y-3">
              {lista.map((p, i) => (
                <div key={p.id} className="animate-entrada" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <TarjetaPrestamo p={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Pantalla>
  )
}
