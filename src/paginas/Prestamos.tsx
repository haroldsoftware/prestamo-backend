import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrestamos } from '../api/hooks'
import { Esqueleto, Segmentos, Vacio } from '../componentes/base'
import { IconoMas, IconoPrestamos } from '../componentes/Iconos'
import { Pantalla } from '../componentes/Pantalla'
import { TarjetaPrestamo } from '../componentes/TarjetaPrestamo'
import { pesos } from '../lib/formato'

type Filtro = 'todos' | 'preste' | 'debo' | 'pendientes' | 'cerrados'

export function Prestamos() {
  const { data, isLoading } = usePrestamos()
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const grupos = useMemo(() => {
    const lista = data ?? []
    const abiertos = lista.filter((p) => !['PAGADO', 'RECHAZADO', 'CANCELADO'].includes(p.estado))
    return {
      todos: abiertos,
      preste: abiertos.filter((p) => p.rol === 'PRESTAMISTA'),
      debo: abiertos.filter((p) => p.rol === 'DEUDOR' || p.rol === 'CODEUDOR'),
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
    ['pendientes', 'Sin aceptar', grupos.pendientes.length],
    ['cerrados', 'Terminados'],
  ] as const).filter(([k]) => k === 'todos' || grupos[k].length > 0)

  return (
    <Pantalla
      titulo="Préstamos"
      accion={
        <Link to="/prestamos/nuevo" className="flex h-9 w-9 items-center justify-center rounded-full bg-marca-suave text-marca active:scale-90" aria-label="Registrar un préstamo">
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
        <Vacio titulo="Todavía no tienes préstamos" icono={<IconoPrestamos tam={30} />}>
          Registra el primero y verás desde el día uno cuánto es interés y cuánto baja la deuda.
          <Link className="btn-primario mt-5 w-full" to="/prestamos/nuevo">Registrar un préstamo</Link>
        </Vacio>
      ) : (
        <div className="space-y-4">
          {opciones.length > 1 && (
            <Segmentos<Filtro> etiqueta="Filtrar préstamos" opciones={opciones} valor={filtro} onCambio={setFiltro} />
          )}

          {total > 0 && (
            <p className="px-1 text-[14px] text-texto-2">
              Saldo de capital: <span className="cifra font-semibold text-texto">{pesos(total)}</span>
            </p>
          )}

          {lista.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-texto-2">No hay préstamos en este grupo.</p>
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
