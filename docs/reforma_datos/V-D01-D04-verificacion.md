# Verificación adversaria · D-01, D-02, D-03, D-04 (tanda 1) · 13-sep-2026

> Para: sesión · Estado: informe fechado · Sustituido por: —

> Para: el orquestador del plan v4 · Postura: refutar por defecto · Árbol: `main` en `3482415`, sin cambios (`git status --short` vacío antes y después).
> Todo lo afirmado lleva ancla `ruta:línea` o una reproducción ejecutada. Los guiones y sus salidas están en este mismo directorio:
> `v_d01_repro.js` (+ `.salida.txt`), `v_lenguaje_d01_d04.js` (+ `.salida.txt`), `v_d02_forma.js` (+ `.salida.txt`), `v_d03_a2_repro.salida.txt` (reejecución de `a2_repro.js 30000 731 0`).
> Lo que no se pudo ejecutar aquí va rotulado NO VERIFICABLE con su motivo. Las secciones de la memoria se citan por su título exacto.

## Resumen en cuatro líneas

| id | veredicto | en una línea |
|---|---|---|
| D-01 | con_condiciones | Calculable y cierto en Purificación (reproducido con las funciones reales), pero desmiente una decisión escrita del 11-sep que nació de palabras literales del dueño; el «30 %» no está publicado (vive solo dentro de un mensaje), sin token filtra K con un 0,33 % de error, el disparador de P3 se enciende en TODO el corpus, y la frase congelada seguiría diciendo «Solo» sobre la misma fila. |
| D-02 | con_condiciones | La fuente existe y la regla YA existe (`concentracion` en `detalleEntidad`): el plan tiene que extraerla y compartirla, no reescribirla en `construirIndice`; hoy ni el registro del índice ni `competenciaDe` llevan líder (reproducido); «6 de 15» es «de 15 con ganador identificado» y hay que decirlo; el líder tiene que entrar en `sinFinanzas`, que hoy no toca ni `competencia` ni `socio`. |
| D-03 | con_condiciones | Todo lo medible se reprodujo (op, función, líneas 580-607, caché v7, cuadre 155/155 · 143/143 · 147/147, 8/95 comandos y 2,00/2,68 MB en frío, 54 HSET y 6,29 MB, 218 ms de CPU a 30k). Condiciones: progreso propio y reanudable dentro del presupuesto de 40 s, guardar la baja cruda y encoger al servir, `refrescar=1` tiene que saltar también el hash, y «contratos» son procesos adjudicados. |
| D-04 | con_condiciones | Las anclas existen y el modal está fuera de `#app` (reproducido). Pero la respuesta visible YA existe (spinner + «Buscando sus adjudicaciones…»), la fecha «Con datos hasta…» no puede salir de `construido` (es la fecha de construcción, no la del corpus: la del corpus es `sync:historico:meta.hasta`), «Actualizar ahora» con `refrescar=1` NO refresca nada en el camino del hash, «esta empresa» no es la palabra del producto («competidor»), y el propio dossier de diseño dice que la evidencia sobre esqueletos está dividida. |

---

## D-01 · «Con quién conviene» · veredicto: **con_condiciones**

### 1) Fuente
- `lib/socio_por_proceso.js` existe (421 líneas; exporta `socioPorProceso`, `pluralesDe`, `socioQueAlcanza`, `carenciasDe`, `avisoMipyme`, `repartoSugerido`… `:415-420`). Lo llaman `lib/filtros.js`, `lib/handlers/perfil/diagnostico.js`, `lib/handlers/perfil/seguimiento.js`, `lib/handlers/procesos/listar.js` (`node tests/mapa.js socio_por_proceso`).
- Corre por fila servida: `lib/handlers/procesos/listar.js:935-938` (`socio: resumenSocio(socioPorProceso({ fila: l, base: perfil, candidatos: CANDIDATOS_CONSORCIO, ctx: {…} }))`), solo si `socioAplica = perfil === ID_DUENO && CANDIDATOS_CONSORCIO.length > 0` (`:554`). `resumenSocio` en `:109-113` devuelve `{tipo, cierra_todo}`. Anclas de la ficha: correctas.
- `nombreCorto`: 0 apariciones en `lib/ public/ api/ tests/` (grep ejecutado). Correcto: hay que crearlo, y también en `perfilDesdeConfig` (`lib/perfiles.js:399-407`, perfiles `rup_…`/`cons_…`).
- `p2_k.depende_del_anticipo`: `lib/puertas.js:183` (cálculo) y `:195` (publicación). `p3_caja.sin_dato_de === "anticipo"`: `lib/puertas.js:248-256` (`p3SinDato("anticipo", …)`); la definición de `p3SinDato` está en `:221-223`. Correcto.
- Contrafáctica `anticipo_pct: 0, anticipo_declarado: true`: el campo existe y manda (`lib/negocio.js:138-139` `if (typeof lic.anticipo_declarado === "boolean") return lic.anticipo_declarado;`, leído por `lib/puertas.js:99-101` y `lib/rup.js:79-91`).

### 2) Verdad (reproducción ejecutada: `node v_d01_repro.js`, salida en `v_d01_repro.salida.txt`)
Purificación ($6.365.863.685, base `helder`, candidatas `["genesis","prodiac"]`):

| caso | p2_k | p3_caja | socio | frase que HOY se congela al guardar |
|---|---|---|---|---|
| A · anticipo no publicado (como llega) | pasa=true, `depende_del_anticipo=true` | pasa=true, `sin_dato_de=anticipo` | **solo** | «Solo. Esta le alcanza sin socio: se queda con todo.» |
| B · contrafáctica (0 declarado) | pasa=false | pasa=false | **con_socio prodiac**, cierra_todo=true, 80/20 | «PRODIAC LTDA suma capacidad: … Reparto sugerido: 80 % usted, 20 % PRODIAC LTDA.» |
| C · 30 % declarado | pasa=true | pasa=true | solo | «Solo. Esta le alcanza…» |
| C' · 29,8 % declarado | pasa=true | pasa=true | solo | (idem) |

- **La derivación es cierta y calculable** para el caso reproducido: sin anticipo → PRODIAC 80/20; con 30 % → solo. Umbral exacto de K = 29,77 % → `ceil` = 30 % (`lib/puertas.js:188`): el 30 es más exigente que la verdad (con 29,8 % también cabe, caso C'), nunca más laxo. Cumple «una cifra redondeada para mostrar no decide»: decide la comparación de `:183`, no el 30.
- **Defecto 1 · el 30 % NO está publicado.** `p2_k` publica `pasa, crp, crpc, dentro_de_tope, tope, depende_del_anticipo, advertencia, mensaje` (`lib/puertas.js:189-210`; reproducido: `¿p2_k publica anticipo_que_cabe_pct? false · el 30 solo está en el mensaje`). La ficha D-09 de la síntesis afirma «el servidor publica `p2_k.anticipo_que_cabe_pct`»: **falso hoy**. D-01 depende de que D-09 lo publique desde la MISMA variable `anticipoQueCabe` (`:188`); recalcularlo en `socio_por_proceso` sería reescribir una regla que existe (regla dura).
- **Defecto 2 · hermano vivo en P3.** El anticipo que haría caber la CAJA es otra cifra: para Purificación 13,03 % → 14 % (reproducido: `patrimonio=1107252964 financiación=1273172737`), y `p3_caja` no publica ningún «anticipo que cabe» (claves reproducidas: `pasa,sin_dato,sin_dato_de,patrimonio,financiacion_requerida,anticipo_pct,mensaje`). En esta fila el umbral de K (30) gana al de caja (14), pero eso depende de las cifras del perfil de hoy (K 4.470 M vs. patrimonio 1.107 M): la línea debe usar el MAYOR de los dos umbrales, con el de caja calculado en `lib/puertas.js` junto al de K.
- **Defecto 3 · el disparador de P3 se enciende en todo el corpus.** `p3Caja` devuelve `sin_dato_de: "anticipo"` para CUALQUIER fila con cuantía > 0 y anticipo no declarado, cabiendo o no (`lib/puertas.js:248`; reproducido con cuantía $3.000 M: `financiación=600000000 < patrimonio=1107252964` y aun así `sin_dato_de=anticipo`). Con 2.000 filas sintéticas de $4.500-6.500 M: 2.000/2.000 «pendientes de anticipo». El estado `segun_anticipo` NO puede asignarse por el disparador: solo cuando la contrafáctica CAMBIA el veredicto (`solo` → `con_socio`/`ninguna_sirve`, o `cierra_todo` distinto). Si no, casi todas las tarjetas salen en ámbar y la que importa no se distingue.
- **Coste real de la contrafáctica:** 0,538 ms/fila (2.000 filas, medido) frente a 0,029 ms del veredicto normal y 0,039 ms de las puertas; con 200 filas por página ≈ 108 ms más por petición. No es «solo en filas con anticipo sin publicar» como minoría: es casi toda la página (el dataset no publica el anticipo, `lib/negocio.js:84-107`). Aceptable, pero hay que declararlo así.
- **Defecto 4 · sin credencial se despeja K.** `lib/publico.js:73-83` (`mensajeP2Publico`) omite a propósito el porcentaje del mensaje de P2 porque el 30 % deriva de K (una finanza del perfil); la fila sin token pasa por `sinFinanzas` (`listar.js:943`), pero `lib/publico.js` tiene **0 apariciones de `socio`** (grep): el campo viaja crudo. Reproducido: `cuantía pública × (1 − 0,30) = 4.456.104.580 · K real 4.470.921.189 · error 0,33 %`. Regla dura «redactar un campo no basta si otro permite despejarlo»: `sinFinanzas` tiene que anular `socio.linea` (o el objeto) sin token.
- **Defecto 5 · dos redacciones del mismo hecho.** La ficha dice «el congelado al guardar no se toca». Pero la `frase` que se congela (`lib/handlers/perfil/seguimiento.js:168-181` → `socioPorProceso().frase`) sigue siendo «Solo. Esta le alcanza sin socio: se queda con todo.» para el caso A, mientras la tarjeta diría «Solo si el pliego trae anticipo del 30 %…». La memoria del 11-sep exige que «la frase manda» y que no haya dos redacciones del mismo número que diverjan. Si `linea` se redacta en `socio_por_proceso.js`, la `frase` del estado `segun_anticipo` cambia en el mismo sitio; lo que no se toca es el MECANISMO de congelar, no el texto.
- «Sin dato ≠ cero»: `socioPorProceso` hace `Number(fila.cuantia_cop ?? fila.precio_base ?? 0) || 0` (`:310`) solo para el aviso Mipyme, que devuelve `null` con cuantía ≤ 0 (`:109`). No convierte ausencia en cero decisorio. Bien.
- «Nunca inventar un porcentaje»: el 40/20 del reparto está en `:227-228` con su motivo («suele ir del 30 % al 40 %», sin fuente verificada contra el pliego, `:222-226`). La ficha lo conserva como «sugerido»: coherente con la memoria. El aviso Mipyme cita el Decreto 1082/2015 modificado por el 1860/2021 (`:94-98`) y el umbral 2026 (`:48`): sin invento nuevo.

### 3) Memoria (títulos exactos)
- «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)» — la respeta (orden a favor del dueño, reparto 60/40 y 80/20, Mipyme avisa y no excluye, nunca «cumple»). Nota: esa sección dice que la tarjeta pinta «Solo: le alcanza sin socio» en gris «a petición expresa del dueño», y NO lleva «> SUPERADA» aunque la siguiente la desmiente.
- «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)» — **la desmiente**: allí consta la petición literal del dueño («cuando lo guarde el proceso me diga con quién conviene más…»), el motivo («ponerlo en cada una de las doscientas tarjetas era repetir doscientas veces una decisión que se toma una») y el peso (1.220 B → 30 B por fila). La cerradura que la fija: `tests/e2e.js:4705-4706` (claves exactas `["cierra_todo","tipo"]`), `:4728` (`bloqueSocio` con «solo» devuelve «»: hoy la tarjeta NO dice nada en «solo» — reproducido), `:4730-4737`. Hoy `bloqueSocio` (`public/app.js:2008-2014`) solo habla cuando `tipo === "con_socio"`. La ficha lo reconoce y propone «> SUPERADA»: es una reversión de palabras del dueño, no un arreglo técnico; tiene que confirmarla el dueño, no un informe.
- ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros (13-sep-2026)» — la respeta (P3 `sin_dato` deja pasar; la contrafáctica no bloquea nada: `viable` no cambia). Explica por qué el disparador de P3 es tan ancho (defecto 3).

### 4) Costo
`peticion`: correcto. `socioPorProceso` ya corre por fila servida (`listar.js:935`, después de paginar). La segunda evaluación añade ~0,54 ms/fila sobre casi todas las filas (medido), no sobre una minoría.

### 5) Lenguaje (cerca real: `lib/lenguaje_pantalla.js` + copia de `JERGA_JS` de `tests/e2e.js:29449`; salida en `v_lenguaje_d01_d04.salida.txt`)
Los siete textos pasan emoji/voseo/tuteo/jerga y miden 27-86 c. Tres correcciones de precisión:
- «Solo si el pliego trae anticipo…»: «Solo» (sin socio) choca con «solo si» (condición). Propuesta (81 c., pasa la cerca): **«Sin socio si hay anticipo del 30 % o más; sin anticipo, con PRODIAC (80 % usted).»**
- «reparto sugerido 60/40» no dice quién es el 60. Propuesta: **«… · usted 60 %, Génesis 40 %»** (88 c.) y **«… · usted 80 %, PRODIAC 20 %»** (80 c.).
- «no cabe si la convocatoria es solo para Mipyme»: el módulo ya lo dice sin sigla («empresas pequeñas», `:113`). Propuesta: **«Conviene con PRODIAC, pero no cabe si la convocatoria es solo para empresas pequeñas.»** (85 c.).

### 6) ¿Ya existe?
Sí, casi todo: `frase` (`:395-397`), `recomendacion.socio/nombre/reparto` (`:400-406`), `avisos` (`:410`), `repartoSugerido` (`:230`), `CARENCIAS_CORTAS` (`:71-76`). `linea` debe derivarse del mismo objeto `mejor` en el mismo módulo (como propone la ficha), no de una segunda evaluación paralela. El umbral del anticipo existe como variable local `anticipoQueCabe` (`lib/puertas.js:188`): se publica, no se recalcula.

### Condiciones para que D-01 sobreviva
1. El dueño confirma que revierte su petición del 11-sep (la línea vuelve a cada tarjeta); la sección «El veredicto de socio se lee AL GUARDAR…» recibe «> SUPERADA» y la del 11-sep anterior también se anota (hoy no lleva marca).
2. El 30 % sale de `lib/puertas.js` publicado como campo (`anticipo_que_cabe_pct`, D-09), y la línea usa el MAYOR entre el umbral de K y el de caja (este último hoy no existe: se calcula en `p3Caja`, no en `socio_por_proceso`).
3. El estado `segun_anticipo` se asigna solo cuando la contrafáctica CAMBIA el veredicto, nunca por `sin_dato_de === "anticipo"` a secas (reproducido: se enciende en todo el corpus).
4. `lib/publico.sinFinanzas` anula `socio.linea` (y `con`/`aviso` si llevan cifras del perfil) sin token; token inválido sigue en 401 (`listar.js:381-391`).
5. La `frase` del estado `segun_anticipo` cambia en `socio_por_proceso.js` (una sola redacción para tarjeta y expediente); el mecanismo de congelar no se toca.
6. Las tres correcciones de texto del § 5, o equivalentes que pasen la cerca y quepan en 90 c.
7. El coste se declara como es: ~0,54 ms/fila sobre casi todas las filas (no «solo en filas con anticipo sin publicar» como si fueran pocas).

---

## D-02 · «Quien más gana aquí» · veredicto: **con_condiciones**

### 1) Fuente
- `indice:competencia` existe (`lib/almacen.js:23-25,119,133-134`): hash entidad → JSON, construido por `construirIndice` (`lib/indice_competencia.js:908`) sobre los chunks del histórico (`CLAVES.patronChunksHist`, `:911`), invocado desde `lib/handlers/procesos/historico.js:469-470` (op `historico` de `api/procesos.js:31`; `?reconstruir_indice=true`, `historico.js:6,393`).
- `esAdjudicado`: `lib/indice_competencia.js:186`; `claveAdjudicatario`: `lib/equivalencias.js:72-88` (descarta rellenos «No Definido», `:69-71`). `MIN_PROCESOS = 5`: `lib/indice_competencia.js:86`. Anclas correctas.
- Hoy el hash NO lleva líder (reproducido, `v_d02_forma.js`): `registroPublicado → nombre, nit, procesos, procesos_contados, min_procesos, oferentes_total, promedio, mediana, nivel, prorroga, plazo_adjudicacion, desiertos` y `competenciaDe → nivel, promedio_oferentes, mediana_oferentes, total_procesos`. `lider: false` en los dos.
- `cargarAdjudicatario(clave, nombre)`: `public/app.js:3382`. Existe. La delegación del listado va en `$("lista").addEventListener` (`:3421`) y la cerradura `tests/e2e.js:20786-20793` exige que `.btn-apu` se resuelva ANTES que `.banda-competencia`: el botón nuevo debe entrar en ese orden.

### 2) Verdad
- **La regla YA existe** y está probada: `lib/competencia_detalle.js:439-446` (`const lider = top[0]; concentracion = conGanador >= MIN_PROCESOS && lider ? { lider: lider.nombre, ganados, base: conGanador, pct } : null`), con `top` acumulado en `:230-262` (`esAdjudicado` → `claveAdjudicatario` → `ganados++`), y el modal ya la pinta: `public/app.js:2969-2970` «Quién gana aquí (15 procesos con ganador identificado)» · «X se lleva 6 de 15 (40 %)». La ficha propone «acumular en construirIndice» sin decir que es esa función: **hay que extraer el acumulador de `detalleEntidad` y compartirlo**, o la tarjeta y el modal divergirán a la primera corrección (regla dura «no reescribir: llamar»; precedente `bajaDeFila`, memoria B9b).
- **«6 de 15»**: en la regla existente `base = conGanador` = procesos adjudicados CON ganador identificado (`:232-233` cuenta aparte `sinAdjudicatario`). El «15» no es «los procesos de la entidad»: si la tarjeta dice «6 de 15» a secas, el lector lo lee sobre el total. El modal lo dice en el título; la tarjeta debe decirlo («6 de 15 con ganador conocido») o el `title`/modal explicarlo a un clic — y `base` publicado debe ser `procesos_con_ganador`, no `procesos`.
- «Sin dato ≠ cero»: `sin_adjudicatario` se cuenta aparte y no entra en `base` (`:232-233`); sin base ≥ 5 no hay líder (`:440`). Bien. Frecuencia natural (n de N), sin porcentaje en la tarjeta: coherente con la filosofía.
- Sin credencial: `op=entidad` exige token (`lib/handlers/inteligencia/detalle.js:54,107`), así que hoy el líder solo sale con token. En la fila, `sinFinanzas` (`lib/publico.js:118-160`) **no toca `competencia`** (0 apariciones de `competencia` y de `socio` en `lib/publico.js`; grep ejecutado): el líder tiene que añadirse ahí explícitamente, o saldría sin token por `competencia: compDe(l)` (`listar.js:782`).

### 3) Memoria (títulos exactos)
- «Competencia histórica por entidad (jul 2026)» — origen del índice y de lo que `/api/oportunidades` expone. La letra «nunca adjudicatarios, NIT ni valores» NO está en la memoria (grep ejecutado: 0 aciertos); vive solo en el comentario `lib/indice_competencia.js:1167-1168`. La ficha la supera en su letra conservando el espíritu (sin credencial nada; con credencial nombre y cuota, sin NIT ni valores): hay que escribirlo como decisión nueva y cambiar ese comentario en el mismo commit.
- «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)» — la barra «quién gana» con «Otros» y la tabla plegada: la regla de `concentracion` que hay que compartir nace ahí.
- «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)» — precedente exacto de «extraer del barrido y compartir» (`bajaDeFila`).

### 4) Costo
`sync`: correcto. Se construye en `construirIndice` dentro de la op `historico` (`historico.js:469-470`), reanudable con presupuesto (`:908`, 40 s), y la cadena se rehace sola cuando la extracción baja datos nuevos (`historico.js:452-454`; refresco cada 30 días, `lib/handlers/procesos/sync.js:104`). Lectura por petición sin coste nuevo (`registroDe` + `competenciaDe`, `:1197-1230`).

### 5) Lenguaje
«Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›» pasa la cerca (60 c.). «Quien» sin tilde es correcto como relativo. Precisión: «6 de 15» → «6 de 15 con ganador conocido» (o el `title` con la frase del modal).

### 6) ¿Ya existe?
Sí: `concentracion` (`lib/competencia_detalle.js:439-446`) y su pintura en el modal (`public/app.js:2969-2970`); cerradura con esa forma en `tests/e2e.js:13024-13036`. El plan debe llamar a esa regla desde el índice, no reescribirla.

### Condiciones
1. Extraer el acumulador de líder de `detalleEntidad` (`:230-262` + `:439-446`) a una función compartida por el barrido de `construirIndice` y el modal; cerradura: índice ≡ modal sobre el mismo corpus, con mutación.
2. `lider.base` = `procesos_con_ganador`; la tarjeta dice de qué base es el «15».
3. `sinFinanzas` anula `competencia.lider` sin token; 401 con token inválido (ya lo hace `listar.js:381-391`).
4. La decisión nueva se escribe en la memoria y se corrige el comentario `lib/indice_competencia.js:1168` en el mismo commit.
5. El botón entra en la delegación de `$("lista")` después de `.btn-apu` y antes de `.banda-competencia` (`tests/e2e.js:20786-20793`).

---

## D-03 · «Dónde gana este competidor» · veredicto: **con_condiciones**

### 1) Fuente
- `op=competidor` → `api/inteligencia.js:17-24` (`competidor: "adjudicatario"`) → `lib/handlers/inteligencia/detalle.js:174-175` → `detalleAdjudicatario` (`lib/competencia_detalle.js:547`). Exige token (`detalle.js:54,107`). Anclas correctas.
- El acumulador a extraer: `lib/competencia_detalle.js:580-607` (`for (const lic of registros) { if (!esAdjudicado(lic)) continue; … claveAdjudicatario … bajaDeFila … CAMPOS_VALOR_ADJUDICADO … primeraFecha }`). Correcto.
- Caché `v7`: `lib/competencia_detalle.js:134`; sello = `meta.construido` del índice de competencia (`:557-558`); `?refrescar=1` solo salta la LECTURA de la caché (`:160-161`, `detalle.js:166`).
- `indice:adjudicatario` NO existe hoy (`lib/almacen.js:119-134` no lo lista): es el hash nuevo, como declara la ficha.

### 2) Verdad (reejecución: `node a2_repro.js 30000 731 0`, salida `v_d03_a2_repro.salida.txt`)
- Cuadre del prototipo con la función real: `total 155 vs 155 · valor 211899299426 vs 211899299426 · entidades 143 vs 143 · baja.n 147 vs 147 · CUADRA`. Frío hoy: 8 comandos / 2,00 MB (24 chunks) y 95 comandos / 2,68 MB (720 chunks); caché 2 comandos. Índice inverso: 10.636 adjudicatarios · 6,29 MB · 54 HSET · 218 ms de CPU (la ficha dice +0,3-0,7 s: es la medida de A2 a 30k/50k; aquí 218 ms a 30k; el 50k no se reejecutó). Las cifras de la ficha son reales dentro de su orden.
- «Sin dato ≠ cero»: `valor_adjudicado_cop` = `null` cuando `con_valor` = 0 (`:669`, `:676-677`); un 0 no es valor (`:599-601`). `procesos_con_valor` viaja (`:669`) y hoy no se pinta (`public/app.js:3366-3368` dice «valor sin dato» o la cifra): «$28.400 M en 14 de 15 contratos con valor publicado» es la cota honesta; su pintura es D-05.
- «último: 12 de ago de 2026» sale de `primeraFecha` (`:96-102`) sobre `CAMPOS_FECHA_ADJUDICACION = ["fecha_adjudicacion","fecha_de_adjudicacion"]` (`lib/indice_competencia.js:118`): es la fecha de ADJUDICACIÓN, no la de firma. La columna «Último contrato» (`public/app.js:3374`) y «15 contratos» (`:3366`) ya existen con esa palabra: p6dx-8zbt son PROCESOS (`lib/indice_competencia.js:161-166`; `que_es` en `:680-685` dice «procesos … adjudicados»). Un proceso adjudicado no es necesariamente un contrato firmado. Precisión, no bloqueo: «adjudicaciones» / «Última adjudicación».
- La identidad no cambia (NIT y nombre cuentan aparte, `:545-546`); `esAdjudicado` no cambia. Correcto.
- Frescura: el hash se construye en la cadena de `historico` (refresco cada 30 días, `sync.js:104`; se rehace al bajar datos nuevos, `historico.js:452-454`; a mano con `?reconstruir_indice=true`). «Hasta un mes salvo reconstrucción»: correcto.

### 3) Memoria (títulos exactos)
- «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)» — `esAdjudicado`/`adjudicacionAfirmada`, la identidad del índice de baja («la regla NO se relaja») y el `motivo` honesto de `baja_media`: el registro del hash debe conservar `descartados` crudos para poder redactar ese motivo al servir (`:646-654`).
- «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)» — `bajaDeFila` extraída del barrido y compartida: el precedente exacto de la extracción que D-03 propone; `subRegistro` + `encogerBaja` se aplican al servir (`:626-629`).
- «Lo que la cadena ya construyó no se vuelve a construir · la causa raíz de «no converge»…» (7-sep) — la memoria `derivadosHechos` y el presupuesto compartido: un constructor nuevo dentro del barrido no puede romper la convergencia.

### 4) Costo
`clic` para la lectura (op de lectura existente; 2-3 comandos con el hash) y `sync` para la construcción (dentro de `construirIndice`, presupuesto de 40 s por invocación, `:908`). La ficha lo declara así en la síntesis; el JSON dice solo «clic»: incompleto, no falso.
NO VERIFICABLE aquí: la latencia real en producción (sin credenciales ni red; se lee en `duracionMs`/`comandosRedis`, `detalle.js:178`), y el 50k del prototipo (no reejecutado).

### 5) Lenguaje
Los dos textos pasan la cerca (109 y 54 c.). «$28.400 M» es el formato de `fmtCorto` ya en uso. Precisión: «contratos» → «adjudicaciones»; «Último contrato» → «Última adjudicación» (es lo que mide `primeraFecha`).

### 6) ¿Ya existe?
La pantalla entera existe (`public/app.js:3345-3380`): cabecera, tabla «Entidad · Ganados · Valor adjudicado · Último contrato» (`:3374`), «que_es». Lo nuevo es el camino de servicio (hash) y `origen`. Bien declarado como «cambia».

### Condiciones
1. El acumulador de `:580-607` se extrae a UNA función compartida (barrido de hoy y constructor), con la cerradura índice ≡ `detalleAdjudicatario` y su mutación; la comparación del prototipo (155/155…) es la prueba a escribir.
2. Progreso propio y reanudable (`indice:adjudicatario:progreso`), no dentro de `indice:competencia:progreso` que se reescribe tras cada mes (`:948`): el acumulador pesa 5,5-7,8 MB (medido) y la cadena de 40 s tiene que seguir convergiendo (memoria del 7-sep).
3. El registro guarda `baja {n, suma, hist}` y `descartados` crudos; `subRegistro` + `encogerBaja` se aplican al servir (`:626-629`), jamás una mediana precalculada.
4. `refrescar=1` tiene que saltar TAMBIÉN el hash (hoy solo salta la caché, `:160-161`): si no, «Actualizar ahora» (D-04) devuelve el mismo registro.
5. `v7` → `v8` en `:134` al desplegar; el «no existe» se sirve del hash solo con `encontrado: false` explícito, nunca por ausencia de clave sin caer al barrido.
6. Palabras: «adjudicaciones» y «Última adjudicación».

---

## D-04 · «La espera del perfil, con forma, y de dónde salió el dato» · veredicto: **con_condiciones**

### 1) Fuente
- `abrirModal`: `public/app.js:2534-2545`. Hoy pinta `cargando(msg)` = spinner `.spin` + mensaje (`:2528-2533`), y `cargarAdjudicatario` lo llama con «Buscando sus adjudicaciones…» (`:3383`). Es compartido por tres vistas (entidad, competidor, probabilidad): firma `(titulo, rotulo, msg)`.
- `.exp-esqueleto`: `public/index.html:1288-1290` (gradiente + `animation: brillo 1.5s`), `@keyframes brillo` en `:794`; bajo `prefers-reduced-motion` en `:1380` (`animation: none`, sin `background` plano; la regla que sí lo pone es `:851` para `#app .animate-pulse .bg-gray-100`). `--dur-5` en `:209` (y a 0 s en `:837`). Anclas correctas.
- Modal fuera de `#app`: reproducido con Node (`#app` abre en `:2006` y cierra en `:4506`; `#modal-cuerpo` en `:4521` → dentro de `#app: false`). Por eso `#app .animate-pulse` (`:791-792`) no alcanza al modal: correcto. La memoria lo tiene escrito: «Segunda pasada del aparato táctil: la portada, el gate y los tres modales no son hijos de `#app` (12-sep-2026)».
- Cerradura `tests/e2e.js:27970-28000`: comprueba efectos del bloque `prefers-reduced-motion: reduce` (`.spin { animation: none`, `--transition: 0s`, sin `.hidden`): correcto, y la regla nueva sobre `.exp-esqueleto` dentro del modal entra en ese bloque.
- `refrescar=1`: `lib/handlers/inteligencia/detalle.js:166` → `usarCache = q.refrescar !== "1"` → solo salta la caché (`lib/competencia_detalle.js:160-161`).

### 2) Verdad
- **La respuesta visible YA existe** (spinner + frase): la regla dura «ninguna pulsación sin respuesta visible» no está rota hoy. Lo que D-04 añade es forma, frase distinta, origen del dato y «Actualizar ahora». La pantalla vacía de hoy dice «No hay adjudicaciones de este proveedor en el corpus (desde 2024)» (`:3346`).
- **La fecha no puede salir de `construido`.** La meta del índice publica `construido: new Date().toISOString()` (`lib/indice_competencia.js:1080`): es la fecha en que se construyó, no hasta cuándo hay datos. La ventana del corpus vive en `sync:historico:meta` (`lib/handlers/procesos/historico.js:351-352`: `{ts, desde, hasta, …}`). «Con datos hasta el 31 de agosto de 2026» tomado de `construido` sería una cifra creíble y equivocada (el índice puede construirse el 13-sep sobre un corpus que termina el 31-ago, o al revés). Ha de ser `hasta` de la extracción (o el último mes de chunks), y decirlo así.
- **«Actualizar ahora» no actualiza.** Con `refrescar=1` el camino del hash devolvería el mismo registro (la caché no interviene). Para que «Al día de hoy (recorrido completo)» sea verdad, `refrescar=1` tiene que forzar el barrido (condición 4 de D-03).
- «Puede tardar unos segundos»: coherente con lo medido (95 comandos × 30-80 ms + CPU ≈ 3-8 s; A2 § 3.2, supuesto declarado). NO VERIFICABLE en producción.
- El esqueleto «con la forma del resultado» solo tiene sentido en la vista del competidor: `abrirModal` es común a tres vistas y hoy no sabe cuál pinta.
- Evidencia de diseño: `docs/INVESTIGACION_DISENO_WEB.md § «8.2. Qué dice el diseño de 2026, y qué de eso sobrevive a Detekta»` («las pantallas de esqueleto como mejora automática, cuya evidencia está DIVIDIDA, no a favor») y `:881-882` («al cargar datos el esqueleto es el único movimiento y desaparece de golpe»). El «beneficia» del esqueleto es criterio, no medición; lo que sí es hecho es el origen y la fecha.

### 3) Memoria (títulos exactos)
- «Segunda pasada del aparato táctil: la portada, el gate y los tres modales no son hijos de `#app` (12-sep-2026)» — la respeta y la explica (el modal no hereda reglas de `#app`; toda regla nueva del modal va fuera del prefijo).
- «La piel v3 · «Lino y tinta»: el color caro y el detalle, medidos (4-sep-2026)» — el esqueleto con brillo en vez del parpadeo de `animate-pulse` y su apagado bajo reduced-motion: la regla nueva debe seguir ese patrón (`:851`), no uno propio.
- «Lo que la cadena ya construyó no se vuelve a construir · la causa raíz de «no converge»…» — de ahí sale que la frescura del hash sea la de la cadena mensual, que es lo que el pie tiene que declarar.

### 4) Costo
`clic`: correcto (misma op de lectura; el «Actualizar ahora» es un clic más con `refrescar=1`).

### 5) Lenguaje
Los cuatro textos pasan la cerca (34-96 c.). Tres correcciones:
- «esta empresa» → **«este competidor»**: un adjudicatario puede ser persona natural, y «competidor» es la palabra del producto (`api/inteligencia.js:13-14`; rótulo del modal «Dónde gana este competidor», `public/app.js:3383`). Propuesta: **«Buscando dónde más gana este competidor…»**.
- «no está en el índice: se recorre el histórico completo» describe el mecanismo (índice, barrido), no el hecho. Propuesta: **«De este competidor no hay resumen guardado: se revisan todos los procesos. Puede tardar unos segundos.»**
- «Con datos hasta el 31 de agosto de 2026» → **«Con los procesos publicados hasta el 31 de agosto de 2026 · Actualizar ahora»** (76 c.), con la fecha de `sync:historico:meta.hasta`.

### 6) ¿Ya existe?
La espera visible sí (`:2528-2533`, `:3383`); el esqueleto `.exp-esqueleto` sí (`index.html:1288`; usado en el expediente, `app.js:3757-3759`); `aria-busy` ya se usa en la lista (`app.js:684, 3619`). Nada de esto se reescribe: se reutiliza.

### Condiciones
1. La fecha del pie sale de la ventana del corpus (`sync:historico:meta.hasta`, `historico.js:351-352`) o del último mes de chunks, nunca de `construido`.
2. `refrescar=1` fuerza el barrido en `detalleAdjudicatario` (si no, «Actualizar ahora» es una pulsación sin efecto, que la regla dura prohíbe).
3. El esqueleto con forma se pinta solo para la vista del competidor (parámetro de `abrirModal` o función propia); bajo reduced-motion, `background: var(--bg-inset-2)` como `:851`, fuera del prefijo `#app`.
4. Las tres correcciones de texto del § 5.
5. Lo visual (esqueleto, brillo, reduced-motion) queda NO VERIFICABLE hasta el navegador real, como manda CLAUDE.md para `public/`.

---

## Anexo · comandos ejecutados (todos de solo lectura)
- `node tests/mapa.js socio_por_proceso | indice_competencia | competencia_detalle | anticipo | adjudicatario | esqueleto | publico | derivados`
- `sed -n` sobre `docs/MEMORIA.md` en 11916-11989, 12390-12448, 13687-13715, 12739-12746 y greps acotados en 340-417, 7139-7239, 9621-9791, 10134-10296.
- `node v_d01_repro.js` · `node v_lenguaje_d01_d04.js` · `node v_d02_forma.js` · `node a2_repro.js 30000 731 0` (CODIGO=0, 425 ms frío A / 307 ms frío B).
- `node -e` de verificación: `#app` 2006-4506 y `#modal-cuerpo` 4521; `p3_caja` con cuantía $3.000 M sin anticipo declarado → `sin_dato_de=anticipo`.
- `git -C /home/user/portafolio-estrategico status --short` → vacío antes y después.
