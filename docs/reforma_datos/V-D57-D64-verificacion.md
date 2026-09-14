# Verificación adversaria de D-57 … D-64 (13/14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Árbol: `/home/user/portafolio-estrategico`, sin modificar (`git status --short` vacío al cierre).
Todo lo afirmado lleva ancla `ruta:línea` o un comando ejecutado con su salida. Los datasets de
datos.gov.co siguen detrás del proxy (403, ver A4 fila 1): lo que dependa de ellos va como NO VERIFICABLE.

Resumen: 0 confirmados, 8 con condiciones, 0 refutados. Cinco de los ocho («nuevo» en la ficha) YA
existen en pantalla o en una función: D-61, D-62, D-63, D-64 se enseñan hoy; D-59 y D-60 tienen la regla
que hay que LLAMAR. Ninguno es falso; todos prometen algo más de lo que el árbol sostiene.

---

## D-57 · Experiencia por contratos de cada socia — CON CONDICIONES

**FUENTE.** `config:experiencia` es UNA clave sin perfil (`lib/almacen.js:180`) y
`guardarExperiencia(redis, contratos)` no recibe perfil (`lib/experiencia.js:251-263`). El archivo de
Génesis existe: `experiencia_genesis_106.json` (49 556 B) → ejecutado
`node -e 'require("./experiencia_genesis_106.json").contratos.length'` = **106**, claves
`no_contrato, entidad, objeto, modalidad, participacion, valor_cop, valor_smmlv, fecha_inicio, fecha_fin`
(**no hay campo «año de RUP»**: el «(RUP 2023)» del corto no tiene columna). PRODIAC: **327 es el número
de registros de experiencia contado en el certificado** (`lib/perfiles.js:160 contratosRup: 327`; MEMORIA
§ «Los tres RUP, leídos enteros, y PRODIAC entra como segunda socia (11-sep-2026)», tabla «contratos
acreditados | 33 | 108 | 327»), no un archivo de contratos: `ls *.json` → solo `experiencia_genesis_106.json`.
**Carga en producción: NO VERIFICABLE** (sin credenciales Redis).
**YA EXISTE (parcial):** el conteo por socia ya se enseña como «contratos acreditados» en el pulso
(`lib/handlers/perfil/pulso.js:57 contratos_acreditados: numONull(p.contratosRup)`, `public/pulso.js:636`,
`public/empresa_libro.js:78`). Lo que NO existe es el objeto/valor por contrato POR PERFIL.
**VERDAD.** «acredita 14 contratos de pavimentación» exige clasificar objetos por tema: hoy solo
`lib/cobertura_rup.js` cruza objetos (por vocabulario, `tokenizar/similitud`, `lib/experiencia.js`) y lo
hace contra el histórico, no contra un pliego. «Acredita» además promete que esos contratos VALEN para el
pliego (el pliego fija requisitos de valor, UNSPSC y antigüedad), cosa que la aplicación no mide.
**MEMORIA.** Coherente con «Sin experiencia cargada el score viaja en null, jamás en 0»
(§ «Experiencia ejecutada y cobertura del RUP (ago 2026)»); la ficha lo respeta («sin cargar», nunca 0).
**COSTO** «clic»: real si la lectura es un `op` (`/api/admin?op=experiencia` GET ya lo es, con token).
**LENGUAJE.** Registro correcto. Corrección: «Génesis tiene registrados 14 contratos de pavimentación por
$9.800 millones · PRODIAC: contratos sin cargar» (sin «acredita», sin «RUP 2023»).
**Condiciones:** (1) clave por perfil (`config:experiencia:{perfil}`) y `guardarExperiencia(redis, perfil,
contratos)` ANTES de cargar dos socias; (2) archivo de PRODIAC (no existe); (3) «pavimentación» solo si se
reutiliza `tokenizar/similitud` de `lib/experiencia.js`, no una regex nueva; (4) sin «acredita».

## D-58 · Lo que el pliego pide en consorcio — CON CONDICIONES

**FUENTE/REPRODUCCIÓN.** `node -e` con `detectar()` real (`lib/dictamen_reglas.js:264`) sobre
«CONVOCATORIA LIMITADA A MIPYME … integrante que aporte la experiencia … 40 % … máximo de integrantes … 3»
→ **`{}`** (nada detectado): la regla NO existe, como dice la ficha. `grep -rn -i mipyme lib/` solo da
`lib/socio_por_proceso.js:45-118` (`UMBRAL_MIPYME_2026`, `avisoMipyme`) y comentarios de `lib/perfiles.js`.
**YA EXISTE y hay que LLAMAR:** `avisoMipyme` (`socio_por_proceso.js:104-118`, cuya `frase` dice
literalmente «No publican si la limitaron … es un riesgo … no un hecho»: el detector nuevo es el que lo
vuelve hecho); `repartoSugerido` con `PARTE_SI_APORTA_EXPERIENCIA` (:antes de la función; A3 § b: 40 %
es el techo del rango «30 % a 40 %» de `guia_proceso.js:535`); `ADVERTENCIA_PARTICIPACION_MINIMA`
(`lib/consorcio.js:56`: «esos umbrales NO están verificados aquí»).
**VERDAD.** Riesgo concreto: los Documentos Tipo traen SIEMPRE una sección «Convocatoria limitada a
Mipyme» que a menudo dice «no aplica / no se limita». Una regex que case el título diría «la limita»
cuando no: es la lección de `SIN_ANTICIPO_RE` (`dictamen_reglas.js:85`) y del `excluye` de plantilla
(:53-56). El 40 % tiene que leerse JUNTO al concepto (patrón `porcentajeJuntoA` de `lib/deducciones.js`).
**MEMORIA.** § «La cláusula gana al índice: el detector del pliego ya no cita la tabla de contenido
(3-sep-2026)» (el índice del pliego menciona el término sin afirmarlo); § «Los documentos del proceso se
leen solos al guardar en Mis procesos (3-sep-2026)» (los hechos llevan `hechosVersion`: un detector nuevo
obliga a subir `REGLAS_VERSION`, `dictamen_reglas.js:33`); § «Con cuál de mis socios conviene ESTE
proceso · `lib/socio_por_proceso` (11-sep-2026)».
**COSTO** «clic»: `op=dictamen` lee texto guardado; correcto.
**LENGUAJE.** «Mipyme» no está en pantalla ni en el glosario (`grep -i mipyme public/` → 0; la frase
vigente dice «empresas pequeñas», `socio_por_proceso.js:113`). Corrección: «El pliego limita la
convocatoria a empresas pequeñas (pág. 12) · Exige al menos el 40 % a quien aporte la experiencia
(pág. 31) · Máximo 3 integrantes».
**Condiciones:** negación/«no aplica» excluida con prueba de mutación; porcentaje adyacente al
concepto; `REGLAS_VERSION` subida; sin pliego `sin_dato`; vocabulario «empresas pequeñas».

## D-59 · Estampillas vistas en pliegos de esta entidad — CON CONDICIONES

**FUENTE/REPRODUCCIÓN.** `leerDeducciones` real sobre «estampilla Pro-Desarrollo del 1,5 % y la
estampilla Pro-Universidad del 1 %» → dos conceptos (`estampilla` 1,5 · `tasa_prodeporte` 1), `total_pct`
2,5, `incompleto: true`; sin texto → `total_pct: null` (ejecutado; ver salida en el cuerpo del encargo).
Los hechos por proceso ya guardan `deducciones` (`lib/documentos_proceso.js:289, 393-394`) bajo
`Docs.claveDocs(id)` (`lib/handlers/pliego/documentos.js:55-57`): **por PROCESO, no por entidad; no existe
ningún acumulador** (`grep estampilla lib/handlers public/` → solo el editor de Precios, `app.js:5114-5159`).
La fila del corpus trae `entidad` y `nit_entidad` (`lib/proyeccion.js:41`); el modal de la entidad existe
(`public/app.js:927` «Historial de la entidad», `:3456`).
**VERDAD.** Bien planteado como observación con fecha. Faltan: (a) la FECHA por lectura (los hechos no la
llevan; `leido_el` sí está en `claveDoc`, `documentos.js:188`); (b) deduplicar por `id_proceso` (se leen
hasta `MAX_PLIEGOS_PLAN` versiones del mismo pliego: contarlas daría «3 pliegos» de un solo proceso);
(c) el NIT de entidad se comparte entre regionales (`seguimiento.js:393` «puede sumar hermanas»);
(d) un solo «1,5 %» cuando dos pliegos difieren es una cifra falsa: enseñar rango o por concepto.
**MEMORIA.** § «Las deducciones se LEEN del pliego (ago 2026 · punto 6 de la hoja de ruta)» («cota
inferior», «nada se inventa»); § «Lo APARCADO por decisión del dueño (20-ago-2026)» (enlazar a Precios
sigue aparcado: la ficha lo respeta); § «Los documentos del proceso se leen solos al guardar en Mis
procesos (3-sep-2026)».
**COSTO** «clic» para leer; la ESCRITURA ocurre en la lectura de documentos (`handlers/pliego/documentos`),
que el navegador dispara al guardar: declararlo.
**LENGUAJE.** Correcto; «Estampillas vistas en pliegos de esta entidad» dice el hecho.
**Condiciones:** acumulador nuevo (clave por `nit_entidad`+nombre, entrada `{concepto, pct, fecha,
id_proceso}`), dedupe por proceso, fecha real, rango si difieren, llamar a `leerDeducciones` sin regex nueva.

## D-60 · Capacidad de verdad: contratos en ejecución desde SECOP II — CON CONDICIONES

**REPRODUCCIÓN.** `calcSCE([])`, `calcSCE(null)`, `calcSCE(undefined)` → **0** con advertencia SOLO en
logs (`lib/capacidad.js:73-76`; `grep "optimista\|en ejecución" public/app.js` → 0: la pantalla no lo
dice). Defecto hermano que la ficha no ve: `calcSCE([{obra:true, v:null, …}])` → **0** (`:81 (c.v || 0)`:
un valor ilegible es CERO, contra la regla dura) y sin `plazoMeses` cuenta el saldo entero (→ 1000).
Helder lleva `sce` a mano con `restanMeses` literal (`lib/perfiles.js:104-107`; MEMORIA § «La pantalla
prometía una revisión horaria que nadie hacía (12-sep-2026)»: «cuenta atrás que nunca corre»).
`validarSce` existe (`lib/config_rup.js:150-160`): el certificado a mano ya tiene camino; Génesis y
PRODIAC `sce: []` (`perfiles.js:133,177`); NIT de los tres perfiles en el árbol (`:83,120,155`, con dígito
de verificación).
**YA EXISTE y hay que LLAMAR:** `resumirVigentes` + la consulta jbjy con `estado_contrato in ('En
ejecución','Modificado','Suspendido','Prorrogado')` (`lib/handlers/perfil/seguimiento.js:62-66, 370-380`);
`consultarContratos` (`lib/socio.js:275-331`) trae `valor_del_contrato, fecha_de_fin_del_contrato,
estado_contrato` por `documento_proveedor`. `valor_pagado` sin dato para media Colombia: confirmado
(`lib/ejecucion.js:18`). Datos.gov.co desde aquí: 403 (NO VERIFICABLE).
**VERDAD.** (1) El ejemplo es incoherente: «$4.471 M descontando $1.900 M» — $4.470.921.189 es la K de HOY
con SCE = 0 (D-dueño:385); descontando, la cifra baja. (2) jbjy da el valor del CONTRATO, no la
participación del perfil en un consorcio: `pct` desconocido → SCE sobrestimado → K subestimada → falso
NEGATIVO, el caro en oportunidades. (3) El formato de `documento_proveedor` (con/sin DV) no está
verificado: `nitONull`/`digitos` normalizan, pero sin la consulta viva no se sabe si «901096271-1» cruza.
(4) La K se calcula por fila en `op=listar` (`lib/puertas`): la consulta externa NO puede ir ahí; el SCE
se guarda (por perfil, con fecha) y `listar` lo lee.
**MEMORIA.** § «La pantalla prometía una revisión horaria que nadie hacía (12-sep-2026)»; § «Puertas,
probabilidad y valor esperado (ago 2026)»; § «Los tres RUP, leídos enteros, y PRODIAC entra como segunda
socia (11-sep-2026)».
**COSTO** «externo»: real; declarar caché y fecha de consulta.
**LENGUAJE.** «Capacidad de facturar hoy» es aceptable (la pantalla ya dice «Cuánto puede facturar»,
`app.js:2198`); «calculado» bien declarado. «$1.900 M» → «$1.900 millones».
**Condiciones:** arreglar `c.v || 0` → `null` con el contrato marcado «sin valor»; `pct` desconocido
declarado y excluible; SCE guardado por perfil (no en `listar`); ejemplo coherente; certificado a mano gana.

## D-61 · Cara a cara ante la entidad (competidor) — CON CONDICIONES (ya existe)

**YA EXISTE.** `ante_esta_entidad.veces_presentado / veces_ganado` (`lib/seguimiento.js
fichaCompetidor`) se ENSEÑAN hoy en la tabla de competidores de Mis procesos (`public/app.js:4549-4550`,
columnas separadas; el cociente no se calcula: 4 líneas sin división), servidas por
`/api/perfil?op=seguimiento&detalle=<id>` (`lib/handlers/perfil/seguimiento.js:640-651`), caché 1 h
**solo si `det.ok`** (`:650`; confirmado «no se cachea si falla»), tope `TIEMPO_MAX_MS` 6 000 ms (`:44`).
**VERDAD.** «(desde 2025)» no lo sostiene la consulta: `hgi6` cubre `fecha_publicaci_n` **2015-02-14 →
2026-08-14** (`docs/datos.md § «5.1 `hgi6-6wh3` — Proponentes por Proceso SECOP II»`) y la consulta de «veces» no pone suelo de fecha (`:352`): cuenta
desde 2015. «hgi6 no tiene filas para procesos abiertos»: confirmado (`docs/datos.md § «2. Inventario de fuentes»`). Lo NUEVO de la
ficha es el SITIO (modal del competidor, `app.js:3383`): ese modal nace del índice del corpus, que NO
ingiere `codigo_entidad` (A4 fila 58: descartada; solo `nit_entidad`, `proyeccion.js:41`), así que allí
las «veces» solo se pueden pedir por NIT de entidad (suma hermanas) o hay que ingerir la columna.
**MEMORIA.** § «Lote «B4b-pulso-cobertura» de la consultoría del 4-sep · M-DGF-03, M-DGF-04, M-DGF-12
(6-sep-2026)» (consulta única, «si respondió, el que no aparece tiene cero»).
**COSTO** «externo»: real; el 6 s sin caché en fallo está en el árbol.
**LENGUAJE.** Correcto; sin «tasa» ni «probabilidad». «ganó 6 de las 9» es frecuencia natural válida.
**Condiciones:** llamar a `fichaCompetidor` y a `detalleCompetencia`, no duplicar la consulta; quitar
«desde 2025» o poner suelo de fecha en el `$where`; en el modal del competidor declarar la llave (NIT).

## D-62 · En todo SECOP II (segunda cifra) — CON CONDICIONES (ya existe)

**YA EXISTE.** `consultarAdjudicaciones` (`lib/socio.js:333-360`) sale por `verificarSocio` →
`/api/inteligencia?op=socio` (`lib/handlers/inteligencia/detalle.js:130-134`) y se ENSEÑA en «Procesos que
ha ganado (SECOP II)» con total, valor y por año (`public/app.js:10710`). No está exportada suelta
(`socio.js:473`): el plan la exporta o llama a `verificarSocio`.
**VERDAD.** «desde 2024» es falso para esta consulta: el `$where` es `nit_del_proveedor_adjudicado=… AND
adjudicado='Si'` sin fecha (`:349-351`): cubre TODOS los años publicados en p6dx. «(todas las
modalidades)» sí lo dice la `nota` (`:335`). `$group=entidad` no existe hoy (solo `count(distinct entidad)`
por año): añadirlo es otra petición. 403 desde aquí: latencia NO VERIFICABLE.
**MEMORIA.** § «Verifique a su socio antes de firmar (ago 2026)» (best-effort, tope, «lo que no está no se
inventa»).
**COSTO** «externo»: real.
**LENGUAJE.** Correcto. Corrección: «En todo SECOP II: 41 contratos por $380.000 millones (todos los años
y modalidades publicados)»; jamás sumar con la cifra del corpus (ya lo dice la ficha).
**Condiciones:** quitar «desde 2024» (o filtrar por fecha explícita); exportar/llamar la función existente;
solo con NIT; «sin dato» si falla.

## D-63 · Archivos de oferta cargados a este proceso — CON CONDICIONES (ya existe)

**YA EXISTE.** `planDeLectura().resumen.de_proponentes` (`lib/documentos_proceso.js:266`) y en pantalla:
«N archivos más son ofertas de otros proponentes» (`public/app.js:4122`). **Reproducido** con 5 archivos y
`cierre 2026-09-04` → `de_proponentes: 4`; SIN cierre → `3` («Oferta.pdf» cambia de lado): la cuenta
depende del cierre (`:210-211, 219`).
**VERDAD.** «se leyeron 3 nombres de empresa» **no tiene regla**: no hay extracción de nombres desde
`nombre_archivo` (solo `RE_PROPONENTE` de tipos de documento, `:183`), y 4 archivos pueden ser de UN
proponente (RUP + carta + propuesta + oferta): el conteo de archivos NO es un conteo de oferentes. La
cuenta se hace tras `.slice(0, MAX_ARCHIVOS_INDICE=150)` (`:120, 244`): en procesos con más de 150
archivos queda truncada sin aviso. El «~3 días por detrás» está en el árbol (`:20`).
**MEMORIA.** § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)» («separa
lo de la ENTIDAD de lo que suben LOS PROPONENTES … por nombre y por fecha»).
**COSTO.** El índice se pide al guardar (externo, ya pagado); enseñarlo es «clic». La ficha dice «externo»:
aceptable si se refresca.
**LENGUAJE.** Correcto. Corrección: «Archivos de oferta cargados: 4 (no dice cuántas empresas: un
proponente sube varios)»; quitar «se leyeron 3 nombres de empresa» hasta que exista un lector con prueba.
**Condiciones:** llamar a `resumen.de_proponentes`; sin nombres; declarar dependencia del cierre y el tope.

## D-64 · La póliza de seriedad y cuándo pedirla — CON CONDICIONES (ya existe)

**YA EXISTE (casi entero).** `guiaDe` real con presupuesto 6.365.863.690 →
`dinero.garantia_seriedad_asegurada_cop = 636586369` y requisito `garantia_seriedad` con «cerca de $637
millones asegurados … cinco días hábiles de anticipación» (ejecutado; `lib/guia_proceso.js:394-396, 547`);
sin presupuesto → `null` (bien). El paso «Pida la garantía de seriedad a su aseguradora» ya lleva FECHA
`sumarHabiles(cierre, −5)` (`:446-448`), y la tabla de dinero la enseña (`public/app.js:4230`).
**VERDAD.** El par de bases está en el árbol: guía = 10 % del PRESUPUESTO (`:95`); `NORMAS_CITABLES`
`seriedad_10_oferta` = «al menos el 10 % del valor de la OFERTA … en subasta y concurso, del presupuesto»
(`lib/dictamen.js:338-340`), con `literal_leido: false` (`:345`): la norma NO está leída. Como la oferta
es ≤ presupuesto, el 10 % del presupuesto es una COTA SUPERIOR del asegurado: decirlo así («como máximo
cerca de…») resuelve el par sin leer la norma; el pliego manda. Los «5 días» son consejo propio de la
aplicación (sin fuente externa; `:396,448`), no un plazo: no presentarlo como norma.
**MEMORIA.** § «La guía le daba al contratista una lista de tareas con las fechas hacia atrás
(12-sep-2026)» y § «El paso a paso se leía hacia atrás cuando había un festivo en la última semana
(13-sep-2026)» (cinco HÁBILES, con festivos); § «Don Héctor · la hipótesis verificada contra fuentes
vigentes y el diseño del dictamen del pliego, sin código todavía (2-sep-2026)» («la seriedad es al menos
el 10 % de la OFERTA, no…»).
**COSTO** «petición»: la guía se sirve con la fila; correcto.
**LENGUAJE.** «días de oficina» ES el vocabulario visible (`public/glosario.js:86`; MEMORIA § «Lote
«B9b-competencia-departamento» …»), aunque `guia_proceso.js:396,448` aún dice «días hábiles» (incoherencia
del árbol, no del corto). «≈ $637 M» → «cerca de $637 millones». Corrección: «Necesitará una póliza de
seriedad: suele ser el 10 % (como máximo cerca de $637 millones asegurados; el pliego fija la cifra);
pídala a su aseguradora al menos 5 días de oficina antes del cierre».
**Condiciones:** llamar a `dinero.garantia_seriedad_asegurada_cop` y al paso fechado, no recalcular;
«como máximo» hasta leer la norma; «suele ser» + «el pliego manda».

---
Comandos ejecutados (todos desde la raíz del repositorio): `node tests/mapa.js experiencia|deducciones|
capacidad|dictamen_reglas|detalleCompetencia|socio.js`; `node -e` con `leerDeducciones`, `calcSCE`,
`detectar`, `planDeLectura`, `guiaDe` reales; `grep -n` acotados citados en cada apartado; `sed -n` de las
secciones de memoria nombradas. Sin escrituras en el árbol.
