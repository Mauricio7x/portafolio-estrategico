/* ============================================================================
   lib/indice_competencia · ¿En qué entidades se presenta menos gente?
   ----------------------------------------------------------------------------
   El puntaje ponderado dice «dónde mirar primero»; este índice dice «dónde es
   más PROBABLE GANAR». Se construye sobre el corpus HISTÓRICO
   (licitaciones:historico:mes:*:chunk:*, que jamás se purga) y responde, por
   entidad: cuántos oferentes se presentan en promedio a sus procesos.

     construirIndice(redis, {presupuestoMs})  → recorre el histórico mes a mes
                                                (REANUDABLE) y publica el hash
                                                indice:competencia
     competenciaDe(indice, licitacion)        → {nivel, promedio_oferentes, …}

   Clasificación en TERTILES sobre el promedio de oferentes:
     "baja"     tercio con MENOS oferentes → MÁS atractiva (más probable ganar)
     "media"    tercio intermedio
     "alta"     tercio con MÁS oferentes  → MENOS atractiva
     "sin_dato" entidad con menos de MIN_PROCESOS procesos útiles, o ausente

   Reglas de honestidad del dato (mismo criterio que `anticipo_pct = 0` en
   lib/negocio: si la fuente no lo dice, no se inventa):

   · Solo cuentan los procesos con evidencia de ADJUDICACIÓN y con un conteo de
     oferentes ≥ 1. Un «0 oferentes» en un proceso adjudicado es un hueco del
     dataset, no una subasta desierta: contarlo como 0 arrastraría el promedio
     de la entidad a cero y TODAS acabarían clasificadas como «baja». Los
     descartes quedan contados en la meta del índice para auditarlo.
   · MIN_PROCESOS = 5: por debajo de eso el promedio es ruido — la entidad se
     marca "sin_dato" y en el orden queda por delante de las de alta
     competencia (no sabemos, pero puede ser oportunidad).

   Nombres de columna: este entorno de desarrollo NO alcanza datos.gov.co
   (allowlist del proxy — verificado: CONNECT 403), así que las candidatas de
   oferentes/adjudicación están PENDIENTES DE VERIFICACIÓN contra el dataset
   real. Por eso se leen por LISTA DE CANDIDATAS en orden de preferencia y no
   por un nombre único: si p6dx-8zbt usa otro, basta añadirlo aquí y reconstruir
   el índice (GET /api/sync/historico?reconstruir_indice=true) — sin re-extraer.
   ========================================================================== */
"use strict";

const {
  CLAVES, leerChunksDedup, leerJSON, escribirJSON,
  leerJSONComprimido, escribirJSONComprimido,
} = require("./almacen.js");
/* `norm` se toma de lib/semantica (su casa desde jul 2026) y NO de lib/filtros,
   que la re-exporta: filtros ya depende de lib/equivalencias y esta de aquí —
   importarla de filtros cerraría un ciclo de requires y dejaría este módulo
   con un `norm` sin definir en tiempo de carga. */
const { norm } = require("./semantica.js");

const MIN_PROCESOS = 5;          // menos de 5 procesos útiles → "sin_dato"
const CAMPOS_POR_HSET = 200;     // campos por comando HSET (payload acotado)
const MAX_OFERENTES = 500;       // cota de cordura: valores mayores son basura

/* ---------- columnas del dataset (candidatas, pendiente verificación) ----------
   Nº de oferentes, de la más específica a la más genérica. `numero_de_ofertas`
   y `numero_proponentes` son las pedidas en el encargo; `proveedores_unicos_con`
   y `conteo_de_respuestas_a_ofertas` son las que p6dx-8zbt trae hoy (ya estaban
   en la proyección y en lib/negocio.COMPETENCIA_CAMPOS). */
const OFERENTES_CAMPOS = [
  "numero_de_ofertas", "numero_proponentes", "numero_de_proponentes", "numero_ofertas",
  "proveedores_unicos_con", "conteo_de_respuestas_a_ofertas",
  "respuestas_al_procedimiento", "respuestas_externas", "proponentes",
];

/* Datos de adjudicación. NO se guardan en el corpus activo (solo en el
   histórico) ni se exponen en /api/oportunidades: allí solo viaja el resumen
   agregado por entidad. */
const CAMPOS_ADJUDICATARIO = [
  "nombre_del_proveedor", "adjudicatario_nombre", "proveedor_adjudicado", "nombre_del_adjudicador",
];
const CAMPOS_ADJUDICATARIO_NIT = [
  "nit_del_proveedor_adjudicado", "adjudicatario_nit", "documento_proveedor", "codigoproveedor",
];
const CAMPOS_VALOR_ADJUDICADO = [
  "valor_total_adjudicacion", "valor_adjudicado", "valor_adjudicacion",
];
const CAMPOS_FECHA_ADJUDICACION = ["fecha_adjudicacion", "fecha_de_adjudicacion"];

/* Todo lo que la proyección histórica debe conservar (lib/proyeccion.js). */
const CAMPOS_ADJUDICACION = [...new Set([
  ...CAMPOS_ADJUDICATARIO, ...CAMPOS_ADJUDICATARIO_NIT,
  ...CAMPOS_VALOR_ADJUDICADO, ...CAMPOS_FECHA_ADJUDICACION,
  ...OFERENTES_CAMPOS,
  "id_adjudicacion", "departamento_proveedor", "ciudad_proveedor",
  "proveedores_invitados", "proveedores_que_manifestaron", "numero_de_lotes",
])];

/* Estados que evidencian que el proceso YA tuvo ganador (normalizados). */
const ESTADOS_ADJUDICADOS = [
  "adjudicado", "celebrado", "en ejecucion", "ejecucion", "terminado",
  "liquidado", "adjudicacion",
].map(norm);

/* ---------- lectura tolerante ---------- */
function numero(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
const primero = (lic, campos) => {
  for (const c of campos) {
    const v = lic[c];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
};

/* Nº de oferentes del proceso, o null si la fuente no lo dice. El 0 es «sin
   dato» a propósito (ver cabecera), nunca «nadie se presentó». */
function oferentesDe(lic) {
  for (const c of OFERENTES_CAMPOS) {
    const n = numero(lic[c]);
    if (n != null && n >= 1 && n <= MAX_OFERENTES) return Math.round(n);
  }
  const propio = numero(lic.oferentes); // derivado guardado por la proyección histórica
  return propio != null && propio >= 1 && propio <= MAX_OFERENTES ? Math.round(propio) : null;
}

/* ¿El proceso llegó a tener ganador? Señales, de la más dura a la más blanda. */
function esAdjudicado(lic) {
  if (norm(lic.adjudicado) === "si") return true;
  if (primero(lic, CAMPOS_ADJUDICATARIO) || primero(lic, CAMPOS_ADJUDICATARIO_NIT)) return true;
  if (primero(lic, CAMPOS_FECHA_ADJUDICACION)) return true;
  const valor = numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));
  if (valor != null && valor > 0) return true;
  for (const v of [lic.estado_del_procedimiento, lic.fase]) {
    const n = norm(v);
    if (n && ESTADOS_ADJUDICADOS.some((e) => n === e || n.startsWith(e))) return true;
  }
  return false;
}

/* ---------- identidad de la entidad: UNA sola definición ----------
   `claveCanonica` es la ÚNICA forma de decir «estas dos filas son la misma
   entidad» en todo el proyecto: `norm` (sin acentos, minúsculas, espacios
   colapsados) MÁS el descarte de la puntuación.

   Por qué la puntuación (ago 2026, defecto real): el mismo organismo aparece en
   el dataset como «… RIOS NEGRO - NARE» y «… RIOS NEGRO NARE». Con `norm` a
   secas son DOS entidades: el índice les partía el historial en dos registros
   de 2 y 3 procesos —ninguno llegaba al mínimo— mientras
   /api/competencia-detalle, que sí quitaba la puntuación, los contaba juntos y
   veía 5. El badge decía ⚪ y el detalle enseñaba un promedio de 5 procesos, y
   los dos tenían razón según su propia definición de «entidad». El problema no
   era el cálculo: eran dos identidades distintas para la misma cosa.

   `claveLegado` es la clave ANTERIOR (`norm` sin más). Se conserva SOLO para
   leer: `indice:competencia` no se purga nunca, así que el hash que hay hoy en
   producción está escrito con ella y tiene que seguir resolviéndose hasta que
   alguien reconstruya el índice. No se escribe jamás. */
const claveCanonica = (s) => norm(s).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/* Clave de entidad: el nombre canónico manda (siempre viene) y el NIT entra
   como alias, para que un cambio de razón social no parta el historial. */
function claveEntidad(lic) {
  const nit = String(lic.nit_entidad || "").replace(/\D/g, "");
  const canonica = claveCanonica(lic.entidad);
  const legado = norm(lic.entidad);
  return {
    clave: canonica || (nit ? `nit:${nit}` : ""),
    claveLegado: legado || (nit ? `nit:${nit}` : ""),
    aliasNit: nit ? `nit:${nit}` : null,
    nombre: String(lic.entidad || "").trim() || (nit ? `NIT ${nit}` : "Entidad no informada"),
    nit: nit || null,
  };
}

/* ---------- tertiles ---------- */
/* Cortes en los promedios ORDENADOS. Se comparan con `<=` para que entidades
   con el mismo promedio caigan siempre en el mismo nivel. */
function cortesTertiles(promediosOrdenados) {
  const n = promediosOrdenados.length;
  if (!n) return null;
  const min = promediosOrdenados[0], max = promediosOrdenados[n - 1];
  if (min === max) return { c1: null, c2: null, degenerado: true }; // sin poder discriminante
  const idx = (frac) => Math.min(n - 1, Math.max(0, Math.ceil(n * frac) - 1));
  return { c1: promediosOrdenados[idx(1 / 3)], c2: promediosOrdenados[idx(2 / 3)], degenerado: false };
}
function nivelPorCortes(promedio, cortes) {
  if (!cortes || cortes.degenerado) return "media"; // todas iguales: ninguna destaca
  if (promedio <= cortes.c1) return "baja";
  if (promedio <= cortes.c2) return "media";
  return "alta";
}

/* Mediana a partir del histograma {oferentes: veces} (sin guardar la muestra). */
function medianaHistograma(histograma, n) {
  if (!n) return null;
  const valores = Object.keys(histograma).map(Number).sort((a, b) => a - b);
  const i1 = Math.floor((n - 1) / 2), i2 = Math.ceil((n - 1) / 2);
  let acumulado = 0, lo = null, hi = null;
  for (const v of valores) {
    acumulado += histograma[v];
    if (lo === null && i1 < acumulado) lo = v;
    if (hi === null && i2 < acumulado) { hi = v; break; }
  }
  return lo == null || hi == null ? null : (lo + hi) / 2;
}

const redondear = (n) => Math.round(n * 10) / 10;

/* ---------- qué se PUBLICA por entidad ----------
   Una entidad por debajo de MIN_PROCESOS no se clasifica… pero hasta ago 2026
   SÍ se publicaba su `promedio`. El registro quedaba
   `{procesos: 3, promedio: 18.2, nivel: "sin_dato"}` y cualquier consumidor que
   pintara el promedio sin mirar el nivel enseñaba una cifra sin ninguna base
   («18.2 oferentes en 0 procesos» en producción). El promedio de 3 procesos no
   es un promedio: es ruido con dos decimales.

   Regla: por debajo del mínimo NO SE PUBLICA NINGUNA CIFRA DERIVADA (ni
   promedio, ni mediana, ni el total de oferentes con el que se podría
   recalcular). Solo el conteo —que es un hecho, y es lo que explica el ⚪— y el
   nivel "sin_dato".

   `procesos_contados` viaja como ALIAS de `procesos`: es el nombre con el que
   se pide el dato desde fuera, y tenerlo escrito evita que un consumidor lea
   `undefined` y lo interprete como cero. El lector acepta los dos nombres. */
function registroPublicado(e) {
  const comun = {
    nombre: e.nombre, nit: e.nit,
    procesos: e.procesos, procesos_contados: e.procesos,
    min_procesos: MIN_PROCESOS,
  };
  if (e.procesos < MIN_PROCESOS) {
    return { ...comun, oferentes_total: null, promedio: null, mediana: null, nivel: "sin_dato" };
  }
  return { ...comun, oferentes_total: e.oferentes_total, promedio: e.promedio, mediana: e.mediana, nivel: e.nivel };
}

/* ---------- acumulación ---------- */
function acumular(acc, stats, lic) {
  stats.filas++;
  if (!esAdjudicado(lic)) { stats.sin_adjudicacion++; return; }
  const oferentes = oferentesDe(lic);
  if (oferentes == null) { stats.sin_oferentes++; return; }
  const { clave, nombre, nit } = claveEntidad(lic);
  if (!clave) { stats.sin_entidad = (stats.sin_entidad || 0) + 1; return; }
  const e = acc[clave] || (acc[clave] = { nombre, nit, procesos: 0, suma: 0, histograma: {} });
  if (!e.nit && nit) e.nit = nit;
  e.procesos++;
  e.suma += oferentes;
  e.histograma[oferentes] = (e.histograma[oferentes] || 0) + 1;
  stats.contados++;
}

/* ============================ construirIndice ============================
   Recorre el histórico MES A MES (no chunk a chunk) porque un proceso vive en
   un solo mes: deduplicar por `_k` dentro del mes basta y el acumulador que se
   persiste entre invocaciones es por ENTIDAD (pequeño), no por proceso.
   Reanudable: progreso comprimido en indice:competencia:progreso. */
async function construirIndice(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.indiceProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = {
      iniciado: new Date().toISOString(),
      pendientes: [...porMes.keys()].sort(),
      acc: {},
      stats: { filas: 0, contados: 0, sin_adjudicacion: 0, sin_oferentes: 0, meses: 0 },
    };
  }
  if (!p.pendientes.length && !Object.keys(p.acc).length && !porMes.size) {
    return { done: true, vacio: true, entidades: 0, clasificadas: 0, msg: "no hay corpus histórico todavía" };
  }

  while (p.pendientes.length) {
    if (Date.now() - t0 > presupuestoMs) {
      await escribirJSONComprimido(redis, CLAVES.indiceProgreso, p);
      return { done: false, pendientes: p.pendientes.length, entidades: Object.keys(p.acc).length };
    }
    const mes = p.pendientes[0];
    const registros = await leerChunksDedup(redis, porMes.get(mes) || []);
    for (const r of registros) acumular(p.acc, p.stats, r);
    p.stats.meses++;
    p.pendientes.shift();
    await escribirJSONComprimido(redis, CLAVES.indiceProgreso, p);
    log(`índice: ${mes} → ${registros.length} procesos (${Object.keys(p.acc).length} entidades)`);
  }

  /* ---------- métricas por entidad + tertiles ---------- */
  const entidades = Object.entries(p.acc).map(([clave, a]) => ({
    clave,
    nombre: a.nombre,
    nit: a.nit || null,
    procesos: a.procesos,
    oferentes_total: a.suma,
    promedio: redondear(a.suma / a.procesos),
    mediana: medianaHistograma(a.histograma, a.procesos),
  }));
  const clasificables = entidades.filter((e) => e.procesos >= MIN_PROCESOS)
    .sort((a, b) => a.promedio - b.promedio || a.clave.localeCompare(b.clave));
  const cortes = cortesTertiles(clasificables.map((e) => e.promedio));
  for (const e of entidades) {
    e.nivel = e.procesos >= MIN_PROCESOS ? nivelPorCortes(e.promedio, cortes) : "sin_dato";
  }

  /* ---------- NITs que NO pueden llevar alias ----------
     El alias `nit:{NIT}` → `{ref: entidad}` existe para que un cambio de razón
     social no parta el historial. Pero un NIT NO identifica a una entidad de
     forma única en este dataset: las regionales y unidades de un mismo
     organismo publican con el NIT de la matriz. Cuando dos entidades distintas
     lo comparten, el alias solo puede apuntar a UNA, y hasta ago 2026 ganaba
     «la última escrita»: la otra entidad heredaba en la tarjeta el nivel de
     competencia de su hermana, en silencio y sin forma de notarlo.

     Un alias ambiguo no es un alias: es una respuesta equivocada. Así que no se
     publica, y esas entidades se identifican SOLO por su nombre —que es exacto—
     La cuenta va a la meta: si un día son muchas, hay que saberlo. */
  const clavesReales = new Set(entidades.map((e) => e.clave));
  const clavesPorNit = new Map();
  for (const e of entidades) {
    if (!e.nit) continue;
    if (!clavesPorNit.has(e.nit)) clavesPorNit.set(e.nit, new Set());
    clavesPorNit.get(e.nit).add(e.clave);
  }
  const nitsAmbiguos = new Set();
  for (const [nit, claves] of clavesPorNit) {
    // dos entidades con el mismo NIT, o un NIT que YA es la clave real de una
    // entidad sin nombre (ahí el alias no sería ambiguo: sería destructivo)
    if (claves.size > 1 || clavesReales.has(`nit:${nit}`)) nitsAmbiguos.add(nit);
  }

  /* ---------- publicación con swap atómico ---------- */
  /* Escribe el hash completo en `destino`, por lotes de CAMPOS_POR_HSET campos:
     un HSET por lote acota el tamaño del request REST. Cada entidad va bajo su
     clave canónica y, si su NIT no es ambiguo, un alias que apunta al mismo
     registro (sin duplicar la carga útil). */
  async function publicarEn(destino) {
    let lote = {}, enLote = 0;
    for (const e of entidades) {
      lote[e.clave] = registroPublicado(e);
      enLote++;
      if (e.nit && !nitsAmbiguos.has(e.nit) && `nit:${e.nit}` !== e.clave) {
        lote[`nit:${e.nit}`] = { ref: e.clave };
        enLote++;
      }
      if (enLote >= CAMPOS_POR_HSET) { await redis.hset(destino, lote); lote = {}; enLote = 0; }
    }
    if (enLote) await redis.hset(destino, lote);
  }

  if (!entidades.length) {
    // hay corpus histórico pero NADA contable (p. ej. ninguna columna de
    // oferentes reconocida): dejar el índice vacío es coherente — todas las
    // entidades caen en "sin_dato" y la meta explica por qué en `descartados`
    await redis.del(CLAVES.indice, CLAVES.indiceNuevo);
  } else {
    await redis.del(CLAVES.indiceNuevo);
    await publicarEn(CLAVES.indiceNuevo);
    try {
      await redis.rename(CLAVES.indiceNuevo, CLAVES.indice);
    } catch {
      // sin RENAME disponible: publicar sobre la vigente (hay una ventana
      // corta con el índice a medias; los niveles solo caen a "sin_dato")
      await redis.del(CLAVES.indice);
      await publicarEn(CLAVES.indice);
      await redis.del(CLAVES.indiceNuevo);
    }
  }

  const porNivel = { baja: 0, media: 0, alta: 0, sin_dato: 0 };
  for (const e of entidades) porNivel[e.nivel]++;
  const meta = {
    construido: new Date().toISOString(),
    entidades: entidades.length,
    clasificadas: clasificables.length,
    min_procesos: MIN_PROCESOS,
    cortes: cortes ? { baja_hasta: cortes.c1, media_hasta: cortes.c2, degenerado: cortes.degenerado } : null,
    por_nivel: porNivel,
    // NITs compartidos por dos o más entidades: no se publica alias para ellos
    // (ver «NITs que no pueden llevar alias»). Si un día son muchos, se ve aquí.
    nits_ambiguos: nitsAmbiguos.size,
    procesos_contados: p.stats.contados,
    filas_leidas: p.stats.filas,
    descartados: { sin_adjudicacion: p.stats.sin_adjudicacion, sin_oferentes: p.stats.sin_oferentes },
    meses: p.stats.meses,
  };
  await escribirJSON(redis, CLAVES.indiceMeta, meta);
  await redis.del(CLAVES.indiceProgreso);
  log(`índice publicado: ${entidades.length} entidades (${clasificables.length} clasificadas)`);
  return { done: true, ...meta };
}

/* ============================ lectura ============================ */
async function leerIndiceMeta(redis) { return leerJSON(redis, CLAVES.indiceMeta); }

/* Hash completo → objeto {clave: métricas}. Un solo comando; /api/oportunidades
   lo memoiza por instancia caliente contra el sello de indice:competencia:meta. */
async function leerIndice(redis) {
  const crudo = await redis.hgetall(CLAVES.indice);
  const out = {};
  for (const [k, v] of Object.entries(crudo || {})) {
    if (v == null) continue;
    if (typeof v === "object") { out[k] = v; continue; }
    try { out[k] = JSON.parse(v); } catch { /* campo corrupto: se ignora */ }
  }
  return out;
}

const SIN_DATO = Object.freeze({ nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: 0 });
const NIVELES_CLASIFICADOS = ["baja", "media", "alta"];

/* Un registro sin base suficiente: se conserva el CONTEO (es un hecho, y es lo
   que explica el ⚪ en la tarjeta) y se anulan todas las cifras derivadas. */
const sinDatoCon = (procesos) => (procesos > 0
  ? { nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: procesos }
  : SIN_DATO);

/* Resumen AGREGADO de la entidad de una licitación. Es lo único del histórico
   que /api/oportunidades expone: nunca adjudicatarios, NIT ni valores.
   ---------------------------------------------------------------------------
   ÚNICO PUNTO DE PASO de los tres consumidores (tarjeta, panel y detalle), y
   por eso es aquí donde se impone la invariante que faltaba:

     un promedio SOLO sale de aquí si la entidad tiene ≥ MIN_PROCESOS procesos
     contados Y un nivel clasificado. En cualquier otro caso, promedio null.

   No basta con arreglar el escritor: `indice:competencia` NO SE PURGA NUNCA
   (es su razón de ser), así que en producción sigue vivo el hash que escribió
   la versión anterior —con promedios publicados para entidades de 3 procesos—
   hasta que alguien reconstruya el índice. Esta guarda hace que ese hash viejo
   ya no pueda enseñar una cifra sin base, con reconstrucción o sin ella.
   Acepta `procesos` y `procesos_contados` por el mismo motivo. */
function competenciaDe(indice, lic) {
  if (!indice) return SIN_DATO;
  const { clave, claveLegado, aliasNit } = claveEntidad(lic);
  const en = (k) => (k && Object.prototype.hasOwnProperty.call(indice, k) ? indice[k] : null);
  /* ORDEN DE BÚSQUEDA, y este orden es la corrección (ago 2026):
       1. la clave canónica — el nombre es EXACTO y solo puede ser esta entidad;
       2. la clave legado — el hash que hay hoy en producción está escrito así y
          no se purga nunca: sin este paso, desplegar dejaría todo en ⚪ hasta
          que alguien reconstruyera el índice a mano;
       3. el alias por NIT, y solo entonces — es el más DÉBIL de los tres porque
          un NIT lo comparten las regionales de un mismo organismo. Antes iba
          PRIMERO, así que una entidad con el nombre bien escrito y su propio
          registro en el índice acababa enseñando las cifras de su hermana.
     El escritor ya no publica alias ambiguos; este orden protege además al hash
     viejo, que sí los tiene. */
  let m = en(clave) || en(claveLegado) || en(aliasNit);
  if (m && m.ref) m = en(m.ref);
  if (!m) return SIN_DATO;
  // `numero()` y no un `||`: un conteo que llegue como cadena ("3") o como
  // basura no puede colarse como truthy y arrastrar consigo un promedio
  const procesos = Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0));
  if (procesos < MIN_PROCESOS) return sinDatoCon(procesos);
  if (!NIVELES_CLASIFICADOS.includes(m.nivel)) return sinDatoCon(procesos);
  const promedio = numero(m.promedio);
  if (promedio == null) return sinDatoCon(procesos); // nivel sin promedio: no hay nada que enseñar
  return {
    nivel: m.nivel,
    promedio_oferentes: promedio,
    mediana_oferentes: numero(m.mediana),
    total_procesos: procesos,
  };
}

module.exports = {
  // `numero` y `primero` se exportan para que el censo de columnas
  // (lib/columnas_historicas) resuelva los campos con las MISMAS reglas que usa
  // este módulo para leerlos: si divergieran, el diagnóstico informaría de una
  // columna que el índice no mira, o al revés.
  numero, primero,
  MIN_PROCESOS, OFERENTES_CAMPOS, CAMPOS_ADJUDICACION,
  CAMPOS_ADJUDICATARIO, CAMPOS_ADJUDICATARIO_NIT, CAMPOS_VALOR_ADJUDICADO, CAMPOS_FECHA_ADJUDICACION,
  oferentesDe, esAdjudicado, claveEntidad, claveCanonica,
  cortesTertiles, nivelPorCortes, medianaHistograma, registroPublicado,
  construirIndice, leerIndice, leerIndiceMeta, competenciaDe,
};
