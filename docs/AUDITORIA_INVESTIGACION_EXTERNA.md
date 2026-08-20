# Auditoría de la investigación externa (ago 2026)

Contraste, corrección y complemento del informe técnico externo «Auditoría, Competencia, Módulo APU
con Precios en Vivo y Diseño Liquid Glass», recibido el 17-ago-2026.

**Método de este documento.** Todo lo que sigue se verificó contra el repositorio real y ejecutando
código, no leyendo el informe. Cada afirmación dice de dónde sale. La suite (`node tests/e2e.js`)
pasó 4/4 el 17-ago-2026 antes de escribir esto, así que el estado descrito es el estado que pasa las
pruebas. Donde este entorno no pudo verificar algo, se dice (§5) en vez de rellenarlo.

**Nota de marca:** el producto se llama **Detekta** (con k) desde la Fase 7. La grafía anterior no
puede aparecer en ningún archivo del repositorio — hay una prueba que recorre `.js/.json/.md/.html/…`
y falla si la encuentra —, así que el título del informe externo no se cita literal en ningún punto
de este documento. No es un detalle de estilo: copiar y pegar ese informe en el repositorio **rompe
la suite**.

---

## Resumen: qué aporta el informe y qué hay que descartar

| Parte | Veredicto | Por qué |
|---|---|---|
| **1 · Auditoría del repositorio** | **Descartar entera** | Su premisa central («NO ACCESIBLE») es falsa desde dentro. Las 10 fases que pide auditar **están todas implementadas y probadas**. El protocolo de greps sirve como humo, nada más |
| **2 · Competencia** | **Aporte real, con una corrección grande** | Trae 6 competidores que el repositorio no tenía documentados. Pero **las 4 brechas que prioriza ya están cerradas**: su «Etapa 3» construiría lo que ya existe |
| **3 · Módulo APU / precios en vivo** | **Su hallazgo central es incorrecto** | Homecenter **no** es la cadena VTEX que el informe describe; la API que recomienda dio **404** aquí. Además, 3 de sus recomendaciones chocan con restricciones duras del proyecto |
| **4 · Liquid Glass** | **Aporte parcial y accionable** | La paleta y el vidrio ya están. Señala bien **una carencia real de accesibilidad** que sigue abierta |

El dato **más valioso de todo el informe** no está en sus conclusiones sino de pasada, en la ficha de
un competidor: la metodología de costo-hora publicada por PresuCosto (§2.2 del informe). Sirve para
contrastar tres parámetros que el repositorio tiene marcados como «sin fuente oficial». Está medido
en el §3.6 de este documento.

---

## 1 · Parte 1 — la premisa es falsa y el trabajo ya está hecho

El informe declara el repositorio inaccesible por toda vía y entrega, en lugar de hallazgos, un
protocolo de auto-auditoría. La honestidad epistémica es correcta y se agradece; la conclusión
operativa, no: **el repositorio es accesible desde esta sesión** y su estado se puede leer.

Ejecutado el protocolo del propio informe, más la suite:

| Fase | Estado real | Evidencia (archivo que existe hoy) |
|---|---|---|
| **0 · Consolidación a routers** | ✅ Hecha | `api/` contiene **exactamente 6** archivos: `admin.js` `apu.js` `inteligencia.js` `perfil.js` `pliego.js` `procesos.js`. La suite fija el conteo en `=== 6` |
| **1 · Motor de costo real** | ✅ Hecha | `lib/costos.js` + `lib/parametros.js` (`apu:parametros`), con `divisorAPU: 210`, `tpnl: 0.225`, `mvp: 0.1472`, `exoneracionParafiscales` (E.T. 114-1) y `horasSemanaVigente: 42` (Ley 2101/2021) |
| **2 · Puerta de entrada** | ✅ Hecha | `lib/handlers/perfil/entrada.js` + `lib/perfil_manual.js` (cascada PDF → OCR → manual; ningún camino termina en error sin salida) |
| **3 · Piso/Techo** | ✅ Hecha | `lib/apu/piso_techo.js` |
| **4 · Guardián del Formulario 1** | ✅ Hecha | `lib/formulario1.js` (7 validaciones con fundamento) |
| **5 · Vigía de adendas** | ✅ Hecha | `lib/diff.js` + `lib/adendas.js` + `lib/cronograma.js` (incluye avisos T-7/T-3/T-1 y exportación `.ics`) |
| **6 · Traducción de lenguaje** | ✅ Hecha | `lib/glosario.js` (re-export de `public/glosario.js`) |
| **7-10** (marca, filtros, portada, consorcio) | ✅ Hechas | El informe ni siquiera las conocía |

**Consecuencia:** la «Etapa 1» del informe (ejecutar el protocolo y confirmar ≤12 funciones antes de
desplegar) no tiene trabajo dentro. Lo único que conviene conservar de su Parte 1 es el conteo de
`api/` como prueba de humo — y esa prueba **ya está en la suite**, que es mejor sitio que un `find`
a mano.

Lo que el informe no podía saber y conviene dejar escrito: el límite de 12 funciones **dejó de ser el
cuello de botella** con la consolidación a 6 routers. La regla vigente no es «no se puede crear un
endpoint» sino «un endpoint nuevo se pliega como `op` en el router de su dominio».

---

## 2 · Parte 2 — buena inteligencia, prioridades equivocadas

### 2.1 Lo que aporta de verdad

Seis competidores que **no estaban** en `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md` ni en
`docs/INVESTIGACION_COMPETENCIA_APU.md`, y que sí importan:

- **PresuCosto** — el más relevante de todos, por dos motivos independientes: (a) publica su
  metodología APU con cifras (210 h/mes, TPNL 22,5 %, MVP 14,72 %, herramienta menor, dotación 5 %),
  que es material de contraste directo para `lib/parametros.js` (§3.6); (b) consume **el mismo dataset
  SECOP `p6dx-8zbt`** y clasifica obra civil por especialidad — o sea, compite en la mitad de arriba
  del producto, no solo en la de abajo.
- **Licitum** — control de cambios de adenda a nivel de párrafo, K-residual, autodiligencia de
  formatos CCE.
- **LicitarUS** — análisis de pliego con **citas verificables a la página exacta** y al artículo de la
  norma; chat anclado al documento.
- **LicitIA**, **BuscaSECOP** (expone un MCP para análisis conversacional), **OneEstimate**
  (10.700+ APU precargados, «la IA lee tus especificaciones y genera el APU»).

Ya estaban documentados: Fromus, GovWin, Licitaciones.info, Alicia, LicitaMatch, Construdata, CYPE,
Presto, SINCO. La ficha ampliada de Construdata (5.500 insumos/ciudad, 1.000 APU, actualización
mensual, 4 ciudades) sí añade detalle útil sobre el referente a batir.

### 2.2 La corrección grande: cuatro de sus cuatro prioridades ya están construidas

La «Etapa 3» del informe manda priorizar «lo que la competencia ya hace y Detekta no», y nombra
cuatro cosas. **Las cuatro existen**:

| Lo que el informe manda construir | Dónde está ya | Comentario |
|---|---|---|
| Cruce automático del RUP con habilitantes (Fromus/LicitarUS) | `lib/rup.js`, `lib/puertas.js`, `lib/unspsc.js` | Es el núcleo del producto desde el primer día, y el matching UNSPSC es **jerárquico y bidireccional**, no una comparación de códigos |
| Diff de adendas a nivel de párrafo (Licitum) | `lib/diff.js` + `lib/adendas.js` (Fase 5) | Va más allá: **reevalúa las puertas** con la fila «como era antes» y responde «usted ya no cumple» frente a «no le afecta» |
| Clasificador automático de obra civil sobre `p6dx-8zbt` (PresuCosto) | `lib/filtros.js` (cascada) + `evaluarPertinencia` + capa anti-suministro | Más fino que lo que describe el informe: distingue convenios, suministro disfrazado, objetos genéricos y estructuración societaria |
| K-residual (Licitum) | `lib/capacidad.js` | Con la regla que casi nadie implementa bien: **K del plural = suma de las CRP**, no promedio |

Y una quinta, que el informe clasifica como «funcionalidad de mercados más maduros, ausente en
Colombia»: **opportunity scoring / probabilidad de ganar**. Está en `lib/probabilidad.js`, con
encogimiento bayesiano, banda del 90 % y un desglose auditable de seis pasos
(`lib/probabilidad_desglose.js`). Es probablemente la ventaja competitiva más difícil de copiar que
tiene el producto, y el informe la da por inexistente.

### 2.3 Las brechas que sí quedan abiertas

Depuradas contra el código, las brechas **reales** frente a la competencia son otras cuatro:

1. **Citas verificables a la página exacta del pliego** (LicitarUS). Hoy `lib/formulario1.js` y
   `lib/diff.js` guardan la **línea** de evidencia; no la página ni la coordenada. El lector de
   pliegos ya extrae por coordenadas (`lib/apu_pliego.js`), así que el dato existe y no se está
   propagando. Es la brecha más barata de cerrar y la de mayor efecto en confianza.
2. **Autodiligencia de formatos CCE** (Licitum) — rellenar los formatos con los datos del perfil.
   Es la vieja fila ⬜ «subsanación → tabla de trazabilidad automática» de `CLAUDE.md`.
3. **Biblioteca de contenido ganador / redacción asistida** (AutogenAI, Loopio). El repositorio ya
   guarda la materia prima (`config:experiencia`, el histórico que ninguna purga toca).
4. **Sincronización de fechas oficiales con tareas del equipo** (Licitum). `lib/cronograma.js` ya
   produce el `.ics`; falta el lado de asignación.

Lo que **no** hay que copiar: los paquetes de APU en Excel de PresuCosto y las bases de Construdata
son *contenido*, y el catálogo de Detekta está calibrado contra un contrato **adjudicado** real
(Nogal, 149/157 ítems exactos al peso). Cambiar eso por 1.003 APU genéricos sería cambiar precisión
verificada por volumen.

---

## 3 · Parte 3 — el hallazgo central es incorrecto

Es la parte que el informe declara «la más importante», y es donde más hay que corregir.

### 3.1 Homecenter no es la cadena VTEX que describe el informe

El informe afirma que Homecenter corre sobre VTEX Intelligent Search y que sus endpoints
`/api/catalog_system/pub/products/search/` e `/api/io/_v/api/intelligent-search/product_search/` son
públicos y sin autenticación, con el precio en `items[].sellers[].commertialOffer.Price`. Sobre esa
afirmación construye toda su arquitectura recomendada.

**Contra la evidencia ya registrada en este repositorio, verificada en vivo el 13 y 14-ago-2026**
(`docs/INVESTIGACION_COMPETENCIA_APU.md` §8 y §10, con códigos HTTP anotados):

| | Lo que dice el informe | Lo verificado y ya implementado |
|---|---|---|
| **Homecenter** | VTEX; `/api/catalog_system/pub/...` público | **La API VTEX clásica dio 404.** El canal real es `homecenter.com.co/s/search/v1/soco?q=…&priceGroup=N` (HTTP 200, sin login) — endpoint propio de Sodimac, no de VTEX —, y la página de producto **SSR** con cookies `usrLocation` + `comuna` |
| **Easy** | mencionado de pasada | **Esta sí es VTEX**: `/api/catalog_system/pub/products/search?ft=…` responde 206 con JSON limpio. Es de donde `tests/capturar_retail.js` lee `commertialOffer` |
| **Precio regional** | no lo aborda; habla de seller y sales channel | Homecenter **regionaliza en el servidor**: el mismo saco de cemento va de **$29.200 (Cúcuta) a $37.900 (Ibagué)**, ±13 % sobre Bogotá. Easy **no** regionaliza: precio único nacional (verificado con 9 códigos postales) |

El informe **conflacionó las dos cadenas**. La consecuencia práctica es concreta: su «Etapa 1, paso
2» — el `curl` de un día a `/api/catalog_system/...` de Homecenter — habría devuelto 404, y la
lectura natural de ese 404 («nos bloquearon, pasemos a Apify o a Mercado Libre») es exactamente la
salida equivocada, porque el canal bueno existe, es JSON, es server-side y se controla con **un solo
parámetro** (`priceGroup`).

Vale la pena conservar del informe un matiz que el repositorio no tenía escrito: los precios del
**Círculo de Especialistas** (contratista) están tras login, así que la cifra pública es el precio
estándar. Encaja con la declaración que ya hace el módulo — retail es un **techo negociable** — y la
refuerza.

### 3.2 Lo que ya está construido y el informe propone como trabajo nuevo

- **Retail por capital**: `data/apu_retail.json` (capturado 2026-08-14) + `lib/apu/retail.js` +
  campo `techo_retail` en el desglose de insumos, con fuente, ciudad y fecha pegadas a cada cifra, y
  8 departamentos **sin cobertura declarada con su motivo**. El techo **jamás entra en
  `costoDirecto`** y hay prueba de que no mueve un peso.
- **INVIAS**: el informe recomienda «precargar los APU base de INVIAS 2026-1» como Etapa 2. Ya está:
  `data/apu_invias.json`, **vigencia 2026-1**, capturado el 16-ago-2026 **desde el Excel oficial**
  (`Territorio_APU_2026_1.xlsx`), 23 códigos curados a mano, mediana departamental reproducible.
  Además el repositorio sabe algo que el informe no: **la vigencia 2025-2 de la API está corrupta en
  origen** (acero a $122.000/kg, 37× el mercado), y por eso no se usa la última disponible.
- **Cascada de precios**: `lib/apu/precios.js` ya declara los niveles y sus motivos, y desde ago 2026
  se pinta en pantalla.

### 3.3 Tres recomendaciones que chocan con restricciones duras del proyecto

Son buenas recomendaciones en abstracto y malas aquí. El informe no podía saberlo porque no leyó el
repositorio.

**(a) «Usar SheetJS (`xlsx`) para leer Excel».** El proyecto escribe su propio lector/escritor
(`public/xlsx.js`, `public/xlsx_lectura.js`) por dos hechos verificados: SheetJS **dejó de publicar en
npm tras la 0.18.5**, que es lo que instala `npm install xlsx`, con dos advisories «high» y `npm
audit` respondiendo literalmente «No fix available»; y la edición libre **ignora los estilos de celda
al escribir**, lo que hace inalcanzable un «formato profesional de APU». Adoptar SheetJS sería
cambiar un lector propio y probado por una dependencia abandonada.

**(b) «Matching semántico con BGE-m3 + pgvector / Upstash Vector».** El proyecto **no tiene
`package.json` ni dependencias**, y el matching Excel→insumo ya existe y está medido:
`lib/apu_mapeo.js` + `lib/apu/importar.js`, con tokenización que **conserva los dígitos** (21 MPa,
420 fy, RDE 21 mueven el precio), umbral de «firme» con margen 0,12 y ≥2 términos coincidentes.
Añadir embeddings mete una dependencia, una base vectorial y una llamada externa **en la ruta de una
petición** — el mismo motivo por el que el Nivel C (LLM de desempate) del clasificador se documentó
como no implementado. La regla que el informe propone como salvaguarda («si la similitud es baja,
marcar “sin match confiable” y no inventar precio») **ya es la política vigente**, y más estricta: un
mapeo «revisar» sin precio del archivo **no cobra el precio del catálogo por su cuenta**.

**(c) «Un LLM propone la composición del APU y se valida contra rangos».** Es justo lo prohibido en
este módulo, donde **el falso positivo cuesta más que el falso negativo**: un rendimiento inventado
es plata, no un dato incómodo. La composición del catálogo está calibrada contra un contrato
adjudicado y reproduce su costo directo (149/157 al peso).

### 3.4 Recomendaciones del informe que sí conviene adoptar

1. **TTL de 24 h y fecha visible en cada precio** («Precio Homecenter al …»), con marca de
   «desactualizado» pasados 7 días. Encaja con la trazabilidad que el módulo ya exige y hoy la
   captura es manual y sin caducidad declarada.
2. **QStash / Vercel Cron** para refrescar precios fuera de la ruta de una petición. Es compatible
   con la regla vigente («la app nunca llama a una tienda al servir») y la haría sostenible.
3. **Serie histórica de precios** con `fecha_captura`, `fuente`, `sku`, `seller`: hoy cada captura
   pisa la anterior y no se puede ver una tendencia.
4. **`schema.org/Product` + `Offer`** como vía de extracción cuando exista: más estable que el HTML.

### 3.5 Una corrección de índice que cambia cuál se usa

El informe dice que el DANE reemplazó el **ICCV** por el **ICOCED** el 25-feb-2022. Es cierto — y es
el índice de **edificaciones**. Para obra civil el que aplica es el **ICOCIV** (sucesor del ICCP),
que es el que el repositorio ya usa (`docs/APU_INFORME_COMPLETO.md`). Adoptar el ICOCED para
reajustar un APU de placa huella sería indexar obra civil con el índice de edificaciones. Los dos son
correctos; solo uno es el nuestro.

### 3.6 El aporte medible: PresuCosto corrobora TPNL y MVP

`lib/parametros.js` marca tres parámetros como **«referencia»**, no «verificado», porque el
contraste del 16-ago-2026 contra las fuentes primarias fue explícito: ni el IDU ni el INVIAS publican
TPNL, MVP ni EPP como porcentaje. El informe aporta una fuente secundaria nueva que **sí** los
publica, con las mismas cifras (210 h, 22,5 %, 14,72 %) y con un resultado numérico contrastable:
**valor/hora del ayudante ≈ $18.280** con SMMLV 2026 de $1.750.905.

Ejecutado el motor propio con los parámetros por defecto:

```
lib/costos.costoHora(DEFAULTS, 1.750.905)
  costo_mensual_base   $2.000.000   (salario + auxilio $249.095)
  recargo               44,793 %    (exonerado: E.T. art. 114-1)
  costo_mensual_total  $2.895.860
  factor_tiempo         1,3722      (1 + TPNL + MVP)
  divisor                 210 h
  → costo_hora         $18.922,38
```

- **Con TPNL + MVP: $18.922 frente a $18.280 → +3,51 %.**
- **Sin MVP: $16.893 → −7,59 %.**

Lectura honesta, que es lo que importa aquí:

- Es una **corroboración de sector, no una verificación primaria**. PresuCosto es una fuente
  secundaria comercial y probablemente bebe de las mismas fuentes secundarias que nosotros; que dos
  derivados coincidan no convierte al supuesto en dato. **Los tres parámetros siguen en
  «referencia»**, y subirlos a «verificado» por esto sería el error que `lib/parametros.js` existe
  para evitar.
- El 3,5 % puede además absorber diferencias de supuestos que no conocemos (clase de ARL, si aplican
  exoneración, si incluyen auxilio de transporte). No es un cuadre exacto y no debe presentarse como
  tal.
- **Lo valioso es la tensión que revela**: `lib/parametros.js` ya anota que el costo-hora **sin MVP**
  reproduce el jornal INVIAS 2026-1 al ±1 %, y que con MVP queda ~11 % por encima. Ahora tenemos dos
  referencias sectoriales **tirando en direcciones opuestas** — INVIAS favorece TPNL solo, PresuCosto
  favorece TPNL+MVP —, y el valor por defecto vigente está del lado de PresuCosto. Eso es información
  nueva y real, y no se resuelve por decreto.
- Alcance acotado, ya declarado en el código: TPNL/MVP **solo afectan al ejemplo público de
  costo-hora, no al precio de un ítem** (la mano de obra del catálogo se cotiza por día y está
  calibrada). Así que esto no mueve ningún presupuesto; mueve una cifra de pantalla y la confianza en
  ella.

---

## 4 · Parte 4 — el vidrio ya está; la accesibilidad no

El rediseño Apple ya se hizo (ago 2026) y coincide con casi todo lo que el informe recomienda, a
veces por las mismas razones:

- Paleta sobre custom properties, con `#f5f5f7` / `#000` / `#007AFF` y guardas en la suite contra el
  tema anterior.
- `backdrop-filter: blur(…) saturate(180%)` **solo en tarjetas de nivel superior** — exactamente la
  cautela de rendimiento que el informe recomienda (anidar `backdrop-filter` multiplica capas de
  composición).
- `contain: layout style` ya aplicado en la zona de tablas.
- Vidrio en el cromo (barra, tarjetas, velo de modal) y **no** detrás de las tablas de APU — la misma
  regla que el informe deriva de la guía de Apple.
- Peso 250 del título puesto **literal en `style`**, porque la parada más fina de la utilidad es 200.

### 4.1 La carencia real, y es la que más importa para este usuario

**No existe ninguna regla `prefers-reduced-transparency` ni `prefers-reduced-motion` en
`public/index.html`** (verificado por búsqueda; cero coincidencias). El informe lo señala y tiene
razón, y pesa más de lo que él mismo sugiere por el perfil de usuario ya documentado: contratistas de
mediana edad, en celular, a veces bajo el sol. Es la única recomendación de su Parte 4 con trabajo
pendiente detrás.

Redacción compatible con la paleta y las guardas vigentes:

```css
@media (prefers-reduced-transparency: reduce) {
  .glass, .modal-velo { background: var(--bg-primary); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Al escribirla hay que respetar dos invariantes ya probadas: la regla propia de visibilidad
(`#onboarding.hidden, #app.hidden, #gate.hidden`) **por id**, y que no aparezca una `.hidden{…}`
global (escondería la barra de pestañas de escritorio, y hay prueba que lo prohíbe).

### 4.2 Dos restricciones que el informe no podía conocer

- **El CDN se bloquea en la red del dueño.** Ya costó un defecto real: con `cdn.tailwindcss.com`
  inaccesible, la clase `hidden` no existía y la landing quedaba encima del tablero — fallo **mudo**,
  sin error en consola. Corolario para esta Parte 4: **ninguna librería de Liquid Glass servida por
  CDN** (el informe menciona varias). El patrón CSS + SVG **en línea** es el único viable, que es
  además lo que el informe recomienda para JS vanilla.
- **Prohibición de emojis en la interfaz**, con prueba sobre `index.html`, `app.js` y
  `onboarding.js`: un emoji lo dibuja el sistema operativo, no hereda el color del tema y cambia de
  aspecto en cada aparato. El semáforo usa `●` (U+25CF) más la clase de color.

Sobre `feDisplacementMap`: la advertencia del informe (solo Chromium) es correcta y encaja con el
`@supports (backdrop-filter: url(#id))` que propone. Dado el punto anterior, la refracción real
quedaría como adorno de una o dos superficies y **nunca** como portadora de información.

---

## 5 · Lo que este entorno NO pudo verificar

- **El `curl` en vivo a Homecenter y Easy no se pudo hacer hoy.** El proxy de egreso de esta sesión
  respondió **403 al CONNECT** para `www.homecenter.com.co:443` y `www.easy.com.co:443` — es una
  denegación de política de la organización, **no** un muro anti-bot de las tiendas. No se reintentó
  ni se buscó ruta alterna. Por tanto, lo del §3.1 se apoya en la verificación registrada del 13 y
  14-ago-2026, no en una medición de hoy. **Sigue valiendo la regla de siempre: un 403 anotado es una
  observación con fecha, no una propiedad del entorno.**
- **`robots.txt` de Homecenter**: el informe lo declara no verificado y aquí tampoco se pudo leer hoy.
  Lo registrado el 13-ago-2026 es que los robots.txt de Homecenter/Easy no bloquean búsqueda ni API de
  catálogo; conviene releerlo antes de automatizar.
- **El proveedor de WAF de Homecenter** sigue sin confirmar. La inferencia de Akamai del informe es
  circunstancial y así hay que tratarla.
- **La cifra de PresuCosto ($18.280/hora)** se toma del informe; no se abrió su fuente desde aquí. El
  contraste del §3.6 es válido como orden de magnitud, no como cuadre auditado.

---

## 6 · Qué hacer, en orden

1. **Cerrar la accesibilidad del vidrio** (§4.1). Pequeño, aislado, y es la única recomendación de la
   Parte 4 con trabajo detrás.
2. **Propagar página/coordenada a las citas** del guardián y del vigía (§2.3-1). El lector ya extrae
   por coordenadas: es propagación, no extracción nueva. Es la brecha competitiva real más barata.
3. **Añadir el canal `priceGroup` de Homecenter a la captura retail**, que hoy usa SSR con cookies
   (§3.1). Un JSON con un parámetro es más robusto que raspar la página de producto, y ya está
   verificado que funciona.
4. **Versionar los precios retail con fecha y TTL declarado** (§3.4-1 y 3): hoy cada captura pisa la
   anterior.
5. **Registrar en `docs/metodologia.md` §7 la corroboración de PresuCosto** para TPNL/MVP **sin
   cambiar el estado a «verificado»**, dejando escrita la tensión con INVIAS (§3.6).
6. **Incorporar a `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md`** las seis fichas nuevas de §2.1,
   marcando cuáles de sus funciones ya están cubiertas para que un encargo futuro no vuelva a pedir
   construir lo construido.

**No hacer:** el protocolo de auditoría de la Parte 1 (nada que auditar), la migración a SheetJS, la
base vectorial con embeddings, la composición de APU por LLM, y el `curl` de descubrimiento contra la
API VTEX de Homecenter (que no es la suya).
