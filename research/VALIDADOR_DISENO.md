# Validador de la base · diseño (borrador de la Fase 1; se construye en la Fase 3)

> Para: sesión · Estado: pendiente del dueño · Sustituido por: —

Lo único que este encargo implementa. Vive en la suite (`tests/e2e.js`, bloque propio con rótulo para
`E2E_SOLO`) y en un módulo sin dependencias que la suite EJECUTA (no busca por regex); también se
puede correr suelto. Cada comprobación tiene que caer contra un árbol mutado (ficha sin campo, id
huérfano, norma sin ficha) antes de darse por cerradura.

| # | Comprobación | Falla si |
|---|---|---|
| V1 | Cada `research/fichas/F-###.json` es JSON válido y trae los campos de `obligatorios` del esquema | falta un campo o el valor no está en `valores` |
| V2 | Ids únicos y con la forma `F-###`; el nombre del archivo es el id | dos fichas con el mismo id o nombre distinto del id |
| V3 | `url` no vacía y `fecha_consulta` con forma AAAA-MM-DD; `estado_lectura` = `parcial` exige `partes_leidas` | — |
| V4 | `vigencia_verificada` es un objeto con fecha y fuente, o la cadena `[sin verificar]` con motivo | otra forma |
| V5 | Ninguna ficha ni archivo de la base contiene la grafía antigua de la marca ni un número de cédula (patrón de 6 a 10 dígitos junto a «C.C.», «cédula» o «identificación») | — |
| V6 | Todo `CP-###` y `CR-###` del catálogo y de la ruta cita al menos una ficha existente; toda ficha citada existe | huérfanos |
| V7 | Toda norma citada en `docs/CONTRATACION_ESTATAL.md` y en los archivos por eje (patrón del censo: Ley/Decreto/Resolución/Circular/Sentencia/CONPES/CCE-EICP) tiene una ficha cuyo `afirmacion` o `titulo` la nombra, o lleva `[sin verificar]` en la misma línea | una norma suelta |
| V8 | El índice declara la fecha de corte («Fecha de corte: AAAA-MM-DD») y la regla de reverificar lo que tenga más de 6 meses | — |
| V9 | La muestra SECOP guarda solo números de proceso, entidad y hechos: ningún archivo bajo `research/muestra_secop/` trae nombres de proponentes (campo `nombre`/`proponente` con texto) | — |

Lo que NO valida: la verdad de la afirmación (eso es la verificación adversaria de la Fase 3, humana o
por agente) ni la vigencia real de la norma (se declara con fecha; la regla de los 6 meses la
reverifica).
