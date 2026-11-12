#!/usr/bin/env bash
# Plan x20 · descarga de los datos abiertos con que se midió el mercado (11-nov-2026).
# Solo LEE datos.gov.co (GET). No escribe en ningún servicio ni toca la aplicación.
#
#   bash tools/analisis/plan_x20/descargar.sh <carpeta_de_datos>
#   node tools/analisis/plan_x20/medir.js <carpeta_de_datos>
#
# La carpeta de datos NO se versiona (unos 30 MB). Las cifras que salen de ella se guardan en
# tools/analisis/plan_x20/resultados_AAAA-MM-DD.json, que sí se versiona.
# p6dx-8zbt se reemplaza entero en cada carga de SECOP II: dos corridas en días distintos dan
# cifras parecidas, no idénticas. La fecha de la consulta va en el JSON de resultados.
set -euo pipefail
D="${1:?uso: descargar.sh <carpeta_de_datos>}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D/of_prueba" "$D/of_antes" "$D/contraste"
P='https://www.datos.gov.co/resource/p6dx-8zbt.json'
O='https://www.datos.gov.co/resource/wi7w-2nvm.json'
OBRA_MENOR="tipo_de_contrato='Obra' and modalidad_de_contratacion='Selección Abreviada de Menor Cuantía'"
EN_OFERTAS="(fase='Presentación de oferta' or fase='Fase de ofertas')"

bajar() { # bajar <salida> <url> <pares --data-urlencode...>; reintenta 3 veces y exige una lista JSON
  local salida="$1"; shift
  local intento
  for intento in 1 2 3; do
    if curl -sS -m 240 -G "$@" -o "$salida" && head -c 1 "$salida" | grep -q '\['; then return 0; fi
    sleep 3
  done
  echo "FALLÓ la descarga de $salida" >&2; return 1
}

echo "1/6 · obra adjudicada por modalidad y número de ofertas (recepción desde 2025-11-01)"
bajar "$D/modalidades.json" "$P" \
  --data-urlencode "\$select=modalidad_de_contratacion,respuestas_al_procedimiento,count(distinct id_del_portafolio) as n" \
  --data-urlencode "\$where=tipo_de_contrato='Obra' and adjudicado='Si' and fecha_de_recepcion_de >= '2025-11-01T00:00:00'" \
  --data-urlencode "\$group=modalidad_de_contratacion,respuestas_al_procedimiento" --data-urlencode "\$limit=5000"

echo "2/6 · menor cuantía de obra en fase de ofertas, adjudicada o no (recepción desde 2025-11-01)"
bajar "$D/ultimo_ano.json" "$P" \
  --data-urlencode "\$select=id_del_portafolio,adjudicado,respuestas_al_procedimiento,fecha_de_recepcion_de" \
  --data-urlencode "\$where=$OBRA_MENOR and fecha_de_recepcion_de >= '2025-11-01T00:00:00' and $EN_OFERTAS" \
  --data-urlencode "\$limit=20000"

echo "3/6 · menor cuantía de obra ADJUDICADA desde 2024 (el historial de cada entidad)"
bajar "$D/historial.json" "$P" \
  --data-urlencode "\$select=id_del_portafolio,entidad,nit_entidad,departamento_entidad,precio_base,valor_total_adjudicacion,respuestas_al_procedimiento,fecha_de_recepcion_de,nit_del_proveedor_adjudicado,nombre_del_proveedor,codigoproveedor" \
  --data-urlencode "\$where=$OBRA_MENOR and adjudicado='Si' and fecha_de_recepcion_de >= '2024-01-01T00:00:00' and $EN_OFERTAS" \
  --data-urlencode "\$limit=50000"

echo "4/6 · menor cuantía de obra publicada desde 2026-10-01 y sin adjudicar (la foto de hoy)"
bajar "$D/abiertos.json" "$P" \
  --data-urlencode "\$select=id_del_portafolio,id_del_proceso,entidad,nit_entidad,departamento_entidad,precio_base,fase,estado_del_procedimiento,fecha_de_recepcion_de,fecha_de_publicacion_del" \
  --data-urlencode "\$where=$OBRA_MENOR and adjudicado='No' and fecha_de_publicacion_del >= '2026-10-01T00:00:00'" \
  --data-urlencode "\$limit=20000"

echo "5/6 · ofertas, agrupadas por proveedor y valor (una consulta por tanda de procesos)"
node "$AQUI/medir.js" tandas "$D"
for grupo in prueba antes contraste; do
  carpeta="of_$grupo"
  [ "$grupo" = "contraste" ] && carpeta="contraste"
  i=0
  while IFS= read -r ids; do
    [ -z "$ids" ] && continue
    i=$((i + 1))
    bajar "$D/$carpeta/t$i.json" "$O" \
      --data-urlencode "\$select=id_del_proceso_de_compra,c_digo_proveedor,nit_del_proveedor,nombre_proveedor,valor_de_la_oferta,count(*) as filas,max(fecha_de_registro) as ultima" \
      --data-urlencode "\$where=id_del_proceso_de_compra in ($ids)" \
      --data-urlencode "\$group=id_del_proceso_de_compra,c_digo_proveedor,nit_del_proveedor,nombre_proveedor,valor_de_la_oferta" \
      --data-urlencode "\$limit=30000"
  done < "$D/tandas_$grupo.txt"
  echo "   $grupo: $i tandas"
done

echo "6/6 · las ofertas de los dos procesos del diagnóstico (por su identificador público)"
bajar "$D/casos.json" "$O" \
  --data-urlencode "\$select=id_del_proceso_de_compra,nombre_proveedor,valor_de_la_oferta,count(*) as filas" \
  --data-urlencode "\$where=id_del_proceso_de_compra in ('CO1.BDOS.10584652','CO1.BDOS.10691742')" \
  --data-urlencode "\$group=id_del_proceso_de_compra,nombre_proveedor,valor_de_la_oferta" --data-urlencode "\$limit=2000"

echo "listo: ahora  node tools/analisis/plan_x20/medir.js $D"
