#!/usr/bin/env bash
# Sincroniza el motor financiero desde el otro repositorio.
#
# El motor está duplicado a propósito: los dos repos son independientes. El
# precio es que hay que mantener las copias iguales, y el modo en que esto
# falla no es que alguien lo haga mal, sino que lo olvide.
#
# Uso:
#   ./scripts/sincronizar-motor.sh ../prestamo-backend
#   ./scripts/sincronizar-motor.sh ../prestamo-frontend
#
# Después: revisa el diff, corre las pruebas y commitea en ESTE repo.

set -euo pipefail

ORIGEN="${1:-}"
if [ -z "$ORIGEN" ] || [ ! -d "$ORIGEN/src/core" ]; then
  echo "Uso: $0 <ruta-al-otro-repo>" >&2
  echo "  Ese directorio debe contener src/core/" >&2
  exit 1
fi

DESTINO="$(cd "$(dirname "$0")/.." && pwd)/src/core"

echo "Comparando:"
echo "  origen:  $ORIGEN/src/core"
echo "  destino: $DESTINO"
echo

# huella.ts se genera en cada build: no se compara ni se copia.
if diff -r -x 'huella.ts' "$ORIGEN/src/core" "$DESTINO" > /dev/null 2>&1; then
  echo "✓ Ya están sincronizados. No hay nada que hacer."
  exit 0
fi

echo "Diferencias encontradas:"
diff -r -u -x 'huella.ts' "$DESTINO" "$ORIGEN/src/core" || true
echo

read -r -p "¿Copiar el origen sobre el destino? [s/N] " respuesta
case "$respuesta" in
  [sS]*) ;;
  *) echo "Cancelado."; exit 0 ;;
esac

find "$ORIGEN/src/core" -name '*.ts' ! -name 'huella.ts' -exec cp {} "$DESTINO/" \;
node "$(dirname "$0")/huella-motor.mjs"

echo
echo "✓ Copiado. Ahora:"
echo "    npm test        # las pruebas del motor van con él"
echo "    git diff src/core"
