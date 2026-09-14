# Verificación adversaria · D-49 … D-56 · 14-sep-2026

> Para: sesión · Estado: informe fechado · Sustituido por: —

Repositorio `/home/user/portafolio-estrategico`, sin modificar (`git status --short` → 0 líneas al cierre). Toda cifra de este informe sale de un comando ejecutado aquí; lo que no se pudo ejecutar (el corpus histórico vive en Upstash, no hay copia local ni fixture con `departamento_proveedor`/`numero_de_lotes`: `grep -rln … tests` → vacío) va rotulado NO VERIFICABLE.

Cerca de lenguaje sobre los ocho textos «corto» (`lib/lenguaje_pantalla.js`: `RE_EMOJI_UI`, `VOSEO_RE`, `tuteoEn`, más la regex de jerga de `tests/e2e.js:4674,7250`): los ocho pasan sin emoji, sin voseo, sin tuteo y sin jerga. Las correcciones de lenguaje que siguen son de VERDAD (lo que el dato sostiene), no de cerca.

| id | veredicto | en una línea |
|---|---|---|
| D-49 | con_condiciones | Las tres cifras se reproducen, pero el 5 % se cobra a una interventoría cuando la guía corre solo con la foto (sin fila viva) o sin perfil, y la base de la garantía (presupuesto en la guía, oferta en el dictamen) sigue sin resolver. |
| D-50 | con_condiciones | Todo existe para calcularlo (`habilesEntre`, `percentilHistograma`, el acumulador por entidad), pero `habilesEntre(null, x)` devuelve **0** y no null: la ausencia se descarta ANTES, como hace `plazoAdjudicacionDe`. «Este proceso da 9» nadie lo calcula hoy. |
| D-51 | con_condiciones | La columna se guarda y nadie la lee (reproducido); el formato del valor no se pudo ver; la comparación debe pasar por el normalizador de `public/filtros.js` y «No Definido» es sin_dato, no «foráneo». |
| D-52 | con_condiciones | El acumulador tiene la cubeta 0 por entidad (`g.hist[0]`) pero el registro PUBLICADO no la conserva: exige reconstruir el índice de baja. La cubeta 0 es `Math.round(baja)===0` (±0,5 %), no «presupuesto completo»; el N es «procesos con las dos cifras y dentro de la banda», no «contratos». |
| D-53 | con_condiciones | `departamento_entidad` sí está en la fila histórica (reproducido); el detalle actual no lo agrupa; depende íntegramente de D-03 (con_condiciones). «Contratos» son adjudicaciones. |
| D-54 | con_condiciones | La proyección descarta `fecha_de_ultima_publicaci` (reproducido `undefined`); los «tres consumidores» solo la usan como RESPALDO de la fecha de publicación, ninguno produce «republicado»: hay que escribir el lector. Cobertura sin medir. |
| D-55 | con_condiciones | `numero_de_lotes` llega solo al histórico (reproducido); «puede presentarse a uno solo» no tiene fuente en el árbol ni en el manual: se quita. Valor «sin lotes» (0/1/vacío) sin ver: sin dato ≠ cero. |
| D-56 | con_condiciones | La norma está citada en el árbol (`lib/dictamen.js:311-313`, `literal_leido: false`), pero no existe ningún clasificador de «infraestructura social» (`grep` → 0) y `fecha_de_publicacion_del` no es la fecha del aviso de convocatoria: el texto debe decir «probablemente» y mandar al aviso. |

---

## D-49 · Lo que cuesta presentarse (expediente) · **con_condiciones**

**Fuente.** `guiaDe(...).dinero` existe (`lib/guia_proceso.js:544-551`): `contribucion_obra_5pct_cop`, `garantia_seriedad_asegurada_cop`, `financiacion_antes_del_primer_pago_cop`. Se enseña ya en el expediente (`public/app.js:4228-4230`, tabla «Presupuesto oficial / Contribución… / Garantía de seriedad: valor asegurado (10 %) / Anticipo / Plata suya antes del primer pago (estimado)»). Único llamador: `lib/handlers/perfil/seguimiento.js:213` (con `perfil` y `fila || null`). Constantes: `GARANTIA_SERIEDAD_PCT = 10` (`:95`), `FRACCION_FINANCIACION = 0.20` (`:96`), `CONTRIBUCION_OBRA_PCT` importada de `lib/ganancia.js` (`:94`).

**Reproducción (node -e, función real):**
```
obra, precio_base 6365863685 → contribucion 318293184 · garantia 636586369 · financiacion 1273172737
sin cuantía (precio_base null) → los tres null      (sin dato ≠ cero: correcto)
precio_base 0 → presupuesto null, garantía null      (el 0 no se toma por cuantía: correcto)
interventoría SIN perfil → contribucion 318293184    ← DEFECTO
interventoría con perfil helder y fila viva → tipo interventoria, contribucion null (correcto)
interventoría con perfil helder y SOLO FOTO (fila null) → tipo null, contribucion 318293184 ← DEFECTO
```
Causa: `tipoTrabajo` solo se resuelve `if (completa && perfilObj)` (`lib/guia_proceso.js:225-238`) y `aplicaContribucion(null)` es `true` (`lib/ganancia.js:136-138`). Un proceso guardado que ya salió del corpus (la foto es lo único que queda) recibe el 5 % aunque sea interventoría o consultoría. Esto desmiente lo que la memoria afirma en § «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)» («contribución del 5 % solo en obra —interventoría y consultoría no la llevan—») y es un hermano del defecto de § «La contribución del 5 % se cobraba siempre» (13-sep-2026), que barrió los motores APU pero no esta rama.

**Verdad.** «Financiar antes del primer pago» es `presupuesto × (1 − anticipo) × 0,20`: un supuesto (`FRACCION_FINANCIACION`), no un hecho; la pantalla actual lo rotula «(estimado)», el corto propuesto no. La garantía: la guía la calcula sobre el PRESUPUESTO (`:95`); `lib/dictamen.js:338-339` cita el Decreto 1082 art. 2.2.1.2.3.1.9: «al menos el diez por ciento del valor de la OFERTA (no del presupuesto)… en subasta inversa y concurso de méritos, del presupuesto oficial». Dos bases con el mismo nombre en dos pantallas (D-64 lo reconoce). Como el valor asegurado sobre el presupuesto es la COTA SUPERIOR (una oferta nunca supera el oficial), la cifra no engaña hacia abajo; debe decirse «hasta».

**Memoria.** Tocadas: «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)»; «La contribución del 5 % se cobraba siempre, y la alerta invitaba a cobrarla dos veces (13-sep-2026)»; «Don Héctor · la hipótesis verificada contra fuentes vigentes y el diseño del dictamen del pliego, sin código todavía (2-sep-2026)» («la seriedad es al menos el 10 % de la OFERTA, no del presupuesto»).

**Costo.** «clic» real: es un op de lectura (`seguimiento.js:213`), nada nuevo.

**Ya existe.** Sí, íntegro (`public/app.js:4228-4230`). El plan solo debe ENLAZAR desde la tarjeta, como declara la ficha.

**Condiciones.** (1) En `guiaDe`, resolver `tipoTrabajo` también sin perfil y sin fila viva (`tipoTrabajoDe(l, null)` ya funciona sobre `tipo_de_contrato`/objeto: `lib/filtros_lista.js:119-131`), o dejar la contribución `null` con motivo cuando el tipo no se conoce; cerradura: prueba con foto de interventoría que hoy FALLA. (2) Corto: «Garantía de seriedad: hasta $637 M asegurados (10 % del presupuesto; el pliego fija la base) · Contribución de obra pública 5 %: $318 M (solo obra) · Plata suya antes del primer pago: cerca de $1.273 M (estimado)». (3) La base de la garantía queda como par abierto (D-64): no afirmar «10 %» a secas.

## D-50 · Lo que esta entidad suele dar para ofertar · **con_condiciones**

**Fuente.** No existe con ese nombre (`node tests/mapa.js dias_oficina` → SIN ACIERTOS; `grep dias_oficina|dias_habiles_para` en `lib/`, `public/app.js` → 0). Las piezas sí: `habilesEntre` (`lib/habiles.js:144`), `percentilHistograma` (exportado por `lib/indice_baja.js:1058-1067`, usado en `lib/indice_competencia.js:457-467`), el acumulador `e.hechos` por entidad (`indice_competencia.js:435-448`) con `MIN_PROCESOS` y la fila histórica que conserva `fecha_de_publicacion_del` y la fecha de cierre (proyectar reproducido: `pub: 2026-08-20…`, `recep: 2026-09-10…`). El lector de cierre a llamar es `diaCierreDe` (`:580-586`), el de adjudicación `plazoAdjudicacionDe` (`:422-433`): el nuevo plazo se escribe con la MISMA forma (`{dias, motivo}`) y sin segunda definición de «cierre».

**Verdad (reproducido):**
```
habilesEntre("2026-08-20","2026-09-10") → 15
habilesEntre(null,"2026-09-10") → 0        ← «sin dato» sale como 0
habilesEntre("2026-09-10",null) → THROW festivos: año fuera de rango (2201)
habilesEntre("2026-09-10","2026-09-01") → 0  (orden invertido = 0, no negativo)
habilesEntre("basura","2026-09-10") → 0
percentilHistograma({21:3,9:2,30:1},6,0.5) → 21
```
`habilesEntre` convierte la ausencia y la basura en **0**: un proceso sin fecha de publicación entraría en el histograma como «0 días» y hundiría la mediana. La guarda va ANTES de llamar (patrón de `plazoAdjudicacionDe`: `sin_fecha_publicacion`, `sin_fecha_cierre`, `no_posterior`), y cada descarte se cuenta en la meta. Bajo 5, `mediana null` con la base (`:455-467`).

«Este proceso da 9»: hoy la lista solo calcula `dias_cierre` desde HOY en calendario (`listar.js:886` → `clasificar`), nunca hábiles publicación→cierre: es cálculo nuevo por fila en `op=listar` (barato, sin petición), y con `fecha_de_publicacion_del` ausente debe ser «sin dato», no 0.

**Memoria.** § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)» (mismo patrón: «días de oficina», frecuencia natural, «sin dato (hacen falta 5 …)», ni «mediana» ni «hábiles» en pantalla); § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)».

**Costo.** «sync» real: el índice de competencia se construye en la cadena de `op=historico` (`lib/handlers/procesos/historico.js:67`), refresco mensual; el campo nuevo no llega a los hashes ya escritos → reconstruir (`?reconstruir_indice=true`), y `hechosDeRegistro` (`:472-`) debe seguir dando null para un hash anterior al campo.

**Ya existe.** No; se LLAMA a lo que existe (arriba).

**Condiciones.** (1) Guardar la ausencia antes de `habilesEntre`; cerradura que falle con una fila sin publicación. (2) Frase con la base: «Esta entidad suele dar 21 días de oficina para ofertar (la mitad de sus 12 procesos, ese plazo o más); este proceso da 9». (3) La adenda que movió el cierre no se ve (A4 C1): decirlo en el plegado.

## D-51 · Ganadores locales frente a foráneos · **con_condiciones**

**Fuente.** `departamento_proveedor` está en `CAMPOS_ADJUDICACION` (`lib/indice_competencia.js:125`) y la proyección histórica la conserva (reproducido: `historica dep_prov: Tolima`; activa `undefined`). Ningún módulo la lee: `grep -rn departamento_proveedor lib public api` → solo esa lista. `departamento_entidad` va en la misma fila (`dep_ent: Tolima`).

**Verdad.** El FORMATO real del valor (nombre, código DANE, «No Definido», mayúsculas) es NO VERIFICABLE aquí (no hay corpus local; `docs/datos.md` no lo censa). El árbol ya tiene el normalizador que acepta nombre o código DANE: `public/filtros.js:121-128` (`departamento(valor)`), usado por `lib/filtros_lista.js:155-156` para `departamento_entidad`; comparar códigos, no cadenas. «No Definido» es `sin_dato` (7,6 % en `departamento_entidad`, § «Fase 8 · Los siete filtros»): no cuenta ni como local ni como foráneo, y la base excluye esas filas. Cobertura de `departamento_proveedor` sin medir: medir con `censarColumnasHistoricas` (`lib/columnas_historicas.js:324`) antes de enseñar. Mínimo 5 sobre adjudicados con AMBOS departamentos legibles.

**Memoria.** § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)» («No Definido» = sin_dato); § «Competencia histórica por entidad (jul 2026)» (índice por entidad); § «Lote «B9b-competencia-departamento» … (6-sep-2026)» (departamento = sede de la entidad).

**Costo.** «sync» real (barrido del índice de competencia, reconstrucción).

**Ya existe.** No.

**Condiciones.** (1) Normalizar ambos lados con `Filtros.departamento`. (2) «No Definido»/vacío aparte y fuera de la base. (3) Corto: «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (de 12 adjudicaciones con domicilio publicado)». (4) Cobertura medida antes de pintar.

## D-52 · Se adjudicó por el presupuesto oficial en X de N · **con_condiciones**

**Fuente.** El acumulador por entidad/departamento guarda el histograma por cubeta entera: `sumar` (`lib/indice_baja.js:244-246`: `cubeta = Math.round(bajaPct); g.hist[cubeta]++`), así que `g.hist[0]` es la cubeta 0 por entidad y por departamento (`acc.departamento`, `:350`). `baja_exactamente_cero` global: `:290` (`Math.round(baja) === 0`). Pero `registroPublicado` (`:391-445`) publica promedio, mediana, p25, p75, segmentos y `por_modalidad`: **NO conserva `hist` ni la cubeta 0** → lo que la ficha dejaba «NO VERIFICADO» queda verificado en negativo: exige reconstruir el índice de baja (`construirIndiceBaja`, llamado desde `sync.js:72` e `historico.js:70`).

**Verdad.** (a) «Cubeta 0» es |baja| < 0,5 %, no «ofertando el presupuesto completo»: una baja del 0,3 % cae ahí. O se cuenta la igualdad exacta (`baja === 0` en `bajaDeFila`) o se dice «prácticamente por el presupuesto». (b) N es «procesos con presupuesto y adjudicado en la misma fila, dentro de la banda −10 %…+70 %» (`:20-27`), no «contratos» ni «todos los adjudicados». (c) El ejemplo «131 de 131» es exactamente la señal de alarma que la cabecera documenta (`:39-41`: si se dispara al 100 % es que `valor_total_adjudicacion` copia a `precio_base`): antes de enseñar el dato por departamento hay que mirar `baja_exactamente_cero` de la meta; un 100 % se enseña como sospecha de dato, no como hecho. (d) Cascada: la entidad con base ≥ 5 gana; el departamento es lectura, no decide (§ B9b).

**Memoria.** § «Decisiones que no hay que re-aprender (costaron caro)» (el cero de la baja es dato; `baja_exactamente_cero` en la meta); § «La dispersión de la baja se MIDE, no se supone (24-ago-2026)»; § «DOS DE LAS CUATRO GRANULARIDADES DE LA BAJA ESTÁN VACÍAS EN PRODUCCIÓN (24-ago-2026)» (reconstruir no re-extrae); § «Lote «B9b-competencia-departamento» … (6-sep-2026)».

**Costo.** «sync» real, más reconstrucción del índice de baja (el hash anterior no trae la cubeta → `null`, nunca 0).

**Ya existe.** Solo el global (`baja_exactamente_cero` en la meta) y el histograma en el progreso; el registro publicado no. Llamar a `bajaDeFila`/`sumar`, no reescribir.

**Condiciones.** (1) Publicar `al_oficial: {n, base}` por grupo en `registroPublicado`, `null` en hashes viejos. (2) Contar igualdad exacta o decir «prácticamente». (3) Corto: «Aquí 9 de sus 12 procesos con cifras se adjudicaron por el presupuesto oficial» / «En Tolima, 131 de 131 con cifras: dato por confirmar (todos iguales)». (4) Un 100 % con base grande se rotula como dato sospechoso.

## D-53 · Gana sobre todo en <departamento> (perfil del competidor) · **con_condiciones**

**Fuente.** `departamento_entidad` vive en la fila histórica (proyectar reproducido: `dep_ent: Tolima`; `lib/proyeccion.js:42`). El acumulador actual del detalle (`lib/competencia_detalle.js:573-600`) agrupa por `lic.entidad` y guarda `{entidad, ganados, valor, con_valor, ultima}`; no hay `departamento` en el módulo (`grep departamento lib/competencia_detalle.js` → 0). Publicación `:672-681`. El índice inverso (`indice:adjudicatario`) no existe todavía (V-D01-D04 § D-03: «NO existe hoy… es el hash nuevo»): D-53 hereda las cuatro condiciones de D-03.

**Verdad.** Departamento = sede de la entidad, no de la obra (dicho). «No Definido» en `departamento_entidad` (7,6 %) va aparte. «Contratos» son procesos adjudicados (V-D03: «Adjudicaciones»). «4 de sus 6 entidades»: hay que declarar sobre qué se cuenta (entidades con departamento legible).

**Memoria.** § «Lote «B9b-competencia-departamento» … (6-sep-2026)»; § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)»; § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)».

**Costo.** «sync» real (barrido de `historico`), 8-12 B por entidad razonable; NO VERIFICABLE el peso exacto sin corpus.

**Ya existe.** No el agrupamiento; sí el acumulador por entidad al que se añade el campo.

**Condiciones.** (1) Reservar `departamento` en el acumulador de D-03 (normalizado con `Filtros.departamento`, null si «No Definido»). (2) Corto: «Gana sobre todo en Tolima: 4 de sus 6 entidades (11 de sus 15 adjudicaciones)». (3) Sujeto a D-03.

## D-54 · Republicado desde su publicación · **con_condiciones**

**Fuente.** `fecha_de_ultima_publicaci` NO está en `lib/proyeccion.CAMPOS` (`:38-61`) y se descarta en las dos proyecciones (reproducido: `activa ultima: undefined`, `historica ultima: undefined`). Cobertura 100 % en el censo del 16-ago: `docs/datos.md § «6. Censo de columnas de `p6dx-8zbt` para los filtros (Fase 8 · 2026-08-16)»`. Consumidores: `lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134` — los tres la leen como `fecha_de_publicacion_del || fecha_de_ultima_publicaci`: RESPALDO de la fecha de publicación, no productores de «republicado». Meterla en CAMPOS no enciende ninguna señal; hay que escribir el lector (`ultima > publicacion` → fecha; igual → nada; ausente → sin dato).

**Verdad.** «Republicado» solo se afirma con `ultima > publicacion` (día); igualdad = no republicado; no se afirma «adenda» (dicho). Riesgo lateral: en esos tres respaldos, si un día `fecha_de_publicacion_del` faltara, el cronograma se contaría desde la REpublicación; hoy `fecha_de_publicacion_del` cubre 100 % (`docs/datos.md § «6. Censo de columnas de `p6dx-8zbt` para los filtros (Fase 8 · 2026-08-16)»`), así que es inerte, pero se documenta.

**Memoria.** § «Fases 4 y 5 del plan v3 · Guardián del Formulario 1 y vigía de adendas (ago 2026)»; § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)»; § «El corpus conserva la llave de cruce `id_del_portafolio` · M-DGF-05 (6-sep-2026)» (precedente: añadir a CAMPOS sin exigir reconstruir el corpus; los registros anteriores no la traen → sin dato).

**Costo.** «sync» real: `transformar` → `proyectar` en full y delta (`sync.js:326`); los registros ya guardados no la traen hasta una full; cobertura medida con `censarColumnasHistoricas` antes de enseñar.

**Ya existe.** No.

**Condiciones.** (1) Escribir el lector con guarda de ausencia. (2) Corto: «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase: mire el proceso en SECOP II)». (3) Sin el campo (fila anterior a la full) no se dice «no republicado».

## D-55 · Proceso por lotes · **con_condiciones**

**Fuente.** `numero_de_lotes` en `CAMPOS_ADJUDICACION` (`lib/indice_competencia.js:126`), solo histórica (reproducido: `activa lotes: undefined`, `historica lotes: 3`); nadie la lee (grep → solo la lista). Cobertura y valor «sin lotes» (¿0, 1, vacío?) NO VERIFICABLES aquí (`docs/datos.md` no lo censa; no hay fixture).

**Verdad.** «puede presentarse a uno solo»: sin fuente en el árbol ni en el manual (`grep -i lote docs/GUIA_ANALISTA_LICITACIONES.md docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` → 0): es una regla del pliego, no del dataset. Se quita. «El valor de cada lote está en el pliego»: instrucción, no dato; aceptable. El vínculo con `desierto_con_adjudicacion` (`indice_competencia.js:225-229`) y «lotes parciales» (`indice_baja.js:23-26`) son HIPÓTESIS escritas en comentarios, no medidas: con el campo se podrán medir. Sin dato ≠ cero: `numero_de_lotes` ausente = no se dice nada; 0/1 = sin lotes (declarar tras medir).

**Memoria.** § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)» (desenlace contradictorio «pasa en procesos por lotes»); § «Decisiones que no hay que re-aprender (costaron caro)» (295 casos: lotes parciales); § «El corpus conserva la llave de cruce `id_del_portafolio` · M-DGF-05 (6-sep-2026)».

**Costo.** «sync» real (CAMPOS + full + cobertura).

**Ya existe.** No.

**Condiciones.** (1) Medir cobertura y el valor «sin lotes» antes de pintar. (2) Corto: «Proceso por lotes (3): el pliego dice si puede ofertar a un solo lote y cuánto vale cada uno; las cifras de esta tarjeta son del total». (3) Las puertas evalúan la suma y lo dicen.

## D-56 · Qué documentos tipo probablemente rigen · **con_condiciones**

**Fuente.** Norma citada en el árbol: `lib/dictamen.js:311-313` (`dt_social_2026`: Resoluciones 539, 540, 541, 952 y 953 de 2025; «obligatorios para procesos con aviso desde el 16 de febrero de 2026»), `dt_agua_2022` (`:314`), transporte v4 (`lib/formulario1.js:87`). Todas nacen con `literal_leido: false` (`:344`) y `normasParaElModelo` las filtra (`:345`): la resolución no se leyó desde aquí (dicho). No hay clasificador de «infraestructura social»: `grep -rni "infraestructura social" lib public` → solo la cita de la norma. Censo de detección de versión = 0 (A5 § 4.1).

**Verdad.** (a) La norma aplica al AVISO DE CONVOCATORIA; `fecha_de_publicacion_del` es la publicación en SECOP II, no ese aviso: en la frontera (febrero de 2026) la deducción puede fallar. (b) Sector: `tipoTrabajoDe` distingue obra/interventoría/consultoría, no infraestructura social frente a transporte o agua; `familiaDe` (`lib/indice_baja.js:204-210`) da familia UNSPSC, pero el corpus histórico no traía código legible en producción (§ «DOS DE LAS CUATRO GRANULARIDADES»). «Sector inequívoco» exige una regla explícita (familias + palabras del objeto) con cobertura medida; ante la duda no se dice nada. (c) «Distingue un pliego desactualizado» es una promesa: solo lo distingue leyendo el pliego (dictamen), no la fila.

**Memoria.** § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados» («Documentos tipo: tienen VERSIÓN, y cambió… desactualizado no es lo mismo que sastre»); § «Las 12 señales de pliego sastre» (señal #12); § «Don Héctor · la hipótesis verificada contra fuentes vigentes … (2-sep-2026)» (normas con `literal_leido`).

**Costo.** «peticion» real (cálculo por fila en `op=listar` sobre campos ya proyectados; sin fuente externa).

**Ya existe.** La cita de la norma, sí (llamar a `NORMAS_CITABLES.dt_social_2026`); la deducción, no.

**Condiciones.** (1) Solo con sector deducido por regla declarada y publicación posterior al 16-feb-2026 con margen; en la frontera, nada. (2) Corto: «Probablemente rigen los documentos tipo de infraestructura social vigentes desde febrero de 2026 (la fecha que manda es la del aviso de convocatoria: confírmelo ahí)». (3) No prometer «distingue un pliego desactualizado» en la tarjeta: eso es del dictamen.
