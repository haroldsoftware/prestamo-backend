/**
 * Calcula la huella del motor financiero.
 *
 * El motor está DUPLICADO en dos repositorios. Duplicar código funciona hasta
 * que alguien arregla un cálculo en un lado y olvida el otro — y entonces el
 * simulador del navegador y el saldo del servidor empiezan a dar cifras
 * distintas, sin que nadie se entere hasta que un usuario reclama.
 *
 * Esta huella convierte esa divergencia silenciosa en una visible: es un
 * SHA-256 de las fuentes del motor. Si las dos copias son idénticas, la huella
 * es idéntica. El backend la publica y el frontend la compara al arrancar.
 *
 * Se ejecuta antes de cada build (`prebuild`).
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

// Solo el código del motor: los tests no afectan el resultado de un cálculo.
const archivos = readdirSync(raiz)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'huella.ts')
  .sort()

const hash = createHash('sha256')
for (const archivo of archivos) {
  // Se normalizan los saltos de línea: en Windows el checkout puede traer CRLF
  // y una huella distinta por eso sería un falso positivo.
  const contenido = readFileSync(join(raiz, archivo), 'utf8').replace(/\r\n/g, '\n')
  hash.update(`${archivo}\n${contenido}\n`)
}

const huella = hash.digest('hex').slice(0, 16)

writeFileSync(
  join(raiz, 'huella.ts'),
  `/* GENERADO POR scripts/huella-motor.mjs — NO EDITAR A MANO */\n` +
    `/* Archivos: ${archivos.join(', ')} */\n` +
    `export const HUELLA_MOTOR = '${huella}'\n`,
  'utf8',
)

console.log(`huella del motor: ${huella}  (${archivos.length} archivos)`)
