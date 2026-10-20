/**
 * Detector de divergencia del motor financiero.
 *
 * El motor vive DUPLICADO: una copia en este repo y otra en el del backend.
 * Es una decisión deliberada (repos 100% independientes), pero tiene un riesgo
 * concreto: que alguien corrija un cálculo en un lado y olvide el otro. A
 * partir de ahí el simulador mostraría un número y el saldo real sería otro —
 * y en un producto cuya única promesa es que las cuentas cuadran, eso es lo
 * peor que puede pasar.
 *
 * Ambas copias se hashean con el mismo script (`scripts/huella-motor.mjs`). Si
 * las huellas no coinciden, las copias no son iguales. Punto.
 *
 * Se avisa, no se bloquea: dejar al usuario fuera por esto sería peor que
 * mostrarle un aviso. Pero el aviso es visible y el log es explícito.
 */
import { useEffect, useState } from 'react'
import { HUELLA_MOTOR } from '@core'
import { BASE } from '../api/cliente'


export type EstadoMotor =
  | { estado: 'verificando' }
  | { estado: 'coincide' }
  | { estado: 'divergente'; local: string; remoto: string }
  | { estado: 'sin-respuesta' }

export function useVerificarMotor(): EstadoMotor {
  const [resultado, setResultado] = useState<EstadoMotor>({ estado: 'verificando' })

  useEffect(() => {
    let vivo = true
    void fetch(`${BASE}/version`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sin versión'))))
      .then((v: { motor?: string }) => {
        if (!vivo) return
        if (!v.motor) return setResultado({ estado: 'sin-respuesta' })
        if (v.motor === HUELLA_MOTOR) return setResultado({ estado: 'coincide' })

        console.error(
          `[motor] Las copias del motor financiero NO coinciden.\n` +
            `  frontend: ${HUELLA_MOTOR}\n` +
            `  backend:  ${v.motor}\n` +
            `Sincroniza src/core/ entre los dos repositorios antes de confiar en las cifras.`,
        )
        setResultado({ estado: 'divergente', local: HUELLA_MOTOR, remoto: v.motor })
      })
      .catch(() => vivo && setResultado({ estado: 'sin-respuesta' }))
    return () => { vivo = false }
  }, [])

  return resultado
}
