# A6 · Restricciones del árbol y cola de trabajo viva

> Para: sesión · Estado: informe fechado · Sustituido por: —

Fecha: 13-sep-2026 · árbol: rama `claude/dazzling-lovelace-y2t2oh` sobre `3482415` (Merge PR #149,
«la piel v4 · investigación, plan y tanda 1») · `git status --short` vacío antes y después de este
informe. Nada del repositorio se modificó; los comandos auxiliares viven en este directorio.

Para quién es: quien redacte un plan de varias sesiones que tocará `public/app.js`,
`lib/handlers/procesos/listar.js`, `lib/socio_por_proceso.js`, `lib/competencia_detalle.js`,
`lib/indice_competencia.js`, el sync (`lib/handlers/procesos/sync.js`) y `docs/`. Cada afirmación
lleva su ancla `ruta:línea`; cada «no existe», «tarda» o «pesa» lleva el comando ejecutado. La memoria
se cita por TÍTULO de sección; los `sed -n` son para LEER, no para citar (la propia suite distingue
las dos formas: § 1.3).

Convención de este informe: **[MEDIDO]** = reproducción ejecutada aquí; **[LEÍDO]** = leído en el
árbol con ancla, sin ejecutar; **[NO VERIFICABLE]** = con su motivo.

---

## 0. Lo que el redactor del plan necesita saber en diez líneas

1. **Un endpoint nuevo es una `op`**, jamás un archivo: tres aserciones fijan `api/*.js` en 6
   (`tests/e2e.js:4285`, `:33412`, `:34533`) y una cuarta exige que la `op` esté escrita con la forma
   literal que `tests/mapa.js` lee (`:34537-34538`).
2. **Casi todas las cerraduras de tarjeta, modal, piel, marca, lenguaje y documentación viven DENTRO
   de `iteracion()`** (`tests/e2e.js:9751-32282`), así que los atajos `E2E_SOLO=«unidad …»` NO las
   ejercen: se ejercen con `E2E_SOLO=iteraciones` (pesado) o con el 4/4 entero. [MEDIDO, § 5]
3. **Toda cadena que llegue a pantalla** —desde `public/*.js` o desde `lib/`/`api/`— pasa por la
   MISMA función `tuteoEn` y la misma `RE_EMOJI_UI` de `lib/lenguaje_pantalla.js`; excepciones
   declaradas: `apu_libro.js` (emoji, cliente), `lib/apu/importar.js` (emoji, servidor),
   `lib/lenguaje_pantalla.js` (tuteo). `public/vendor/` no entra en ningún censo de texto. [MEDIDO]
4. **Jerga**: `JERGA_JS` (`tests/e2e.js:29449-29470`) barre todos los `public/*.js` salvo seis
   declarados; «cuatro puertas», «capacidad residual», «habilitante», «subsanable», «tertil», «pp»,
   «p25/p75», «N/A», «VEG»… tumban la suite. Y ninguna cadena de pantalla puede nombrar `docs/`,
   una `.html` retirada ni un `.sh` (`:29671`).
5. **La marca sale de `MARCA.nombre`**: un literal `"Detekta` en `app.js`, `onboarding.js`,
   `pliego.js`, `xlsx.js`, `justificacion.js` o `apu_libro.js` falla (`:24157-24161`); la grafía
   vieja está prohibida en TODO el repositorio (`:24104-24129`).
6. **Documentos**: ficha `> Para: … · Estado: … · Sustituido por: …` en las 12 primeras líneas
   (`:24937-24957`; audiencias `dueño|sesión|ingeniero|contratista`); sin cifras de estado en la
   ficha; `docs/INDICE.md`, `docs/MAPA.md` y `docs/MEMORIA_INDICE.md` se REGENERAN con
   `node tests/mapa.js --escribir` en el mismo commit; toda cita `<documento>.md § «título»` resuelve a un
   título existente y ninguna cita por línea sobrevive (`:24598-24722`).
7. **Memoria**: sección nueva AL FINAL, con fecha, que empieza por «En una línea: …»
   (`:36803-36813`); una decisión desmentida recibe `> SUPERADA el dd-mmm-2026 por «título» — nota`
   bajo su título (`:36600-36624`), no se reescribe.
8. **Tamaño**: Vercel corta en 4,5 MB (`lib/cuerpo.js:39`), chunk de Redis 500 KB comprimidos
   (`lib/almacen.js:271`), lista de guardados < 1/4 del corte con el peor perfil (`:35462`), PDF
   3 MB (`lib/cuerpo.js:47`), `por_pagina` máx. 100 (`listar.js:141`). **No existe una cerradura de
   «1 220 bytes por fila»**: es una MEDICIÓN de la memoria (§ 1.9). [MEDIDO]
9. **Movimiento**: los tokens del árbol son `--dur-1…5` y `--ease-out|expo|sheet`
   (`public/index.html:205-212`), NO los nombres de la propuesta § 7.3 del informe de diseño; hay
   `prefers-reduced-motion` (`:836-855`) que pone todas las duraciones a 0 y apaga `.spin`,
   `.animate-pulse`, `.barra-indeterminada` y `.dato-cambio`; el esqueleto ya existe (`brillo`
   1,5 s, `:789-794`) y la lista de licitaciones ya tiene tres tarjetas esqueleto con `aria-busy`
   (`:3593-3606`, `app.js:682-684`, cerradura `:13633-13638`).
10. **Cola viva**: de la piel v4 queda desde **V4-05 en adelante** (tandas 2-4) y cuatro decisiones
    del dueño (§ 9.6); chocan con un rediseño de tarjeta/modal: **V4-13** (animación de entrada de
    `#app .tarjeta`), **V4-19** (`@starting-style` en modales + censo de capas), **V4-20**
    (`@container` en las rejillas de cifras de `app.js`), **V4-11** (Escape en `#modal-eliminar` /
    `#modal-importar`) y **V4-12** (los diez `scrollIntoView` de `app.js` por una sola función).

---

## 1. Cerraduras que atan a un cambio así

### 1.1 Conteo de archivos en `api/` (= 6) y la forma de una `op` nueva

| Ancla | Qué exige | Cómo cumplir |
|---|---|---|
| `tests/e2e.js:4285-4286` | `readdirSync("api").filter(.js).length === 6` («el modo cuenta se pliega como `op` del router de perfil, jamás como función nueva») | No crear `api/x.js`. |
| `tests/e2e.js:33412-33413` | Mismo conteo = 6 («las deducciones se pliegan como `op` del router de pliego») | Ídem. |
| `tests/e2e.js:34533` | Mismo conteo = 6 («el dictamen se pliega como op») | Ídem. |
| `tests/e2e.js:34534-34535` | La `op` tiene que aparecer en el router con la forma literal `"op": () => require("lib/handlers/<dominio>/<archivo>.js")` (regex `^\s*"?([a-z0-9_-]+)"?\s*:\s*\(\)\s*=>.*require\(…\)`), porque **`tests/mapa.js` lee ese mapa OPS** | Añadir la `op` al mapa del router con esa forma exacta; el 404 del router enseña `operaciones` (`:34531`). |
| `tests/e2e.js:24971-24972` (línea de cierre del bloque de documentación) | «README breve con N op censadas **en los dos sentidos** contra `estado.js` y `vercel.json`» | Una `op` nueva lleva su fila en `README.md` (y su rewrite en `vercel.json` si necesita ruta). [LEÍDO: solo la línea de cierre; el bloque del censo no se leyó entero] |

[MEDIDO] `ls api/` → `admin.js apu.js inteligencia.js perfil.js pliego.js procesos.js` (6).
`node tests/estado.js` enumera las `op` de cada router; `api/inteligencia.js` despacha por
`op/vista` con literales comparados «router + handlers» (entidad · competidor · adjudicatario ·
paa · probabilidad · socio); `api/procesos.js` por mapa (sync · historico · listar · baja ·
entidades · portada · manifestacion · salud).

### 1.2 Ficha de documentos y censo de rutas `docs/`

`tests/e2e.js:24937-24963` [LEÍDO] + reproducción [MEDIDO]:

- Regex exacta: `^> Para: (.+?) · Estado: (.+?) · Sustituido por: (.+?)\s*$` en las **12 primeras
  líneas**. Audiencias válidas: `dueño`, `sesión`, `ingeniero`, `contratista` (`:24938`).
- Censo: todo `docs/**/*.{md,txt}` **un nivel abajo** (`juntar("docs", 1)`, `:24940-24950`), menos
  `MAPA.md`, `MEMORIA_INDICE.md`, `INDICE.md` (generados), más `README.md` y `CLAUDE.md`. Hoy:
  **47 documentos, 0 sin ficha**; audiencias en uso: ingeniero 21 · dueño 16 · sesión 9 ·
  contratista 1; estados en uso: `referencia` 20 · `informe fechado` 14 · `pendiente del dueño` 10 ·
  `archivado` 3 (script en el anexo).
- La ficha **no puede llevar cifra de estado** (`\d+\s*(KB|MB|B|líneas|secciones|documentos)`,
  `:24956`); `Sustituido por:` es `—` o una ruta que existe (`:24957`); mínimo 30 fichas (`:24959`).
- `docs/INDICE.md` tiene que ser byte a byte `node tests/mapa.js --indice-docs` (`:24960-24963`);
  [MEDIDO] hoy coincide (`diff -q` sin salida), igual que `docs/MEMORIA_INDICE.md` contra
  `node tests/mapa.js --indice`.
- Censo de rutas (`:24925-24935`): toda cadena `docs/…\.(md|txt|html|json)` citada en el árbol tiene
  que existir («archivar MUEVE (git mv) y las referencias se actualizan en el mismo commit»).
- Numeración de encabezados de cada `docs/*.md` inequívoca (entre hermanos crece, el hijo cuelga del
  padre) y `docs/INVESTIGACION_DISENO_WEB.md` conserva `## 5.`, `## 6.` y `## 7.` porque la memoria y
  el commit `49789fa` los citan (`:24722`, `:24748`). **Para añadir al plan**: si el plan v5 se
  escribe en ese documento, va como `## 10.` con `### 10.1…`, nunca renumerando.

Cómo cumplir: un documento nuevo del plan en `docs/` nace con ficha (p. ej.
`> Para: sesión · Estado: pendiente del dueño · Sustituido por: —`), sin cifras en la ficha, y el
commit lleva `node tests/mapa.js --escribir`.

### 1.3 Censo de citas por título de sección

`tests/e2e.js:24598-24722` [LEÍDO] + regex ejecutadas [MEDIDO]:

- Archivos censados (`:24616-24626`): `docs/`, `lib/`, `api/`, `public/`, `tests/` (`.md` y
  `.js`), `.claude/` (`.md`), `README.md`, `CLAUDE.md`; saltando `worktrees`, `node_modules`,
  `.git`. **Excepción declarada**: `docs/MEMORIA.md` como CITADORA (crónica fechada) (`:24627`).
- Formas de cita por línea prohibidas (`FORMAS_LINEA`, `:24645`): `:N`, `#LN`, ` L N`, ` l. N`,
  `, línea(s) N`; para MEMORIA/README/CLAUDE también `docs/MEMORIA.md § «Los costos que casi nadie suma»` y `docs/MEMORIA.md § «Los costos que casi nadie suma»`
  (`RE_MEMORIA_LINEA`, `:24646`), excluyendo tamaños («216 KB», «222 104 B») y fechas.
- Toda cita `<documento>.md § «título»` (`RE_DOC_TITULO`, `:24648`) tiene que nombrar un título que exista en
  X, exacto o como PREFIJO de ≥ 8 caracteres, sin el pictograma inicial; una cita a `CLAUDE.md` puede
  resolver en `MEMORIA.md` (`:24684-24694`). Documentos fuera del árbol cuentan como «externas»
  (mínimo 20, `:24721`).
- **Cita con cifra** (`:24695-24716`): si la MISMA línea trae una cifra agrupada por millares
  («1 752», «1.220»), el cuerpo de la sección resuelta tiene que contenerla (comparación sin
  separadores). Mínimo 3 de estas (`:24720`).

Reproducción ejecutada con las tres regex (anexo): `docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»` → cazada;
`docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»` → cazada; `docs/INVESTIGACION_DISENO_WEB.md § «9. Plan de la piel v4 · qué se implementa, en qué orden (12-sep-2026)»` → cazada;
`docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»` → cazada; `sed -n '1094,1230p' docs/INVESTIGACION_DISENO_WEB.md`
→ **no** cazada (es la forma inerte para dar coordenadas de lectura); `MEMORIA.md § «Tanda 1 de la
piel v4»` → resuelve por prefijo.

Cómo cumplir en el plan: en `docs/`, en comentarios de código y en la memoria, citar
`<documento>.md § «título exacto o prefijo ≥ 8»`; dar coordenadas solo como `sed -n 'A,Bp' docs/<documento>.md`.
Ojo: una referencia `tests/e2e.js:11829` no la censa nadie (es `.js`) **y se pudre igual** (§ 6).

### 1.4 Cerca de lenguaje: `lib/lenguaje_pantalla.js`

Módulo hoja de 105 líneas [LEÍDO entero]:
- `RE_EMOJI_UI` (`:38-44`, bandera `gu`: usar con `.match()`, nunca `.test()`): 1F300-1FAFF más los
  puntos BMP con presentación emoji (✅ 2705, ⏰ 23F0, ⚪ 26AA, ➕ 2795…). Los dingbats de texto
  (✓ ✗ ● ▸ ·) están permitidos.
- `VOSEO_RE` (`:54`, con frontera propia para tildes, bandera `i`): formas enumeradas («Podés»,
  «verificá», «hacé», «puedes», «tienes», «hazlo»…).
- `TUTEO_TERMINACIONES_RE` (`:60`): `-aste|-iste|-ás|-és|-ís`; `VOSEO_ENCLITICO_RE` (`:69`):
  «Escribilo», «corregilo». `EXCEPCIONES_TUTEO` (`:84-90`): **23 palabras** declaradas con motivo
  (además, arnés, atrás, contraste, después, existe, consiste, país, interés, Vaupés, tranquilo,
  alquila…). `tuteoEn(texto)` (`:95-103`) devuelve la primera palabra no declarada o `null`.

Dónde la aplica la suite [LEÍDO]:
| Ancla | Censo | Excepción declarada |
|---|---|---|
| `tests/e2e.js:29744-29757` | `RE_EMOJI_UI` sobre `index.html` + TODOS los `public/*.js` (fuente crudo, con comentarios) | `apu_libro.js` (sus marcadores van al Excel) |
| `:29773-29785` | `RE_EMOJI_UI` sobre TODOS los `.js` de `lib/` y `api/` (sin comentarios) | `lib/apu/importar.js` (reconoce los marcadores del Excel) — y se exige que la excepción siga siendo necesaria |
| `:30336-30345` | `VOSEO_RE` sobre TODOS los `public/*.js` (sin comentarios) | ninguna |
| `:30348-30353` | `VOSEO_RE` sobre el texto visible de `index.html` (sin comentarios, `<script>`, `<style>`) | ninguna |
| `:30361-30366` | `VOSEO_RE` línea a línea sobre `README.md`, y toda ruta «Mi empresa → X» del README tiene que ser un texto que `index.html` pinte tal cual | ninguna |
| `:30388-30420` | `tuteoEn` sobre TODOS los `.js` de `lib/`, `api/` y `public/` (≥ 75 archivos) | `lib/lenguaje_pantalla.js` (es la cerca) |
| `:34523-34527` | En tiempo de ejecución: `pasaCercas` sobre `error`/`que_hacer` del dictamen | — |
| `:17322-17325` | `public/vendor/` NO entra en los censos de lenguaje, jerga, emoji ni pictograma (los censos leen el primer nivel de `public/`) | — |

[MEDIDO] `node -e` con la función real (anexo): «Buscando sus adjudicaciones…» → `null` (pasa);
«Se está armando la ficha; tarda unos segundos» → pasa; «Escribilo como porcentaje» → `Escribilo`;
«no contés con eso» → `contés`; «Verificá a su socio» → `tuteoEn` null pero `VOSEO_RE` **true**
(las dos cercas son complementarias: hay que pasar las dos); «Cargando ✅» y «Un momento… ⏳» →
emoji cazado.

Cómo cumplir: toda frase nueva de espera en registro de usted, sin imperativos voseantes, sin
pictogramas; si una palabra legítima acaba en -és/-ás/-iste (p. ej. un nombre propio), se DECLARA en
`EXCEPCIONES_TUTEO` con su motivo, no se elude.

### 1.5 Cerca de jerga y rutas prohibidas en pantalla

- `JERGA_HTML` sobre el `index.html` visible (`tests/e2e.js:29445-29448`) y `JERGA_JS`
  (`:29449-29470`) sobre TODOS los `public/*.js` sin comentarios (`:29483-29490`), **excepciones
  declaradas** (`:29483`): `glosario.js`, `frases.js`, `costos.js`, `apu_libro.js`, `xlsx.js`,
  `xlsx_lectura.js`. Términos que tumban: `UNSPSC` (texto), `SMMLV` (fuera de comillas), «cuatro
  puertas», «K sobre CO», «Baja típica», «tertil», «capacidad residual», «habilitante»,
  «subsanable», «causal O», «RUP ✓/✗», «K ✓», `badgePuerta("RUP"|"K")`, «N/A», «evaluar esta
  puerta», «códigos/Familias UNSPSC», `CRP/CRPC`, «Calcular APU», `VEG`, `pp` suelto,
  «Manifestar interés», «Manifestación de interés» suelta (pegada a la modalidad con «· » se
  conserva), `p25`/`p75` sueltos, «descuento típico».
- Textos del servidor: las razones de socio (`:4674-4675`: UNSPSC, SMMLV, capacidad residual, CRPC,
  habilitante, cuatro puertas) y el expediente (`:4781-4782`); la guía (`:13960-13962`, con emoji
  y voseo); un texto de pantalla no puede decir «mediana|p75|percentil|hábiles» (`:13082`);
  cabeceras del Excel sin `K`, `VEG`, «puerta», «probabilidad», «valor esperado» (`:7129`, `:7250`).
- `RUTAS_PROHIBIDAS` (`:29671-29690`): en todo `.js` de `lib/`, `api/`, `public/` (sin comentarios ni
  URLs) y en el `index.html` visible no puede aparecer `docs/`, `/(admin|apu|pliego).html` ni un
  `*.sh`. La alerta del catálogo tiene que citar la ruta de pantalla literal
  («Mi empresa → Catálogo de precios de referencia → «Cargar catálogo APU»», `:29694-29700`).
- Un solo semáforo: cualquier tabla con claves `cumple/revisar/no_cumple` fuera de `glosario.js`
  tiene que leer `Glosario.ESTADO` y hoy son exactamente 4 en `app.js` (`:29497-29545`).

### 1.6 Marca

`tests/e2e.js:24076-24170` [LEÍDO]: `MARCA.nombre === "Detekta"`, objeto congelado
(`:24096-24099`); la grafía vieja (construida por concatenación) no puede aparecer en ningún
`.js|.json|.md|.html|.css|.csv|.txt|.sh|.yml|.yaml` del repositorio salvo `node_modules`, `.git`,
`ecc-tool`, `.vercel` (`:24104-24129`) — **también en un documento nuevo del plan en `docs/`**;
`<title>` ≡ `Glosario.titulo()` y `<meta>` ≡ `Glosario.descripcion()`/`MARCA.nombre`
(`:24132-24139`); los nodos `[data-marca]` nacen VACÍOS y los rellena `glosario.js`
(`:24140-24146`); fuera de `<title>`/`<meta>` la marca no aparece escrita en `index.html`
(`:24147-24149`); `glosario.js` se carga antes que `xlsx.js`, `justificacion.js`, `onboarding.js`,
`app.js` (`:24151-24155`); y `app.js`, `onboarding.js`, `pliego.js`, `xlsx.js`, `justificacion.js`,
`apu_libro.js` no pueden contener `"Detekta`, `'Detekta` ni `` `Detekta `` (`:24157-24161`).
Además `tests/e2e.js:29786-29793`: `<title>` de `index.html` = `Glosario.titulo()` y «Portafolio
Estrat…» no puede asomar al marcado visible.

Cómo cumplir: un texto de espera que nombre el producto se arma con `MARCA.nombre` (leído de
`window.Glosario` **dentro de la función**, no al cargar: § 1.11).

### 1.7 Memoria e índices generados (`memoria útil al crecer`, `tests/e2e.js:36564-36815`)

[LEÍDO] Se EJECUTAN `tests/mapa.js` y `tests/estado.js` y se exige:
- misma cuenta de «secciones» en las dos herramientas (`:36566-36571`); `estado.js` mide el tamaño
  real de `CLAUDE.md` y `docs/PROMPT_INICIAL.md` (`:36574-36577`);
- todo `> SUPERADA` con la forma `^> SUPERADA (el|en) (dd-mmm-20dd|mmm 20dd) por «título»` seguida
  de `—`/`–` o fin de línea (`RE_SUP`, `:36600`), **justo bajo el título** de la sección superada
  (`:36612-36615`), nombrando un título que existe (`:36616-36618`), y que el índice generado lo
  resuelva al título completo (`:36619-36623`); mínimo 6 marcadores (`:36625`); la sección
  «Rediseño Apple Glass…» tiene que seguir marcada y el mapa imprimir «(superada el … → «…»
  sed -n …)» (`:36626-36637`);
- **toda sección posterior a «B6b-memoria-util» empieza por `En una línea: ` con texto**
  (`:36803-36813`; el marcador SUPERADA puede ir entre el título y esa línea);
- `docs/MEMORIA_INDICE.md` = generado (apartado (e) de la cabecera del bloque). [MEDIDO] hoy coincide.

Cómo cumplir en cada tanda: sección nueva AL FINAL de `docs/MEMORIA.md` con fecha, «En una línea:»,
`node tests/mapa.js --escribir`, y los tres generados en el mismo commit
(`docs/PROMPT_INICIAL.md § «11. Mantenimiento de este documento»`).

### 1.8 Topes de tamaño y límites de Redis

| Constante | Valor | Ancla | Cerradura |
|---|---|---|---|
| `TOPE_PLATAFORMA` | 4,5 MiB (`4.5 * 1024 * 1024`) | `lib/cuerpo.js:39` | `tests/e2e.js:6373` (la respuesta del proxy cabe); `:35461-35464` (lista de guardados) |
| `TOPE_PDF_BASE64` | 3 MiB | `lib/cuerpo.js:47` | `:6325-6380`: 413 por encima, con «hasta 3 MB» y ««Archivo PDF»»; `MAX_BYTES_DOC` de `lib/documentos_proceso.js` ≡ esta constante (`:6331-6332`) |
| `MAX_BYTES_DEFECTO` (cuerpo de entrada) | 5 MiB | `lib/cuerpo.js:36` | — |
| `CHUNK_MAX_COMPRIMIDO` | 500 000 B comprimidos por chunk (deflate nivel 6, partición recursiva) | `lib/almacen.js:271`, `:288-296`; motivo `:54-61` («el tope NO es Upstash —10 MB por petición y 100 MB por registro—; es la respuesta de Vercel») | lectura tolera chunk corrupto/duplicado (`:281`, `:314-340`) |
| `POR_PAGINA_DEFAULT` / `POR_PAGINA_MAX` | 20 / 100 | `lib/handlers/procesos/listar.js:141`, `:833-836` | el Excel usa 100 por página (`public/app.js:1197`) |
| Lista de guardados (`aLigero`) | peor perfil < corte/4 (≈ 1,125 MiB); un expediente < corte/10 | `tests/e2e.js:35435-35470` | quita `tareas, documentos, notas, avisos, guia` (y el veredicto de socio: `:4785-4792`, deja `tiene_socio`); deja `tareas_resumen, documentos_resumen, fechas_suyas, hitos, cambios, tiene_notas, tiene_guia` |

Otros topes citados en el árbol, por si el plan toca esos módulos: `lib/apu_extraer.js:46`
(`MAX_BYTES = 4 MiB`), `lib/seguimiento.js:80,140,500,618`, `lib/paa.js:85`, `lib/rup_pdf.js:16`.

### 1.9 «Presupuesto de bytes por fila» — NO es una cerradura [MEDIDO]

`grep -n "1220\|bytes por fila\|aLigero" tests/e2e.js` no devuelve ninguna coincidencia de «1220» ni
de «bytes por fila»; `node -e` sobre el fuente de la suite: **0 coincidencias**. La cifra viene de
`docs/MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea
(11-sep-2026)»`: el veredicto entero pesaba **1.220 B por fila** (14,4 % del cuerpo; 15,0 %
comprimido) y se sustituyó por un resumen de **30 B** con `tipo` y `cierra_todo` («no se puede
perder»). Lo que SÍ está cerrado son las tres piezas y el congelado (cinco mutaciones citadas en esa
sección: que el servidor deje de congelar; que `enriquecer` deje de publicarlo; que la fila vuelva a
llevar el veredicto entero; que `aLigero` deje de quitarlo; que el expediente pierda la sección). La
única cifra por fila que la suite imprime es «bytes por proceso» en `tests/e2e.js:35470`, y es un
`console.log`, no una aserción.

Consecuencia para el plan: **no hay un número que respetar, hay una dirección**: lo que la lista no
pinta no viaja en la lista, y toda ampliación de la fila de `op=listar` se mide (p. ej. con el peor
caso `por_pagina=100`) contra el corte de 4,5 MB «que este proyecto ya cruzó una vez».

### 1.10 Movimiento, `prefers-reduced-motion` y esqueletos existentes

**Tokens del árbol** (`public/index.html:204-213`) [LEÍDO]:
`--dur-1: 70ms` (press) · `--dur-2: 150ms` (color, borde, sombra) · `--dur-3: 220ms` (controles que
cambian de forma; salidas) · `--dur-4: 320ms` (lo que se desplaza: pestaña, hoja, diálogo) ·
`--dur-5: 480ms` (entrada de listas — hoy su ÚNICO uso es `.dato-cambio`, `:392`, y la cerradura
`tests/e2e.js:28332-28333` exige que ese realce use `--dur-5`; el comentario `:376-390` declara que
es «el único sitio»: un segundo uso no rompería la suite pero desmentiría el motivo escrito) ·
`--ease-out`, `--ease-expo`, `--ease-sheet` · `--transition: 0.18s`. El comentario `:204` es la
regla: «cinco duraciones y tres curvas, nada más (una animación por evento)».

**La propuesta § 7.3 del informe de diseño NO se adoptó con esos nombres**: propone
`--dur-instant/press/hover/enter/exit/toast` y `--ease-out/out-soft/in/in-out`
(`docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»`,
`sed -n '794,886p'`); el árbol tiene los cinco numerados. Lo que sí pasó al árbol y vale para la
«animación de espera»: § 7.3.3 «Esqueleto»: mismas dimensiones que el dato final; brillo
`linear-gradient(90deg, …)` en 1,5 s en fase; `aria-busy` en la región; **bajo reduced-motion, gris
plano**. § 7.3.5: «al cargar datos el esqueleto es el único movimiento y desaparece de golpe cuando
llega el dato».

**`prefers-reduced-motion: reduce`** (`public/index.html:836-855`): pone `--transition` y
`--dur-1…5` a `0s`; `transition: none !important` en `body`, `.barra`, `.pestana-movil`,
`#app .transition`, `#modal-competencia .transition`, `#modal-importar .transition`,
`#modal-eliminar .transition`, `#rup-barra`, `.pestanas::before`; `animation: none` en
`.panel-pestana`, `.panel-filtros-hoja`, los velos y `> .relative` de los tres modales,
`.insignia-pestana`, `#d-aviso/#c-aviso/#rup-mensaje:not(.hidden)`, `#app .tarjeta`,
`.dato-cambio`, **`.spin`**, `#app .animate-pulse .bg-gray-100` (gris plano `--bg-inset-2`),
`.barra-indeterminada` (ancho 100 %, opacidad 0,45); `transform: none` en los `:hover/:active`.
También `prefers-reduced-transparency` (`:823-835`) y `prefers-contrast: more` (`:857+`). Los
bloques van «por CLASE/ID como el resto de la piel (no globales) para no pelear con los modales, que
fijan `style.display`» (`:820-822`). `.exp-esqueleto` tiene su propia regla reducida (`:1380`).
La cerradura de preferencias del sistema está en `tests/e2e.js:27970-28000`.

**Esqueletos y estados de espera que ya existen** (§ 4 amplía): keyframe `brillo`
(`public/index.html:789-794`: `#app .animate-pulse .bg-gray-100` con gradiente y 1,5 s;
`.animate-pulse` de Tailwind anulado); `.exp-esqueleto` (`:1288-1290`); `#estado-carga` con
`.spin` + `#estado-carga-msg` + `#estado-carga-esqueleto` de tres tarjetas (`:3593-3606+`);
`#d-skeleton` (`:2243`), `#c-skeleton` (`:2933`), `#seg-skeleton` (`:3322`).

Cómo cumplir: la espera del modal se arma con `.spin` o con el esqueleto `brillo` que ya existe,
duraciones `--dur-2/--dur-4`, sin nuevo `@keyframes` (V4-19 quiere borrar cuatro, no añadir), sin
tocar `--dur-5`, con `aria-busy` en la región, y el bloque de reduced-motion recibe la clase nueva
si trae `animation`/`transform` (la cerradura `:27970-28000` comprueba efectos, «no solo que
aparezcan escritas»).

### 1.11 Otras cerraduras de `public/` que morderán a quien toque `app.js` / `index.html`

| Cerradura | Ancla | Qué exige |
|---|---|---|
| Toda clase USADA está DEFINIDA | `tests/e2e.js:23105-23135+` | Se barre todo `class=`/`className=`/`classList` de `index.html` y `public/*.js`; cada clase existe en `public/tailwind.css` (compilada, 33 471 B, 8-sep), en el `<style>` propio, en el `<style>` del documento que el módulo genera, o es gancho de `closest(".x")`; lo demás se DECLARA. **Regla de trabajo** (`:23078-23093`): una utilidad Tailwind nueva obliga a REGENERAR `public/tailwind.css` fuera del árbol con el CLI v3 (comando literal en ese comentario); el CDN no puede volver (`:23095`). |
| Clases de fondo | `:28360-28395` | Toda `bg-<color>-<n>` (con variantes `hover:`, `file:`) existe en alguna hoja y, si es de tono 400-700, está traducida al token del tema en el `<style>`; excepción `bg-gray-900`. |
| Contraste de tokens | `:28125-28215` | El lector solo entiende `#rrggbb` y `rgba()` («no sé leer el color»): nada de `oklch`/`color-mix()` en tokens; `--ok/--warn/--danger` ≥ 4,5:1 sobre `bg-card, bg-primary, bg-inset, bg-inset-2` en los dos temas, y las pastillas compuestas (`.cal-*`, franja de `pulso.js`). |
| Suelo de letra 11 px y táctil 24 px | `:28551-28598` | Ningún `text-[10px]` salvo `.pestana-movil`; ningún `font-size` < 11 px en `<style>` ni en JS (atributo o declaración); `#lista .tarjeta summary` y `.detalle-probabilidad` con `min-height: 24px` (`:28541`). |
| `window.<Global>.<x>` al cargar | `:29546-29570` | Ninguna desreferencia de un global de otro módulo a profundidad 1 del IIFE: se difiere dentro de la función. |
| Capas a pantalla completa | `:28955-28990`; `public/app.js:863` | Toda capa `role="dialog"` o `fixed inset-0` que nazca `hidden` (salvo `#gate`) está en `CAPAS_A_PANTALLA_COMPLETA`; **un solo** `document.body.style.overflow =` en todo `public/`; la regla se aplica por `MutationObserver` y ese arranque va al final del IIFE (`:28993-28994`). |
| Salto a sección | `:28997-29015` | `html { scroll-padding-top ≥ 66px }` (hoy `5rem`, `public/index.html:286`) y ningún `scroll-margin-top`. |
| Modal de competencia | `:23552-23557`, `:23590-23592`, `:23608-23614` | ids `modal-competencia, modal-fondo, modal-titulo, modal-cuerpo, modal-cerrar, modal-cerrar-pie`, `role="dialog"`, `aria-modal`, arranca `hidden`; `app.js` contiene `banda-competencia, cargarDetalle, abrirModal, cerrarModal, x-historico-token, sessionStorage, MOTIVO_EXCLUSION`; fija `style.display = "flex"/"none"` en línea; cierra por botón, pie, fondo y `Escape`; badge con `data-entidad`, `cursor-pointer`, `hover:underline`. |
| Orden de `closest` en la delegación | `:20786-20793`, `:30748-30750` | `.btn-apu` antes que `.banda-competencia`; `.detalle-ganancia` antes que `.detalle-probabilidad` y que `.banda-competencia`. |
| Funciones extraídas por NOMBRE y ejecutadas | `:29827-29830` (`extraer`) y ~113 `new Function(` en la suite | Se localiza `function X(` y se corta hasta el primer `\n  }` (`jsT.indexOf("\n  }", i) + 4`): cambiar el nombre, la firma o la sangría de cierre rompe la extracción. Nombres de `app.js` fijados así (censo del anexo): `lineaRequisitos, badgesPuertas, badgePuerta, estadoPuerta, chipManifestacion, avisoManifestacion, avisoCierre, alertaVigenciaRup, botonPasoQueFalta, cuantosCompiten, fraseProbabilidad, frecuenciaNatural, motivoProbabilidad, fmtCorto, copFirmado, curvaSVG, pintarPrecioSugerido, pintarPisoTecho, pintarEscalaPisoTecho, tarjeta, bloqueSocio, pintarDetalle, pintarAdjudicatario, htmlEntidadPorAnio, htmlMercadoPeriodos, resumenSocio, parteDelSocio, fraseCierreSocio, htmlResultadoSocio, abrirSimuladorSocio, pintarSocio, cargandoSeguimiento, htmlResumenSeguimiento, htmlDesenlaceSeguimiento, htmlCascada, chipBaja, chip, botones, bloquear, numeroLocal, edadEnPalabras, anioLegible, diaLegible, precargarDesdeURL, reiniciarEditorParaProceso, sincronizarPerfilBorrador, textoIcociv, msgApu, fraseMeseta, quitarDesdeFicha, descargarFichaEmpresa, iniciarAlDia, actualizarDatos, abrirPliegues, abrirApp, detener, pintar, pintarIa, pintarDictamen, pintarBaseZona, arrancarPaneles` (más `RAZONES_SOCIO`, `MESES_ES`, `leerJson`, `api`, `perfilRecordado`, `simularConsorcio`, `pintarCorte`, `pintarApu`). `pintarTarjetas` es de `pliego.js` (`:28276-28280`). |
| `.json()` en `app.js` | `:8893` | Censo de usos de `.json()` con 4 excepciones declaradas: el parseo va aparte del `fetch` (`leerJson`). |
| Escape por censo | `:17404-17606` | Toda interpolación en plantillas de `public/*.js` que nombre un campo de texto pasa por `esc()`; excepciones declaradas con motivo. |
| Lo que un teléfono VE | `:8663-8680` («unidad pantalla · public/app.js sin tooltip») | Ningún dato de la tarjeta puede vivir solo en un `title` (sin ratón no existe). |
| `aria-busy` de la lista | `:13633-13638` | `#estado-carga-esqueleto` con `animate-pulse` y `bg-gray-100`; `$("resultados").setAttribute("aria-busy", estado === "estado-carga" ? "true" : "false")` literal en `app.js` (`public/app.js:684`). |
| Arranque al final del IIFE | `:4280-4282`, `:23594-23601` | El arranque automático va después de declarar el estado (`let pagina = 1, reintentosSync = 0, timerReintento = null;`). |
| Censo de ids | `docs/MEMORIA.md § «Lo que esta auditoría enseñó sobre las propias cerraduras (13-sep-2026)»` | Todo id que `app.js` referencia existe en `index.html` («cazó el hueco de un lote que apuntaba a un id que ningún lote creó»). [LEÍDO en la memoria; el bloque no se localizó por ancla] |

### 1.12 Cerraduras de los módulos de servidor que el plan tocará

| Módulo | Bloques con puerta (`E2E_SOLO`) | Qué fijan (cabecera leída) | Memoria obligatoria antes de tocarlo |
|---|---|---|---|
| `lib/socio_por_proceso.js` (421 líneas; lo llaman `lib/filtros.js`, `perfil/diagnostico.js`, `perfil/seguimiento.js`, `procesos/listar.js`) | «unidad socio por proceso» (`tests/e2e.js:4533-4800`) [MEDIDO: CODIGO=0] | «solo» = 100 % de participación; **el objeto va PRIMERO** (refrigerios → `ninguna_sirve`, motivo `objeto`, 0 opciones; mutación: con el orden anterior daba «solo»); con socio = `falta` no vacío y reparto; razones sin jerga (`:4674`). | § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)» (`sed -n '11916,11989p'`) y § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)» (`sed -n '12390,12448p'`): el veredicto se CONGELA al guardar (patrón F0-7), la fila lleva solo `tipo` y `cierra_todo`, la tarjeta dice «con un socio, sí» / «se acerca, pero puede no bastar», y la frase del servidor manda (no se repite el reparto debajo). |
| `lib/competencia_detalle.js` (703; lo llama `lib/handlers/inteligencia/detalle.js`) | «unidad detalle de competencia» (`:4801-4837`) [MEDIDO: CODIGO=0] | `claveIndice === claveBusqueda` (misma función, con guion tolerado); `claveIndice(x) === indiceComp.claveEntidad({entidad:x}).clave`; memoización 1 por nombre distinto. | § «Remates «R4-remates-inteligencia» de la ola 2…» (`sed -n '10134,10296p'`), § «Lote «B9a-entidad-graficos»…» (`sed -n '9485,9620p'`), § «Lote «B9b-competencia-departamento»…» (`sed -n '9621,9791p'`), § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)» (`sed -n '783,809p'`). |
| `lib/indice_competencia.js` (1 252; 18 llamadores) | «unidad índice de competencia» (`:4838-4881`) y «· mediana única» (`:4882-4935`) [MEDIDO: CODIGO=0]; «unidad badge sin base» (`:4936`); «unidad identidad de entidad» (`:5003`) | tertiles 2/2/2 con empates; todas iguales → «media»; `medianaHistograma`; **0 oferentes = `null`** (hueco del dataset); `MIN_PROCESOS_DEPTO` es el único suelo (`:16216`); la mediana viene de `lib/estadistica` (§ «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)»). | § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)» (`sed -n '3386,3544p'`) y las dos B9 de arriba. |
| `lib/handlers/procesos/listar.js` (1 056; 9 llamadores) | Sin bloque propio: se invoca dentro de `iteracion()` (`:1521`, `:14895-14904`, `:14534`, `:25626`) → `E2E_SOLO=iteraciones`. Unidades que alimentan su cascada: «unidad competencia de la fila» (`:1940`), «unidad pertinencia» (`:2638`), «unidad índice de baja» (`:2837`), «unidad capacidad» (`:3644`), «unidad puerta caja sin anticipo» (`:3700`, `:3784`), «unidad anticipo en la cascada» (`:3891`), «unidad capacidad sin presupuesto» (`:3979`), «unidad adjudicación fuera de calendario» (`:4116`). | Un valor de filtro desconocido es INERTE (`:14902-14903`: `manif=marciana` no vacía la lista); el campo viaja en toda fila (`null` donde no aplica, `:14904`); `por_pagina` ≤ 100. | § «F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)» (`sed -n '2102,2148p'`), § «Datos del negocio (fuente de verdad)» (`sed -n '3128,3249p'`), § ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros (13-sep-2026)» (`sed -n '13687,13715p'`). |
| `lib/handlers/procesos/sync.js` (934; lo llaman `listar.js` y `api/procesos.js`) | «sincronización: el sello va después del hecho» (`:36194`), «sincronización» (`:36390`, detalle), «unidad socrata» (`:1546`), «unidad tiempo de espera» (`:1737`), «unidad empaquetar» (`:1893`), «unidad reloj» (`:2025`); dentro de `iteracion()`: «unidad censo de ingesta» (`:2307`), «refresco mensual del histórico» (`:15531`), «salud de la sincronización» (`:15717`), «guarda de la sincronización» (`:15813`), «dato fresco» (`:15913`). | El sello `terminado` se escribe DESPUÉS del dato (§ «El marcador de «hecho» se escribía antes que el hecho (13-sep-2026)», `sed -n '13794,13819p'`). | § «Lote «B3b-sync-menor»…» (`sed -n '7989,8090p'`), § «Remates «R1b-remates-servidor-B3-B4b»…» (`sed -n '8436,8554p'`), § «Consolidación a 6 routers por dominio» (`sed -n '3849,3899p'`). |

---

## 2. Cola viva

### 2.1 Plan de la piel v4 (`docs/INVESTIGACION_DISENO_WEB.md § «9. Plan de la piel v4 · qué se implementa, en qué orden (12-sep-2026)»`, `sed -n '1094,1230p'`)

**Hecho**: Tanda 1 (V4-01…V4-04) — `docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba
a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»` (`sed -n '13932,14031p'`),
fusionada en `main` por PR #149 (`git log`: `3482415`). Dejó: `.dato-cambio` con `--dur-5` y filo
`outline` 2 px; `--ok/--warn/--danger` nuevos (`#2b7346/#7f4b0c/#862822` claro; `#88d7a8/#e4a84b/#f18078`
oscuro; tintes a alfa 0,10); los puntos del semáforo de `app.js` traducidos a tokens; la cerradura
de contraste sobre cuatro superficies y dos temas; el censo de clases de fondo. **Anotado y no
tocado** (§ «Commitear con agentes sueltos»): los cinco puntos del modal de auditoría fuera de
`#app` (`app.js:1679`, `text-yellow-500`, 1,73:1), anillos/bordes pastel `ring-*-200`,
`border-amber-200/300`, y dos campos muertos `margen_mejor_pct` y `lineas_con_insumo` (este último
codifica «no hay precio» como 0).

**Pendiente (V4-05 en adelante)** y su choque con un plan que toque tarjeta/`app.js`/modal:

| Tanda | Ítem | Archivos | ¿Choca con tarjeta/`app.js`/modal? |
|---|---|---|---|
| 2 | V4-05 `color-scheme: light dark` en `:root` | `index.html` | no |
| 2 | V4-06 familia `sky` deja de ser segundo azul (`:611`, `:635`) | `index.html` | no (panel APU e insignias) |
| 2 | V4-07 cifras tabulares | `pliego.js:521-525`, `pulso.js:50, 604`, `onboarding.js:491` | no toca `app.js`; **la tarjeta no está en la lista** (si el rediseño alinea cifras, aplicar el mismo `font-variant-numeric: tabular-nums`) |
| 2 | V4-08 `#btn-listar` y «Cargar» contestan («Abriendo…» + `finally`) | `app.js:6529`, `:6561` (pestaña Precios) | toca `app.js`, no la tarjeta — **mismo patrón que la animación de espera que pide el dueño**: conviene resolverlos con una sola función de «botón ocupado» |
| 2 | V4-09 `text-wrap: balance/pretty` (`#frase-portada`, `.titulo-pestana`, `.exp-nombre`, `.marca-gate`, `#app h2/h3`) | `index.html` | `#app h2/h3` alcanza títulos dentro de la lista: CSS puro, riesgo bajo |
| 2 | V4-10 borrar dos reglas muertas (`:1276-1277`, `:1335-1336`) | `index.html` | no |
| 2 | V4-11 `#modal-eliminar` y `#modal-importar` cierran con Escape y devuelven el foco | `app.js` (`abrirModalEliminar` `:9213`, `cerrarModalImportar` `:7181`) | **sí**: toca la maquinaria de modales; si el plan unifica «abrir/cerrar/cargando» de los tres modales, V4-11 entra ahí |
| 3 | V4-12 `scroll-behavior: smooth` solo bajo `no-preference` y los diez `scrollIntoView` por una función | `index.html:286`, `app.js` (10 sitios) | **sí** (`app.js` transversal). **Su riesgo declarado cita `tests/e2e.js:11829`, que HOY es otra cosa** (§ 6); la cerradura real del salto es `:28997-29015` |
| 3 | V4-13 un cambio de pestaña no dispara dos animaciones | `index.html:374` (`.panel-pestana`) y `#app .tarjeta` (`:849`, animación de entrada) | **sí, directo**: quien rediseñe la tarjeta decide su animación de entrada; hacerlo en la misma tanda |
| 3 | V4-14 anillo de foco sin transición · V4-15 press en un fotograma · V4-16 `.barra` 600→220 ms (`:301`) · V4-17 entrada del gate | `index.html` | V4-14/15 alcanzan botones de la tarjeta (`.btn-guardar`, `.btn-apu`): CSS, bajo |
| 4 | V4-18 `scrollbar-gutter: stable` | `index.html` | no |
| 4 | V4-19 `@starting-style` + `transition-behavior: allow-discrete` en hojas y modales; borra 4 `@keyframes` y 6 `animation:` | `index.html`, `app.js`, censo de capas (`:28955-28990`) | **sí, el mayor riesgo** («si hay que recortar, se cae este»): cualquier estado «cargando» del modal se diseña sabiendo que su entrada/salida cambiará de mecanismo |
| 4 | V4-20 `@container` para las seis rejillas de cifras (`app.js`, `pulso.js`, `portada.js`) | `index.html` + `app.js` | **sí**: la rejilla de tres cifras de la tarjeta es una de ellas |
| 4 | V4-21 `@property` para tokens de color y duración | `index.html` | no (pero la cerradura de contraste solo lee `#rrggbb`/`rgba()`: `@property` no puede cambiar la notación de los valores) |

**Lo que NO se hace** (§ 9.5): `oklch`/`color-mix()`, APCA, mover el acento, `dvh`, `@layer`,
`popover`+`::backdrop`, `anchor()`/`@scope`/`animation-timeline`/`field-sizing`/`content-visibility`,
**«trucos para acortar la espera percibida»** («lo que rinde es decir qué falta en unidades del
oficio») y subir a 14 px el suelo de los campos. Esto ata a la «animación de espera»: la propia
investigación descarta el truco de espera y prescribe esqueleto + texto que diga qué se está armando.

**Lo que decide el dueño** (§ 9.6, gusto): (1) pliegues `<details>` que se deslizan (solo Chromium)
o se quedan; (2) View Transitions al cambiar de pestaña, con la regla dura «la transición no arranca
hasta que la cifra nueva ya está en el DOM»; (3) serif intermedio en más titulares; (4) jerarquía de
las siete cajas de Mi empresa.

### 2.2 Las 12 secciones más nuevas de la memoria (`node tests/estado.js`, 13-sep-2026) — ¿tocan tarjeta / listar / competencia?

| Sección (título) | En una línea (resumen) | Tarjeta / listar / competencia |
|---|---|---|
| «Leer el cronograma es público; guardar sus fechas, no» | `op=cronograma` se declaraba público y guardaba sin credencial | no (pliego) |
| ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros» | `p3Caja` hacía `Number(anticipo_pct) \|\| 0` | **sí: listar** (la cascada de puertas que decide `viable`) y la línea de requisitos de la tarjeta |
| «La contribución del 5 % se cobraba siempre, y la alerta invitaba a cobrarla dos veces» | `apu/calculo` y `apu/rentabilidad` no miraban tipo de trabajo | no (APU) |
| «La unidad del pliego se perdía dos veces: al emparejar y al calcular» | m³ vs otra unidad en el emparejamiento | no (APU) |
| «La cifra que decía «Puede facturar hasta» era el TECHO, no la K» | `crp(perfil, 0)` deja el factor E en su mejor escalón | no (Mi empresa); ojo si la tarjeta muestra capacidad: es un TECHO |
| «El marcador de «hecho» se escribía antes que el hecho» | los extractores del histórico sellaban `terminado` antes de escribir el dato | **sí: sync** (bloque `:36194`) |
| «Restaurar una copia podía BORRAR lo que venía a reemplazar» | `del` + `hset` son dos viajes REST | no (admin) |
| «Cinco medianas en `lib/`, y ya divergían» | una sola mediana en `lib/estadistica` | **sí: indice_competencia** (rótulo «· mediana única») — no reescribir una mediana |
| «La pulsación que llegó antes que el archivo» | la puerta del gate se ve antes de que su manejador exista | no (gate) — pero es el precedente de «ninguna pulsación sin respuesta visible» que la espera del modal debe honrar |
| «Lo que esta auditoría enseñó sobre las propias cerraduras» | cerraduras por regex que no cazaban; lotes DISJUNTOS; `e2e.js` spliciado EN SERIE | método (§ 3) |
| «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban» | V4-01…04 | **sí: tarjeta** (semáforo de `app.js` por tokens; `bg-green-500` significaba dos cosas) |
| «Commitear con agentes sueltos en el árbol: el diff que se empujó no era el que se verificó» | dos líneas mutadas por una pasada adversaria entraron en el commit | método (§ 3); y deja anotado el modal de auditoría fuera de `#app` |
| (13.ª, `L13624`) «El paso a paso salía desordenado, y `main` llevaba horas en rojo sin que nadie lo viera» | dos relojes en la guía; censo de 391 fechas | no (seguimiento) |

### 2.3 `EXPERIENCIA_PENDIENTE.md`

[MEDIDO] `find . -iname "*EXPERIENCIA_PENDIENTE*"` → **`./EXPERIENCIA_PENDIENTE.md` en la RAÍZ**, no
en `docs/` (el encargo lo nombra como `EXPERIENCIA_PENDIENTE.md (movido a docs/)`); 266 líneas, 13 915 B; sin
ficha `> Para:` (por estar en la raíz no entra al censo de fichas, que barre `docs/` un nivel +
`README.md` + `CLAUDE.md`); lo citan `docs/MEMORIA.md § «Datos del negocio (fuente de verdad)»`,
`docs/CONSULTORIA_2026-09-04_RESUMEN.md` y `docs/CONSULTORIA_2026-09-04.json` (DOC-A-06 propuso
`git mv` a `EXPERIENCIA_GENESIS.md (dentro de docs/)`; **no se hizo**).

Qué es: «Experiencia ejecutada de Génesis — RESUELTO (ago 2026)»: los datos llegaron
(`experiencia_genesis_106.json`, 106 filas extraídas del RUP 2023 aportado por el dueño); el
documento se conserva como CONTRATO del archivo (campos de `validarContratos`, límites, ejemplo),
cómo se extrajo, qué quedó en `null` (54 `participacion`, 11 `modalidad`) y tres anomalías de la
fuente conservadas. **No es un backlog de experiencia de usuario de las socias**: es la lista de
contratos ejecutados (RUP) de la socia Génesis. Lo pendiente que declara: (a) aportar una versión
actualizada tras la próxima renovación del RUP, por las tres vías descritas; (b) «Qué funciona hoy
sin este archivo»: `cobertura-rup` responde con `score: null` («no medido», no cero); (c) el paso de
carga es `./cargar_experiencia.sh`, que es un `.sh` en la raíz — recuérdese que ningún texto de
pantalla puede nombrarlo (§ 1.5). Si el plan lo mueve a `docs/`, necesita ficha y sus dos citas
actualizadas en el mismo commit (§ 1.2), y su línea 3 trae un pictograma (`✅`) que no censa nadie en
`docs/`, pero que la regla de estilo desaconseja.

---

## 3. Convenciones que el plan debe repetir en cada tanda

De `docs/PROMPT_INICIAL.md § «3. El ciclo ECC (di en qué paso estás)»` (`sed -n '106,131p'`):
0 PREMISA (cada afirmación del encargo se verifica contra el código) → 1 PLAN (problema raíz) →
2 REPRODUCE (sin reproducción no hay defecto) → 3 TEST (se escribe ANTES) → 4 IMPLEMENT (mínimo;
llamar la regla que existe) → 5 REVIEW → **6 ADVERSARY (por MUTACIÓN: la prueba debe FALLAR sin el
arreglo)** → 7 VERIFY (`node tests/e2e.js` 4/4 sin tuberías; `apu_bench.js` si se tocó el lector;
navegador real si se tocó `public/`; los atajos `--indice`, `E2E_SOLO`, `E2E_SILENCIO` NO cuentan)
→ 8 HONESTY → 9 REMEMBER (decisión y motivo AL FINAL de `docs/MEMORIA.md`, con fecha; corregir
CLAUDE.md/PROMPT_INICIAL si el trabajo los desmintió) → 10 IMPROVE (¿dónde más vive el patrón?).
Escalera: cuestionar → eliminar (= no añadir una segunda definición) → simplificar → acelerar →
automatizar.

De `§ «8. Verificación · qué cuenta como «hecho»»` (`sed -n '178,192p'`): (1) toda cerradura nueva
FALLA contra el árbol anterior y se dice; (2) unidad con dependencias inyectadas prueba el CABLEADO,
la integración prueba el CONTRATO; (3) **navegador real a 390 px**: `scrollWidth > clientWidth`,
`getComputedStyle`, consola limpia (precedente: CDN de Tailwind bloqueado con cero errores); (5) la
compatibilidad con el dato viejo desplegado se prueba (desplegar nunca exige reconstruir).

De `§ «10. Reglas de respuesta (obligatorias)»` (`sed -n '229,258p'`): imperativo; cita exacta y
**por título de sección**; cifras medidas o «no puedo medirlo»; beneficio para el contratista;
español; si el dato no permite algo, se entrega el resto y se declara; **cierre obligatorio**:
MEDIDO · SUPUESTO · NO VERIFICABLE DESDE AQUÍ, Verificación (el «4/4» literal y bench/navegador),
Pendientes con URL completa y botón literal, y **Rama**: destino `main`; si el arnés impuso
`claude/…`, se trabaja ahí y **la sesión ABRE el pull request contra `main`** con la URL completa y
los botones «Merge pull request» y «Confirm merge» (o la URL de comparación y «Create pull request»).
Motivo fechado: `§ «Por qué la entrega cambió de «Trabaja en main» a «abre tú el pull request»
(13-sep-2026)»` (`sed -n '365,377p'`): cinco ramas quedaron sin fusionar entre el 28-ago y el 8-sep.
[MEDIDO] La rama de hoy es `claude/dazzling-lovelace-y2t2oh` y `main` va detrás/igual; el último
merge es PR #149.

De `§ «11. Mantenimiento de este documento»` (`sed -n '259,298p'`): sin números ni «está hecho» en
CLAUDE.md/PROMPT_INICIAL; retiro de documentos con `git mv` a `docs/archivo/` y primera línea
`> Archivado el …`; y la convención de la memoria («En una línea:», `> SUPERADA`,
`node tests/mapa.js --escribir` con los generados en el mismo commit).

De la memoria del 13-sep (§ «Lo que esta auditoría enseñó» y § «Commitear con agentes sueltos»):
**lotes de ficheros DISJUNTOS entre agentes**; `tests/e2e.js` fuera de la fase paralela — las
cerraduras se escriben como guiones autónomos y se splician EN SERIE; ningún agente toca una
aserción existente (si su cambio la pone en rojo, la localiza y dice qué cambiar); **no se commitea
con agentes vivos que escriben en el árbol**; `git diff --stat` no verifica contenido: se compara el
diff completo (o los hash de blobs) con lo que se verificó; un conteo escrito a mano en un comentario
caduca en el mismo commit.

De `CLAUDE.md`: el patrón de corrida `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?; tail -3
salida.txt`; `E2E_SOLO` cierra con «CORRIDA PARCIAL» (nunca 4/4); `E2E_REDIS_LENTO_MS` para
reproducir fallos de corredor lento; GitHub repite el 4/4 en `.github/workflows/suite.yml` pero no
bloquea.

---

## 4. Cómo se abre hoy el modal desde la tarjeta, y qué esqueleto de «cargando» existe

**Un solo modal genérico** (`#modal-competencia`) y una sola función de apertura:
`public/app.js:2534-2545` `abrirModal(titulo, rotulo = "Competencia histórica", msg = "Cargando…")`
→ pone `#modal-rotulo`, `#modal-titulo` (o «Entidad no informada»), `#modal-cuerpo = cargando(msg)`,
oculta «Copiar justificación», quita `hidden`, añade `flex`, fija `style.display = "flex"` y
registra `Escape`. `cargando(msg)` (`:2529-2533`) es un `.spin` de 32 px + `<p class="text-gray-400">`
con el mensaje escapado («Spinner mientras carga, no un «Cargando…» seco: la consulta recorre el
corpus entero la primera vez (después la sirve la caché de 300 s)», `:2527-2528`). `cerrarModal`
(`:2520`).

**Delegación de clics en la lista** (`public/app.js:3425-3458`, en orden y con `return`):
1. `.detalle-ganancia[data-id]` → `abrirModal(objeto, "Lo que deja este contrato", "Rehaciendo la cuenta…")` + `abrirDetalleGanancia(fila)` (fila buscada en `ultimaBusqueda`).
2. `.detalle-probabilidad[data-id]` → `abrirModal(objeto, "Desglose de la probabilidad", "Reconstruyendo el cálculo…")` + `cargarDesglose(id)`.
3. `.btn-apu` → `abrirEditorConProceso(...)`.
4. `.btn-guardar` → `alternarGuardado(id, btn)`.
5. `.banda-competencia[data-entidad]` → `abrirModal(entidad, "Competencia histórica")` + `cargarDetalle(entidad)` (`:3284-3300`: reemplaza el cuerpo por «Consultando el histórico…», `fetch("/api/inteligencia?op=entidad&entidad=…", {headers: {"x-historico-token"}})`, `leerJson` aparte, mensajes de red/401/`!ok`).

**Competidor**: `cargarAdjudicatario(clave, nombre)` (`:3382-3392`) → `abrirModal(nombre || "Competidor",
"Dónde gana este competidor", "Buscando sus adjudicaciones…")` + `fetch("/api/inteligencia?op=competidor&adjudicatario=…")`.
Se llama desde el modal de la entidad (bloque de adjudicatarios), no desde la tarjeta [LEÍDO: el
disparador exacto no se localizó por ancla; la tarjeta no contiene `cargarAdjudicatario`].
**Desde los filtros**: `:927` `abrirModal(estadoFiltros.entidad, "Historial de la entidad")`.
**Socio**: `:10661` `op=socio&id=…` (expediente / simulador), no desde la tarjeta.

**Esqueletos existentes** (todos con el keyframe `brillo`, 1,5 s, apagado bajo reduced-motion):
- Lista de licitaciones: `mostrar("estado-carga", "Buscando oportunidades…")` (`app.js:1124`);
  `#resultados[aria-busy]` (`:682-684`); `#estado-carga` = `.spin` + `#estado-carga-msg` +
  `#estado-carga-esqueleto` con TRES tarjetas esqueleto de la altura real (título, franja de tres
  cifras, fila de chips; `index.html:3586-3606+`, decorativo `aria-hidden`). Cerradura
  `tests/e2e.js:13633-13638`.
- Mis procesos: `cargandoSeguimiento(v)` (`app.js:3616-3634`), `#seg-skeleton` (`index.html:3322`),
  `aria-busy` en `#seg-lista`; solo la primera vez. Cerradura `:13677-13681`.
- Expediente: `.exp-esqueleto` (`app.js:3757-3759`; `index.html:1288-1290`, reducido `:1380`).
- Panel (`#d-skeleton`, `app.js:8568-8595`, solo si no hay `ultimoResumen`) y cobertura
  (`#c-skeleton`, `:9825-9852`).
- Modales: **no hay esqueleto**, solo `.spin` + frase (`cargando`), y `cargarDetalle` lo sustituye
  por un `<p>` sin spinner («Consultando el histórico…», `:3286`).
- Otros indicadores: `.barra-indeterminada` (reducido en `index.html:853`), `msgIa("Buscando…
  completado N %")` (`app.js:6605`), `avanzar("Buscando los documentos del proceso en SECOP II…")`
  (`:4506`).

Para la «animación de espera» del modal, lo que ya existe y lo que falta: existe `cargando(msg)`
con `.spin` (queda quieto bajo reduced-motion, `index.html:849`), existe `brillo` y la forma de
tarjeta esqueleto; **falta** un esqueleto con la FORMA del detalle de entidad (columnas por año,
barra apilada, tabla plegada: § «Lote «B9a-entidad-graficos»…»), `aria-busy` en `#modal-cuerpo`, y
un mensaje que diga qué se arma («qué falta en unidades del oficio», § 9.5) — sin nombrar la marca a
mano y sin pictograma.

---

## 5. Rótulos `E2E_SOLO` que un plan puede pedir (`node tests/e2e.js --indice`: 36 873 líneas, 61 bloques con filtro, 79 rótulos)

**Regla que manda** [MEDIDO]: `iteracion()` va de `tests/e2e.js:9751` a `:32282` y la ejecuta el
bloque «iteraciones» (`:36406-36413`, bucle `for (i = 1..objetivo) await iteracion(i)`). Todo lo
que vive ahí (cableado tarjeta→modal `:23550`, marca `:24076`, documentación y citas `:24598`,
piel/contraste/clases `:28100-29015`, jerga y lenguaje `:29440-30420`, `listar` real `:14895`,
probabilidad `:11869`, colisión de cierres `:12766`, sync `:15531-15913`) **solo se ejerce con
`E2E_SOLO=iteraciones` o con la corrida entera**. Los bloques con puerta de abajo son unidades
baratas, y tres de ellas se corrieron aquí con `CODIGO=0` y el pie «NO es la verificación».

- **tarjeta**: `unidad pantalla · public/app.js sin tooltip` (L8663) · `unidad competencia de la fila` (L1940) · `unidad tipo de precio` (L1961) · `unidad adjudicatario` (L1987) · `unidad badge sin base` (L4936) · y el resto vía `iteraciones`.
- **listar**: `unidad pertinencia` (L2638) · `unidad índice de baja` (L2837) · `unidad modalidades` (L2465) · `unidad anti-suministro` (L2500) y `· (obra vs compra pura)` (L3623) · `unidad convenios` (L2531) · `unidad UNSPSC (normalización)` (L2571) y `(jerarquía)` (L2601) · `unidad capacidad` (L3644) · `unidad puerta caja sin anticipo` (L3700) y `· mensaje público` (L3784) · `unidad anticipo en la cascada` (L3891) · `unidad capacidad sin presupuesto` (L3979) · `unidad adjudicación fuera de calendario` (L4116) · `unidad fechas del PAA` (L2002) · el handler real: `iteraciones`.
- **competencia**: `unidad detalle de competencia` (L4801) · `unidad índice de competencia` (L4838) · `unidad índice de competencia · mediana única` (L4882) · `unidad badge sin base` (L4936) · `unidad identidad de entidad` (L5003).
- **socio**: `unidad socio por proceso` (L4533) · `unidad simulador con conocimiento` (L4058) · `unidad perfiles contra el RUP` (L4298) · `unidad experiencia/cobertura` (L5037) · `unidad modo cuenta` (L4150).
- **inteligencia**: los de competencia + socio; `probabilidad A2-A6` (L11869) y `colisión de cierres MEDIDA (A7)` (L12766) solo vía `iteraciones`.
- **sync**: `sincronización: el sello va después del hecho` (L36194) · `unidad socrata` (L1546) · `unidad tiempo de espera` (L1737) · `unidad empaquetar` (L1893) · `unidad reloj` (L2025) · `unidad rendimiento` (L3595) · dentro de `iteraciones`: `unidad censo de ingesta` (L2307), `unidad rastreo` (L2396), `refresco mensual del histórico` (L15531), `salud de la sincronización` (L15717), `guarda de la sincronización` (L15813), `dato fresco` (L15913), `sincronización` (L36390).
- **documentos / memoria**: `memoria útil al crecer` (L36564) · `cómo se corre la suite` (L36417) · `unidad guía · orden del paso a paso` (L35776) · el censo de fichas, citas e `INDICE.md` (`:24598-24975`) solo vía `iteraciones`.
- **pantalla / arranque** (por si la tanda toca el gate o el arranque): `unidad pantalla · la puerta de entrada y el relleno del teléfono` (L9108) · `· la puerta pulsada antes de cargar` (L9405) · `· el envío de la clave antes de cargar` (L9573).

---

## 6. Premisas desmentidas por el árbol

1. **«Presupuesto de bytes por fila (1220) con cerradura»** — no hay tal cerradura: 0 coincidencias
   de «1220»/«bytes por fila» en `tests/e2e.js` [MEDIDO]. Es una medición de la memoria (§ 1.9).
2. **«EXPERIENCIA_PENDIENTE.md (movido a docs/)»** — está en la raíz (`./EXPERIENCIA_PENDIENTE.md`) [MEDIDO], y
   no es la «experiencia de las socias» como pendiente de UX: es el contrato de datos de la
   experiencia ejecutada (RUP) de Génesis, RESUELTO en ago 2026 (§ 2.3).
3. **«Los tokens de movimiento de § 7.3 son los del árbol»** — no: el árbol usa `--dur-1…5` y tres
   curvas (`public/index.html:204-213`); § 7.3 propone otros nombres y seis duraciones [LEÍDO].
4. **`docs/INVESTIGACION_DISENO_WEB.md` V4-12 cita `tests/e2e.js:11829` como «recorte con lista de
   inyección cerrada»** — hoy esa línea está dentro del bloque de la banda de probabilidad
   (`:11820-11840` leído: `estimarPDetalle`, `p_lo/p_hi`); la cerradura del salto a sección es
   `:28997-29015` (`scroll-padding-top` ≥ 66 px, sin `scroll-margin-top`) [LEÍDO]. Una cita a una
   línea de `.js` no la censa la suite y se pudre igual.
5. **«`node tests/estado.js` lista las 12 secciones más nuevas»** — cierto, pero la 13.ª («El paso a
   paso salía desordenado…», `L13624`) es del mismo día y también reciente; se incluyó (§ 2.2).
6. **CLAUDE.md «Una sola rama: main»** frente a la práctica medida: el arnés impone `claude/…` y la
   regla vigente es «abre tú el PR contra main» (`docs/PROMPT_INICIAL.md § «10. Reglas de respuesta
   (obligatorias)»`, apartado Rama; motivo fechado 13-sep-2026). No es contradicción, es el matiz
   que el plan debe repetir.

## 7. No verificable desde aquí

- La duración real del 4/4 y el peso de `E2E_SOLO=iteraciones`: no se corrió (el encargo lo prohíbe).
- El censo de `op` del README «en los dos sentidos» (`tests/e2e.js:24971-24972`): solo se leyó la
  línea de cierre, no el bloque que lo implementa.
- El bloque exacto del «censo de ids» (id referenciado en JS que no existe en HTML): citado en la
  memoria del 13-sep, no localizado por ancla.
- El disparador exacto de `cargarAdjudicatario` en el modal de la entidad (se sabe que no está en
  la tarjeta: `grep abrirModal` no lo enlaza a `.banda-competencia`).
- El comportamiento visual en navegador (390 px, consola) de cualquier cambio: aquí no se tocó nada.

---

## Anexo · comandos ejecutados y salidas resumidas (13-sep-2026)

```
git -C /home/user/portafolio-estrategico status --short | wc -l   → 0 (antes y después)
git branch --show-current                                         → claude/dazzling-lovelace-y2t2oh
git log --oneline -1                                              → 3482415 Merge pull request #149: la piel v4 · investigación, plan y tanda 1
ls api/                                                           → admin.js apu.js inteligencia.js perfil.js pliego.js procesos.js
node tests/e2e.js --indice                                        → 36873 líneas · 61 bloques con filtro · 79 rótulos (lista completa en el cuerpo)
node tests/estado.js                                              → api/ 6 · lib/ 124 js · public/ 19 js · docs/ 44 md · tests/ 16 js · e2e 36873 líneas, 8775 aserciones, 61 bloques, 79 rótulos · MEMORIA 1 243 197 B, 215 secciones, 7 SUPERADA
E2E_SILENCIO=1 E2E_SOLO="unidad socio por proceso" node tests/e2e.js      → CODIGO=0 · «NO es la verificación…»
E2E_SILENCIO=1 E2E_SOLO="unidad detalle de competencia" node tests/e2e.js → CODIGO=0
E2E_SILENCIO=1 E2E_SOLO="unidad índice de competencia" node tests/e2e.js  → CODIGO=0 (incluye «· mediana única»)
grep -n "1220\|bytes por fila\|aLigero" tests/e2e.js              → solo aLigero (4785-4792, 35439-35469, 35903-35906); 0 «1220», 0 «bytes por fila»
node -e '…lenguaje_pantalla…'  → «Buscando sus adjudicaciones…» null/false/- · «Escribilo como porcentaje» Escribilo · «no contés con eso» contés · «Verificá a su socio» tuteoEn null, VOSEO_RE true · «Cargando ✅» emoji ✅ · «Un momento… ⏳» emoji ⏳ · EXCEPCIONES_TUTEO 23
node -e '…RE_MEMORIA_LINEA/RE_DOC_LINEA/RE_DOC_TITULO…' → «docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»» cazada · «docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»» cazada · «<documento>.md, líneas A-B» cazada · «<documento>.md L54» cazada · «sed -n '1094,1230p' docs/<documento>.md» no cazada · «MEMORIA.md § «Tanda 1 de la piel v4»» título
node -e '…censo de fichas…'    → 47 documentos censados · 0 sin ficha · audiencias {sesión 9, ingeniero 21, dueño 16, contratista 1} · estados {informe fechado 14, referencia 20, pendiente del dueño 10, archivado 3}
node tests/mapa.js --indice-docs | diff -q - docs/INDICE.md       → iguales
node tests/mapa.js --indice | diff -q - docs/MEMORIA_INDICE.md    → iguales
find . -iname "*EXPERIENCIA_PENDIENTE*"                           → ./EXPERIENCIA_PENDIENTE.md (raíz); wc → 266 líneas, 13915 B; sin «> Para:» en las 12 primeras líneas
awk '/^  }$/ …' tests/e2e.js                                      → iteracion() abre en L9751 y cierra en L32282
grep -c "new Function(" tests/e2e.js                              → 113
ls -la public/tailwind.css                                        → 33471 B (8-sep)
```
