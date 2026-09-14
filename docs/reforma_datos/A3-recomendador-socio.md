# A3 · Recomendador de socio: «¿conviene con Génesis, con PRODIAC LTDA o solo?» en CADA tarjeta

> Para: sesión · Estado: informe fechado · Sustituido por: —

> Fecha: 13-sep-2026 · Árbol: `main` limpio (`git status --short` vacío antes y después) · Nada del repositorio se modificó.
> Scripts de reproducción (fuera del repositorio): `scratchpad/plan/a3_forma.js`, `a3_scan.js`, `a3_textos.js`.
> Toda cifra de este informe sale de una ejecución; lo que no se pudo ejecutar va rotulado NO VERIFICABLE.

## 0 · Lo que hay hoy, en tres frases

1. **El veredicto entero ya se calcula para cada fila servida** (`lib/handlers/procesos/listar.js:935-938` llama a `socioPorProceso` por fila de la página, reaprovechando el RUP y las puertas ya evaluadas) y **se recorta a dos campos** antes de viajar (`resumenSocio`, `listar.js:109-113`: `{tipo, cierra_todo}`). Añadir «con quién» a la tarjeta **no cuesta CPU nueva: cuesta bytes**.
2. **La tarjeta hoy calla el nombre**: `public/app.js:2008-2014` (`bloqueSocio`) pinta una sola línea y solo cuando `tipo === "con_socio"` («Solo no le alcanza; con un socio, sí. Guárdelo y le decimos con cuál…»); el caso «solo» no pinta nada (la suite lo exige: `tests/e2e.js:4732-4733`).
3. **El «con quién» completo se congela al guardar** (`lib/handlers/perfil/seguimiento.js:168-181` `congelarSocio`; se llama en `:491` y `:531`, solo al CREAR, ignorando lo que traiga el cliente) y se pinta en el expediente (`public/expediente.js:445-474` `htmlConQuien`) con su fecha.

---

## (a) FORMA REAL del veredicto, ejecutada

Comando: `node scratchpad/plan/a3_forma.js` y `node scratchpad/plan/a3_scan.js` (usan `socioPorProceso` real con `base: "helder"` y `candidatos: CANDIDATOS_CONSORCIO = ["genesis","prodiac"]`, `lib/perfiles.js:357`). La fila de ejemplo es el `filaDe` del fixture de la suite (`tests/e2e.js:4537-4541`).

Los fixtures del encargo (una clase que Helder no tiene) **no bastan para que falte la actividad**: con un nombre que describe obra («CONSTRUCCION DE OBRAS DE URBANISMO…») el juicio del objeto lo rescata por texto/familia y el veredicto sale «solo» (ejecutado: los tres primeros casos de `a3_forma.js` devolvieron `tipo: "solo"`). Por eso el barrido `a3_scan.js` busca clases y nombres donde `evaluarRup(...).paso === "unspsc"` de verdad. Resultado:

| Caso | Fixture (nombre · clase · cuantía) | `recomendacion` | Orden de `opciones` | `avisos` | **Bytes JSON** |
|---|---|---|---|---|---|
| 1 · Solo alcanza | «CONSTRUCCION DE PLACA HUELLA VEREDA EL PALMAR» · 72141000 · $300 M (fixture `e2e.js:4544`) | `{tipo:"solo", participacion_suya:100}` | `[]` | `[]` | **186** |
| 2 · Falta socio y Génesis cierra | «INSTALACION» · 12161800 · $300 M | `{tipo:"con_socio", socio:"genesis", cierra_todo:true, reparto:{suya:60, del_socio:40, porque, nota}}` | genesis | `carga_del_socio`, `verificar_socio` | **3.346** |
| 3 · Solo PRODIAC cierra + aviso Mipyme | «INSTALACION» · 10141600 · $300 M | `{tipo:"con_socio", socio:"prodiac", cierra_todo:true, reparto:{60/40}}` | prodiac (`aviso_mipyme` lleno) | `mipyme`, `carga_del_socio`, `verificar_socio` | **3.821** |
| 3b · Ambas cierran, cuantía < umbral | «INSTALACION» · 22101600 · $300 M | genesis, 60/40 | genesis › prodiac | 2 | **5.422** |
| 3c · Ambas cierran, cuantía ≥ umbral | «INSTALACION» · 22101600 · $600 M | **prodiac**, 60/40 | prodiac › genesis | 2 | **4.818** |
| 3d · Cuantía grande (fixture `e2e.js:4700`) | «CONSTRUCCION DE PAVIMENTO…» · $8.500 M | prodiac, `cierra_todo:true`, 80/20 (`falta:["tope"]`) | prodiac › genesis | 2 | **4.682** |

Forma completa (caso 2, tal cual salió; el resto está en la salida del script):

```json
{"base":{"perfilId":"helder","falta":["actividad"]},
 "recomendacion":{"tipo":"con_socio","socio":"genesis","nombre":"Génesis Ingeniería y Construcción GIC SAS","cierra_todo":true,
   "reparto":{"suya":60,"del_socio":40,"porque":"Aquí Génesis … aporta la experiencia, y varios pliegos exigen … (suele ser del 30 % al 40 %) …","nota":"El reparto no cambia qué puertas se abren: …"}},
 "opciones":[{"socioId":"genesis","nombre":"…","abre":["actividad"],"sigue_faltando":[],"cierra_todo":true,"aviso_mipyme":null,
   "lo_que_no_se_sabe":[{clave:"carga_del_socio",frase,porque},{clave:"verificar_socio",frase,porque}],
   "indicadores_que_empeoran":[{campo:"liquidez",…,suyo:129.12,del_socio:6.98},{…cobertura…},{…endeudamiento…}],
   "capacidad_juntos":10315335998,"patrimonio_juntos":1318593852,"actividades_juntos":387,"reparto":{…igual que arriba…},
   "frase":"Génesis … sí tiene registrada la actividad de este proceso."}],
 "avisos":[{…carga_del_socio…},{…verificar_socio…}],
 "frase":"Génesis … sí tiene registrada la actividad de este proceso. Reparto sugerido: 60 % usted, 40 % Génesis …."}
```

**Por qué pesa lo que pesa**: `reparto` (con sus dos párrafos) viaja **dos veces** (en `recomendacion` y en cada opción, `socio_por_proceso.js:362` y `:405`); `lo_que_no_se_sabe` de la mejor opción viaja **dos veces** (en la opción y en `avisos`, `:357` y `:410`); `indicadores_que_empeoran` lleva cinco campos por indicador; y el nombre largo de Génesis (41 caracteres) aparece hasta 9 veces. Con dos socias, un veredicto «con socio» pesa **3,3-5,4 KB**, no 1.220 B: la cifra de la memoria (`MEMORIA.md § «El veredicto de socio se lee AL GUARDAR»`) es una **media sobre 210 filas servidas**, donde la mayoría son «solo» (186 B).

**Resúmenes, medidos** (mismo script, `Buffer.byteLength(JSON.stringify(...))`):

| Resumen | solo | con_socio |
|---|---|---|
| Actual `{tipo, cierra_todo}` (`listar.js:112`) | 34 B | 39-43 B (la memoria dice «30 B»: medido, son 34-43) |
| Pedido en el encargo `{tipo, cierra_todo, con, motivo_corto ≤ 90}` | 114 B | 158-165 B |

**Coste de calcularlo**: `socioPorProceso` entero, con dos socias y SIN el `ctx` precalculado que sí le pasa el listado: 2.000 llamadas en 1.676 ms → **0,838 ms por fila** (ejecutado). La memoria midió 0,239 ms con `ctx`; en el listado ya se paga hoy (`listar.js:935`), así que la propuesta no añade cálculo.

---

## (b) QUÉ DECIDE hoy entre Génesis y PRODIAC — y qué NO considera

### El orden de preferencia (código, `lib/socio_por_proceso.js:384-388`)

```js
opciones.sort((a, b) =>
  (b.cierra_todo - a.cierra_todo)                                   // 1. cierra todo lo que falta
  || ((a.aviso_mipyme ? 1 : 0) - (b.aviso_mipyme ? 1 : 0))          // 2. sin aviso de convocatoria limitada
  || (a.indicadores_que_empeoran.length - b.indicadores_que_empeoran.length)  // 3. menos indicadores empeorados
  || (b.patrimonio_juntos - a.patrimonio_juntos));                  // 4. más respaldo
```

**Lo que eso produce con estas dos socias, reproducido:**

- **El criterio 3 es INERTE**: las dos socias empeoran los tres indicadores de Helder (liquidez 129,12 · cobertura 662,70 · endeudamiento 0,04 son mejores que los de cualquiera de las dos). Ejecutado: `indicadoresQueEmpeoran(helder, genesis).length === 3` y `(helder, prodiac).length === 3`. Se cuenta cuántos empeoran, no cuánto: la liquidez 1,98 de PRODIAC y la 6,98 de Génesis pesan igual.
- **Por tanto, cuando las dos cierran, decide la cuantía**: por debajo de `UMBRAL_MIPYME_2026 = 511.708.497` (`:48`) gana **Génesis** (PRODIAC carga `aviso_mipyme`); por encima gana **PRODIAC siempre**, porque su patrimonio ($8.309 M) es 40 veces el de Génesis (caso 3b vs 3c del cuadro, ejecutados). No hay empate posible entre ellas: el criterio 4 nunca empata.
- El **porcentaje no entra en el orden** (medido el 11-sep: capacidad, caja, tope y actividades son suma/unión, no dependen del reparto; `:13-24`).

### Qué carencia cubre cada una (`carenciasDe`, `:79-86`; el plural se deriva con `derivarPlural`, `lib/perfiles.js:271-311`)

| Carencia (`falta`) | Cómo se detecta en Helder | Cómo la cubre un socio | Génesis | PRODIAC |
|---|---|---|---|---|
| `actividad` | `rup.paso === "unspsc"` (obra, pero de una clase que Helder no registra) | **unión** de clases (`perfiles.js:305`) | +194 clases que Helder no tiene (ejecutado) | +331 clases que ni Helder ni Génesis tienen (ejecutado) |
| `capacidad` | `rup.dentro_de_k === false` (`lib/rup.js:105`: `crpc_minimo <= k_cop`; con anticipo NO publicado se compara contra el CRPC con el tope de anticipo, `rup.js:86`) | K del plural = **suma de CRP** de los integrantes (`lib/consorcio.js:20-23`) | capacidad juntos $8.987 M (caso 3d) | $68.484 M (caso 3d) |
| `tope` | `rup.dentro_de_tope === false` (4.000 SMMLV ≈ $7.004 M) | suma de topes (`perfiles.js:297`) | +2.000 SMMLV | **sin declarar** (`docs/PERFILES.md` §3) → `null`, y `null` no suma: el tope combinado H+P se queda en `null` = «sin tope» |
| `caja` | `puertas.p3_caja.pasa === false` (patrimonio < 20 % de lo que hay que financiar, `lib/puertas.js:230,257`) | suma de patrimonios | $1.318 M | $9.416 M |

Nota: en el caso 3d ($8.500 M), Helder **pasa la K** aunque `k_cop` 4.470 M < CRPC 8.500 M: como el anticipo no viene publicado, `dentro_de_k` compara contra `crpc_minimo` (`rup.js:86,105`), que asume el tope de anticipo. Solo `tope` falla. Es la regla «ante la duda, se muestra» y está bien; la anoto porque explica por qué «capacidad» aparece menos de lo que uno espera.

### El reparto: 40 % o 20 %, y por qué (`:217-244`)

- `PARTE_SI_APORTA_EXPERIENCIA = 40` cuando `abre.includes("actividad")`; si no, `PARTE_SI_SOLO_APORTA_RESPALDO = 20`.
- Motivo, escrito en el código y en la Guía (`docs/GUIA_ANALISTA_LICITACIONES.md` cap. 10: «el integrante que aporta la experiencia debe tener un porcentaje mínimo de participación (frecuentemente 30 % o 40 %)… te la desconoce entera»): por debajo de ese mínimo el pliego desconoce la experiencia del integrante; el 40 % es el techo de ese rango. El 20 % «porque por encima del 10 % el socio sigue contando para los criterios diferenciales» (`:241`) **no tiene fuente en el árbol** más allá de esa frase: va como «sin fuente» (no la inventé ni la confirmé).
- **Un nombre que engaña**: «aporta la experiencia» se dispara por **una clase UNSPSC registrada**, no por contratos ejecutados. La frase de la opción dice «sí tiene registrada la actividad» y el `reparto.porque` dice «aporta la experiencia». Son dos hechos distintos con un nombre parecido: tener la actividad inscrita en el RUP no acredita la experiencia específica que el pliego pide en contratos. La regla dura «dos cosas distintas no pueden tener nombres parecidos» aplica.

### Lo que NO considera (verificado en el árbol)

| Aspecto | Evidencia |
|---|---|
| **Puntaje** (experiencia adicional, criterios diferenciales Mipyme, apoyo a la industria nacional) | Ninguna función lo modela. `grep -rn -i "industria nacional\|criterios diferenciales\|experiencia adicional"` en `lib/` solo da literales de texto: `socio_por_proceso.js:241`, `guia_proceso.js:146,413`, `documentos_proceso.js:183` (una regex de nombres de documento). El recomendador optimiza «poder presentarse» (`:21-24`), no «ganar». |
| **Limitación Mipyme de la convocatoria** | No está en el corpus: `grep -n -i "mipyme\|limitad" lib/columnas_historicas.js lib/negocio.js` → **sin coincidencias** (código de salida 1). El único rastro es `NO_ES_MIPYME` + `UMBRAL_MIPYME_2026` (`socio_por_proceso.js:48-53`): una **sospecha por cuantía**, declarada como aviso (`:104-118`), nunca exclusión. |
| **Experiencia específica por contratos** | El módulo no requiere `lib/experiencia.js` (cabecera `:41-43`), y `evaluarRup`/`evaluarPuertas` tampoco (`grep -n -i experiencia lib/rup.js` → nada; `lib/puertas.js:150` solo nombra `expSMMLV` como dato faltante). La experiencia cargada la consumen **solo** `lib/cobertura_rup.js` y `lib/handlers/admin/{cobertura,experiencia}.js` (`node tests/mapa.js experiencia`). |
| **¿Están cargados los 106 de Génesis y los 327 de PRODIAC?** | `experiencia_genesis_106.json` existe en la raíz (49.556 B) y tiene `contratos.length === 106` (ejecutado). Se carga con `POST /api/admin?op=experiencia&origen=repositorio` (`lib/handlers/admin/experiencia.js:78-95`). **Si está cargado en la Redis de producción: NO VERIFICABLE** desde aquí (sin credenciales). **Los 327 de PRODIAC no existen en el árbol**: `ls *.json` → solo `experiencia_genesis_106.json` y `vercel.json`; `grep -n -i "prodiac\|327" EXPERIENCIA_PENDIENTE.md` → nada. Y aunque se cargaran, `config:experiencia` es **una sola clave compartida, no por perfil** (`lib/almacen.js:180`; `lib/handlers/admin/rup.js:16-17`; `guardarExperiencia(redis, contratos)` sin perfil, `lib/experiencia.js:246`): el sistema no sabría cuáles contratos son de quién. |
| **Plazo, adenda, indicadores frente al pliego** | `indicadoresQueEmpeoran` compara socio contra Helder, no contra un mínimo del pliego (`:120-139`, «no se compara contra el pliego (no se conoce)»). |

### Un hermano que ya discrepa (reproducido)

La fila lleva **dos campos de socio con dos respuestas distintas**:

- `alcanzable_con_socio` = **el primer socio que alcanza en el orden de `CANDIDATOS_CONSORCIO`** (`socioQueAlcanza`, `:282-295`; `lib/filtros.js:692-696`), es decir Génesis si Génesis alcanza. Viaja con `socioId` y el **nombre completo** (77 B) en cada fila rescatada (`listar.js:920`).
- `socio.recomendacion.socio` = el mejor tras el `sort` (`:384-388`).

Ejecutado con el fixture de $8.500 M: `alcanzable_con_socio = {socioId:"genesis", nombre:"Génesis Ingeniería y Construcción GIC SAS"}` y `socio recomendado = prodiac`. Lo mismo en el caso 3c ($600 M). Hoy no se ve porque `public/*.js` no lee `alcanzable_con_socio` (`grep` → nada) y la suite no lo fija (`grep -n alcanzable tests/e2e.js` → solo otros usos de la palabra). **Si la tarjeta empieza a decir CON QUIÉN, tiene que salir de un solo campo**, o un día pintará Génesis donde el expediente dirá PRODIAC.

---

## (c) PROPUESTA para «en cada tarjeta»

### Campos mínimos de la fila (sustituyen a `resumenSocio`, `listar.js:109-113`)

```json
"socio": {
  "tipo": "solo" | "con_socio" | "ninguna_sirve",
  "con": "genesis" | "prodiac" | null,          // id del socio recomendado (recomendacion.socio), NUNCA alcanzable_con_socio
  "cierra_todo": true | false | null,           // null si no hay socio; no se puede perder (memoria 11-sep)
  "aviso": "mipyme" | null,                     // la sospecha de convocatoria limitada, para que la línea la lleve
  "linea": "…≤ 90 caracteres, redactada por el servidor…"
}
```

- **Una sola redacción, en el servidor** («la frase manda», `MEMORIA.md § «El veredicto de socio se lee AL GUARDAR»`): si el cliente compusiera la línea a partir de códigos, habría dos redacciones del mismo consejo (tarjeta y expediente) que divergirían a la primera corrección. La alternativa «solo códigos» (`{tipo, con, cierra_todo, aviso, abre, reparto}`) pesa 83-111 B (medido) y no la recomiendo por eso.
- **Nombre corto del socio**: hoy no existe (`grep -n -i "corto" lib/perfiles.js` → nada) y el nombre completo de Génesis tiene 41 caracteres: no cabe en 90 con el motivo. Hace falta un `nombreCorto` en `lib/perfiles.js` («Génesis», «PRODIAC»), que también acortaría el expediente.
- `alcanzable_con_socio` **se retira de la fila** o se hace coincidir con `socio.con`: son dos respuestas a la misma pregunta.

### Texto exacto de cada estado (ejecutado contra la cerca real, `node scratchpad/plan/a3_textos.js` + variante recortada)

| Estado | Línea (servidor) | Caract. | Bytes de `socio` |
|---|---|---|---|
| solo | «Solo: le alcanza sin socio.» | 27 | 96 |
| con_socio · cierra · aporta actividad | «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» | 86 | 167 |
| con_socio · cierra · aporta respaldo | «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» | 78 | 158 |
| con_socio · cierra · aviso Mipyme | «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para Mipyme.» | 74 | 157 |
| con_socio · NO cierra | «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» | 83 | 164 |
| ninguna_sirve (socios) | «Ninguna de las dos alcanza lo que falta.» | 40 | 118 |
| ninguna_sirve (objeto) | *(no se pinta: la fila no es obra para nadie y ya sale descartada por objeto)* | — | — |

Las seis pasan `tuteoEn === null` y `RE_EMOJI_UI` sin coincidencias (`lib/lenguaje_pantalla.js`, ejecutado), no contienen la jerga que la suite persigue (`UNSPSC`, `SMMLV`, `capacidad residual`, `CRPC`, `cuatro puertas`; `tests/e2e.js:4776`) ni la palabra «cumple». Cambié dos redacciones del encargo a propósito:

- «aporta la experiencia que falta» → «tiene la actividad que a usted le falta»: es lo que la aplicación **verifica** (una clase del RUP); decir «experiencia» prometería lo que no se midió (ver (b), «un nombre que engaña»).
- «Ninguno de los dos alcanza» → «Ninguna de las dos alcanza lo que falta»: las socias son empresas (femenino en el resto de la interfaz: «Con ninguna de las dos alcanza», `expediente.js:448`).

**Cuánto pesaría por fila**: media de los seis estados **143 B** (medido; 96 B en «solo», que es la mayoría). Extrapolado a las 210 filas de la medición del 11-sep (esto es una estimación, no una medida: las proporciones de estados del corpus real no las tengo): ≈ 30 KB por respuesta, frente a ≈ 256 KB del veredicto entero (1.220 × 210) y ≈ 7-9 KB del resumen actual (34-43 × 210). En porcentaje del cuerpo: si 256 KB eran el 14,4 %, 30 KB serían ≈ 1,7 %.

**En pantalla** (`bloqueSocio`, `app.js:2008-2014`): una línea siempre (también en «solo», que el dueño pidió ver en cada proceso: `MEMORIA.md § «Con cuál de mis socios conviene ESTE proceso»`, «En pantalla»); color: verde si `cierra_todo && !aviso`, ámbar si `aviso` o `!cierra_todo`, gris en «solo»; el porqué NO va en la tarjeta (sigue en el expediente, plegado). La línea se pinta con `esc()` como hoy.

---

## (d) Qué haría falta para «adjudicar la mayor cantidad», no solo «poder presentarse»

El recomendador contesta a la **estatura mínima** (habilitantes: cap. 8 de la Guía) y nada del **concurso de disfraces** (puntaje). Para acercarse a «ganar» harían falta estos datos, cada uno con su fuente posible y su estado real:

| Dato | Para qué serviría en la elección de socia | Fuente posible | Estado hoy |
|---|---|---|---|
| **Experiencia específica por contrato de CADA socia** (objeto, valor SMMLV, participación) | Saber quién aporta la experiencia que el pliego pide (y por tanto quién debe llevar el 30-40 %), no quién tiene la clase inscrita | `POST /api/admin?op=experiencia` ya valida y guarda `{contratos:[…]}` (`lib/experiencia.js`; contrato del archivo en `EXPERIENCIA_PENDIENTE.md`) | Génesis: 106 en el árbol, carga en producción NO VERIFICABLE. PRODIAC: **no hay archivo**. Y la clave es **única y compartida** (`almacen.js:180`): habría que hacerla **por perfil** antes de cargar dos socias, o la de una tapa a la otra. |
| **Contratos en ejecución (SCE) de cada socia** | Quitar el aviso `carga_del_socio` (`:148-159`) y dejar de sobreestimar la K del socio grande | El esquema del RUP cargado por `POST /api/admin/rup` ya acepta `sce` por perfil (`lib/config_rup.js:150-153, 201`) y `prodiac` es clave válida (`config_rup.js:35`) | Nadie lo ha cargado (`sce: []` en las dos, `perfiles.js:127,163`). Hermano vivo: `resumenPerfiles()` en `lib/handlers/admin/rup.js:78-92` recorre `["helder","genesis","consorcio"]` y **omite `prodiac`** (ejecutado: claves `helder, genesis, consorcio`, `"prodiac" in r === false`): Mi empresa no enseñaría el RUP de PRODIAC aunque se cargue. El mensaje del `DELETE` (`rup.js:328,381`) también lista solo `helder|genesis|consorcio`, aunque el código acepta `IDS` (incluye prodiac). |
| **Lo que el pliego pide en consorcio**: % mínimo del que aporta experiencia, número máximo de integrantes, si la convocatoria está **limitada a Mipyme** | Convertir el aviso Mipyme en un hecho, y el 40 % en la cifra exacta | El lector de pliegos (`op=parsear` / `op=dictamen`) | Hoy el dictamen extrae y compara los numéricos habilitantes (`capital_trabajo, patrimonio, liquidez, endeudamiento, cobertura, experiencia_smmlv, plazo_meses`; `lib/dictamen_reglas.js:88-92`) y hechos como personal, garantías, multas, anticipo (`:45-60`). **No hay regla para «convocatoria limitada», «Mipyme» ni «integrante/proponente plural»** (`grep -rn -i "limitada\|mipyme\|integrante\|proponente plural" lib/dictamen.js lib/dictamen_reglas.js` → solo `NOTA_PLURAL` «participación 50/50 supuesta», `dictamen.js:257`). Es una regla nueva del dictamen, no del recomendador. |
| **Factores de puntaje del pliego** (precio: método sorteado; calidad; industria nacional; criterios diferenciales) | Elegir la socia que sume puntos, no solo la que habilite | El mismo lector de pliegos (tabla de puntaje) | No existe en ningún módulo (ver (b)). Cualquier peso que se ponga sin leer el pliego sería un porcentaje inventado. |
| **Indicadores frente al mínimo del pliego, ponderados por reparto** | Saber si el 60/40 deja la liquidez del plural por encima del mínimo (con PRODIAC al 40 %, la liquidez ponderada baja mucho: 1,98 vs 6,98) | El dictamen ya compara el perfil contra el pliego; falta hacerlo con el plural derivado al reparto sugerido | El módulo lo dice en `reparto.nota` pero no lo calcula (`:120-139`). |

**Lo que NO se puede saber y cómo se declara** (y ya se declara bien): la limitación Mipyme no la publica el corpus → aviso en ámbar por cuantía, jamás exclusión (`:100-103`; falso caro = negativo); los requisitos del pliego concreto → `cumple` es `null` por contrato y ninguna pantalla dice «cumple» (la suite lo fija: `e2e.js:4738-4740, 4765`). La propuesta (c) conserva las dos cosas.

**Observación fuera del alcance de A3, con dato ejecutado**: `derivarPlural` **suma** `expSMMLV` (`perfiles.js:295`: Helder + PRODIAC = 25.033,72) y guarda el máximo aparte en `mayorContratoSMMLV` (18.264,85), pero `lib/dictamen.js:498` compara contra el pliego `experiencia_mayor_contrato_smmlv: p.expSMMLV`. Para un consorcio, eso compararía la **suma de los dos mayores contratos** con la experiencia exigida, contra la propia regla de la memoria («dos contratos distintos no se acumulan en uno»). El efecto en el dictamen lo leí, no lo ejecuté: NO VERIFICADO como defecto; conviene reproducirlo en su propio encargo.

---

## (e) Riesgo de la reversión, y cómo satisfacer al dueño sin volver atrás

### Por qué el 11-sep se sacó de la tarjeta (`MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea»`)

1. **Dos preguntas, dos momentos**: la lista contesta «¿a qué me puedo presentar?» y el expediente «¿con cuál voy y qué le cedo?»; repetir el consejo entero en doscientas tarjetas era repetir doscientas veces una decisión que se toma una vez.
2. **Peso**: 1.220 B por fila, 14,4 % del cuerpo (15,0 % comprimido).
3. **Deriva silenciosa**: un consejo recalculado en cada lectura cambia cuando se carga otro RUP o se corrige un tope, sin que el dueño sepa sobre qué decidió → se **congela al guardar**, con fecha, solo al crear y calculado por el servidor.
4. **Una sola redacción**: pintar el reparto dos veces dejó la misma línea repetida (cazado en Chromium).

### Cómo dar el «con quién» en cada tarjeta respetando las cuatro

- **El congelado al guardar NO se toca**: `congelarSocio` (`seguimiento.js:168-181`), sus dos llamadas (`:491`, `:531`) y `htmlConQuien` (`expediente.js:445-474`) siguen igual; el expediente sigue diciendo «Este consejo es del día en que guardó el proceso, dd-mm» (`expediente.js:472`). La tarjeta dice el consejo de **hoy**; el expediente, el del día que decidió. No son dos juicios: son el mismo juicio en dos fechas, y la fecha está en pantalla.
- **Peso**: 143 B de media por fila (medido), no 1.220. La línea es una y de ≤ 90 caracteres; el porqué, los avisos y los indicadores se quedan en el expediente.
- **Cálculo**: cero nuevo — `socioPorProceso` ya corre por fila servida (`listar.js:935`); solo cambia lo que `resumenSocio` deja pasar. La lista de guardados sigue sin llevarlo (`aLigero` conserva `tiene_socio`; `e2e.js:4786-4790`).
- **Una redacción**: la línea la escribe el servidor, en el mismo módulo que escribe `frase` (idealmente `socioPorProceso` devuelve también `linea`, y `resumenSocio` la copia): el expediente y la tarjeta salen de la misma función.
- **Opcional, si el dueño quiere ver la deriva y no solo la fecha**: en el expediente, «Hoy, con los datos actuales, diría: …» cuando difiere del congelado. El expediente ya tiene la fila viva en la mano (`alertasDelPerfil`, `seguimiento.js:261`), así que cuesta 0,24-0,84 ms y ninguna lectura. No reescribe el consejo guardado: lo contrasta. Lo dejo como opción porque es un segundo juicio en la misma pantalla y hay que decidir si vale el ruido.

### Cerraduras de la suite que caerán A PROPÓSITO y hay que reescribir con la nueva decisión (no borrar)

- `tests/e2e.js:4706-4707`: `Object.keys(resumido) === ["cierra_todo","tipo"]`.
- `:4710`: «el resumen tiene que ser un orden de magnitud más liviano» (`pesoCorto * 20 < pesoLargo`): con 143-167 B frente a 3.346-5.422 B sigue cumpliéndose (×20 a ×34), pero conviene fijar además el tope de 90 caracteres de `linea`.
- `:4732-4733`: «si le alcanza solo, la tarjeta no pinta nada» → pasa a exigir «Solo: le alcanza sin socio.».
- `:4734-4737`: «Solo no le alcanza… Guárdelo» → pasa a exigir el nombre corto del socio y el reparto.
- Nuevas: la línea de la tarjeta y la `frase` del expediente nombran **al mismo socio** (mutación: hacer que la tarjeta lea `alcanzable_con_socio`); `linea` ≤ 90; `nombreCorto` presente en los tres perfiles fijos y en `perfilDesdeConfig`; las seis líneas pasan `tuteoEn`, sin emoji, sin «cumple».
- Memoria: la sección de 11-sep «Con cuál de mis socios…» dice en su línea resumen «la tarjeta de cada oportunidad dice ahora si conviene ir solo o con cuál socio»; la de «El veredicto se lee AL GUARDAR» la superó ese mismo día **sin dejar la marca «> SUPERADA»** (leídas ambas: `sed -n '11916,11922p'` no la trae). Con la reversión parcial, la nueva sección debe marcar a la segunda y la primera queda vigente en parte: anotarlo para que el mapa no imprima una línea falsa.

---

## Anexo · comandos ejecutados (resumen)

```
node scratchpad/plan/a3_forma.js      # forma y bytes: solo 186 B; 8.500 M → prodiac, 4.682 B
node scratchpad/plan/a3_scan.js       # fixtures reales: genesis cierra (3.346 B) · solo prodiac + mipyme (3.821 B) · ambas <umbral → genesis (5.422 B) · ambas ≥umbral → prodiac (4.818 B)
node scratchpad/plan/a3_textos.js     # cerca de lenguaje y bytes de las líneas propuestas (media 143 B)
node -e '… indicadoresQueEmpeoran …'  # 3 y 3: el criterio 3 del sort es inerte
node -e '… socioQueAlcanza vs socioPorProceso …'  # genesis vs prodiac en la misma fila (8.500 M)
node -e '… 2000 llamadas …'           # 0,838 ms por fila sin ctx
node -e '… resumenPerfiles() …'       # claves helder, genesis, consorcio; prodiac ausente
node -e '… derivarPlural(H+P).expSMMLV …'  # 25.033,72 (suma) · mayorContratoSMMLV 18.264,85
grep -n -i "mipyme\|limitad" lib/columnas_historicas.js lib/negocio.js   # sin coincidencias (código 1)
ls *.json ; grep -n -i "prodiac\|327" EXPERIENCIA_PENDIENTE.md            # solo experiencia_genesis_106.json; nada de PRODIAC
node tests/mapa.js socio_por_proceso ; node tests/mapa.js experiencia
git -C /home/user/portafolio-estrategico status --short                    # vacío
```
