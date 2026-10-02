# Fase 0 · Inventario para la base de conocimiento de contratación estatal de obra

> Para: sesión · Estado: informe fechado · Sustituido por: —

Fecha de corte: 2-oct-2026. Árbol: rama `claude/stoic-lamport-slvr9d` sobre `7c4af6f` (main tras #237).
Hecho por la sesión principal, sin agentes, como pide el encargo. Todo lo que dice «medido» salió de
una herramienta en esta sesión (comando en `research/BITACORA.md`); lo que dice «inferencia» no.

---

## 1. Documentos (paso a)

| Documento que pide el encargo | Dónde está | Estado de lectura en esta sesión | Qué aporta a la base | Advertencia |
|---|---|---|---|---|
| **«Los 6 del proyecto»** | **Inferencia**: los 6 documentos de Google de Drive, carpeta «P1_Analisis_Precontractual» (`01_NORMATIVA_Y_DOCTIPO` y `03_PLANTILLAS`), todos del 9-sep-2026 | **Completa** (los 6, con `read_file_content`) | Índice normativo con enlaces, guía de subsanabilidad y rechazo, guía de capacidad residual, guía de desempate, lista de chequeo del pliego, plantilla de informe | Sin fuentes por afirmación. Siete afirmaciones marcadas para la Fase 3 (bitácora, 02:45). Confirmar con el dueño que son estos 6 |
| **PROMPT-MAESTRO v3** | **No encontrado**: ni en el árbol (grep, `git log --all -S`), ni en Drive (búsqueda por título y texto) | No leído | — | Faltante. Lo pide el PC0 |
| **Su Anexo A** | **No encontrado**. El «Anexo A» del árbol es `docs/LEGAL_COLOMBIA.md` (frente jurídico del SaaS) y **no** contiene «AIU» ni «parágrafo» | `LEGAL_COLOMBIA.md`: primeras 30 líneas | — | Los dos errores que cita el encargo no están en ningún `.md` del árbol: no hay qué corregir hasta tener el Anexo A |
| **Análisis de competidores** | `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md` (plataformas del mundo, 4-sep) y `docs/INVESTIGACION_COMPETENCIA_APU.md` (costeo, 13-14-ago) | Parcial: § 1 de la primera; índice de la segunda | Capas «publicar / decidir / costear» y la nota de que PresuCosto ya cruza pliego → APU | Las herramientas gratuitas de CCE (SECOBOT, aplicativo de documentos tipo, consulta del RUP) **no aparecen**: vacío |
| **Investigación de APU** | `docs/APU_INFORME_COMPLETO.md` (10.435 líneas), `docs/APU_Y_RENTABILIDAD.md`, `docs/APU_FUENTES.md`, `docs/INSUMOS_2026.md` | Parcial: índice del primero; § 1 del segundo | § 1.C «Marco normativo del APU» y § 2.D «Imprevistos, desequilibrio económico y reclamaciones» tocan los ejes 5 y 9 | Muchas filas rotuladas «[EXTRACTO DE BUSCADOR]»: no son texto oficial |
| **MEMORIA (pendientes)** | `docs/MEMORIA.md`, 31 marcadores abiertos (impresos por `node tests/estado.js`) | Los 31 enunciados completos; secciones leídas: «CONOCIMIENTO DE DOMINIO…» y la nota de red del 25-sep | Ver § 7 | El destilado de dominio dice «se sortea con el primer decimal de la TRM» y «5–12 % en obra» sin fuente: a la Fase 3 |
| **INVESTIGACION_LICITANTE § 8** | `docs/INVESTIGACION_LICITANTE.md` | Completa la § 8; también §§ 0-6 y 9 | 17 propuestas o cifras que cayeron, con su motivo. **No se vuelven a proponer** | Tres de ellas tocan esta base: días de pago (retirado por el dueño el 2-sep-2026), «lo que cobró el ganador por ítem» y el piso de descuento leído del pliego |

Otros documentos de dominio del árbol que la base debe **citar y reverificar, no reescribir**: el manual
(`docs/GUIA_ANALISTA_LICITACIONES.md`), su complemento (`docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`,
que declara haberse hecho con fuentes secundarias porque los portales oficiales daban 403),
`docs/PROPONENTE_PLURAL.md` (norma leída en fuente el 25-sep-2026), `docs/DON_HECTOR_DICTAMEN_DEL_PLIEGO.md`
y `docs/INVESTIGACION_MERCADO_LICITADOR.md` (351 fuentes, 110 transcripciones, 26-sep-2026).

**Lo que cambió desde esos documentos (medido hoy)**: los portales normativos responden. Colombia
Compra Eficiente da 200 en sus 10 entradas del encargo; el Gestor Normativo de Función Pública da 200
completando la cadena TLS con el intermedio oficial de Sectigo (sin desactivar la verificación);
SUIN-Juriscol pasa el TLS (301); datos.gov.co da 200; una descarga de SECOP II por `RetrieveFile`
dio 200 (un pliego definitivo, probado una vez). El manual y su complemento se escribieron con esos portales cerrados: **su parte normativa
es la que más gana con la reverificación**.

## 2. Código (paso b): qué hace hoy Detekta, con archivo y prueba

Las pruebas se nombran por el rótulo del bloque de la suite (se corren con `E2E_SOLO=«rótulo»`); el
mapeo función → bloque se midió con un barrido de `tests/e2e.js` (bitácora).

| Módulo | Qué hace hoy | Archivos | Bloques de la suite que lo ejercitan | Límite conocido (pendiente de la memoria o defecto declarado) |
|---|---|---|---|---|
| **Ingesta SECOP** | Copia `p6dx-8zbt` a Redis: carga completa del año, delta por `:updated_at` con solape de 48 h, reanudable; prefiltro ancho (modalidad → estado → `admisibleParaIngesta`); proyección activa sin datos de adjudicación e histórica con ellos. Usa además `jbjy-vk9h`, `dmgg-8hin`, `hgi6-6wh3`, `ceth-n4bn`, `wi7w-2nvm` y `9sue-ezhx` | `lib/handlers/procesos/sync.js`, `lib/socrata.js`, `lib/proyeccion.js`, `lib/filtros.js` | «unidad socrata», «unidad ingesta/juicio», «sincronización: el sello va después del hecho», «unidad obra declarada por SECOP», «unidad sincronización tras la republicación masiva» | El delta no detecta el re-sellado masivo y relee el año; 5 de 28 obras de mínima cuantía perdidas por `sin_unspsc_ni_obra` (sin verificar por escépticos) |
| **RUP** | Lee el certificado en PDF (texto del navegador) a un perfil validado; códigos por runs de 8 dígitos; perfiles del dueño y socias en una fuente única; cruce UNSPSC jerárquico (clase/familia/segmento) más equivalencias por *lift* entre adjudicatarios | `lib/rup_pdf.js`, `lib/config_rup.js`, `lib/perfiles.js`, `lib/unspsc.js`, `lib/equivalencias.js`, `lib/cobertura_rup.js` | «unidad perfiles contra el RUP», «unidad UNSPSC (normalización)», «unidad UNSPSC (jerarquía)», «unidad equivalencias», «unidad experiencia/cobertura» | `rup_pdf` no lee los componentes del balance ni el total del segmento 72; no sabe de la versión del clasificador ni de códigos deshabilitados; nada del Decreto 0997 de 2026 |
| **Capacidad residual** | CRP = CO × (E + CT + CF) / 100 − SCE según la Guía CCE-EICP-GI-22 v01; dónde la pide la ley (`requisitos_ley`: obra sí, interventoría y consultoría no, régimen especial y mínima cuantía «no consta»); contratos en ejecución incluidos los de consorcio; capital de trabajo del pliego | `lib/capacidad.js`, `lib/requisitos_ley.js`, `lib/contratos_en_ejecucion.js`, `lib/capital_trabajo.js`, `lib/puertas.js` | «unidad capacidad», «unidad capacidad sin presupuesto», «unidad requisitos por tipo y modalidad», «unidad contratos en consorcio», «unidad capital de trabajo del pliego» | Marcador abierto: capacidad «Cumple» con la lista de contratos vacía (`lib/capacidad.js:106`); CO estimada como utilidad × 16,7; la K de una lista con fechas usa el reloj real; la tabla de meses del capital de trabajo es la de menor cuantía |
| **APU** | Catálogo y cascada de precios con fuente y confianza; cinco bancos oficiales (INVIAS, IDU, EPC, FFIE, ICCU) más tienda; costo directo único; AIU, IVA de la utilidad y cinco puertas de control; lector del formulario de cantidades del pliego | `lib/apu/*.js` (20 módulos), `lib/apu_pliego.js`, `lib/apu_extraer.js`, `lib/apu_mapeo.js`, `lib/parametros.js` | «unidad APU», «unidad catálogo APU», «unidad importación APU», «unidad APU · unidad del pliego», «unidad APU · dinero de la oferta»; más `tests/apu_bench.js` | El banco INVIAS prohíbe uso comercial sin autorización (no pedida); el factor prestacional 1,55 es supuesto declarado |
| **Precio** | Margen, capital expuesto, valor esperado y P(ganar \| precio) con cuatro mecanismos equiprobables en licitación y menor cuantía; mínima cuantía por tabla medida; barrido del precio; índice de baja; con cuánto ofertaron todos | `lib/apu/rentabilidad.js`, `lib/apu/optimizador.js`, `lib/apu/piso_techo.js`, `lib/indice_baja.js`, `lib/ofertas.js`, `lib/ganancia.js` | «unidad índice de baja», «unidad cómo se gana por modalidad», «unidad mínima cuantía con tabla medida», «unidad CON CUÁNTO OFERTARON TODOS», «unidad IVA DE LA UTILIDAD» | Costo fijo de preparar la oferta $5.000.000 sin fuente (`C_PREPARACION_DEFECTO`, hoy `lib/apu/rentabilidad.js:89`; el pendiente del 26-sep dice `:84`); la regla de la TRM descrita es la vieja (decisión (8) pendiente) |
| **Formulario 1** | Ocho validaciones de la oferta económica con su fundamento (total > presupuesto, ítems cambiados, SECOP II ≠ anexo, AIU, baja temeraria, aritmética, redondeo, unitario contra el oficial); llena el formato que publica la entidad | `lib/formulario1.js`, `lib/formato_entidad.js`, `public/justificacion.js` | «unidad revisor de la oferta», «unidad IVA DE LA UTILIDAD», «unidad FORMATOS DE LA ENTIDAD», «unidad cantidad sin dato en el libro que se radica» | Marcador abierto de los defectos del 26-sep (`lib/formulario1.js:400` y `:253`); la sección «La revisión de la oferta suma como la entidad…» indica que se atendieron: **sin reproducir aquí**. Tres familias de formato no se llenan (anticorrupción, Mipyme, consorcio) |
| **Adendas** | Vigía del dataset (cierre, presupuesto, plazo, objeto y modalidad, viejo contra nuevo, reevaluando las puertas del perfil) y vigía del texto del pliego (versiones, diff por párrafo, habilitantes numéricos) | `lib/adendas.js`, `lib/diff.js`, `lib/cronograma.js` | «unidad DICTAMEN DEL PLIEGO», «unidad prórrogas publicadas», «unidad historia de un proceso» | El vigía del texto solo corre cuando alguien abre el pliego; la fecha del pliego se muestra aunque una adenda leída la mueva (N15) |
| *Además, del pliego* | Dictamen citado por página (modelo + verificación) y dictamen por reglas; documentos del proceso desde `dmgg-8hin`; deducciones; garantía de seriedad | `lib/dictamen.js`, `lib/dictamen_reglas.js`, `lib/documentos_proceso.js`, `lib/deducciones.js`, `lib/garantia_seriedad.js` | «unidad DICTAMEN DEL PLIEGO», «unidad garantía de seriedad y capital del dictamen», «unidad EXPEDIENTE DE UN PROCESO» | OCR sin configurar en producción; deducciones sin pantalla que las llame |

## 3. Restricciones vigentes, leídas del árbol (paso c)

| Restricción | Dónde está escrita |
|---|---|
| Sin build, sin `package.json`, cero dependencias (`fetch`, `zlib`, `crypto` nativos); CommonJS | `CLAUDE.md`, «Stack» |
| Vercel serverless + Upstash Redis por REST + una sola página estática en `public/` | `CLAUDE.md`, «Stack» |
| Seis routers en `api/`; un endpoint nuevo se pliega como `op`, nunca como archivo (la suite fija el conteo en 6) | `CLAUDE.md`; guardas en `tests/e2e.js` que imprime `node tests/estado.js` |
| El costo se calcula determinista y auditable: «*Calcular* con LLM sigue siendo NO»; *leer* el pliego con modelo es decisión abierta, fuera de la ruta de la petición y como sugerencia | `docs/MEMORIA.md` § «Auditoría del módulo APU: las dos mitades no están conectadas (24-ago-2026)» |
| El PDF se lee en el navegador; al servidor solo llega texto (tope del cuerpo 4,5 MB) | cabeceras de `lib/apu_pliego.js` y `lib/rup_pdf.js` |
| Una sola rama permanente, `main`; el trabajo entra por pull request con fusión automática cuando pasa el check «Suite» | `docs/PROMPT_INICIAL.md` § «10. Reglas de respuesta (obligatorias)» |
| Compuerta: `node tests/e2e.js` 4/4 antes de commitear (1/1 si el commit solo cambia `.md`); GitHub repite en `.github/workflows/suite.yml` | `CLAUDE.md` |
| Todo `.md` de `docs/` (y un nivel de subcarpeta) lleva la ficha «> Para: … · Estado: … · Sustituido por: …» en sus 12 primeras líneas; `docs/INDICE.md` se regenera con `node tests/mapa.js --escribir` | `tests/e2e.js`, censo de documentos |
| Toda ruta `docs/…` citada en `docs/`, `lib/`, `api/`, `public/`, `tests/` tiene que existir; un documento se cita por título de sección, nunca por línea | `tests/e2e.js`; `docs/PROMPT_INICIAL.md` § 10 |
| Lo que decide plata lleva plan y visto bueno del dueño antes de tocar código | `CLAUDE.md`, «Cómo trabaja una sesión aquí» |
| Pantalla: usted, sin jerga ni emoji; la marca sale de `MARCA.nombre` | `CLAUDE.md`, «Filosofía de producto» |

`research/` no lo censa la suite hoy: el validador de la Fase 3 es el que lo pone bajo cerradura.

## 4. Taxonomía común para todos los agentes (paso d)

Vocabularios cerrados. Un valor fuera de la lista lo rechaza el validador de la Fase 3.

```json
{
  "etapa": {
    "E0": "Planeación de la entidad (PAA, estudios previos, análisis del sector, presupuesto, matriz de riesgos)",
    "E1": "Aviso y proyecto de pliego (observaciones, manifestación de interés)",
    "E2": "Pliego definitivo y adendas",
    "E3": "Preparación de la oferta (habilitantes, experiencia, precio, garantía)",
    "E4": "Cierre y presentación en SECOP II",
    "E5": "Evaluación (informe, traslado, subsanación, rechazo, precio artificialmente bajo)",
    "E6": "Adjudicación, desierta y recursos",
    "E7": "Firma y legalización (garantías, anticipo, acta de inicio)",
    "E8": "Ejecución (cantidades, ítems no previstos, adiciones, prórrogas, suspensiones, reajustes, pagos, multas)",
    "E9": "Terminación y liquidación",
    "E10": "Después de la liquidación (estabilidad de la obra, sanciones, experiencia para el RUP)",
    "T": "Transversal (marco normativo, plataforma, datos)"
  },
  "decision": {
    "D1": "¿Me presento? (incluye ¿con quién?)",
    "D2": "¿A qué precio?",
    "D3": "¿Qué me hace rechazar o no habilitar?",
    "D4": "¿Qué riesgo trae la ejecución?"
  },
  "modulo": {
    "M-INGESTA": "lib/handlers/procesos/sync.js, lib/socrata.js, lib/proyeccion.js, lib/filtros.js",
    "M-LISTA": "lib/handlers/procesos/listar.js, lib/puertas.js, lib/probabilidad.js, lib/indice_competencia.js",
    "M-RUP": "lib/rup_pdf.js, lib/config_rup.js, lib/perfiles.js, lib/unspsc.js, lib/equivalencias.js",
    "M-CAPACIDAD": "lib/capacidad.js, lib/requisitos_ley.js, lib/contratos_en_ejecucion.js, lib/capital_trabajo.js",
    "M-PLURAL": "lib/consorcio.js, lib/reparto.js, lib/participacion.js, lib/socio.js, lib/socio_por_proceso.js",
    "M-PLIEGO": "lib/documentos_proceso.js, lib/dictamen.js, lib/dictamen_reglas.js, lib/guia_proceso.js, lib/deducciones.js, lib/garantia_seriedad.js, lib/cronograma.js, lib/manifestacion.js",
    "M-ADENDAS": "lib/adendas.js, lib/diff.js",
    "M-APU": "lib/apu/*.js, lib/apu_pliego.js, lib/apu_extraer.js, lib/apu_mapeo.js, lib/parametros.js",
    "M-PRECIO": "lib/apu/rentabilidad.js, lib/apu/optimizador.js, lib/apu/piso_techo.js, lib/indice_baja.js, lib/ofertas.js, lib/ganancia.js",
    "M-OFERTA": "lib/formulario1.js, lib/formato_entidad.js, public/justificacion.js",
    "M-SEGUIMIENTO": "lib/seguimiento.js, lib/handlers/perfil/avisos.js, public/casillero.js, public/expediente.js",
    "M-ENTIDAD": "lib/ejecucion.js, lib/competencia_detalle.js, lib/proponentes.js, lib/paa.js",
    "M-NINGUNO": "conocimiento sin módulo hoy"
  },
  "tipo_fuente": ["ley", "decreto", "resolucion", "documento_tipo", "guia_cce", "circular_cce", "concepto_cce", "jurisprudencia", "organo_control", "multilateral", "gremio_ong", "academia", "dato_secop", "documento_proceso", "manual_entidad", "video_transcripcion", "herramienta_oficial"],
  "nivel_autoridad": {
    "A1": "Ley",
    "A2": "Decreto",
    "A3": "Documento tipo, circular o guía de CCE",
    "A4": "Jurisprudencia (marcar unificacion: true/false)",
    "A5": "Concepto de CCE (no vinculante)",
    "A6": "Academia, órgano de control, multilateral",
    "A7": "Práctica (gremio, video de practicante, documento de un proceso, dato de SECOP)"
  },
  "naturaleza": {
    "normativa": "qué dice la regla (la jerarquía A1-A7 decide)",
    "empirica": "cuánto pasa o cuánto cuesta (decide el método: dato medido > informe con método > academia > practicante)",
    "practica": "cómo se hace (evidencia de un problema, no autoridad)"
  },
  "estado_lectura": ["completa", "parcial", "solo_resumen", "no_leida"]
}
```

## 5. Esquema de ficha (borrador; se ajusta en el PC1)

Una ficha JSON por fuente en `research/fichas/F-####.json`. Campos obligatorios (los del encargo)
más los que exige el criterio de terminado para las reglas:

```json
{
  "id": "F-0001",
  "tipo": "decreto",
  "autor": "Presidencia de la República",
  "titulo": "…",
  "anio": 2026,
  "institucion": "…",
  "url": "…",
  "fecha_consulta": "2026-10-02",
  "estado_lectura": "completa | parcial (qué partes) | …",
  "localizador": "art. 2.2.1.1.1.5.3 · pág. 4 · min 12:30",
  "cita": "texto literal breve",
  "afirmacion": "lo que la cita sostiene, en una frase",
  "eje": 4,
  "etapa": ["E3"],
  "decision": ["D3"],
  "modulo": ["M-RUP"],
  "naturaleza": "normativa",
  "nivel_autoridad": "A2",
  "unificacion": null,
  "vigencia_verificada": { "fecha": "2026-10-02", "fuente": "URL del texto consolidado", "vigente": true },
  "regla": { "regimen": "Estatuto General | régimen especial | ambos", "desde_aviso": "AAAA-MM-DD | null", "documento_tipo": "nombre y versión | null" }
}
```

`regla` solo es obligatorio cuando `naturaleza` es `normativa`. Un dato que no se pudo verificar va
`null` con su motivo en un campo `motivo_null`, nunca rellenado.

## 6. Matriz tema → cobertura (salida de la Fase 0)

**Cómo se midió.** Un barrido por expresión regular de cada tema en `docs/` (sin `archivo/` ni
`reforma_datos/`), en `docs/MEMORIA.md` y en `lib/` + `public/` (conteos en la bitácora, guion en el
espacio de trabajo de la sesión). Un conteo alto no prueba profundidad: la clasificación final la hizo
la sesión leyendo las cabeceras y secciones citadas. Criterio:

- **Conocimiento** — *cubierto*: hay un documento del árbol que lo leyó en fuente primaria, con fecha;
  *a medias*: existe pero de fuente secundaria, de buscador, sin fecha de vigencia o anterior a una
  reforma que lo toca; *vacío*: cero menciones o solo de paso.
- **Producto** — *cubierto*: módulo y bloque de la suite que lo ejercita; *a medias*: existe con un
  defecto reproducido o un pendiente abierto; *vacío*: nada; *n. a.*: no es tarea de Detekta.

| Eje | Tema | Conocimiento | Producto | Módulo |
|---|---|---|---|---|
| 1 | Decreto 0997 de 2026 (RUP, anticorrupción, listas internacionales, compra sostenible, transición) | **vacío** (0 menciones) | **vacío** | M-RUP, M-OFERTA, M-PLIEGO |
| 1 | Decreto 287 de 2026 (preferencias por discapacidad) | a medias (2 menciones de paso) | vacío | M-PLIEGO |
| 1 | Versiones vigentes de los documentos tipo y desde qué aviso rigen | a medias (complemento V-01, de fuente secundaria) | a medias (la tabla de meses del capital de trabajo no distingue familia de pliego) | M-PLIEGO, M-CAPACIDAD |
| 1 | Circulares de CCE 2025-2026 | vacío | n. a. | M-NINGUNO |
| 1 | Reforma de la Ley 80 en trámite (no vigente) | a medias (complemento V-17; índice de Drive) | n. a. | M-NINGUNO |
| 1 | Régimen especial que toca la obra | a medias | a medias (`requisitos_ley` devuelve «no consta») | M-CAPACIDAD, M-PLIEGO |
| 1 | Ley de garantías | a medias (complemento V-02, secundaria) | a medias (calendario político del dictamen) | M-PLIEGO |
| 2 | Estudios previos y análisis del sector | a medias | a medias (se leen del proceso; los escaneados no, sin OCR) | M-PLIEGO |
| 2 | Presupuesto oficial: cómo se forma | a medias | cubierto como dato («no publicado ≠ $0») | M-APU, M-ADENDAS |
| 2 | Matriz de riesgos (tipificación, asignación) | a medias (complemento V-11, secundaria) | **vacío** (no se lee) | M-PLIEGO |
| 2 | Plan Anual de Adquisiciones | a medias | cubierto (`paa.js`, `paa_acierto.js`) | M-ENTIDAD |
| 3 | Modalidades y lo que implica cada una | a medias | cubierto («unidad cómo se gana por modalidad», «unidad requisitos por tipo y modalidad») | M-LISTA, M-PLIEGO |
| 3 | Requisitos habilitantes | a medias | a medias (indicadores «No cumple» contra referencia fija, `lib/guia_proceso.js:97`) | M-PLIEGO |
| 3 | Factores de puntaje (calidad, industria nacional, discapacidad, Mipyme) | a medias | **vacío** (no se calcula el puntaje) | M-PLIEGO |
| 3 | Subsanación (qué y hasta cuándo, por modalidad) | a medias (manual cap. 13; guía de Drive sin fuente) | a medias (insubsanable marcado en `formulario1`) | M-OFERTA |
| 3 | Causales de rechazo | a medias | a medias | M-OFERTA, M-PLIEGO |
| 3 | Desempate (art. 35 de la Ley 2069 de 2020 y su reforma) | a medias | **vacío** | M-PLIEGO |
| 3 | Convocatoria limitada a Mipyme | a medias (N25) | a medias (solo por monto) | M-PLURAL |
| 3 | Manifestación de interés | a medias | cubierto («unidad manifestación calibrada») | M-PLIEGO |
| 3 | Observaciones al pliego y respuestas | a medias | a medias (hitos del cronograma) | M-PLIEGO |
| 3 | Adendas (plazos, límites) | a medias (art. 89 de la Ley 1474 «no consultada» en DON_HECTOR) | cubierto (dos vigías) | M-ADENDAS |
| 4 | RUP: inscripción, renovación, firmeza, plena prueba | a medias | a medias (deudas de `rup_pdf`) | M-RUP |
| 4 | Cambios del RUP en 2026 (Decreto 0997) | **vacío** | **vacío** | M-RUP |
| 4 | Experiencia: cómo se acredita, en SMMLV, por número de contratos | cubierto (`PROPONENTE_PLURAL.md` § 4, leído en fuente el 25-sep) | a medias (dictamen compara un solo contrato, `lib/dictamen.js:523`) | M-PLIEGO, M-RUP |
| 4 | Capacidad residual | cubierto (Guía CCE-EICP-GI-22 v01 leída el 25-sep) **sin revisar contra 2026** | a medias (§ 2) | M-CAPACIDAD |
| 4 | Proponente plural: indicadores, participación, experiencia | cubierto (241 pliegos, 25-sep) | a medias (pendientes de consorcio) | M-PLURAL |
| 4 | Clasificador UNSPSC: versión vigente en SECOP II y en el RUP, códigos deshabilitados, equivalencias | **vacío** (la versión no aparece) | a medias (cruce jerárquico y *lift*; sin versión) | M-RUP |
| 4 | Indicadores financieros y capital de trabajo | a medias (complemento V-10) | a medias | M-CAPACIDAD, M-PLURAL |
| 5 | Adiciones (tope y forma) | a medias | **vacío** | M-NINGUNO |
| 5 | Mayores cantidades frente a adición | a medias (complemento V-03, secundaria) | **vacío** | M-NINGUNO |
| 5 | Ítems no previstos | a medias (escaso) | **vacío** | M-APU |
| 5 | Reajustes y fórmula de ajuste | a medias (complemento V-04) | a medias (el ICOCIV actualiza el catálogo, no el contrato) | M-APU |
| 5 | Anticipo y pago anticipado | a medias (complemento V-08 corrige al manual) | a medias (sí/no sin porcentaje) | M-PLIEGO, M-CAPACIDAD |
| 5 | Desequilibrio económico | a medias (complemento V-06; APU_INFORME § 2.D) | **vacío** | M-NINGUNO |
| 5 | Suspensiones | vacío (4 menciones) | a medias (conteo por entidad en `ejecucion.js`) | M-ENTIDAD |
| 5 | Multas, cláusula penal, caducidad, incumplimiento reiterado | a medias (complemento V-07) | a medias (multas del socio) | M-PLURAL |
| 5 | Garantías de cumplimiento y estabilidad | vacío (7 menciones de paso) | **vacío** (solo la de seriedad) | M-PLIEGO |
| 5 | Liquidación (plazos, salvedades) | a medias (complemento V-05 corrige al manual) | **vacío** | M-NINGUNO |
| 5 | Interventoría como contraparte del contratista | a medias (complemento V-16) | n. a. (salvo el filtro: no se le pide K) | M-CAPACIDAD |
| 6 | Pliego sastre | a medias (12 señales de oficio, sin fuente) | a medias (concentración del ganador) | M-ENTIDAD |
| 6 | Proponente único | a medias | a medias (aviso con promedio menor de 2) | M-LISTA |
| 6 | Colusión (SIC) | a medias | **vacío** | M-NINGUNO |
| 6 | Obras inconclusas | vacío | **vacío** | M-ENTIDAD |
| 6 | Pagos tardíos | a medias | **vacío por decisión del dueño** (retirado el 2-sep-2026; no se reabre sin él) | M-ENTIDAD |
| 7 | Datos abiertos de SECOP y cuán diligenciado viene cada campo | cubierto (`docs/datos.md`, no abierto aquí; consultas del 26-sep-2026 en `INVESTIGACION_MERCADO_LICITADOR.md` § 9) | cubierto (siete conjuntos en uso) | M-INGESTA |
| 7 | Cambios de la plataforma (release de aplicaciones) | **vacío** | **vacío** | M-INGESTA |
| 7 | Señales de alerta (OCDE, Banco Mundial, Transparencia) | vacío | a medias | M-ENTIDAD |
| 7 | Herramientas gratuitas de CCE como competencia (SECOBOT, aplicativo de documentos tipo, consulta del RUP, visualizaciones) | **vacío** | n. a. | M-NINGUNO |
| 8 | La oferta paso a paso en SECOP II, con tiempo y error típico | a medias («9 errores que descalifican», sin fuente) | a medias (orden del paso a paso de la guía) | M-SEGUIMIENTO, M-PLIEGO |
| 8 | Garantía de seriedad | a medias | a medias (lee el porcentaje del pliego) | M-PLIEGO |
| 8 | La cuenta del proponente plural en SECOP II | a medias (N23) | **vacío** | M-PLURAL |
| 8 | Tiempo por paso | **vacío** (ninguna fuente mide horas: `INVESTIGACION_MERCADO_LICITADOR.md` § 0) | n. a. | M-NINGUNO |
| 9 | AIU: composición, discriminación, IVA de la utilidad | a medias (bandas del manual cap. 11) | cubierto («unidad IVA DE LA UTILIDAD», validación 4) | M-APU, M-OFERTA |
| 9 | Listas de precios oficiales | cubierto (verificadas en vivo en ago-2026, `INVESTIGACION_COMPETENCIA_APU.md` §§ 4 y 11) | cubierto (cinco bancos), con la licencia del INVIAS pendiente | M-APU |
| 9 | Corrección aritmética | **vacío** (1 mención) | a medias (validación 6, informativa; su cita a la Ley 1882 está sin verificar) | M-OFERTA |
| 9 | Precio artificialmente bajo | a medias (art. 2.2.1.1.2.2.4 citado 29 veces; no se comprobó si algún documento lo leyó en fuente) | a medias (validación 5, piso y techo) | M-OFERTA, M-PRECIO |
| 9 | Método aleatorio de evaluación económica | a medias (premisa del encargo verificada hoy: Ley 1882, art. 1, parágrafo 3; la regla de la TRM del árbol es la vieja) | a medias (cuatro mecanismos equiprobables, supuesto declarado) | M-PRECIO |
| 9 | Precio de ítems no previstos | **vacío** | **vacío** | M-APU |

**Lectura de la matriz** (contada con código sobre la tabla de arriba, no a mano). De 58 temas:
conocimiento cubierto 5, a medias 40, vacío 13; producto cubierto 8, a medias 27, vacío 18, n. a. 5.
Los vacíos dobles —ni la base ni el producto tienen nada— son seis: el Decreto 0997 de 2026, los
cambios del RUP en 2026, las garantías de cumplimiento y estabilidad, las obras inconclusas, los
cambios de la plataforma y el precio de los ítems no previstos.

## 7. Pendientes de la memoria que cruzan este encargo

De los 31 abiertos, estos tocan un eje de la base (el texto completo, en `node tests/estado.js`):

- Los defectos que deciden dinero reproducidos el 26-sep-2026 (`lib/formulario1.js`, `lib/dictamen.js`,
  `lib/capacidad.js`, `lib/guia_proceso.js`, `lib/deducciones.js`, `lib/apu/rentabilidad.js`) → ejes 3, 4 y 9.
- Las decisiones (5), (7) y (8) de `docs/INVESTIGACION_LICITANTE.md § «6. Hoja de ruta unificada»`
  (indicadores del consorcio, revisor de la oferta, la regla vieja de la TRM) → ejes 4 y 9.
- La tabla de meses del capital de trabajo por familia de pliego → ejes 3 y 4.
- Los contratos ganados en consorcio que `lib/socio.js` y el seguimiento no ven → ejes 4 y 7.
- Los formatos que no se llenan (anticorrupción, Mipyme, consorcio) → ejes 1 (Decreto 0997) y 8.
- Las deudas de `lib/rup_pdf.js` → eje 4 (y el Decreto 0997, que toca el RUP).
- La autorización de uso comercial del INVIAS → eje 9.
- El OCR sin configurar → ejes 2 y 7 (estudios previos escaneados).
- El tramo de oferentes sin separar por modalidad → ejes 3 y 6.

## 8. Faltantes y bloqueos

1. **PROMPT-MAESTRO v3 y su Anexo A**: no están en el árbol ni en Drive. Sin ellos, la
   corrección de sus dos errores «en el repo» no tiene objeto: en el repo no están.
2. **Confirmar «los 6 del proyecto»** (inferencia: los 6 de Drive).
3. **scielo.org.co** reinicia la conexión desde este entorno (sin resolver; Redalyc y Dialnet sin probar).
4. **SECOP II en la web** (fichas de proceso) da 403; los documentos sí se bajan. La muestra se arma
   desde `dmgg-8hin` y `p6dx-8zbt`.
5. **YouTube** dio 200 en la portada; el bloqueo de transcripciones del 26-sep-2026 (HTTP 429) es una
   observación con fecha: se vuelve a probar en el piloto.

## 9. Lo que decidió la sesión en la Fase 0 (también en la bitácora)

- Taxonomía con «¿con quién me presento?» dentro de D1, y no como quinta decisión: el encargo fija cuatro.
- Se agrega el campo `naturaleza` (normativa / empírica / práctica) porque la jerarquía de autoridad del
  encargo ordena normas, no frecuencias: para «cuánto pasa» manda el método, no el rango.
- La base **cita** los documentos de dominio del árbol y reverifica su parte normativa; no los reescribe
  (regla «No reescribir una regla que ya existe: llamarla»).
- Los problemas del catálogo llevan, cuando existe, su equivalente N-xx de `docs/INVESTIGACION_LICITANTE.md`.
- El inventario y la bitácora viven en `research/`, que la suite no censa; los archivos por eje irán en
  `docs/contratacion/` (sí censado: llevarán su ficha de cabecera).
