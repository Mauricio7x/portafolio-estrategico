# Inventario de la Fase 0 · documentos, código y restricciones (2-oct-2026)

> Para: dueño · Estado: informe fechado · Sustituido por: —

Regla de este inventario: lo que no se abrió no existe. Cada fila dice qué se leyó (completo o qué
partes) y con qué herramienta se midió. Las coordenadas de código salen de `node tests/mapa.js`; el
estado, de `node tests/estado.js`; los bloques de prueba, de `node tests/e2e.js --indice`.

## 1. Documentos pedidos por el encargo

| Documento | Dónde está | Estado de lectura | Qué aporta a la base |
|---|---|---|---|
| «Los 6 del proyecto» | **No identificados.** No hay en el árbol ni en Google Drive (búsqueda por título y por texto completo) un conjunto que se llame así; si son los archivos de conocimiento del proyecto de claude.ai, esta sesión no los ve | no abiertos | — (pregunta en el PC0) |
| «PROMPT-MAESTRO v3» (el nombre del archivo lleva la grafía antigua de la marca) y su Anexo A | **No están en el árbol** (`grep` sobre .md/.js/.json) **ni en Drive**. El árbol los menciona de refilón: `docs/datos.md` habla de «la tercera premisa falsa del prompt maestro» y el README del «plan maestro v4». El único «Anexo A» del árbol es `docs/LEGAL_COLOMBIA.md` (frente jurídico de la consultoría SaaS, 24-ago-2026) y no trae las dos frases erradas | no abiertos | Los dos errores que el encargo atribuye al Anexo A **no aparecen en el árbol**: ninguna línea atribuye el AIU a la Ley 80 ni ubica la subsanación en un «parágrafo 1 del art. 30» (`grep` en docs, lib y public). `docs/APU_INFORME_COMPLETO.md § 1.C` dice lo contrario: «la Ley 80 no menciona el APU». No hay nada que corregir en el repositorio hasta que el Anexo A llegue |
| Análisis de competidores | `docs/INVESTIGACION_COMPETENCIA_APU.md` (APU, 13-ago-2026), `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md`, `docs/INVESTIGACION_MERCADO_LICITADOR.md` § 3 | parcial: índices y § 3-5, 8 del de mercado | Competidores de costeo (Construdata, SINCO, Presto…) y de licitación (LicitarUS); herramientas gratuitas de CCE aún no tratadas como competencia |
| Investigación de APU | `docs/APU_Y_RENTABILIDAD.md`, `docs/APU_INFORME_COMPLETO.md`, `docs/APU_FUENTES.md`, `docs/INSUMOS_2026.md` | parcial: índices; `APU_INFORME_COMPLETO` § 1.C completo | § 1.C es el único marco normativo del APU del árbol: 10 normas, todas marcadas [SECUNDARIA] por el propio informe (403 de su fecha) |
| MEMORIA · pendientes abiertos | `docs/MEMORIA.md`, impresos por `node tests/estado.js` | completo (los 31 marcadores) | 31 pendientes; los que tocan la base se cruzan en `research/MATRIZ_FASE0.md` |
| `INVESTIGACION_LICITANTE` § 8 (qué se descartó y por qué) | `docs/INVESTIGACION_LICITANTE.md` | completo (§ 4, 6, 8) | 18 propuestas caídas con su motivo: no se vuelven a proponer sin dato nuevo |
| Manual del analista + complemento | `docs/GUIA_ANALISTA_LICITACIONES.md` (21 capítulos), `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` (V-01…V-17) | parcial: índices; del complemento, «Lo que NO se encontró», «Temas pendientes» (P-01…P-12) y «Los 5 hallazgos» completos | Es la base de dominio actual: escrita en ago-2026 con 403 a los portales oficiales, así que **sus citas normativas están sin verificar en texto oficial** |
| Proponente plural · Don Héctor · Legal | `docs/PROPONENTE_PLURAL.md`, `docs/DON_HECTOR_DICTAMEN_DEL_PLIEGO.md`, `docs/LEGAL_COLOMBIA.md` | parcial: índices y cabeceras | Plural (fórmulas, % mínimo, experiencia) ya investigado con internet el 25-sep-2026 |

## 2. Qué hace hoy Detekta, por módulo (con el archivo y la prueba)

Lectura: cabecera de cada módulo (`sed -n '1,22p'`), `lib/requisitos_ley.js` completo, mapa de cada
término. Las pruebas se nombran por su rótulo de `E2E_SOLO`; en esta fase se corrió la suite entera una
vuelta (ver § 5), no cada bloque aparte.

| Módulo | Qué hace hoy | Archivos | Prueba que lo demuestra |
|---|---|---|---|
| Ingesta SECOP | Baja el año vigente de `p6dx-8zbt` por Socrata (paginación por `:id`, reanudable, full + delta) y guarda «ancho»: modalidad competitiva, sin convenios, sin lista negra, con código de obra/servicios u objeto de obra. El juicio fino se hace al servir. Histórico de 2 años con 3 derivados | `lib/handlers/procesos/sync.js`, `lib/socrata.js`, `lib/filtros.js`, `lib/proyeccion.js`, `lib/handlers/procesos/historico.js` | `unidad socrata`, `unidad modalidades`, `unidad anti-suministro`, `unidad pertinencia`, `iteraciones` (sincronización, censo de ingesta), `unidad sincronización tras la republicación masiva`, `unidad obra declarada por SECOP` |
| RUP | Valida el RUP del perfil contra cada proceso: códigos UNSPSC con matching jerárquico, equivalencias aprendidas del histórico, cobertura (qué códigos faltan), RUP por archivo JSON o por PDF del certificado | `lib/rup.js`, `lib/unspsc.js`, `lib/equivalencias.js`, `lib/cobertura_rup.js`, `lib/config_rup.js`, `lib/rup_pdf.js` | `unidad perfiles contra el RUP`, `unidad UNSPSC (normalización)`, `unidad UNSPSC (jerarquía)`, `unidad equivalencias`, `unidad experiencia/cobertura` |
| Capacidad residual | Fórmula única de la K (Guía CCE-EICP-GI-22) con contratos en ejecución del perfil y de sus consorcios (datasets jbjy-vk9h y ceth-n4bn); se exige solo en obra (`requisitos_ley`); capital de trabajo exigido por el pliego | `lib/capacidad.js`, `lib/contratos_en_ejecucion.js`, `lib/requisitos_ley.js`, `lib/puertas.js`, `lib/capital_trabajo.js` | `unidad capacidad`, `unidad capacidad sin presupuesto`, `unidad requisitos por tipo y modalidad`, `unidad contratos en consorcio`, `unidad capital de trabajo del pliego` |
| APU | Catálogo de 174 ítems y 437 insumos por región, 5 bancos oficiales (INVIAS, IDU, EPC, FFIE, ICCU), lector de pliegos (ítem, unidad, cantidad), factores con su norma (prestacional, AIU, IVA sobre utilidad), parámetros versionados, APU por sesión de Claude Code | `lib/apu/*`, `lib/apu_extraer.js`, `lib/apu_pliego.js`, `lib/parametros.js`, `lib/apu/normativa.js` | `unidad APU`, `unidad catálogo APU`, `unidad importación APU`, `unidad APU · unidad del pliego`, `unidad APU · dinero de la oferta`, `node tests/apu_bench.js` |
| Precio | Precio que maximiza la ganancia esperada (optimizador), margen y caja (rentabilidad), baja ganadora por entidad y tipo (índice de baja), P(ganar) con desglose, descuentos leídos del pliego (sin pantalla que los llame) | `lib/apu/optimizador.js`, `lib/apu/rentabilidad.js`, `lib/indice_baja.js`, `lib/probabilidad.js`, `lib/ganancia.js`, `lib/deducciones.js` | `unidad índice de baja`, `unidad índice de baja por partes`, `probabilidad A2-A6` (en `iteraciones`), `unidad mínima cuantía con tabla medida`, `unidad cómo se gana por modalidad`, `unidad IVA DE LA UTILIDAD` |
| Formulario 1 | Revisa la oferta contra el Formulario 1 del pliego (8 validaciones), llena el formato Word de la entidad con lo inequívoco, libro Excel que se radica | `lib/formulario1.js`, `lib/formato_entidad.js`, `public/apu_libro.js` | `unidad revisor de la oferta`, `unidad FORMATOS DE LA ENTIDAD`, `unidad cantidad sin dato en el libro que se radica` |
| Adendas | Dos vigías: lo que el dataset dice que cambió (cierre, presupuesto, plazo, objeto, modalidad; reevalúa las puertas) y el texto del pliego (versiones, diff por párrafo, habilitantes numéricos); cronograma con avisos; documentos del proceso leídos solos (índice dmgg-8hin, la adenda más reciente manda) | `lib/adendas.js`, `lib/diff.js`, `lib/cronograma.js`, `lib/documentos_proceso.js` | «Vigía de adendas (Fase 5)» y «documentos del proceso» (en `iteraciones`), `unidad historia de un proceso`, `unidad EXPEDIENTE DE UN PROCESO`, `unidad prórrogas publicadas` |
| Dictamen y guía | Dictamen del pliego por reglas (sin modelo) o por sesión de Claude Code, con citas verificadas en su página; guía paso a paso del proceso guardado; garantía de seriedad y tabla de experiencia leídas del pliego | `lib/dictamen.js`, `lib/dictamen_reglas.js`, `lib/guia_proceso.js`, `lib/garantia_seriedad.js`, `lib/tabla_experiencia.js` | `unidad DICTAMEN DEL PLIEGO`, `unidad garantía de seriedad y capital del dictamen`, `unidad guía · orden del paso a paso` |
| Consorcio y socio | Reparto recomendado, fórmulas del plural, frontera del reparto, due diligence del socio | `lib/consorcio.js`, `lib/reparto.js`, `lib/participacion.js`, `lib/socio.js`, `lib/socio_por_proceso.js` | `unidad reparto recomendado`, `unidad participación`, `unidad socio por proceso`, `unidad indicadores del consorcio con la fórmula del pliego` |
| Inteligencia | Quién se presenta (hgi6-6wh3), con cuánto ofertaron todos (wi7w-2nvm), cómo ejecuta la entidad (jbjy-vk9h), concentración del ganador, PAA | `lib/proponentes.js`, `lib/ofertas.js`, `lib/ejecucion.js`, `lib/competencia_detalle.js`, `lib/paa.js` | `unidad índice de competencia`, `unidad detalle de competencia`, `unidad ganadores publicados`, `unidad CON CUÁNTO OFERTARON TODOS` |

## 3. Restricciones vigentes del repositorio (leídas del árbol, no del encargo)

| Restricción | Dónde está escrita o medida |
|---|---|
| Sin build, sin `package.json`, cero dependencias; Node 22 en Vercel; `fetch`/`zlib`/`crypto` nativos | `README.md § Cómo se ejecuta…`, `CLAUDE.md` |
| Exactamente 6 archivos en `api/`; un endpoint nuevo es una `op`, nunca un archivo | tres aserciones en `tests/e2e.js` (las imprime `node tests/estado.js`) |
| Vercel serverless con `maxDuration` 300 s (procesos, admin, pliego) y 60 s (apu, perfil, inteligencia); Upstash Redis por REST; 8 crons | `vercel.json` |
| El cálculo que decide (costo, K, baja) es determinista y auditable; el modelo no multiplica ni suma | `docs/AUDITORIA_MODULO_APU.md`, `docs/APU_INFORME_COMPLETO.md`, `lib/dictamen_reglas.js` (dictamen sin modelo) |
| Una sola rama permanente `main`; el trabajo entra por pull request desde la rama del arnés, con fusión automática para lo que el dueño encargó en conversación | `docs/PROMPT_INICIAL.md § 10 · Rama` |
| Compuerta: `node tests/e2e.js` en 4/4 antes de commitear (1 vuelta si solo cambian `.md`), código de salida sin tuberías; `apu_bench` si se toca el lector; navegador real si se toca `public/`; GitHub repite el 4/4 en cada pull request | `CLAUDE.md`, `.github/workflows/suite.yml` |
| Todo `.md`/`.txt` bajo `docs/` (y un nivel abajo) lleva la ficha «> Para: … · Estado: … · Sustituido por: —» en sus 12 primeras líneas; audiencias: dueño, sesión, ingeniero, contratista; sin cifras de estado en la ficha; encabezados numerados crecientes y jerárquicos; toda ruta `docs/…` o `api/….js` citada debe existir | bloque «Documentación viva contra el árbol» de `tests/e2e.js` |
| `docs/INDICE.md`, `docs/MAPA.md` y `docs/MEMORIA_INDICE.md` se regeneran con `node tests/mapa.js --escribir` y van en el mismo commit | mismo bloque y bloque «memoria útil al crecer» |
| La marca vieja no puede aparecer en ningún archivo del árbol (el censo cubre también `research/`: lo comprobó la vuelta de la suite de hoy) | bloque de marca de `tests/e2e.js` |
| Citas a documentos del árbol por título de sección, nunca por línea | `docs/PROMPT_INICIAL.md § 10` |
| Memoria: la decisión va al final de `docs/MEMORIA.md` con «En una línea: …», pendientes como «> PENDIENTE · …» | `CLAUDE.md § La memoria se escribe` |
| Lenguaje de pantalla: usted, sin jerga, sin emoji (censo de `public/*.js`); los textos del dueño (`*_DESDE_CLAUDE_CODE.md`, skills) también | `lib/lenguaje_pantalla.js` y su censo en la suite |
| Entradas del dueño que no se versionan (listas de precios, APU adjudicados) | `entrada/LEEME.md`, `.gitignore` |

## 4. Red desde este entorno (medido el 2-oct-2026, 02:45–02:55 UTC, con `curl` por el proxy)

| Portal | Resultado |
|---|---|
| datos.gov.co (p6dx-8zbt, dmgg-8hin, jbjy-vk9h, `api/views`) | 200 |
| relatoria.colombiacompra.gov.co (conceptos, normativa) · colombiacompra.gov.co (documentos tipo, guías, ABC del Decreto 0997, guía UNSPSC, releases) · formacionvirtual.colombiacompra.gov.co | 200 |
| community.secop.gov.co (página pública de un proceso) | 403 con `curl` a secas; **200 con agente de usuario de navegador** |
| consejodeestado.gov.co · corteconstitucional.gov.co (relatoría) · procuraduria.gov.co · contraloria.gov.co | 200 |
| imprenta.gov.co (Diario Oficial) · alcaldiabogota.gov.co (régimen legal, texto de normas) · dapre.presidencia.gov.co · minhacienda.gov.co | 200 |
| **suin-juriscol.gov.co · funcionpublica.gov.co (gestor normativo) · sic.gov.co** | **fallan**: `curl: (60) SSL certificate problem: unable to get local issuer certificate` (también con `--cacert` del proxy); `WebFetch` devuelve `HTTP 503 Service Unavailable` |
| **secretariasenado.gov.co · scielo.org.co · repository.unilibre.edu.co · manglar.uninorte.edu.co · repository.urosario.edu.co** | **fallan**: el proxy registra `tunnel closed (code 1006, Connection ended)` |
| repositorio.uniandes.edu.co · repository.javeriana.edu.co · bdigital.uexternado.edu.co · repositorio.unal.edu.co · repository.eafit.edu.co · repository.upb.edu.co · repository.unimilitar.edu.co · noesis.uis.edu.co · repository.usergioarboleda.edu.co · redalyc.org · dialnet.unirioja.es · scielo.org | 200 |
| repository.usta.edu.co · oecd.org · publications.iadb.org | 403 |
| documents.worldbank.org · transparenciacolombia.org.co · infraestructura.org.co · fedesarrollo.org.co · idu.gov.co · ani.gov.co · invias.gov.co · rues.org.co | 200 |
| youtube.com | 200 la portada; 429 un video (límite de peticiones) |

Consecuencia: el **texto oficial** de leyes y decretos se tomará del Diario Oficial (imprenta.gov.co),
de la normativa de la relatoría de Colombia Compra y del régimen legal de Bogotá, con la URL abierta; SUIN
y Función Pública quedan como «no alcanzados el 2-oct-2026» y se reintentan en cada fase (un fallo con
fecha es una observación, no una propiedad del entorno).

## 5. Censo de citas normativas del árbol (insumo de la Fase 3)

`research/censo_citas_normativas.tsv` (archivo, línea, cita): 638 menciones, **121 normas distintas**
(leyes, decretos, resoluciones, circulares, sentencias, CONPES y guías CCE), más 90 menciones de
«Documento(s) Tipo …». Las más citadas: Decreto 1082 de 2015 (46), Ley 80 de 1993 (44), Guía
CCE-EICP-GI-22 (36), Ley 1150 de 2007 (23), Ley 1474 de 2011 (20), Ley 2022 de 2020 (17). En código
(`lib/`, `public/`) hay 27 normas distintas, concentradas en `lib/dictamen.js`, `lib/perfiles.js`,
`lib/requisitos_ley.js`, `lib/capital_trabajo.js` y `lib/parametros.js`. Dos grafías para la misma norma
(«Decreto 159 de 2026» y «Decreto 0159 de 2026»): el validador tendrá que normalizar.

## 6. Tamaño del universo para la muestra SECOP II (medido el 2-oct-2026 contra p6dx-8zbt)

Procesos con `tipo_de_contrato = 'Obra'` publicados desde el 1-ene-2026, expedientes distintos
(`id_del_portafolio`): 5.188 «Seleccionado», 5.551 «Publicado», 3.106 «Evaluación», 637 «Cancelado»,
389 «Abierto». Por modalidad: régimen especial 5.568 (+576 con ofertas), menor cuantía 2.457, mínima
cuantía 1.253, contratación directa 1.132 (+135), licitación pública de obra 1.076 (+16). El índice de
documentos `dmgg-8hin` trae los informes de evaluación por nombre de archivo (muestra de 5 del 1-sep-2026
verificada); el conteo total del año agotó el tiempo de la consulta (60 s) y se hará por ventanas de
fecha en el piloto.
