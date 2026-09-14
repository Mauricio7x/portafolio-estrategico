# V · Verificación adversaria de D-25 … D-32 (13/14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Postura: refutar. Cada veredicto lleva su reproducción ejecutada (comando y salida) o el rótulo NO VERIFICABLE.
Árbol intacto: `git status --short` vacío al terminar. Guiones auxiliares: `v_d29_ganancia.js` (este directorio).

## Resumen

| id | veredicto | en una línea |
|---|---|---|
| D-25 | con_condiciones | Los campos viajan ya en la fila y la cabecera ya pinta «entidad · departamento»; falta filtrar el literal «No Definido» de `ciudad_entidad` (hoy se pinta), declarar que es la sede, y LLAMAR la regla de `lugarDeEjecucion` (public/calendario.js). Costo real: ninguno, no «petición». |
| D-26 | con_condiciones | El «✓» es `ubicacion_valida` (lista UBICACION_VALIDA, no la distancia del chip de zona): es OTRA noción, y es lo que filtra «Solo mi zona». El campo debe seguir viajando (la suite lo exige). |
| D-27 | refutado | La instrucción «cargue el ingreso de su RUP en Mi empresa» no se puede cumplir: el RUP NO reporta el ingreso operacional (por eso se estima) y Mi empresa no tiene campo donde cargarlo. |
| D-28 | con_condiciones | `plazoMesesDe` devuelve **12** sin duración (reproducido), no `null`: la regla «null sin duración» YA existe en `lib/guia_proceso.js:219` y es la que hay que llamar; `resumen.js:528` publica el 12; el editor convierte null en 8/12 de todos modos. Costo: petición, no clic. |
| D-29 | confirmado | Reproducido: sin credencial y con cuantía de $500 M la celda dice en el `title` «Sin presupuesto oficial publicado…» (motivo falso) y nada visible. Los dos datos (`ganancia.motivo`, `finanzas_visibles`) existen y ya viajan. |
| D-30 | con_condiciones | Ningún módulo modela el puntaje (cierto), pero la probabilidad SÍ ajusta por PRECIO (paso 4): decir «no mide… precio» contradice el cálculo. «Para ganar» sobre las TRES celdas rotula también «lo que deja», que no es ganar. |
| D-31 | confirmado | Guardar abre sola la guía (ocho casillas, requisitos, paso a paso) y lee los documentos: la promesa del rótulo es cierta. Ancho en teléfono: NO VERIFICABLE sin navegador. |
| D-32 | con_condiciones | Medido: 6.012 ms y 6.007 ms con la fuente colgada (en paralelo, ≈6 s); no se cachea si fallan. La caché es UNA clave con el cuerpo entero: la respuesta ligera no puede guardarse bajo ella. «Se presentan» → «se han presentado» (son procesos cerrados). |

---

## D-25 · Entidad · municipio · departamento — con_condiciones

**Fuente (existe).** `lib/proyeccion.js:42` proyecta `"departamento_entidad", "ciudad_entidad"`; la fila de `op=listar` es `{...sinAdjudicacion(l), …}` (`lib/handlers/procesos/listar.js:841,851`) y `sinAdjudicacion` conserva esos campos (reproducido abajo con `duracion`, misma mecánica). `docs/datos.md § «6. Censo de columnas de `p6dx-8zbt` para los filtros (Fase 8 · 2026-08-16)»`: `ciudad_entidad` 100 % poblada, «también con "No Definido"».

**Ya existe.** La cabecera de la tarjeta YA pinta «entidad · departamento» (`public/app.js:2149`), filtrando el literal «No Definido» SOLO en el departamento. El formato «ciudad · departamento» detrás de la entidad ya existe en `public/calendario.js:lugarDeEjecucion` (`sede = [ciudad, departamento].join(" · ")`, fila «Lugar de ejecución» en `:282`), y `lib/guia_proceso.js:263` publica `donde: {entidad, departamento, ciudad}`.

**Verdad — reproducción del literal-trampa** (`node -e` con la misma expresión de `app.js:2149` y del chip `:2196`):
```
cabecera hoy: ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Tolima
chip plegado hoy: No Definido            ← ciudad_entidad = "No Definido" se pinta tal cual
guia donde.ciudad: No Definido           ← lib/guia_proceso.js:263 tampoco lo filtra
```
Si D-25 concatena `ciudad_entidad` sin la guarda, la tarjeta dirá «… · No Definido · Tolima». La guarda de `app.js:2149` vale solo para el departamento: regla «un arreglo que solo cubre el caso reproducido deja hermanos vivos».

**Memoria.** § «El lugar de ejecución ES la entidad, «Para Helder» abre la pestaña, y Tailwind medido de verdad (31-ago-2026, segunda pasada)»: decidido que el valor del campo es la ENTIDAD con su municipio detrás, y que la ficha DECLARA en la misma pantalla que los datos abiertos no publican el sitio («el rótulo SIN la frase vuelve a afirmar lo que no se sabe», con cerradura por mutación). D-25 es coherente si conserva la declaración. A4 filas 3-4 confirman: sede, 7,6 % «No Definido» en departamento.

**Costo.** Declarado «peticion»; real: NINGUNO — los tres campos ya viajan en cada fila hoy. No hay bytes ni cómputo nuevos.

**Lenguaje.** Texto corto sin tuteo ni emoji (`lib/lenguaje_pantalla`: `emoji=false tuteo=null`).

**Condiciones.** (1) Filtrar «No Definido» en `ciudad_entidad` igual que en el departamento (y en `lib/guia_proceso.js:263`, hermano). (2) Declarar que es la sede de quien contrata (en el `title` no basta en teléfono; una nota o el propio rótulo). (3) Llamar UNA regla de formato compartida entre tarjeta y calendario (`lugarDeEjecucion` vive en `public/calendario.js`; la tarjeta está en `public/app.js` — moverla a `public/glosario.js` o a un módulo compartido, no copiarla). (4) Corregir costo a «ninguno (ya viaja)».

## D-26 · Chip plegado «PURIFICACIÓN ✓» — con_condiciones

**Fuente.** `lib/negocio.js:166-175`: `ubicacionValida(lic)` compara `ciudad_entidad`/`departamento_entidad` con `process.env.UBICACION_VALIDA` (por defecto `"BOGOTÁ D.C."`); `enriquecer` lo publica como `ubicacion_valida` (`:232`), y `enriquecer` corre en la proyección de ingesta (`lib/proyeccion.js:30`) → costo «sync» correcto.

**Reproducción** (`node -e` con `enriquecer` real, sin `UBICACION_VALIDA` en el entorno):
```
ubicacion_valida Purificación/Tolima = false
ubicacion_valida sin ciudad/dpto     = false   ← «sin dato» sale como false, no como null
```
**Verdad.** La ficha dice «el chip de zona ya dice lo que decide». No es el mismo dato: `chipZona` pinta `l.zona` de `lib/accesibilidad.evaluarZona` (distancia por departamento desde la base del perfil, `lib/accesibilidad.js:98-104`), que ORDENA la lista (`listar.js:816-818`); `ubicacion_valida` es lo que FILTRA el select «Ubicación: Solo mi zona / Fuera de mi zona» (`public/index.html:3552-3556` → `f-ubicacion` → `?ubicacion_valida=` en `app.js:1085`, `listar.js:518,639`). No participa en puertas ni probabilidad (grep en `lib/`: solo `negocio.js` y `listar.js`). Quitar el «✓» quita la única huella visible en la tarjeta de lo que ese filtro usa; con el filtro activo todas las filas son «✓», así que la pérdida es pequeña, pero la ficha debe decir que son dos nociones (y que «sin ciudad ni departamento» es `false`, no «sin dato»).

**Suite.** `tests/e2e.js:10049` exige `typeof l.ubicacion_valida === "boolean"` en la fila: el campo sigue viajando; D-26 solo deja de pintar. El carácter «✓» no lo caza `RE_EMOJI_UI` (reproducido: `emoji=false`), pero la cerca de la guía prohíbe «RUP ✓ / K ✓» (`tests/e2e.js:13962`): retirarlo va en la misma dirección.

**Memoria.** § «Auditoría integral del 1-sep-2026 · trece frentes» y § «Lote «zona y RUP en PDF» de la consultoría del 4-sep · M-SEG-10, M-INF-01 (6-sep-2026)» (únicas menciones de `ubicacion_valida`, por `node tests/mapa.js ubicacion_valida`); ninguna fija el chip.

**Condiciones.** (1) `ubicacion_valida` sigue en la respuesta (e2e:10049). (2) La ficha corrige «afecta»: el filtro «Solo mi zona» y el chip de zona son nociones distintas (lista de la variable de entorno vs. distancia); si el filtro se conserva, su rótulo debe seguir siendo cierto sin el «✓». (3) Certeza: «publicado» no es exacto — es un CALCULADO sobre publicados contra una lista de configuración.

## D-27 · «Capacidad calculada con ingreso estimado: cargue el ingreso de su RUP en Mi empresa» — refutado

**Fuente (existe).** `lib/rup.js:138` publica `co_estimado: coEstimado(perfil)`; `lib/capacidad.js:100-103` `coEstimado = perfil.ingresoOp == null`; `coDe` (`:90-98`) estima `CO = utilidadOp × MARGIN_MULTIPLIER` cuando no hay ingreso (con `null` si tampoco hay utilidad: `:96`). Reproducido: `coEstimado({})=true`, `coEstimado({ingreso:1,utilidad:100})=true` (la clave es `ingresoOp`, no `ingreso`). Sin token: `sinFinanzas` deja `rup.co_estimado = null` (reproducido: `rup={"co_estimado":null,"k_cop":null}`) → «sin token no se pinta» es cierto.

**Verdad — la instrucción es falsa e imposible de cumplir hoy.**
- El RUP **no reporta** el ingreso operacional: `lib/rup_pdf.js:719` (`ingreso_operacional: null, // el RUP no lo reporta`), `lib/perfiles.js:44,99,163` («el RUP no lo reporta → CO se estima»), `lib/perfil_manual.js:97` (`ingreso_operacional: null` en la entrada de «tres datos»). Decir «cargue el ingreso de su RUP» manda buscar en el certificado un dato que no está en él.
- Mi empresa **no tiene campo** para el ingreso: `grep ingreso public/index.html` → nada; la única entrada es `#rup-archivo` (`public/index.html:1875`, acepta pdf/jpg/png/zip); «Actualizar datos» (`:2416-2418`) es la sincronización con SECOP II, no un formulario. El único camino que acepta `ingreso_operacional` es el JSON de `/api/admin/rup` (`lib/handlers/admin/rup.js:2` «archivo JSON», etiqueta `:237`), que el usuario sin terminal no puede fabricar.
- El chip actual ya declara el supuesto con una frase honesta en el `title` (`public/app.js:2198`: «…sirve para orientar, no para acreditar»). Lo que DUE-24 pide («decir qué hacer») no tiene hoy un «qué hacer» real.

**Hermano vivo (para el plan).** `public/app.js:9046`: `const co = ind.ingreso_operacional || (ind.utilidad_operacional || 0) * 16.7;` — copia de `coDe` en el cliente con `|| 0` («sin dato» → 0) en la vista previa de Mi empresa. Regla «no reescribir una regla que existe: llamarla» y «sin dato ≠ cero».

**Memoria.** § «Puertas, probabilidad y valor esperado (ago 2026)» (`co_estimado` entre las cifras que viajan en `null` sin token); § «Fase 2 · Puerta de entrada de 60 segundos (ago 2026)» (`null × 16,7 = 0` cerraba la puerta por ignorancia; la ausencia se propaga en `null`); § «La cifra que decía «Puede facturar hasta» era el TECHO, no la K (13-sep-2026)» (el renglón D-12 donde se fundiría).

**Corrección literal posible.** «Capacidad calculada con un ingreso estimado: el RUP no trae el ingreso operacional, así que se estima con la utilidad. Sirve para orientar, no para acreditar.» — sin instrucción, hasta que exista un campo para cargarlo (eso sería un dato nuevo con su propia ficha: campo en Mi empresa → `perfiles.js:414` ya lo leería). Con esa corrección el dato sobreviviría como «se_pliega» dentro de D-12.

## D-28 · «Calcular mi precio» lleva el plazo — con_condiciones

**Fuente (existe).** `duracion`, `unidad_de_duracion` en la proyección (`lib/proyeccion.js:44`; `CAMPOS.includes("duracion") = true`, reproducido) y en la fila (`sinAdjudicacion({duracion:"90",unidad_de_duracion:"Días",plazo_meses:3,oferentes:4})` → `{duracion:'90', unidad_de_duracion:'Días', plazo_meses:3}`). `qApu` lee `l.plazo_meses` (`public/app.js:2122`) y `listar.js` no lo publica (grep `plazo_meses` en `lib/handlers/procesos/listar.js`: ninguna línea) — A1 H4 confirmado.

**Verdad — la ficha describe una función que no existe así.** `plazoMesesDe` (`lib/capacidad.js:146-157`, comentario «Default 12»):
```
plazoMesesDe({})                                   = 12
plazoMesesDe({duracion:"abc",unidad:"Días"})       = 12
plazoMesesDe({duracion:"90",unidad:"Días"})        = 3
```
«`plazo_meses = plazoMesesDe(fila)` … sin duración null, no 12» exige una guarda ANTES de llamar. Esa guarda **ya existe**: `lib/guia_proceso.js:219` `const plazoMeses = l.duracion && num(l.duracion) > 0 ? plazoMesesDe(l) : null;` (y publica `plazo.meses: null` en `:266`). Es la regla que hay que LLAMAR (extraerla a `lib/capacidad` como una función con nombre, usada por guía, resumen y lista), no una tercera versión.

**Consumidores que discrepan.** `lib/handlers/perfil/resumen.js:528` ya publica `plazo_meses: plazoMesesDe(l)` → **12** sin duración. Si `op=listar` publica `null` y `op=resumen` publica `12` para la misma fila, dos consumidores del mismo campo discrepan (el propio `listar.js:848-850` prohíbe eso para `puntaje_ponderado`). Hay que alinear los dos.

**Hermanos del 12.** Aunque la fila lleve `null`: `poner("plazo-meses","plazo")` salta el valor nulo (`app.js:7345-7347`) y el campo queda en su valor por defecto **8** (`public/index.html:4022`, `value="8"`); al pedir el APU se manda `Number($("plazo-meses").value) || 12` (`app.js:7410`) y el servidor repite `Number(datos.plazo_meses) || 12` (`lib/handlers/apu/editor.js:801,868`). Es decir: sin duración legible el editor no queda «sin plazo», queda en 8 sin decirlo. Beneficio real de D-28: cuando SÍ hay duración, el plazo llega; cuando no, hace falta que el editor diga «plazo no publicado: confírmelo en el pliego» — si no, «null, no 12» solo cambia qué número mudo se usa.

**CRPC.** `calcCRPC(1000,0,null)=1000`, `calcCRPC(1000,0,24)=500` (reproducido): el 12 por defecto en la K es conservador (plazo ≤ 12 → base directa) y no hay que tocarlo.

**Costo.** Declarado «clic»; real: **petición** (se calcula por fila en `op=listar`). «+15 B por fila»: NO VERIFICABLE aquí (no se midió; el orden de magnitud es plausible: `"plazo_meses":3,`).

**Memoria.** § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados» (`plazoMesesDe` normaliza el plazo); § «Los pendientes declarados, cerrados (ago 2026)» (`plazo_meses` acotado a 600 meses en el editor: lo teclea una persona); § «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)» (plazo = `plazoMesesDe` en la guía, con la guarda de `:219`).

**Condiciones.** (1) Llamar la guarda de `guia_proceso.js:219` (extraída con nombre), no escribirla de nuevo. (2) Alinear `resumen.js:528` con la misma función. (3) Que el editor diga en pantalla cuando el plazo no venía (hoy queda en 8 mudo). (4) Costo: petición.

## D-29 · Los «—» dicen por qué — confirmado

**Fuente (existe).** `lib/ganancia.js:205-222`: sin presupuesto, `sinCifra("sin_presupuesto_oficial", "Este proceso no publica presupuesto oficial: …")` → `motivo` y `frase` viajan. `finanzas_visibles: conFinanzas` en la cabecera (`lib/handlers/procesos/listar.js:1025`; `lib/publico.js` anula `ganancia`, reproducido: `sinFinanzas → ganancia = null`). El cliente ya conserva `ultimaBusqueda.finanzas_visibles` (`public/app.js:1244`).

**Reproducción con la función real `bloqueGanancia`** (`v_d29_ganancia.js`, extrae la función de `public/app.js:1867` y la ejecuta con una `celda` de captura):
```
SIN TOKEN (ganancia:null, cuantía 500M): {"valor":"—","rotulo":"sin cifra de lo que deja","nota":"",
  "titulo":"Sin presupuesto oficial publicado no hay con qué calcular lo que deja este contrato."}
CON TOKEN sin cuantía:                   {"valor":"—","rotulo":"sin cifra de lo que deja","nota":"",
  "titulo":"Este proceso no publica presupuesto oficial: no hay contra qué calcular lo que deja."}
```
Sin credencial y con cuantía publicada, la celda afirma un motivo FALSO («sin presupuesto oficial»), y en los dos casos el motivo va solo en el `title` (`nota` vacía): en teléfono no hay tooltip (misma lección que `botonGuardar`, `app.js:3557-3562`). El comentario de `app.js:2094-2096` («…y ahí también se dice») no se cumple en el código. Defecto real; D-29 lo corrige.

**Verdad.** No convierte nada en cero; token presente e inválido sigue en 401 (`listar.js:370-376`). El texto «sin cuantía publicada» repite lo que la cabecera ya dice («Cuantía no publicada», `app.js:2156`): admisible, pero la ficha debe saberlo.

**Ya existe (redacción).** `public/lista_libro.js:112` y `app.js:1283` ya usan «solo se descarga con la clave del sitio» para el mismo hecho: conviene la misma palabra («clave del sitio»).

**Costo.** Declarado «peticion»; real: ninguno nuevo (los dos campos ya viajan).

**Memoria.** § «Puertas, probabilidad y valor esperado (ago 2026)» (sin token `null` + `finanzas_visibles:false`; token inválido 401); § «Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)» (corrección M-DOC-03: token opcional en la lista).

## D-30 · Rótulo «Para ganar» y lo que la aplicación no mide — con_condiciones

**Fuente.** Es un rótulo (sin dato). `bloqueProbabilidad` (`public/app.js:2022-2107`) pinta tres celdas: «empresas suelen competir», «1 de N se gana», y `bloqueGanancia` («lo que deja»). El modal de `op=probabilidad` (`app.js:3192-3216`, `pintarDesglose`) pinta `explicacion_simple` y `de_donde_salen_los_datos` (`lib/probabilidad_desglose.js:559-561`), que es el sitio natural (texto del SERVIDOR, sujeto a las cercas de lenguaje de la suite).

**Verdad.** (a) Ningún módulo modela el puntaje: `grep -n "puntaje\|calidad" lib/probabilidad.js lib/probabilidad_desglose.js` → nada. Cierto. (b) Pero la probabilidad SÍ tiene un ajuste por PRECIO: `lib/probabilidad_desglose.js:348-352` «PASO 4 · Ajuste por precio: hasta dónde puede bajar frente al centro del mercado» (`min(baja_maxima_del_dueño, baja_mediana_entidad)`). El texto propuesto «Lo que la aplicación no mide: los puntos que da el pliego (calidad, **precio**, apoyo a la industria nacional)» contradice ese paso tal como está escrito. (c) «Para ganar» sobre las TRES celdas rotula también «lo que deja» (ganancia), que no es «ganar»: el rótulo cabe sobre las dos primeras.

**Dominio.** MEMORIA § «Habilitante vs. puntaje — la distinción más importante del oficio»: factores de puntaje = «Calidad, precio, industria nacional, sociales»; A5 W1 confirma la confusión que D-30 ataca.

**Memoria.** § «Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)» (la tarjeta no dice «probabilidad»: el texto propuesto lo respeta); § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)» (el factor de precio existe).

**Corrección literal.** «Lo que la aplicación no mide: los puntos que da el pliego por calidad, por apoyo a la industria nacional y por criterios sociales. El precio solo entra como cuánto suele bajar esta entidad. Lea el capítulo de evaluación del pliego.» Y «Para ganar» solo sobre las dos primeras celdas (o «Cómo se gana aquí»).

**Costo.** «peticion» no aplica a un rótulo fijo: ninguno; si va en `de_donde_salen_los_datos`, es un clic (op=probabilidad).

## D-31 · Guardar dice qué da — confirmado

**Fuente.** `botonGuardar` (`public/app.js:3553-3567`): hoy «Guardar» con `title` «Guardar en Mis procesos para seguirle el cronograma y, cuando cierre, ver quiénes se presentaron» (solo tooltip). Al pulsar, `alternarGuardado` (`app.js:3572-3596`) guarda con `foto`, **abre sola la guía de ESE proceso** en Mis procesos («encargo del dueño: automáticamente») y encola la lectura de documentos (`encolarLecturaDocumentos`). Detrás: la ficha de ocho casillas (`lib/guia_proceso.js:416,588`), los requisitos con estado (`:569`; la suite exige que lo no verificable viaje «pendiente», jamás «cumple», `tests/e2e.js:13940`) y los pasos fechados (`e2e:13943-13948`). La promesa «para ver qué le piden y el paso a paso» es cierta.

**Verdad.** Un rótulo, sin cifra. «Qué le piden» es honesto porque la ficha declara «pendiente/sin dato» cuando no puede verificar. Respuesta visible a la pulsación: existe («Guardado · me interesa» / «No se pudo», `app.js:3565,3607`).

**Lenguaje.** `emoji=false tuteo=null`. Sin jerga.

**NO VERIFICABLE.** El rótulo largo comparte el pie con «Calcular mi precio» y «Ver en SECOP II ↗» (`app.js:2205-2211`): si en 400 px rompe línea o desplaza, solo lo ve un navegador real (regla de CLAUDE.md para `public/`).

**Memoria.** § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)»; § «La ficha «Lo que exige este pliego» en Mis procesos y los precios buscados por una sesión de Claude Code en Precios (4-sep-2026)»; § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)»; § «Segunda pasada del 4-sep-2026: la guía sin cuadros vacíos y Precios en tres pasos».

## D-32 · Antesala ligera del modal de la entidad — con_condiciones

**Fuente.** `detalleEntidad` (`lib/competencia_detalle.js:162`): barrido del corpus + `Promise.all([proponentesDeProcesos, ejecucionDeEntidad])` (`:482-486`), y **no se cachea** si alguna fuente viva falló (`:523-527`). `op=entidad` → `vista: "entidad"` (`api/inteligencia.js:17-24`, `lib/handlers/inteligencia/detalle.js:176`). El modal hace UNA petición (`public/app.js:3289`) y pinta `bloqueProponentes` y `bloqueEjecucion` (`:3110-3111`).

**Medición** (`node -e` con las funciones reales y un `fetchImpl` que nunca responde):
```
proponentes colgado: 6012 ms ok=false motivo=no se pudo consultar la lista de proponentes: tiempo agotado (6000 ms)
ejecucion colgado:   6007 ms ok=false motivo=no se pudo consultar el historial de contratos de la entidad: tiempo agotado (6000 ms)
```
(`TIEMPO_MAX_MS = 6000` en `lib/proponentes.js:45` y `lib/ejecucion.js:37`; en paralelo, así que el modal espera hasta ≈6 s, no 12). La suite ya ejercita el camino caído con `PROPONENTES_TIEMPO_MS=1500` (`tests/e2e.js:13215-13230`) y fija el contrato del bloque (`ok:false`, `motivo` sin id de dataset, `top: []`).

**Verdad / diseño.** Cierto que «Quién gana aquí» espera a Socrata. Riesgo real: la caché es UNA clave con el cuerpo entero (`claveCache` `v7`, `:132`; `guardarCache` `:143-144`, TTL 3.600 s `:60`). Una respuesta `ligero=1` guardada bajo esa clave serviría durante 1 h un cuerpo sin proponentes ni ejecución a la petición completa. La ligera puede LEER de la caché completa (si existe, ya trae lo vivo y no hace falta segunda petición), pero no ESCRIBIRLA. Además el cuerpo ligero debe declarar los bloques ausentes (p. ej. `proponentes: null` con motivo «se consulta al pulsar»), no omitirlos: `bloqueProponentes(d.proponentes)` recibe hoy siempre un objeto.

**Precedente.** Un parámetro que aligera la misma op ya existe: `ligero` en `alertasDelPerfil` (`lib/handlers/perfil/seguimiento.js:258`), MEMORIA § «Mis procesos deja de ser una lista y pasa a ser un EXPEDIENTE en el que se entra (7-sep-2026)» («no mandar lo que nadie lee; lo completo se pide al ENTRAR»). Parámetro, no op nueva: respeta la regla de CLAUDE.md sobre endpoints. Carga perezosa por `toggle` de un `<details>` también tiene precedente (`app.js:4739`).

**Memoria.** § «Contra quién se ha competido: proponentes en vivo (hgi6-6wh3, ago 2026)» y § «Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)» (best-effort con 6 s, `v4`/`v5` de la caché, nada de un segundo cliente HTTP): D-32 no las desmiente, las acota.

**Costo.** «clic» para la antesala; la segunda petición es «externo» (fuente viva) y en oportunidades debe declararse — ya lo hace el bloque («hgi6-6wh3» en `fuente`, la lectura dice qué es).

**Lenguaje.** «Ver quiénes se presentan y cómo ejecuta sus contratos ›»: los proponentes son de procesos YA CERRADOS (`lib/proponentes.js` lectura: «obra ya cerrada; un proceso abierto no tiene proponentes…»). Corrección: «Ver quiénes se han presentado aquí y cómo ejecuta sus contratos ›». Sin tuteo ni emoji (reproducido).

**Condiciones.** (1) La respuesta ligera no escribe la caché `v7` (o usa otra clave); puede leer la completa. (2) Bloques ausentes declarados, no omitidos. (3) Verbo en pasado. (4) Lo vivo, al pulsar, sigue sin cachearse cuando falla (regla vigente).
