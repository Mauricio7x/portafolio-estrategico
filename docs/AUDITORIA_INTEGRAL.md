# Auditoría integral · Detekta

**Fecha:** agosto 2026 · **Alcance:** `lib/`, `api/`, `public/`, `data/`, `tests/`, `docs/`, `vercel.json`
**Base:** `main` @ `7966683` + la rama de esta auditoría · **Suites en verde al cerrar:** `tests/e2e.js` 4/4 y `tests/apu_bench.js`

Este documento es el **censo** del sistema: qué hay, qué funciona, qué está probado, qué está
duplicado, qué pide llave y qué falta. Todo lo que aquí se afirma se verificó **leyendo el código o
ejecutándolo**, no la documentación. Donde la documentación y el código discrepaban, manda el código
y queda anotado.

Las correcciones que esta misma sesión aplicó están marcadas ✔ y llevan su commit. Lo que **no** se
tocó —porque altera lógica de negocio o exige una decisión del dueño— está en §4 con su motivo.

---

## 0 · Resumen en una página

| | |
| --- | --- |
| Tamaño | **30 744 líneas** de JS · 0 dependencias · 0 `package.json` · 0 build |
| Reparto | `lib/` 12 682 (38 módulos) · `api/` 4 111 (12 archivos) · `public/` 4 889 · `tests/` 9 062 |
| Funciones serverless | **12 de 12** del plan Hobby de Vercel. **Sin margen: el presupuesto está agotado** |
| Endpoints públicos | 2 (`/api/oportunidades` sin finanzas, `/api/apu/catalogo`) |
| Endpoints con token | 10 archivos exigen · 1 lo tiene opcional · 1 no pide · 8 de las 9 acciones del despachador APU |
| Cobertura de pruebas | los 12 endpoints y los 38 módulos de `lib/` se ejercitan; 3 (`auth`, `semantica`, `socrata`) solo indirectamente |
| Correcciones aplicadas | **8**, en 7 commits atómicos |
| Deuda con dueño | 5 decisiones abiertas (§4) · §4.1 **resuelto** en ago 2026 |

**El diagnóstico en una frase:** el sistema está **notablemente sano por dentro** —una sola
implementación de cada regla, invariantes probadas que atan un endpoint a otro, y un historial
escrito de por qué cada decisión es como es— y su deuda real **no es de código sino de alcance**: la
app decide bien sobre lo que ve, pero **ve tarde**: ingiere procesos ya publicados, no el PAA.
(La señal que mentía en la tarjeta —§4.1— ya se retiró.)

---

## 1 · Censo de funcionalidades

Leyenda de **Probado**: `E2E` la suite lo invoca y comprueba su comportamiento · `E2E·fuente` la
suite lee su código y comprueba una propiedad estructural · `bench` `tests/apu_bench.js` ·
`indirecto` no tiene aserciones propias, se ejercita al usarlo otro módulo.

### 1.1 · Núcleo de decisión — de la fila de SECOP a «preséntese a esto»

| Módulo | Líneas | Qué hace | ¿Funciona? | Probado | ¿Duplicado? |
| --- | ---: | --- | --- | --- | --- |
| `lib/filtros.js` | 682 | **Las reglas.** Estado (3 valores, desconocido = cerrado), reloj de cierre, modalidad, convenios, pertinencia, anti-suministro, prefiltro de ingesta y `filtrarProcesosVisibles` | Sí | E2E | **No** — `filtrarProcesosVisibles` es la única cascada, la llaman `/api/oportunidades` y `/api/resumen` |
| `lib/unspsc.js` | 235 | Whitelists de los RUP + matching jerárquico bidireccional por niveles | Sí | E2E | No |
| `lib/semantica.js` | 204 | Los vocabularios (`norm`, blacklist, verbos de obra, términos no pertinentes, estructuración) | Sí | indirecto | No |
| `lib/rup.js` | 89 | Orquestador delgado: objeto + capacidad → veredicto graduado | Sí | E2E | No |
| `lib/capacidad.js` | 139 | Fórmula **única** del K (CRP/CRPC, Guía CCE-EICP-GI-22) | Sí | E2E | No · hay prueba de que `rup.kContratacion === capacidad.crp` |
| `lib/perfiles.js` | 372 | Los tres perfiles, respaldo del repositorio + RUP cargado, con recarga por sello | Sí | E2E | No |
| `lib/puertas.js` | 243 | Las cuatro puertas (RUP · K · Caja · Competencia) | Sí | E2E | No |
| `lib/probabilidad.js` | 380 | `P(ganar)` y VE. `trazaP` es la **única** implementación de la cadena | Sí | E2E | No · prueba de que el desglose narra esta traza y no otra |
| `lib/negocio.js` | 187 | `enriquecer()`: anticipo, cuantía, ubicación, fecha de cierre, `nivel_competencia` | Sí, **con una salvedad grave** (§4.1) | E2E | No |
| `lib/publico.js` | 164 | Qué se redacta sin credencial (finanzas del perfil + inteligencia de precio) | Sí | E2E | No |
| `lib/proyeccion.js` | 142 | Fila cruda → registro guardable. Dos proyecciones: activa (sin adjudicación) e histórica | Sí | E2E | No |
| `lib/almacen.js` | 314 | Esquema de claves + compresión/particionado + dedup por `_k` y señales entre versiones | Sí | E2E | No |
| `lib/redis.js` | 106 | Cliente REST mínimo de Upstash | Sí | E2E | No |
| `lib/socrata.js` | 158 | SoQL, keyset por `:id`, backoff con jitter, calendario Colombia | Sí | indirecto (mock HTTP) | No |
| `lib/auth.js` | 99 | **Guardián único** del `HISTORICO_TOKEN` — 12 puntos de llamada | Sí ✔ mensajes corregidos | indirecto (401/503 por endpoint) | No |
| `lib/cuerpo.js` ✔ | 86 | Lector único del cuerpo JSON | Sí | E2E (413/400 por endpoint) | **Era triple; ya no** |

### 1.2 · Conocimiento derivado del histórico

| Módulo | Líneas | Qué hace | ¿Funciona? | Probado | Notas |
| --- | ---: | --- | --- | --- | --- |
| `lib/indice_competencia.js` | 479 | Entidad → oferentes promedio, tertiles, swap atómico, identidad canónica de entidad | Sí | E2E | Depende de columnas **sin verificar contra el dataset real** (§3.4) |
| `lib/indice_baja.js` | 787 | Cuánto descuenta el ganador. Cascada de 3 granularidades + segmento + modalidad | Sí | E2E | El módulo más grande de `lib/` |
| `lib/equivalencias.js` | 339 | Clases UNSPSC afines por lift sobre adjudicatarios | Sí | E2E | Puede quedar vacío por 4 causas distintas, y las explica |
| `lib/texto_unspsc.js` | 325 | Vocabulario distintivo por familia (TF-IDF) + semilla curada | Sí | E2E | La semilla es **curada a mano**, y lo declara |
| `lib/competencia_detalle.js` | 324 | Auditoría del badge: qué procesos lo sostienen y cuáles no, con motivo | Sí | E2E | Prueba que compara contra el hash publicado |
| `lib/probabilidad_desglose.js` | 670 | Los 6 pasos de `P(ganar)` narrados, con aportes en pp que suman la cifra | Sí | E2E | **No recalcula**: narra `trazaP` |
| `lib/columnas_historicas.js` | 277 | Censo de con qué nombre llegó cada columna de adjudicación | Sí | E2E | Importa las listas de candidatas, no las copia |
| `lib/experiencia.js` | 287 | Contratos ejecutados → vocabulario del oficio | Sí | E2E | 106 contratos reales en el repositorio |
| `lib/cobertura_rup.js` | 401 | Qué códigos UNSPSC le faltan al RUP, priorizados por similitud | Sí | E2E | Reutiliza `evaluarPertinencia` y las listas de segmentos |
| `lib/config_rup.js` | 268 | Validación campo por campo del RUP subido | Sí | E2E (11 casos) | Distingue error de **advertencia**, y eso importa |

### 1.3 · Módulo APU — del pliego al precio

| Módulo | Líneas | Qué hace | ¿Funciona? | Probado |
| --- | ---: | --- | --- | --- |
| `lib/apu_pliego.js` | 983 | Texto de PDF → tabla de cantidades: 3 vías de fila, 3 niveles de validación, semáforo de 2 ejes | Sí | E2E + **bench** |
| `lib/apu_mapeo.js` | 347 | Descripción del pliego → ítem del catálogo por 4 señales ponderadas | Sí | E2E + bench |
| `lib/apu_catalogo.js` | 153 | Diccionario de **reconocimiento** (93 ítems, **sin precios**) | Sí | E2E |
| `lib/apu_ocr.js` | 252 | Respaldo OCR.space por página, con la clave tachada en los errores | Sí | E2E |
| `lib/apu_extraer.js` | 336 | Lógica de la acción `extraer-texto` (no toca Redis) | Sí | E2E |
| `lib/apu_descargar.js` | 289 | Descarga del PDF con anti-SSRF: resuelve el nombre y valida **la IP**, salto a salto | Sí | E2E |
| `lib/apu/catalogo.js` | 518 | Catálogo de **precios** (48 insumos × 5 regiones, 17 ítems) + `costoDirecto()` | Sí | E2E |
| `lib/apu/tipologias.js` | 157 | 22 tipologías + departamento → región. **Jamás una región de relleno** | Sí | E2E |
| `lib/apu/inferencia.js` | 391 | Objeto → tipología: Nivel A léxico, Nivel B UNSPSC como **veto**, 3 puertas anti-falso-positivo | Sí | E2E |
| `lib/apu/calculo.js` | 415 | Presupuesto y AIU. **Llama** a `costoDirecto()`, no lo reimplementa | Sí | E2E |
| `lib/apu/rentabilidad.js` | 582 | Margen, caja mes a mes, VEG, payback, precio piso, maldición del ganador | Sí | E2E |
| `lib/apu/optimizador.js` | 502 | **A qué precio ofertar**: barre las bajas y devuelve el VEG máximo con su curva | Sí | E2E |

**Los dos catálogos NO son duplicados** y conviene dejarlo escrito porque lo parecen:
`data/catalogo_apu.json` (93 ítems, sin precios, con sinónimos) responde *«¿qué ítem es esta fila del
pliego?»* y `data/apu_catalogo.json` (17 ítems, con precios y composición) responde *«¿cuánto cuesta
este ítem?»*. Son dos preguntas y dos estructuras; lo que sí se hace es **emitir el código del
segundo cuando el ítem reconocido existe allí**, para que no haya dos identidades del mismo ítem.

### 1.4 · Frontend

| Archivo | Líneas | Qué hace | Probado |
| --- | ---: | --- | --- |
| `public/app.js` | 836 | La app: gate, filtros, tarjetas, modal de competencia y de probabilidad | E2E·fuente (orden del IIFE, prohibición de `\|\| 0`, cableado del modal) |
| `public/admin.js` | 1 670 | Panel: encadenado de la full, dashboard, RUP, experiencia, cobertura, catálogo APU | E2E·fuente |
| `public/apu.js` | 1 137 | Editor de APU: tabla, inferencia, rentabilidad, optimizador, borradores | E2E·fuente |
| `public/pliego.js` | 875 | Lector de pliegos: pdf.js en el navegador, columnas por coordenadas, OCR | E2E·fuente |
| `public/xlsx.js` | 371 | Escritor `.xlsx` propio (ZIP + OOXML con estilos reales) | E2E (audita el ZIP entrada por entrada) |

---

## 2 · Endpoints

### 2.1 · Tabla completa

`E` = estratégico (no puede salir sin llave) · `P` = podría ser público · `A` = administración (escribe).

| # | Endpoint | Método | Token | Dato | ¿Debería ser público? |
| ---: | --- | --- | --- | --- | --- |
| 1 | `/api/sync` | GET | **no** | ninguno (idempotente, auto-limitado por candado) | Ya lo es. Correcto: no expone nada y el candado + presupuesto lo acotan |
| 2 | `/api/sync/historico` | GET | sí | corpus histórico completo | **E** — no |
| 3 | `/api/oportunidades` | GET | **opcional** | lista de procesos; finanzas del perfil redactadas sin token | **Ya resuelto bien**: producto público, cifras del perfil privadas |
| 4 | `/api/resumen` | GET | sí | agregados del corpus + cifras del RUP | **E** — no |
| 5 | `/api/diagnostico` | GET | sí | corpus, muestras, distribuciones | **E** — no |
| 6 | `/api/competencia-detalle` | GET | sí | procesos históricos de una entidad · desglose de `P(ganar)` | **E** — no |
| 7 | `/api/indice-baja` | GET | sí | **a qué precio se adjudica** en cada entidad | **E** — es la ventaja competitiva de la app |
| 8 | `/api/admin/rup` | GET·POST | sí | RUP del dueño | **E·A** — no |
| 9 | `/api/admin/experiencia` | GET·POST | sí | contratos ejecutados | **E·A** — no |
| 10 | `/api/admin/cobertura-rup` | GET | sí | huecos del RUP frente al mercado | **E** — no |
| 11 | `/api/admin/apu/cargar-catalogo` | GET·POST | sí | escribe ~70 claves de precios | **A** — no |
| 12 | `/api/apu/[accion]` | — | ver 2.2 | — | — |

**Alias** (`rewrite` de `vercel.json`, no cuentan como función):
`/api/admin/cargar-experiencia-genesis` → `#9?origen=repositorio` · `/api/probabilidad-desglose` → `#6?vista=probabilidad`.
Hay prueba de que los dos apuntan al endpoint real **con su parámetro**, y el frontend llama siempre
a la canónica: si un rewrite fallara, el botón tiene que seguir funcionando.

### 2.2 · Las nueve acciones de `/api/apu/[accion]`

| Acción | Método | Token | Dato | ¿Debería ser público? |
| --- | --- | --- | --- | --- |
| `catalogo` | GET | **no** | precios de referencia de mercado | Ya lo es, y es la regla, no la excepción |
| `inferir` | POST | sí | objeto → tipología + ítems | **Discutible** — ver §4.4 |
| `calcular` | POST | sí | presupuesto desde el catálogo público | **Discutible** — ver §4.4 |
| `rentabilidad` | POST | sí | margen, VEG, **baja de la entidad**, optimizador | **E** — no: lee los dos índices |
| `guardar` · `cargar` · `listar` | POST·GET·GET | sí | borradores de un perfil | **E** — no |
| `extraer-texto` | POST | sí | el pliego que sube el dueño | **E** — no |
| `descargar` | POST | sí | proxy de descarga (SSRF si se abre) | **E** — **jamás** |

### 2.3 · Lo que se comprobó del modelo de autorización

- **Una sola implementación** (`lib/auth.autorizarToken`), 12 puntos de llamada. Comparación de
  digests SHA-256 en tiempo constante; el header gana a la query si vienen los dos.
- **Sin `HISTORICO_TOKEN` definida → 503, nunca un default.** Verificado.
- **Un token presente pero inválido en `/api/oportunidades` da 401**, no degradación silenciosa a
  modo público. Es la decisión correcta y está probada.
- **Tres canales de inferencia abiertos y aceptados**, documentados en `lib/publico.js`: (i) el
  booleano de P3 permite acotar el patrimonio por bisección; (ii) `ordenar_por=baja` ordena en el
  servidor; (iii) la baja se despeja de `p_ganar` por aritmética inversa, con resolución de **cuatro
  clases**. No son descuidos: son el precio de publicar el veredicto sin credencial, y cerrarlos
  exigiría dejar de explicar la probabilidad — un cambio de producto.
- **No se encontró ningún endpoint que exija token y devuelva un dato no estratégico** salvo el caso
  discutible de §4.4. La regla del proyecto («lo que no sale sin llave son las cifras del perfil y la
  inteligencia de precio») se cumple en los 12.

---

## 3 · Deuda técnica

### 3.1 · Código duplicado — inventario completo

| Qué | Dónde | Veredicto |
| --- | --- | --- |
| `leerCuerpo` | `api/admin/rup.js` · `api/admin/experiencia.js` · `api/apu/[accion].js` | ✔ **Consolidado** en `lib/cuerpo.js` |
| `ANTICIPO_PLENO` / `ANTICIPO_MIN_DEFAULT` | `api/resumen.js` frente a `lib/negocio.js` y `lib/filtros.js` | ✔ **Corregido**: uno se importa, el otro estaba muerto |
| `cop()` (formato de pesos) | `lib/puertas.js` y `lib/publico.js`, idénticas; `lib/probabilidad_desglose.js`, distinta | **Se deja.** Consolidar ataría `lib/publico` —cuyo valor es ser auditable de un vistazo— a un módulo más; y la tercera no es la misma función |
| `DEV` / `logDev` | 4 `api/` + `lib/negocio.js` | **Se deja.** Cada una lleva su prefijo; un módulo compartido cambiaría 5 archivos para ahorrar 10 líneas |
| `badgeCompetencia` ↔ `bandaCompetencia` | `api/resumen.js` ↔ `public/app.js` | **Duplicación justificada**: el navegador no puede `require`. Hay comentario que exige que digan lo mismo |
| `numeroLocal` ↔ `numeroColombiano` | `public/apu.js` ↔ `lib/apu_pliego.js` | **Duplicación justificada Y ATADA POR UNA PRUEBA** que extrae la función del fuente y compara ambas. Cazó una divergencia real |
| `enMayusculas` ↔ `normaliza` ↔ `norm` | `api/resumen.js` · `lib/negocio.js` · `lib/semantica.js` | **Tres normalizadores con tres contratos**: mayúsculas para agrupar, mayúsculas para comparar ubicación, minúsculas sin tildes para vocabularios. No son la misma función. **Merece una nota, no una fusión** |
| Dos catálogos APU | `data/catalogo_apu.json` · `data/apu_catalogo.json` | **No es duplicación** (§1.3). Los nombres casi-idénticos sí son una trampa: la única defensa hoy es el comentario |

### 3.2 · Código muerto

Medido recorriendo el repositorio con comentarios y bloques de `module.exports` retirados, para no
contar como uso el nombre escrito en su propia lista de exportación.

| Categoría | Cantidad | Acción |
| --- | ---: | --- |
| **Funciones sin un solo llamador** (ni interno) | **7** | ✔ **Eliminadas** |
| Exports de funciones que sí se usan **dentro** de su módulo pero nadie importa | 51 | **Se dejan**: son la superficie que hace probable cada regla por separado |
| Exports de constantes sin lector externo | 108 | **Se dejan**: documentan umbrales en el sitio donde se aplican |
| Exports que solo leen las pruebas | 61 | **Se dejan**: es cobertura, no deuda |

Las siete eliminadas: `experiencia.borrarExperiencia`, `filtros.esSegmentoDeBienes`,
`filtros.clasesDelRup`, `filtros.unspscCubierto`, `probabilidad.estimarP`,
`unspsc.emparejarLicitacion`, `rup.compatibleConAlgunPerfil`.

### 3.3 · Defectos encontrados y corregidos en esta auditoría

| # | Defecto | Gravedad | Estado |
| ---: | --- | --- | --- |
| D1 | **`api/indice-baja.js` no estaba declarada en `vercel.json`.** Es la 12.ª función: se desplegaba sin `includeFiles` y con el `maxDuration` por defecto de la plataforma, mientras el propio endpoint acepta `?reconstruir=true&presupuesto=60000`. La reconstrucción del índice de baja —la vía del dueño **sin terminal**— moría a mitad | **Alta** (solo visible en producción) | ✔ |
| D2 | **La prueba de `vercel.json` solo miraba una dirección**: que cada entrada apunte a un archivo. Un archivo nuevo bajo `api/` podía desplegarse sin entrada sin que nada fallara — que es exactamente lo que pasó con D1 | Alta (es la cerradura que faltaba) | ✔ |
| D3 | **`/api/indice-baja?entidad=…&modalidad=…` devolvía la clave equivocada.** La clave se pegaba con el índice del arreglo **ya filtrado**: con tres entidades que comparten NIT y solo la segunda con esa modalidad, salían las cifras de la segunda bajo el rótulo de la primera | Media (caso estrecho, error caro: una cifra de mercado con la entidad equivocada) | ✔ |
| D4 | **El 503 de `lib/auth` decía «la extracción histórica está deshabilitada»** en los 12 endpoints que lo usan. Quien pedía el panel o el editor recibía el diagnóstico de otro endpoint | Media (le toca al único usuario, que no tiene terminal) | ✔ |
| D5 | **El 401 juntaba «inválido» y «ausente»**, que tienen arreglos distintos | Baja | ✔ |
| D6 | **Copia derivada de `leerCuerpo`**: a la del APU le faltaba comprobar el tope en la rama de cuerpo ya parseado como cadena, así que su límite documentado de 2 MB no se cumplía por ahí | Baja | ✔ |
| D7 | `ANTICIPO_MIN_DEFAULT` muerta en `api/resumen.js`, replicando un default real: se lee como si mandara | Baja | ✔ |
| D8 | `VERCEL_AUTOMATION_BYPASS_SECRET` sin documentar pese a decidir si la cadena de sincronización sobrevive a Password Protection — la causa típica de «la full no termina» | Baja (documental, consecuencia alta) | ✔ |

### 3.4 · Límites técnicos, medidos

| Límite | Valor | Margen real |
| --- | --- | --- |
| **Funciones serverless (Hobby)** | **12 de 12** | **CERO.** Un archivo más bajo `api/` y falla el despliegue entero, no el endpoint nuevo. Ya obligó a plegar `/api/apu/catalogo`, `extraer-texto`, `descargar`, el desglose de probabilidad y `cargar-experiencia-genesis`, y a **no crear** `/api/baja-mercado` |
| Respuesta de una función | 4,5 MB | Holgado: el texto de un pliego de 120 páginas son ~0,34 MB |
| Valor de Redis (Upstash) | 1 MB | Respetado: chunks deflate ≤ 500 KB antes del base64 |
| Crons (Hobby) | solo diarios | Por eso la full se auto-encadena y cada visita refresca vía delta |
| Cuota Socrata | ~1 000 pet./h con token, 200 filas/petición | Respetada con keyset + backoff |
| `maxDuration` | 300 s en los 3 endpoints con presupuesto | ✔ tras D1 |

**Dos límites del entorno de desarrollo que condicionan todo lo demás y hay que repetirlos:** este
entorno **no alcanza `datos.gov.co`** (allowlist del proxy, `CONNECT 403`) ni tiene CLI de Vercel.
Consecuencia: **las columnas de adjudicación y de nº de oferentes se leen por lista de candidatas y
siguen SIN VERIFICAR contra el dataset real.** El síntoma de que falta la correcta ya está
instrumentado (`indice:competencia:meta` con `clasificadas: 0`, y el bloque `columnas_historicas` de
`/api/diagnostico`), pero la verificación solo puede hacerse desplegando.

### 3.5 · Pruebas: dónde son fuertes y dónde no

**Fuertes, y de una forma poco común:** la suite no comprueba resultados, comprueba **invariantes que
atan un endpoint a otro**. Ejemplos verificados:

- `totales.visibles` de `/api/resumen` ≡ `total` de `/api/oportunidades` ≡ `embudo.visibles` de `/api/diagnostico`.
- `embudo.visibles = viables + distribucion_puertas.fallan_p3`, y `pasan_todas ≡ viables` de la app.
- Los pasos del embudo **suman** el total; cada reparto **suma** los visibles.
- `probabilidad_final` del desglose ≡ `p_ganar` de la tarjeta, sobre **varios** procesos (con uno
  solo coincidiría por casualidad).
- La suma de los seis `aporte_pp` ≡ la cifra final.
- El detalle de competencia reconstruye promedio y conteo y los compara **contra el hash publicado**.
- `sin_modalidad + Σ procesos de las cubetas = procesos_analizados` en el índice de baja.
- El punto del optimizador evaluado en el precio vigente **reproduce exactamente** el bloque de rentabilidad.
- Prohibiciones sobre el fuente del frontend: `i.<conteo> || 0`, `f.cantidad || 0`, el orden del
  arranque del IIFE, que `buscar()` no pueda volver a pedir el token.

**Débiles, y hay que decirlo:**

1. **El corpus de pruebas es sintético y lo escribió quien escribió el parser.** `tests/apu_bench.js`
   lo declara él mismo y por eso trae una tanda adversaria sin suelos de regresión. La distribución
   real de formatos de SECOP II **sigue sin medir**.
2. ~~**Un fixture inventa un dato que la fuente real no publica**~~ — **corregido con §4.1**: la
   generación de procesos activos asignaba `respuestas_al_procedimiento = i % 20`, una columna que
   SECOP II solo publica *ex-post*, y eso hacía que `nivel_competencia` **pareciera** una señal viva
   en las pruebas. **Era la razón de que el defecto de §4.1 sobreviviera.** Ahora solo la llevan los
   procesos adjudicados y la suite **mide** cuántos valores distintos toma el campo (1 de 1).
3. **Ninguna prueba vigila el SIGNO del VEG.** La de rentabilidad solo exige `veg != null`, y el VEG
   es **el único umbral duro sobre `p`** de todo el repositorio (§4.2).
4. **No hay pruebas de concurrencia real** (dos cargas de RUP simultáneas, dos reconstrucciones); se
   confía en los candados con TTL y en el sello aleatorio, que están bien diseñados pero no medidos.
5. `lib/socrata.js` y `lib/semantica.js` no tienen aserciones propias: se ejercitan al usarlos otros.

---

## 4 · Lo que NO se corrigió, y por qué

Todo lo de esta sección altera lógica de negocio o exige una decisión que no es del auditor.

### 4.1 · ✔ RESUELTO (ago 2026) · «Ofertas del proceso: baja» era un cero disfrazado de medición

**Qué pasa.** `lib/negocio.enriquecer` calcula `nivel_competencia` así:

```js
const ofertas = primerNumero(lic, COMPETENCIA_CAMPOS) ?? 0;   // → 0 en todo proceso abierto
const nivel_competencia = nivelCompetencia(ofertas);          // nivelCompetencia(0) === "baja"
```

Las seis columnas candidatas (`respuestas_al_procedimiento`, `numero_de_ofertas`, `proponentes`…)
son **ex-post**: SECOP II no las publica mientras el proceso está abierto. Y el corpus activo, por
construcción, **solo tiene procesos abiertos**. Resultado: `nivel_competencia === "baja"` en
prácticamente todo lo que la app sirve.

**Dónde se ve.** `public/app.js:399` pinta en cada tarjeta un chip **verde**
`Ofertas del proceso: baja`, y `public/index.html:84` ofrece un desplegable «Ofertas del proceso»
con tres opciones de las que **una no filtra nada y las otras dos vacían la lista**.

**Por qué importa tanto.** Es exactamente el defecto que este proyecto ya identificó y corrigió dos
veces —«0 oferentes = SIN DATO, no *nadie se presentó*» y «18,2 oferentes sin base»— sobreviviendo en
el único sitio que el dueño mira siempre: la tarjeta. Un verde que dice «poca competencia» sobre el
100 % de los procesos no es una señal débil: es una afirmación falsa, y compite visualmente con el
badge **que sí tiene base** (`competencia_entidad`, el del histórico).

**Resuelto con la opción A** (retirar el chip y el filtro), que era la recomendada. Se descartaron
la B —añadir `sin_dato` como cuarto nivel obligaba a tocar tres invariantes probadas para conservar
un campo que la fuente no publica— y la C.

**Qué se hizo:**

| Dónde | Cambio |
| --- | --- |
| `public/index.html` | Fuera el desplegable «Ofertas del proceso» |
| `public/app.js` | Fuera el chip, su paleta de color y el envío del parámetro. Prueba que prohíbe que `nivel_competencia` reaparezca en el fuente |
| `api/oportunidades.js` | Fuera el filtro `?nivel_competencia=`, que queda **inerte** (no 400: un enlace guardado no puede vaciarle la lista a nadie) |
| `api/oportunidades.js` | **`?ordenar_por=competencia` leía el campo de la FILA**, o sea no ordenaba nada, mientras README y CLAUDE.md llevaban un mes afirmando que ordenaba por la entidad. Ahora lee el nivel de la entidad: el código alcanzó a su documentación |
| `tests/e2e.js` | El fixture solo publica `respuestas_al_procedimiento` en procesos **adjudicados**, que es lo que hace SECOP II. El histórico conserva sus conteos: 184 procesos y 3 entidades clasificadas, sin mover un dígito |
| `tests/e2e.js` | **La medida sustituye a la regex**: la suite cuenta cuántos valores distintos toma el campo en el corpus servido y lo publica en cada corrida — **1 en 384 procesos** |

**Lo que NO se tocó, y es deliberado:** `nivel_competencia` sigue en la proyección y en la respuesta.
Sacarlo del registro exigiría una full y no arregla nada; lo que no podía seguir es **presentarse
como una medición**. Si algún día SECOP II publicara el conteo en procesos abiertos, el campo está
ahí y la cifra que la suite publica lo delataría sola.

### 4.2 · 🟠 `P(ganar)` cobra el precio dos veces, y eso mueve el único umbral duro

Documentado en `docs/PROBABILIDAD_MEJORADA.md` §2.5c y reconocido en `lib/probabilidad.js`:
`lib/probabilidad` ya multiplica por un factor de baja de mercado, y `lib/apu/rentabilidad` vuelve a
modular por precio sobre esa misma `p`. **`veg = p × utilidad − c_preparación` es el único umbral
DURO sobre `p` de todo el repositorio** —lo demás ordena o pinta—, así que un VEG apenas positivo
pasa a negativo y `filtros_duros.veg_no_positivo` empieza a decir «el valor esperado no cubre el
costo de preparar la oferta» en presupuestos que deberían salir verdes.

Medido en la suite tras retirar el tertil: `p_ganar` del bloque de rentabilidad pasó de 0,2091 a
0,1777. **No se corrige aquí** porque exige separar `p` de `p_sin_precio` y coordinar dos módulos
(pasos A4/A5 del plan del documento). Es un cambio de modelo, no una corrección.

Lo que sí cabe hacer ya, y es barato: **una prueba que vigile el signo del VEG** (§3.5.3).

### 4.3 · 🟠 El PAA no se lee — la ventaja de seis meses sigue sin explotar

La app ingiere **solo `p6dx-8zbt`** (procesos ya publicados). El Plan Anual de Adquisiciones se
publica el **31 de enero** con objeto, valor, mes previsto y modalidad de todo el año; el manual lo
señala como *la* fuente de inteligencia anticipada y «casi nadie la lee». Hoy la app avisa cuando el
proceso **ya salió** y la competencia tiene los mismos 20 días.

Es **la brecha de mayor impacto sobre el objetivo** (más adjudicaciones), y no es una corrección: es
un dataset nuevo, un keyspace nuevo y una pantalla nueva. Decisión del dueño.

### 4.4 · 🟡 `inferir` y `calcular` piden token y quizá no deberían

Son las dos únicas acciones donde la regla del proyecto («lo que no sale sin llave son las cifras del
perfil y la inteligencia de precio») **no decide sola**: ninguna de las dos lee las finanzas del
perfil ni el histórico, y las dos se alimentan del catálogo, que **es público**. `rentabilidad` sí
debe seguir cerrada (lee los dos índices).

El código lo declara como decisión deliberada: *«son la máquina de armar una oferta»*. Es un
argumento de negocio legítimo —no querer regalar el motor de presupuestación— y por eso **no lo
toco**. Pero conviene que sea una decisión y no una inercia: abrirlas convertiría `/apu.html` en una
herramienta usable sin credencial, igual que `/api/oportunidades`.

### 4.5 · 🟡 Lo que la ley de garantías 2026 le hizo al índice de competencia

Entre el **8 nov 2025** y el **31 may 2026** (21 jun con segunda vuelta) los convenios
interadministrativos y la contratación directa estuvieron bloqueados: las entidades **tuvieron que
competir**. El índice promedia **2 años** que mezclan esa ventana anómala con períodos normales, y el
backfill por defecto (`?desde=2024-01`) no tiene ningún tramo limpio. Como ese promedio es el
criterio de orden por defecto (`atractividad`), el sesgo llega a la primera pantalla.

Mitigación barata y ya casi hecha: exponer el reparto temporal en `/api/competencia-detalle`, que ya
enseña qué procesos cuentan. Cara y mejor: segmentar el índice por período. **Las dos cambian una
cifra que el dueño ya usa**, así que no se aplican sin su visto bueno.

### 4.6 · 🟡 Baja competencia se presenta como atractiva, y es ambigua

El manual sostiene **las dos** lecturas: nicho rentable (Palanca 4) **y** señal #11 de pliego sastre.
La app solo pinta la primera. Un badge que dice «⭐ poca competencia» está eligiendo una de las dos
sin evidencia, y la equivocada cuesta el costo de preparar una oferta que no se podía ganar. Es
decisión de producto: qué decir en la tarjeta cuando el promedio es 1-2 oferentes.

### 4.7 · Otros, ya documentados y sin cambio en esta sesión

- **Corte duro en 5 procesos** del índice (salto de ×2,60). `docs/PROBABILIDAD_MEJORADA.md`, sin corregir.
- **19 de 33 departamentos sin base de precios regional**: salen `sin_base` con su motivo, que es lo
  correcto, pero el APU de esos departamentos usa la región base y lo declara.
- **`margen_final` no descuenta impuestos** por definición del encargo; la contribución del 5 % y las
  estampillas van en `deducciones_pct` y hay una alerta si no se cargan. Mientras no se carguen, el
  margen es una **cota superior**.
- **Hueco menor de estado**: un proceso con `estado` vacío y solo `fase="Selección"` cuenta como
  cerrado. Meter «seleccion» en la lista de abiertos haría que «Seleccionado» pasara a abierto por
  prefijo. Resolverlo exige mirar el dato real primero.
- **`estado_cerrado` no es la negación de `estado_abierto`**: son tres estados. Correcto y deliberado.

---

## 5 · Priorización por impacto en *maximizar adjudicaciones rentables*

Ordenado por **cuánto mueve la aguja del objetivo**, no por dificultad. El coste es una estimación de
esfuerzo, no un compromiso.

| # | Acción | Impacto | Coste | Quién decide |
| ---: | --- | --- | --- | --- |
| **1** | **Relanzar en producción `?modo=full` una vez y el backfill histórico** con `HISTORICO_TOKEN` | **Máximo, y es operación, no código.** Sin el backfill, todo el orden por defecto (`atractividad`) sale en ⚪ y la app ordena por un supuesto conservador. Sin la full, los procesos con estado `Activo` **nunca entraron a Redis** | 2 clics en `/admin.html` | — (hacerlo ya) |
| ~~2~~ | ~~Quitar el chip y el filtro «Ofertas del proceso»~~ (§4.1) | **HECHO** (ago 2026): retirada una afirmación falsa del 100 % de las tarjetas, y de paso corregido `?ordenar_por=competencia`, que leía el mismo campo muerto | — | — |
| **3** | **Leer el PAA** (§4.3) | **El mayor del catálogo**: seis meses de ventaja frente a una competencia que se entera el día del aviso | Alto (dataset + keyspace + pantalla) | **Dueño** |
| **4** | **Separar `p` de `p_sin_precio`** y dejar de cobrar el precio dos veces (§4.2) | Alto: corrige el único umbral duro del sistema, que hoy declara inviables procesos que no lo son | Medio-alto (2 módulos) | **Dueño** |
| **5** | **Prueba del signo del VEG** | Medio: hoy nadie vigila la cifra que decide si vale la pena presentarse | ~20 líneas | — (hacerlo ya) |
| **6** | **Cargar `deducciones_pct` reales** (contribución 5 % + estampillas de las entidades habituales) | Medio-alto: sin ellas el margen es una cota superior, y el bloque puede llegar al ~10 % del valor — mayor que el margen típico | Bajo, pero exige el dato del dueño | **Dueño** |
| **7** | **Decir en la tarjeta que baja competencia es ambigua** (§4.6) | Medio: evita preparar ofertas para pliegos sastre | Bajo | **Dueño** |
| **8** | **Segmentar el índice por período electoral** (§4.5) | Medio: hoy el orden por defecto mezcla una ventana anómala | Medio | **Dueño** |
| **9** | **Verificar las columnas de adjudicación contra el dataset real** (§3.4) | Medio: si la candidata correcta no está, el índice entero queda en `sin_dato` y nadie lo sabría salvo por la meta | Bajo — pero **solo se puede desplegando** | — |
| **10** | **Abrir `inferir`/`calcular`** (§4.4) | Bajo para adjudicaciones, alto para usabilidad del editor | Trivial (mover 2 cadenas) | **Dueño** |
| **11** | **Medir el parser de pliegos contra formatos reales de SECOP II** (§3.5.1) | Bajo hoy, alto el día que el APU se use para fijar precio en serio | Alto (hay que conseguir el corpus) | — |
| **12** | Suavizar el corte duro en 5 procesos (§4.7) | Bajo: afecta al orden, no al veredicto | Bajo | **Dueño** |

**El presupuesto de funciones condiciona los puntos 3 y 10.** Están en 12 de 12: cualquier cosa que
«necesite un endpoint nuevo» tiene que plegarse en uno existente (como ya hicieron el desglose de
probabilidad, el catálogo APU y la carga de experiencia) o el despliegue entero se rechaza.

---

## 6 · Correcciones aplicadas en esta sesión

| Commit | Qué |
| --- | --- |
| `d17852b` | Declara `api/indice-baja.js` en `vercel.json` y añade la comprobación en la dirección contraria (D1, D2) |
| `1f45e86` | Los mensajes de `lib/auth` hablaban solo de la extracción histórica; separa 401 «inválido» de «ausente» (D4, D5) |
| `cfe1699` | La clave de la entidad se desalineaba al filtrar por modalidad en `/api/indice-baja` (D3) |
| `850a5e1` | Consolida en `lib/cuerpo.js` el `leerCuerpo` triplicado, y con él la copia derivada (D6) |
| `e401d52` | Retira de `/api/resumen` una constante muerta y desduplica el umbral de anticipo (D7) |
| `6da0695` | Documenta `VERCEL_AUTOMATION_BYPASS_SECRET` y corrige dos conteos de acciones APU (D8) |
| `6000861` | Elimina siete funciones sin un solo llamador |

**Verificación:** `node tests/e2e.js` → **4/4** · `node tests/apu_bench.js` → suelos de regresión
superados. Ninguna corrección cambió un número de negocio: se comprobó que los invariantes cruzados
(`visibles`, `p_ganar`, VEG, optimizador) siguen dando exactamente las mismas cifras que antes.

---

## 7 · Lo que esta auditoría NO pudo comprobar

Dicho explícitamente, porque un censo que calla sus vacíos es peor que ninguno:

1. **Nada contra datos reales.** El entorno no alcanza `datos.gov.co` (`CONNECT 403`). Todo lo
   verificado corre sobre mocks. Las columnas de adjudicación siguen sin confirmar.
2. **Nada contra el despliegue.** No hay CLI de Vercel: que D1 estuviera roto solo se puede afirmar
   leyendo `vercel.json` y la documentación de la plataforma, no observándolo fallar.
3. **El estado de producción.** No sé si la full y el backfill se han relanzado, ni si el índice de
   baja está construido. El punto 1 de §5 asume que puede que no.
4. **El comportamiento del navegador.** Las pruebas del frontend son sobre el **fuente**, no sobre
   una página cargada. Que el orden del IIFE sea correcto está probado; que la página pinte bien, no.
5. **`docs/APU_INFORME_COMPLETO.md` (10 433 líneas) y `docs/GUIA_ANALISTA_LICITACIONES.md` (1 646)**
   se consultaron por secciones, no íntegros.
