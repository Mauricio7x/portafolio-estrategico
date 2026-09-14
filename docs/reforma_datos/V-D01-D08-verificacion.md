# Verificación adversaria · D-01 a D-08 (13/14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Postura: refutar salvo prueba en el árbol. Nada del repositorio se modificó (`git status --short` vacío al cierre).
Scripts de reproducción: `rep_d01.js`, `rep_d08.js`, `rep_lenguaje.js`, `rep_costo_d01.js` en esta carpeta.

## Cuadro

| id | veredicto | en una línea |
|---|---|---|
| D-01 | con_condiciones | El mecanismo se reproduce (hoy «Solo» con anticipo sin publicar; contrafáctica → PRODIAC 80/20), pero la cifra «30 % o más» no existe para la rama de caja (P3), «Mipyme» es jerga que el propio servidor ya evita, y desmiente una decisión escrita del dueño que solo él puede superar. |
| D-02 | con_condiciones | Todo lo que la ficha nombra existe (claveAdjudicatario, base ≥ 5, cargarAdjudicatario, hash sin líder); contradice en su letra el comentario-contrato de `indice_competencia.js:1168` y el `lider` debe salir SOLO con token (hoy `sinFinanzas` no toca `competencia`). |
| D-03 | con_condiciones | La op, el barrido y la agregación existen tal como se citan; el hash inverso es nuevo (no hay clave), «155/155» y latencia NO VERIFICABLES aquí; frescura mensual confirmada. |
| D-04 | con_condiciones | Piezas confirmadas (esqueleto, reduced-motion, modal fuera de `#app`, `refrescar=1`); «Con datos hasta …» conflaría fecha de construcción con cobertura; «índice» e «histórico» son jerga en pantalla. |
| D-05 | con_condiciones | `procesos_con_valor` viaja y no se pinta; `identificacion null` no pinta línea; «desde enero de 2024» confirmado. La frase del NIT afirma más de lo que el dato sostiene (la identidad es POR CONTRATO, no por empresa). |
| D-06 | con_condiciones | `entidades[]` sí va con `lic.entidad` crudo y `detalleEntidad` agrupa por `claveCanonica`; pero el navegador NO tiene `claveCanonica` ni lee `entidad_normalizada`, y la puerta real al perfil es el modal de entidad, no la tarjeta. |
| D-07 | confirmado | Fila solo con `title` + `cursor-pointer` (app.js:2930) y aserción literal e2e.js:13033 confirmadas; cambio de interfaz sin cifra nueva. |
| D-08 | confirmado | Reproducido: a $8.000 M `alcanzable_con_socio` = Génesis y `recomendacion.socio` = prodiac en la MISMA fila; ningún `public/*.js` ni prueba lee el campo. |

## D-01 · Con quién conviene

**Fuente.** `lib/socio_por_proceso.js` existe (421 líneas; `node tests/mapa.js socio_por_proceso`), lo llama `lib/handlers/procesos/listar.js:935` por fila. `resumenSocio` en `listar.js:109-113` devuelve `{tipo, cierra_todo}`. `nombreCorto`: `grep -n nombreCorto lib/perfiles.js public/*.js` → 0 resultados (la ficha lo dice bien: hoy 0). `p2_k.depende_del_anticipo` en `lib/puertas.js:183/195`; `p3_caja.sin_dato_de === "anticipo"` en `lib/puertas.js:247-254`.

**Verdad — reproducción (`rep_d01.js`, Helder + Génesis + PRODIAC, obra de pavimento, anticipo SIN publicar):**

```
v= 6000 M | p2 depende_del_anticipo= true pasa= true | p3 sin_dato_de= anticipo financiacion= 1200000000 patrimonio= 1107252964 | socio: solo  | Solo. Esta le alcanza sin socio: se queda con todo.
   contrafáctica anticipo 0 declarado → p3 pasa= false p2 pasa= false | socio: con_socio prodiac 80/20 cierra_todo= true
   con anticipo 30 declarado → socio: solo
   p2 mensaje: … el proceso solo cabe si el pliego prevé un anticipo del 26 % o más …
```

- Confirmado el hecho que motiva el dato: hoy la fila dice «Solo» porque `carenciasDe` (`socio_por_proceso.js:96-102`) solo mira `p3_caja.pasa === false`, y `p3SinDato` devuelve `pasa: true` (`puertas.js:222`). La condición del anticipo queda escondida.
- **La cifra «30 % o más» no tiene fuente para la rama P3.** El único umbral que existe es `anticipoQueCabe` (`puertas.js:188`), que es de P2 (K) y está escrito «Solo se muestra; lo que decide es la comparación» (redondeado con `Math.ceil`, así que «X % o más» es cierto para P2). Para la caja no hay cifra: a $6.000 M P3 falla con anticipo 0 (financiar $1.200 M > $1.107 M) y pasaría desde ≈ 8 %; el umbral real de la línea sería max(umbral P2, umbral P3) y el segundo NO se calcula en el árbol. Si la ficha imprime el 26 % de P2 en un proceso donde manda P3, la línea es falsa y creíble.
- La regla dura «una cifra redondeada para mostrar no decide» se respeta si la rama se decide por la contrafáctica (comparación) y el porcentaje solo se muestra; la ficha lo dice así. Condición: que el porcentaje de la línea salga de `puertas` (añadir el umbral de P3 junto a `anticipoQueCabe`, no en `socio_por_proceso`), o que la línea omita la cifra («Solo si el pliego trae anticipo; sin anticipo, con PRODIAC (80/20)»).
- «Sin dato ≠ cero»: la contrafáctica declara `anticipo_pct: 0` + `anticipo_declarado: true` explícitamente (`negocio.anticipoDeclarado` lo lee, `lib/negocio.js`): no confunde ausencia con cero. Bien.
- `cumple` no se promete: las redacciones propuestas no lo dicen (memoria § «Con cuál de mis socios conviene ESTE proceso»).

**Memoria.** § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)» decide, con petición literal del dueño, que la fila lleva 30 B (`tipo`, `cierra_todo`) y que «el con quién … se lee en el expediente». D-01 lo desmiente; la ficha lo reconoce («> SUPERADA»). Condición: la superación la firma el dueño (la ficha alega «la pregunta que el dueño puso primera»; el encargo no lo cita literal). Sección que debe respetar: § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)» (aviso Mipyme en ámbar, jamás excluir; `cumple` null; reparto a favor del dueño).

**Costo (medido, `rep_costo_d01.js`, 2000 filas sintéticas):** hoy 0,299 ms/fila; la contrafáctica (rup + puertas + socio otra vez) 0,559 ms/fila afectada. Cifra de la ficha (0,25-0,84) plausible. Pero «solo en filas con anticipo sin publicar» no acota nada: en el sintético fueron 2000 de 2000, y SECOP II casi nunca publica anticipo (`puertas.js:238-243`). NO VERIFICABLE la fracción real sin corpus; con 200 filas por página serían ≈ 110 ms extra, acotado.

**Cerraduras que caen (confirmado):** `tests/e2e.js:4705-4706` (`["cierra_todo","tipo"]`), `:4708` (peso ×20) y `:4724-4726` (`bloqueSocio` con tipo solo devuelve «»).

**Lenguaje (`rep_lenguaje.js`):** sin emoji, sin voseo/tuteo. «Mipyme» es jerga: el servidor ya dice «empresas pequeñas» (`socio_por_proceso.js:118-119`). Corrección: «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para empresas pequeñas.» Los nombres cortos «Génesis»/«PRODIAC» necesitan el `nombreCorto` que hoy no existe (declarado).

## D-02 · Quien más gana aquí (tarjeta)

**Fuente.** `claveAdjudicatario` en `lib/equivalencias.js:72-88` (confirmado); `esAdjudicado` en `lib/indice_competencia.js:186`; `registroPublicado` (`indice_competencia.js:~86-135`) NO publica líder: `grep -n "ganadores\|lider" lib/indice_competencia.js` → 0; `construirIndice` no acumula adjudicatarios (`grep claveAdjudicatario lib/indice_competencia.js` → solo las listas de campos :110/:113). `cargarAdjudicatario` existe en `public/app.js:3382`. El agregado con base ≥ 5 ya existe en el detalle: `lib/competencia_detalle.js:440-447` (`concentracion` solo con `conGanador >= MIN_PROCESOS`) — **el plan debe llamar a esa regla** (misma frecuencia natural «6 de 15», mismo `MIN_PROCESOS`), no reescribirla.

**Verdad.** «6 de 15» es hecho + frecuencia natural (sin «probabilidad»). Sin base no hay botón: coherente con `concentracion` null bajo 5.

**Memoria/contrato.** `lib/indice_competencia.js:1167-1168`: «Es lo único del histórico que /api/oportunidades expone: nunca adjudicatarios, NIT ni valores»; `lib/handlers/inteligencia/detalle.js:49-56`: el agregado se publica porque «este endpoint exige token». La ficha lo declara. Condición: `lider` viaja SOLO con token; hoy `sinFinanzas` (`lib/publico.js`) no anula `competencia` en absoluto, así que el corte hay que escribirlo (y probarlo por mutación). Secciones: § «Competencia histórica por entidad (jul 2026)» y § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)».

**Costo «sync».** Confirmado: el índice se construye en la cadena de `/api/sync/historico` (`lib/handlers/procesos/historico.js:469-470`), que `/api/sync` (cron diario `vercel.json`) patea cuando la última extracción histórica tiene > 30 días (`lib/handlers/procesos/sync.js:95-105`). Frescura hasta un mes: cierto.

**Delegación.** `tests/e2e.js:20786-20793` exige que `closest(".btn-apu")` vaya antes que `closest(".banda-competencia")` en el delegado de `#lista`: un botón nuevo en la tarjeta tiene que resolverse antes también (declarado).

**Lenguaje:** limpio. Sugerencia menor: «Quién más gana aquí» (con tilde, es interrogativo indirecto).

## D-03 · Perfil casi instantáneo (hash inverso)

**Fuente.** `api/inteligencia.js:17-24` (`competidor` → `adjudicatario`), `detalleAdjudicatario` en `lib/competencia_detalle.js:547`; el bucle citado `:577-607` es exactamente la agregación por adjudicatario (esAdjudicado → claveAdjudicatario → valor con `n > 0`, fecha). Clave `indice:adjudicatario`: NO existe (`grep adjudicatario lib/almacen.js` → 0); nuevo, como dice la ficha. Caché `v7` en `competencia_detalle.js:134` confirmado. Sello por `meta.construido` (`:558`).

**Verdad.** El total es cota inferior y `valor_adjudicado_cop` es null sin valores (`:668-669`): no convierte sin dato en cero. La pantalla de hoy ya enseña «15 contratos en 6 entidades» (`app.js:3366`): D-03 cambia el ORIGEN, no la cifra.

**NO VERIFICABLE aquí:** «prototipo cuadró 155/155…», «8-95 comandos y 2-2,7 MB por clic», «54-66 HSET, 6-9 MB, +0,3-0,7 s CPU», latencia real. No hay Redis ni corpus en este entorno. Condiciones: (1) construir el hash en `construirIndice` DENTRO del presupuesto reanudable (`presupuestoMs`, `indiceProgreso`) y del swap atómico (`indiceNuevo`), no como escritura suelta; (2) `CAMPOS_POR_HSET = 200` (`indice_competencia.js:87`) acota el tamaño por comando: respetarlo; (3) origen `'indice'|'barrido'` viaja en la respuesta con la fecha (D-04 depende de ello); (4) la caché `adj:` con sello sigue valiendo. Frescura mensual: confirmada (ver D-02).

**Memoria.** No hay sección que prohíba un índice por adjudicatario (`grep "^### .*adjudicatari" docs/MEMORIA.md` → 0). Debe respetar § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)» y § «Competencia histórica por entidad (jul 2026)» (identidad y lista blanca).

## D-04 · Espera con forma y origen del dato

**Fuente.** `abrirModal` en `public/app.js:2534` pinta `cargando(msg)` (spinner + texto, `:2529`) ANTES del fetch: la espera ya tiene respuesta visible; lo que cambia es la FORMA. `.exp-esqueleto` en `public/index.html:1288-1290` (gradiente + `animation: brillo`), y bajo reduced-motion `animation: none` en `:1380` sin fondo plano (la ficha lo detecta bien). Modal FUERA de `#app`: `#app` cierra en `index.html:4506` y `#modal-cuerpo` está en `:4521` (contado por anidamiento de `<div>`): el `#app .animate-pulse` de `:791` no lo alcanza. `?refrescar=1` salta la caché también en la vista `adjudicatario` (`lib/handlers/inteligencia/detalle.js:166,175`). La cerradura `e2e.js:27970-28000` mira efectos en los bloques `@media`; añadir una regla dentro del bloque reduced-motion no la rompe.

**Verdad.** «Con datos hasta el 31 de agosto de 2026» tomaría `meta.construido` (`indice_competencia.js:1080`), que es la fecha en que se ARMÓ el índice, no hasta qué fecha llegan los datos. En la cadena se construye justo tras la extracción, así que casi coinciden, pero son dos cosas: redactar «Índice armado el 31 de agosto de 2026» o derivar la cobertura de `meta.meses`. Condición.

**Lenguaje (`rep_lenguaje.js`):** «índice» e «histórico» salen marcados como jerga interna. Corrección literal: «Esta empresa no está en el resumen guardado: se revisan todos los contratos. Puede tardar unos segundos.» · «Resumen armado el 31 de agosto de 2026» · «Actualizar ahora» · «Al día de hoy (revisión completa)».

## D-05 · Cabecera que dice qué sostiene cada cifra

**Fuente.** `procesos_con_valor: conValor` viaja (`competencia_detalle.js:669`) y `pintarAdjudicatario` no lo pinta (`app.js:3366-3368` imprime solo `valor_adjudicado_cop`). `identificacion` null → `ident = ""` y no hay línea (`:3349-3353`). `que_es` al pie (`:3379`). «desde enero de 2024»: `DESDE_HISTORICO = "2024-01"` (`sync.js:105`) y `DESDE_DEFAULT` (`historico.js:75`); «competitivos, obra y afines» según `que_es` (`competencia_detalle.js:671-674`).

**Verdad.** «$28.400 M en 14 de 15 contratos con valor publicado» es la cota inferior bien dicha. **«SECOP no publica el NIT de esta empresa» afirma más de lo que el dato sostiene:** `claveAdjudicatario` decide POR FILA (`equivalencias.js:72-88`) y `que_es` lo declara: «si el dataset lo identificó a veces por NIT y a veces solo por nombre, cada identidad se cuenta aparte». Un perfil `n:` significa que EN ESTOS contratos no vino NIT; la misma empresa puede tener otro perfil `nit:`. Corrección literal: «En estos contratos SECOP no trae el NIT: se identifica por el nombre tal como lo escribe la entidad. Si en otros sí lo trae, esos cuentan aparte.» Además el NIT puede llegar como «No Definido» o como `codigoproveedor` (rótulo «Cód. SECOP», `app.js:3350`): la frase debe salir solo cuando `identificacion` es null.

## D-06 · En esta entidad: N de sus M

**Fuente.** `entidades[]` se agrupa con `String(lic.entidad || "").trim()` crudo (`competencia_detalle.js:583`); `detalleEntidad` agrupa con `claveCanonica` (`:79-80`, `:172`). Reproducido: `claveCanonica("ALCALDIA MUNICIPAL DE PURIFICACION") === claveCanonica("Alcaldía Municipal de Purificación")` (`"alcaldia municipal de purificacion"`); «MUNICIPIO DE PURIFICACION» sigue siendo otra clave (la canónica unifica grafía, no sinónimos: correcto y declarado en memoria).

**Refutado en su mecanismo, no en su fin:** (1) el navegador NO tiene `claveCanonica` (`grep claveCanonica public/*.js` → 0) ni lee `entidad_normalizada` (`grep entidad_normalizada public/app.js` → 0): la comparación tiene que hacerla el servidor (publicar `clave` por fila de `entidades[]`, agrupada con `claveCanonica`, y el nombre más frecuente) y el cliente comparar claves; (2) la puerta real al perfil no es la tarjeta sino el modal de la entidad (`app.js:3411-3417`, delegación en `#modal-cuerpo`), donde la entidad de origen es `cuerpo.entidad_normalizada` (`competencia_detalle.js:490`); `data-entidad` (`app.js:1615`) sirve solo si D-02 abre el perfil desde la tarjeta. Sección: § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)».

## D-07 · Filas que dicen que se pulsan

Confirmado: `app.js:2930` fila con `cursor-pointer` y `title="Ver en qué otras entidades gana"` (en teléfono el `title` no existe: la cerradura `bq51` `e2e.js:8663-8680` mira lo que un teléfono VE, aunque hoy no cubre `bloqueAdjudicatarios`); rótulo `:2967` «Ver los N adjudicatarios que más ganan»; aserción literal `e2e.js:13033` y conteo `:13035` de `data-adjudicatario` (5). Memoria § «Lote «B9a-entidad-graficos» …» fija el pliegue (ver arriba/tocar plegado): D-07 lo respeta. Sin cifra nueva; lenguaje limpio.

## D-08 · Retirar `alcanzable_con_socio`

Reproducido (`rep_d08.js`):
```
v= 8000 M | alcanzable_con_socio = {"socioId":"genesis","nombre":"Génesis Ingeniería y Construcción GIC SAS"} ( 74 B) | recomendacion.socio = prodiac
v= 12000 M | alcanzable_con_socio = {"socioId":"prodiac",…} ( 45 B) | recomendacion.socio = prodiac
```
`socioQueAlcanza` devuelve el PRIMER socio en orden de `CANDIDATOS_CONSORCIO` (`socio_por_proceso.js:282-296`; `perfiles.js:357` = `["genesis","prodiac"]`); `socioPorProceso` ordena por cierra_todo/mipyme/indicadores/patrimonio (`:379-383`). Dos «con quién» distintos en la misma fila: regla dura «dos cosas distintas no pueden tener nombres parecidos». Ningún consumidor: `grep -rn alcanzable_con_socio public/ tests/ api/` → 0. El rescate (`listar.js:663`, `lib/filtros.js:693-696`) solo pregunta `!!alcanzaConSocio(l)`: se conserva. Peso: 45-74 B de valor + 23 B de clave por fila con token. Debe respetar § «Un proceso que se alcanza con socio ya no se esconde (11-sep-2026)» (el predicado sigue decidiendo la lista) y § «El veredicto de socio se lee AL GUARDAR» (menciona `alcanzable_con_socio` como pieza con cerradura: buscar y ajustar esa aserción si existe — el grep en `tests/` no la encontró).
