# Verificación adversaria de D-73 … D-79 (14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Árbol leído sin modificar (`git status --short` vacío al cerrar). Repro auxiliar: `repro_d73.js` en esta carpeta.

## D-73 · Margen entre su piso y el techo — CON CONDICIONES
- Fuente real: `margenDe` en `lib/handlers/procesos/listar.js:718-751`; solo viaja con `ordenar_por=margen` (`:895`) y con credencial (`:708`, `margen_ignorado` `:1029`). Frontend `lineaMargen` `public/app.js:1051-1062`, texto literal «Puede mover el precio … entre su precio mínimo (…) y el precio al que suele adjudicar esta entidad (…)».
- Sin dato ≠ cero: reproducido con `pisoTechoDeBorrador` real (lib/baja_maxima.js:96): sin borrador → motivo; baja con n=3/4 o null → `techo null` → `valor null` con motivo «hacen falta 5 adjudicaciones»; n=8 y mediana 5 % → piso 132.631.579, techo 142.500.000, margen 9.868.421. Redondeo solo al final (`Math.round`), sobre cifras ya redondeadas al peso.
- DEFECTO reproducido: la cascada de `bajaDeMercado` (`lib/indice_baja.js:893-897`) baja hasta `departamento_familia`; con `granularidad_utilizada: "departamento_familia"` y n=8, `techo_competitivo` = 142.500.000 (no null) y la frase de la tarjeta dice «el precio al que suele adjudicar ESTA ENTIDAD». `margenDe` descarta `baja_granularidad` (que `pisoTecho` sí publica, `lib/apu/piso_techo.js:221`). El panel Piso/Techo sí distingue niveles (`fraseBaja`, `:92-104`).
- Costo «peticion»: real (cargarCostosPorProceso + pisoTecho por fila, memoizado `:752`).
- Memoria: «Fase 3 · Panel Piso / Techo (ago 2026)», «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)», «Auditoría integral del 1-sep-2026 · trece frentes, dos auditores que llegaron y el resto a mano».
- Condiciones: (1) que `margen_estimado` lleve `granularidad` y `lineaMargen` diga «esta entidad» solo con `entidad`/`entidad_familia`, y «en su departamento, en obras como esta» con `departamento_familia`; (2) el ejemplo «$ 20.000.000» es ilustrativo, no medido.

## D-74 · Encaja con su registro — CON CONDICIONES
- Fuente: `evaluarRup` `lib/rup.js:92-145` (tier, unspsc, pertinencia); `badgesRup` `public/app.js:1579-1588`, textos `MATCH_UNSPSC` `:1563-1569`; plegado bajo «Más detalles» `:2190-2197`. Viaja por fila en `op=listar` (`listar.js:852`); sin token `lib/publico.js:194-196` solo anula los campos financieros del rup, no el tier.
- K sin dato deja pasar (`rup.js:104-105`), no convierte en cero. ✓ ✗ ~ ≈ son dingbats de texto, exentos por la cerca (`tests/e2e.js:29739`).
- Lo que NO sostiene: «P2: qué códigos le faltan». Con tier `ninguno` el detalle trae `codigo_proceso: null, codigo_rup: null` y el mensaje genérico «Ninguna clase UNSPSC del proceso está inscrita en el RUP» (`lib/unspsc.js:166-167`): no dice qué código inscribir. Además «UNSPSC» está en la lista de jerga de la cerca (`tests/e2e.js:13962`) y ese mensaje va al tooltip.
- «Obra civil» es `ETIQUETA_TIPO.obra_civil` (`lib/filtros.js:317-321`), etiqueta de pertinencia, no de encaje: son dos chips.
- Memoria: «Fase 6 · Traducción de lenguaje (ago 2026 · plan v3, transversal — cierre)», «Fase 2 · Puerta de entrada de 60 segundos (ago 2026)».

## D-75 · Cómo se adjudica en el departamento — CONFIRMADO
- Fuente: `bajaDepartamentoDe` `lib/indice_baja.js:988-1035`; `listar.js:865`; anulado sin token `lib/publico.js:136`; pintado plegado `public/app.js:1377-1386`.
- Repro: sin índice → null; sin departamento → null; índice vacío → `nivel: "sin_dato"`, `baja_mediana: null`, `procesos_contados: 0`, mensaje «Sin dato en TOLIMA: …». Frontend con mediana ≤ 0 → «sin bajar el precio» (`:1382`). No decide (no entra en la cascada, `:894-897` no incluye `departamento`).
- «131 contratos» es cifra de ejemplo: no medida aquí.
- Memoria: «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)», «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)».

## D-76 · Activo · abierto — CON CONDICIONES
- Fuente real: NO es un campo del PAA ni del corpus; es la bandera de interfaz `paaEncendido` (`public/app.js:695`, `:3502`) y el chip `:2171-2172` se pinta en TODA tarjeta activa cuando el toggle está encendido, repintando desde `ultimaBusqueda` sin petición (`:3505`). «fuente: PAA / certeza: medido / costo: peticion» son incorrectos: es un hecho estructural (la fila viene de `/api/oportunidades`), certeza «publicado», costo cero.
- Memoria: «Plan Anual de Adquisiciones · qué va a salir antes de que salga (ago 2026)» (badge SOLO con PAA encendido; no se pinta fuera).

## D-77 · Estado y «Ver en SECOP II ↗» — CONFIRMADO
- `estado_del_procedimiento` en `lib/proyeccion.CAMPOS` (`:43`), sobrevive a la proyección de sync (`transformar` `:138-141`, requerido por `sync.js:68`); pintado tal cual `public/app.js:2209`. `urlDeFila` está en `lib/proyeccion.js:77-81` (la ficha dice 71-75: desfase de 6 líneas), `out.urlproceso = urlDeFila(fila)` `:92`; `urlSegura` `app.js:47` solo http(s); enlace `:2214`.
- Repro `urlDeFila`: objeto {url} → url; «  » → null; {} → null; sin campo → null.
- Valores «Publicado»/«Convocado» aparecen como valores de SECOP en `tests/e2e.js:249,2027`; A4 fila 40 confirma la columna. Costo sync: real.
- Memoria: «El enlace al proceso en SECOP II vuelve, y trae un dato basura debajo (8-sep-2026)», «⚠️ UNA `fase` REZAGADA MATABA CONVOCATORIAS PUBLICADAS, Y NO DEJABA RASTRO (20-ago-2026)».

## D-78 · Baja media con la que gana — CON CONDICIONES
- Ruta real: `lib/competencia_detalle.js:636-661` (la ficha cita `competencia_detalle.js:649-653` en handlers: ese fichero no existe; el op es `lib/handlers/inteligencia/detalle.js:175`). Se sirve por clic (op detalle con `?adjudicatario=`), con caché v7 (`:134`).
- La ficha dice «índice inverso con {n, suma, hist}»: FALSO. `{n, suma, hist}` se acumula POR PETICIÓN escaneando los chunks del histórico (`:567-588`); no hay índice inverso. La regla es la del índice (`bajaDeFila`, `subRegistro`, `encogerBaja`); lo que se enseña es `mediana_pct` = medida (no la encogida, que viaja aparte en `encogida`).
- Repro: `subRegistro({n:0,suma:0,hist:{}},5)` → `baja_mediana null, nivel sin_dato`; `bajaDeFila` con NIT «No Definido» → `descarte adjudicatario_no_definido`; motivo real «SECOP no publica el NIT del ganador en k de los procesos que ganó…» (`:648-653`).
- Lenguaje: el rótulo dice «Baja MEDIA» y la cifra es la MEDIANA (`mediana_pct`, `app.js:3341`; `promedio_pct` existe aparte). Corrección propuesta: «Baja con la que suele ganar: 3 % por debajo del presupuesto oficial (14 procesos ganados con presupuesto y valor adjudicado)».
- Memoria: «Lote «B9b-competencia-departamento» …», «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)», «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)».

## D-79 · El modal de la entidad — CONFIRMADO
- `pintarDetalle` `public/app.js:3078-3118`: banda (● de `COMPETENCIA_ENTIDAD` `:551-556`, no emoji) → resumen → `htmlEntidadPorAnio` → `htmlProrrogaEntidad` («Movió la fecha de cierre en p de los p+n…» `:3042`) → `htmlPlazoAdjudicacion` («Suele tardar N días de oficina en adjudicar…» `:3056-3061`, sin dato con el mínimo) → `htmlDesiertos` (`:3070-3076`) → encogimiento → `d.mensaje` → adjudicatarios («Quién gana aquí» `:2969`) → proponentes (`:2858`) → ejecución (`:2893`). Orden de la ficha coincide.
- Memoria: «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)», «Lote «B9b-competencia-departamento» …», «Lote «B7a-tablero-mis-procesos» de la consultoría del 4-sep · M-DGF-09, M-DGF-11, M-DGF-15 (6-sep-2026)».
