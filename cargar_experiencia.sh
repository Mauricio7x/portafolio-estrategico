#!/usr/bin/env bash
# ============================================================================
#  cargar_experiencia.sh · Los tres pasos, en orden, para poner en producción
#  la experiencia ejecutada de Génesis.
#  ---------------------------------------------------------------------------
#  Existe porque este entorno de desarrollo NO alcanza el despliegue (el proxy
#  de egreso responde CONNECT 403, igual que con datos.gov.co) y el dueño
#  trabaja en un portátil institucional sin terminal cómoda: esto se ejecuta
#  desde una máquina con red.
#
#  USO
#      export HISTORICO_TOKEN='TU_HISTORICO_TOKEN'
#      ./cargar_experiencia.sh                       # usa experiencia_genesis_106.json
#      ./cargar_experiencia.sh otro_archivo.json     # o el que se le indique
#
#  El token va por CABECERA (`x-historico-token`), no por `?token=`. Las dos
#  formas funcionan y la cabecera gana si vienen las dos, pero la query queda
#  escrita en los logs de acceso de Vercel y en el historial del navegador.
#  Aquí hay terminal, así que no hay razón para pagar ese precio.
#  Rotar el token cuando termine el backfill.
# ============================================================================
set -euo pipefail

BASE_URL="${BASE_URL:-https://portafolio-estrategico.vercel.app}"
TOKEN="${HISTORICO_TOKEN:-TU_HISTORICO_TOKEN}"
ARCHIVO="${1:-experiencia_genesis_106.json}"
PERFIL="${PERFIL:-genesis}"

if [ "$TOKEN" = "TU_HISTORICO_TOKEN" ]; then
  echo "✗ Falta el token. Ejecute:  export HISTORICO_TOKEN='…'" >&2
  echo "  Sin él los pasos 1 y 2 responden 401 (y 503 si la variable no está en el despliegue)." >&2
  exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
  echo "✗ No existe «$ARCHIVO»." >&2
  echo "  Los 106 contratos NO están en el repositorio: hay que aportarlos." >&2
  echo "  Formato, campos y ejemplo en EXPERIENCIA_PENDIENTE.md" >&2
  exit 1
fi

# Un JSON inválido daría un 400 del servidor idéntico al de un JSON válido pero
# mal formado. Se detecta aquí, que es donde se puede leer el error.
if command -v node >/dev/null 2>&1; then
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$ARCHIVO" \
    || { echo "✗ «$ARCHIVO» no es JSON válido." >&2; exit 1; }
fi

CURL=(curl --silent --show-error --fail-with-body --max-time 300)

echo "═══ 1/3 · Cargar la experiencia ejecutada ═══"
echo "    POST $BASE_URL/api/admin/experiencia   ($ARCHIVO)"
# Valida el archivo ENTERO antes del primer write: o entra todo, o no entra
# nada. La respuesta trae `contratos_cargados` y `terminos_extraidos` — si el
# segundo sale bajo, los objetos del archivo son demasiado escuetos.
"${CURL[@]}" -X POST "$BASE_URL/api/admin/experiencia" \
  -H "x-historico-token: $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$ARCHIVO"
echo; echo

echo "═══ 2/3 · Auditar la cobertura del RUP ═══"
echo "    GET  $BASE_URL/api/admin/cobertura-rup?perfil=$PERFIL"
# `perfil` es OBLIGATORIO y sin default a propósito: la respuesta se lee como
# «lo que te falta a TI», y servir la de otro perfil por omisión sería la peor
# forma posible de equivocarse.
# Recorre el histórico entero, así que tarda. Con el paso 1 hecho, prioriza por
# similitud con la experiencia REAL; sin él responde igual pero con `score` en
# `null`, que significa «no medido», no «cero».
"${CURL[@]}" "$BASE_URL/api/admin/cobertura-rup?perfil=$PERFIL" \
  -H "x-historico-token: $TOKEN"
echo; echo

echo "═══ 3/3 · Relanzar la ingesta completa ═══"
echo "    GET  $BASE_URL/api/sync?modo=full"
# ⚠️ ESTE PASO SE EJECUTA **UNA SOLA VEZ**. `modo=full` REINICIA la extracción
# desde enero; las tandas siguientes van con `modo=auto`, que CONTINÚA. Repetir
# `full` volvería a enero para siempre.
# Hace falta porque el estado `Activo` se añadió a ESTADOS_ABIERTOS y el filtro
# de estado corre en la INGESTA: esos procesos nunca entraron a Redis y ninguna
# consulta los recupera sola. Es la excepción a «afinar el juicio tiene efecto
# inmediato»: esto no es juicio, es ingesta.
# No exige token (sí puede exigirlo Vercel Password Protection, por delante).
"${CURL[@]}" "$BASE_URL/api/sync?modo=full"
echo; echo

cat <<FIN
═══ Hecho ═══
Mire \`done\` en la respuesta del paso 3. Si viene \`done: false\`, la extracción
quedó a medias por presupuesto y hay que CONTINUARLA — nunca reiniciarla:

    curl -s "$BASE_URL/api/sync?modo=auto"      # repetir hasta done: true

El servidor intenta encadenarse solo, pero esa auto-llamada muere si Vercel
Password Protection la intercepta: por eso el encadenado real se hace desde
/admin.html o repitiendo la línea de arriba a mano.

(\`?estado=true\` NO existe en /api/sync: es de /api/sync/historico, que
diagnostica la otra extracción, la del corpus histórico.)
FIN
