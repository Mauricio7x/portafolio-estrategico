# Muestra SECOP II · método de selección (2-oct-2026)

> Para: sesión · Estado: referencia · Sustituido por: —

La muestra describe la muestra, no el universo. Se saca con `node research/muestra_secop/seleccionar.js <N> <semilla> [desde] --salida=<ruta.json>` (sin dependencias; solo lee).

| Paso | Regla |
|---|---|
| Universo | `p6dx-8zbt` (SECOP II · Procesos de Contratación): `tipo_de_contrato` en Obra, Interventoría o Consultoría; `modalidad_de_contratacion` del Estatuto con informe de evaluación (licitación pública, selección abreviada de menor cuantía con y sin manifestación, concurso de méritos abierto y con precalificación, mínima cuantía); `estado_del_procedimiento` en Seleccionado, Evaluación o Adjudicado; `fecha_de_publicacion_del` desde la fecha dada. Un expediente es un `id_del_portafolio` (se queda la fila publicada más tarde) |
| Orden aleatorio reproducible | `sha256(semilla + "|" + id_del_portafolio)`, ascendente. Con la misma semilla sale la misma muestra |
| Condición | El índice de documentos `dmgg-8hin` trae para ese expediente al menos un archivo cuyo nombre contenga INFORME y EVALUA. Los que no lo traen se cuentan como «sin informe en el índice» y se saltan |
| Estratos | Con N ≥ 5: al menos 1 interventoría y 1 consultoría; el resto, obra |
| Qué se guarda | Número de proceso, expediente, entidad, modalidad, tipo, presupuesto y las URL de los informes. Ninguna persona natural |

## Piloto (semilla `piloto-2026-10-02`, desde 2026-01-01, N = 5)

Universo medido el 2-oct-2026: 13.569 filas, 6.443 expedientes (4.115 obra, 1.229 interventoría, 1.099 consultoría).
Recorrido: 24 expedientes revisados, 19 sin informe en el índice, 5 tomados (`muestra_piloto.json`).
Lo que esa proporción dice: solo 1 de cada 5 expedientes «Seleccionado/Evaluación» trae un archivo
llamado informe de evaluación en el índice; para N = 40 harán falta unas 200 consultas al índice.
