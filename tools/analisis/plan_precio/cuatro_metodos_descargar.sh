#!/usr/bin/env bash
# Plan precio · los cuatro métodos · descarga de los datos abiertos (14-nov-2026).
# Solo LEE datos.gov.co (GET, sin token). No escribe en ningún servicio ni toca la aplicación.
#
#   bash tools/analisis/plan_precio/cuatro_metodos_descargar.sh <carpeta_de_datos>
#   node tools/analisis/plan_precio/cuatro_metodos_base.js     <carpeta_de_datos>
#   node tools/analisis/plan_precio/cuatro_metodos_medir.js    <carpeta_de_datos> [AAAA-MM-DD]
#
# Qué baja (la carpeta NO se versiona; las cifras van a resultados_4metodos_AAAA-MM-DD.json):
#   1 · procesos/obra_N.json  p6dx-8zbt (procesos de SECOP II): tipo_de_contrato = «Obra»,
#       adjudicado = «Si», recepción desde 2020-01-01, TODAS las modalidades. Paginado con
#       $limit/$offset y $order=:id (el identificador de fila: orden estable y único).
#   2 · ofertas_<conjunto>/tN.json  las ofertas por proceso de licitación, menor cuantía y régimen
#       especial (NO mínima cuantía ni contratación directa), por tandas de 40
#       `id_del_proceso_de_compra` (= `id_del_portafolio`), AGRUPADAS en el servidor por
#       (proceso, NIT, código, nombre, valor) como scripts/base_obra/inventario.js y el paso 5 de
#       tools/analisis/plan_x20/descargar.sh. Se piden a los TRES conjuntos de ofertas, porque
#       datos.gov.co los partió por años (medido el 14-nov-2026 con min/max de fecha_de_registro):
#         wi7w-2nvm «Ofertas Por Proceso 2025_2026»  2024-12-31 a hoy
#         b28v-edj8 «Ofertas Por Proceso 2023_2024»  2022-12-31 a 2024-12-31
#         bpan-xvj3 «Ofertas Por Proceso Hasta 2022» 2015-03-05 a 2022-12-31
#       (el 25-oct-2026 wi7w empezaba en 2024 y b28v llegaba «hasta 2023»: la partición se mueve.
#       Con wi7w solo, ninguno de los 13.082 procesos de estas tres modalidades recibidos antes de
#       2025 quedaba con una oferta válida: medido en la primera corrida de este mismo script.)
#   3 · consulta.json  fecha y hora de inicio y fin de la consulta.
# Reanudable: una página o tanda ya bajada y legible no se vuelve a pedir (borre la carpeta para
# repetir desde cero). p6dx-8zbt se reemplaza entero en cada carga de SECOP II: dos corridas en
# días distintos dan cifras parecidas, no idénticas.
set -euo pipefail
D="${1:?uso: cuatro_metodos_descargar.sh <carpeta_de_datos>}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D/procesos"
P='https://www.datos.gov.co/resource/p6dx-8zbt.json'
R='https://www.datos.gov.co/resource'
CONJUNTOS_OFERTAS="wi7w-2nvm b28v-edj8 bpan-xvj3"
PAGINA=10000
TOPE_GRUPOS=50000
[ -s "$D/inicio.txt" ] || date -u +%Y-%m-%dT%H:%M:%SZ > "$D/inicio.txt"   # la primera corrida fija la fecha de la consulta
INICIO="$(cat "$D/inicio.txt")"

# bajar <salida> <url> <pares --data-urlencode...>: 6 intentos con espera creciente; exige HTTP 200
# y una lista JSON completa (empieza por «[» y cierra con «]»). Un fallo deja el error literal.
bajar() {
  local salida="$1"; shift
  local intento codigo
  for intento in 1 2 3 4 5 6; do
    codigo="$(curl -sS -m 300 -G "$@" -o "$salida.tmp" -w '%{http_code}' 2>"$salida.err" || true)"
    if [ "$codigo" = "200" ] && head -c 1 "$salida.tmp" | grep -q '\[' && tail -c 3 "$salida.tmp" | grep -q '\]'; then
      mv "$salida.tmp" "$salida"; rm -f "$salida.err"; return 0
    fi
    echo "   reintento $intento de $salida (HTTP $codigo) $(head -c 200 "$salida.err" 2>/dev/null)" >&2
    sleep $((intento * 5))
  done
  echo "FALLÓ la descarga de $salida (HTTP $codigo)" >&2; return 1
}
export -f bajar
legible() { [ -s "$1" ] && head -c 1 "$1" | grep -q '\[' && tail -c 3 "$1" | grep -q '\]'; }
export -f legible

echo "1/3 · procesos de obra adjudicados, todas las modalidades (recepción desde 2020-01-01)"
SELECT="id_del_portafolio,id_del_proceso,entidad,nit_entidad,codigo_entidad,departamento_entidad,ciudad_entidad,ordenentidad,modalidad_de_contratacion,fase,precio_base,fecha_de_publicacion_del,fecha_de_recepcion_de,fecha_adjudicacion,respuestas_al_procedimiento,proveedores_unicos_con,proveedores_invitados,numero_de_lotes,estado_del_procedimiento,adjudicado,valor_total_adjudicacion,nombre_del_proveedor,nit_del_proveedor_adjudicado,codigoproveedor"
DONDE="tipo_de_contrato='Obra' and adjudicado='Si' and fecha_de_recepcion_de >= '2020-01-01T00:00:00'"
i=0
while :; do
  f="$D/procesos/obra_$i.json"
  if ! legible "$f"; then
    bajar "$f" "$P" --data-urlencode "\$select=$SELECT" --data-urlencode "\$where=$DONDE" \
      --data-urlencode "\$order=:id" --data-urlencode "\$limit=$PAGINA" --data-urlencode "\$offset=$((i * PAGINA))"
  fi
  n="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$f")"
  echo "   página $i: $n filas"
  [ "$n" -lt "$PAGINA" ] && break
  i=$((i + 1))
done

echo "2/3 · tandas de procesos cuyas ofertas se bajan (licitación, menor cuantía y régimen especial)"
node "$AQUI/cuatro_metodos_base.js" tandas "$D"

echo "3/3 · ofertas agrupadas por proceso, NIT, código, nombre y valor (3 consultas a la vez)"
GRUPO="id_del_proceso_de_compra,nit_del_proveedor,c_digo_proveedor,nombre_proveedor,valor_de_la_oferta"
una_tanda() { # una_tanda <carpeta> <conjunto> <número> <ids entre comillas, separados por coma>
  local dir="$1" ds="$2" num="$3" ids="$4" f="$1/ofertas_$2/t$3.json"
  if ! legible "$f"; then
    bajar "$f" "$R/$ds.json" \
      --data-urlencode "\$select=$GRUPO,count(*) as n,min(fecha_de_registro) as fecha" \
      --data-urlencode "\$where=id_del_proceso_de_compra in ($ids)" \
      --data-urlencode "\$group=$GRUPO" --data-urlencode "\$limit=$TOPE_GRUPOS" || return 1
  fi
  # Socrata escribe un grupo por renglón: si la tanda llegó al tope pudo cortarse, y se vuelve a
  # pedir proceso por proceso (tN_K.json). Un proceso SOLO que llega al tope queda «sin medir»
  # (lo detecta cuatro_metodos_base.js por el tamaño del archivo).
  if [ "$(wc -l < "$f")" -ge "$TOPE_GRUPOS" ] && [[ "$ids" == *,* ]]; then
    local k=0 id lista
    IFS=',' read -ra lista <<< "$ids"
    for id in "${lista[@]}"; do k=$((k + 1)); una_tanda "$dir" "$ds" "${num}_$k" "$id" || return 1; done
    echo '[]' > "$f"
  fi
}
export -f una_tanda
export R GRUPO TOPE_GRUPOS
rm -f "$D/tandas_fallidas.txt"
for ds in $CONJUNTOS_OFERTAS; do
  mkdir -p "$D/ofertas_$ds"
  # tandas.txt: una línea por tanda, «número<TAB>ids»
  while IFS=$'\t' read -r num ids; do
    [ -z "$num" ] && continue
    printf '%s\0%s\0' "$num" "$ids"
  done < "$D/tandas.txt" | xargs -0 -n 2 -P 3 bash -c 'una_tanda "$0" "$1" "$2" "$3" || echo "$1 $2" >> "$0/tandas_fallidas.txt"' "$D" "$ds" || true
  echo "   $ds: $(ls "$D/ofertas_$ds" | grep -c '^t[0-9]*\.json$') tandas de $(grep -c . "$D/tandas.txt")"
done
[ -s "$D/tandas_fallidas.txt" ] && echo "   OJO: tandas fallidas en $D/tandas_fallidas.txt (se cuentan como «sin medir», jamás como «sin ofertas»)"

printf '{"inicio":"%s","fin":"%s","fuente_procesos":"%s","fuente_ofertas":"%s","donde_procesos":"%s"}\n' \
  "$INICIO" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$P" "$CONJUNTOS_OFERTAS" "$DONDE" > "$D/consulta.json"
echo "listo: ahora  node tools/analisis/plan_precio/cuatro_metodos_base.js $D"
