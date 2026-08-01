/* ============================================================================
   /api/oportunidades · Consulta de oportunidades viables desde la caché Redis
   ----------------------------------------------------------------------------
   GET /api/oportunidades?perfil=helder|genesis|juntos   (alias: consorcio)
     &anticipo_min=20            (excluye anticipos DECLARADOS bajo el mínimo;
                                  0 = "sin dato" pasa el filtro y puntúa 0,
                                  porque p6dx-8zbt no trae columna de anticipo)
     &cuantia_rango=bajo|medio|alto
     &nivel_competencia=baja|media|alta        (ofertas DEL PROCESO)
     &competencia_entidad=baja|media|alta|sin_dato  (histórico DE LA ENTIDAD)
     &ubicacion_valida=true|false
     &match=clase|familia|equivalente|texto    (solidez del match UNSPSC)
     &incluir_sin_unspsc=1       (abre la ruta de TEXTO cuando la pertinencia no
                                  llegó a verde; apagada por defecto)
     &incluir_cerradas=1         (por defecto solo procesos abiertos)
     &ordenar_por=atractividad|anticipo|cuantia|competencia|puntaje
                                 (default ATRACTIVIDAD)
     &orden=asc|desc             (default desc)
     &pagina=1&por_pagina=20     (máx 100)

   → { ok:true, total, resultados, pagina, por_pagina, perfil, sincronizado,
       por_match, indice_competencia, conocimiento }
   Cada resultado lleva `rup` con el veredicto GRADUADO: rup.tier
   (clase|familia|equivalente|texto), rup.unspsc {codigo_proceso, codigo_rup,
   mensaje} y rup.pertinencia {nivel, etiqueta, motivo}.

   ORDEN POR ATRACTIVIDAD (el default, y la razón de ser del índice): primero
   las entidades donde históricamente se presenta MENOS gente — ahí es más
   probable ganar. Grupos: baja → media → sin_dato → alta; dentro de cada uno,
   por puntaje ponderado descendente. "sin_dato" va por delante de "alta" a
   propósito: no saber no es lo mismo que saber que hay 20 competidores.

   Lógica: SCAN licitaciones:activo:mes:*:chunk:* → MGET por lotes → inflate →
   dedup por _k (gana :updated_at) → filtros de negocio → rup_valido(perfil)
   → índice de competencia → orden → paginación. El corpus deduplicado, el
   índice y el conocimiento derivado se memoizan a nivel de módulo (instancia
   serverless caliente), sellados con meta.last_sync y con la fecha de
   construcción de cada artefacto.

   AQUÍ CORRE TODO EL JUICIO (jul 2026). /api/sync guarda ancho —cualquier
   proceso que PUEDA interesar— y es esta consulta la que aplica, por perfil:
   matching UNSPSC jerárquico, equivalencias funcionales, co-señal de texto,
   pertinencia del objeto, anti-suministro, capacidad K y tope. Consecuencia
   deliberada: afinar una regla o cargar un RUP nuevo tiene efecto inmediato,
   sin re-sincronizar nada.

   El corpus HISTÓRICO (licitaciones:historico:*) NO se lee aquí: de él solo
   llega el resumen AGREGADO por entidad (promedio y nº de procesos) y el
   conocimiento derivado (equivalencias entre clases, vocabulario por familia).
   Los datos de adjudicación —adjudicatario, NIT, valor adjudicado— nunca salen
   por este endpoint; ni siquiera se guardan en el corpus activo.

   Arranque en frío: si Redis no tiene chunks, dispara /api/sync?modo=auto en
   segundo plano (sin await) y responde 503 con mensaje claro — la web
   reintenta sola.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { CLAVES, leerChunksDedup, leerJSON, leerJSONComprimido } = require("../lib/almacen.js");
const { PERFILES, ALIAS_PERFIL, evaluarRup } = require("../lib/rup.js");
const { modalidad_competitiva, estado_abierto } = require("../lib/filtros.js");
const { leerIndice, leerIndiceMeta, competenciaDe } = require("../lib/indice_competencia.js");
const { leerEquivalencias, leerEquivalenciasMeta } = require("../lib/equivalencias.js");
const { vocabularioActivo } = require("../lib/texto_unspsc.js");
const { sinAdjudicacion } = require("../lib/proyeccion.js");

const POR_PAGINA_DEFAULT = 20, POR_PAGINA_MAX = 100;
const ANTICIPO_MIN_DEFAULT = 20;
/* Puntaje de atractividad: más alto = más probable ganar. Con el orden `desc`
   por defecto, las de competencia baja quedan arriba. */
const ATRACTIVIDAD = { baja: 3, media: 2, sin_dato: 1, alta: 0 };
const ORDEN_CAMPOS = {
  atractividad: (l, comp) => ATRACTIVIDAD[comp.nivel] ?? 1,
  anticipo: (l) => l.anticipo_pct || 0,
  cuantia: (l) => l.cuantia_cop || 0,
  competencia: (l) => ({ baja: 1, media: 2, alta: 3 }[l.nivel_competencia] || 0),
  puntaje: (l) => l.puntaje_ponderado || 0,
};
const ORDEN_DEFAULT = "atractividad";
const NIVELES_ENTIDAD = ["baja", "media", "alta", "sin_dato"];

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[oportunidades]", ...a); };

/* Corpus deduplicado memoizado por instancia caliente (sello = last_sync). */
let _mem = { sello: null, filas: null };
/* Índice de competencia memoizado (sello = fecha de construcción + nº entidades):
   evita un HGETALL del hash completo en cada petición de una instancia caliente. */
let _memIndice = { sello: null, indice: null, meta: null };

async function cargarCorpus(redis, meta) {
  // el SCAN corre siempre (1 comando barato); el sello incluye el nº de
  // chunks para que una compactación/poda concurrente (que cambia el conteo)
  // invalide una memoización tomada a mitad de la maniobra
  const claves = await redis.scan(CLAVES.patronChunks);
  if (!claves.length) return null;
  const sello = meta && meta.last_sync ? `${meta.last_sync}|${meta.last_full}|${claves.length}` : null;
  if (sello && _mem.sello === sello && _mem.filas) {
    logDev(`corpus desde memoria caliente (${_mem.filas.length} filas)`);
    return _mem.filas;
  }
  const filas = await leerChunksDedup(redis, claves);
  if (sello) _mem = { sello, filas };
  logDev(`corpus leído de Redis: ${claves.length} chunks → ${filas.length} filas únicas`);
  return filas;
}

/* Índice de competencia por entidad. Si nunca se construyó (no se ha corrido
   /api/sync/historico), se devuelve vacío: todas las entidades quedan en
   "sin_dato" y la app sigue funcionando exactamente como antes. */
async function cargarIndice(redis) {
  let meta = null;
  try { meta = await leerIndiceMeta(redis); } catch { /* índice opcional */ }
  if (!meta) { _memIndice = { sello: null, indice: null, meta: null }; return { indice: null, meta: null }; }
  const sello = `${meta.construido}|${meta.entidades}`;
  if (_memIndice.sello === sello && _memIndice.indice) {
    logDev(`índice desde memoria caliente (${Object.keys(_memIndice.indice).length} claves)`);
    return { indice: _memIndice.indice, meta };
  }
  let indice = null;
  try { indice = await leerIndice(redis); } catch { /* índice opcional */ }
  _memIndice = { sello, indice, meta };
  logDev(`índice leído de Redis: ${indice ? Object.keys(indice).length : 0} claves`);
  return { indice, meta };
}

/* Conocimiento aprendido del corpus histórico: equivalencias funcionales entre
   clases UNSPSC y vocabulario distintivo por familia. Los dos son OPCIONALES —
   sin backfill histórico no existen y la cascada simplemente no dispara esas
   dos capas. Memoizado por instancia caliente contra el sello de su meta.
   Dos GET por instancia fría, cero por petición caliente. */
let _memConocimiento = { sello: null, conocimiento: null, meta: null };
async function cargarConocimiento(redis) {
  let metaEq = null;
  try { metaEq = await leerEquivalenciasMeta(redis); } catch { /* opcional */ }
  let metaVoc = null;
  try { metaVoc = await leerJSON(redis, CLAVES.vocabularioMeta); } catch { /* opcional */ }
  const sello = `${(metaEq && metaEq.construido) || "-"}|${(metaVoc && metaVoc.construido) || "-"}`;
  if (_memConocimiento.sello === sello && _memConocimiento.conocimiento) {
    return { conocimiento: _memConocimiento.conocimiento, meta: _memConocimiento.meta };
  }
  let equivalencias = null, vocabRedis = null;
  if (metaEq && !metaEq.vacio) {
    try { equivalencias = await leerEquivalencias(redis); } catch { /* opcional */ }
  }
  if (metaVoc) {
    try { vocabRedis = await leerJSONComprimido(redis, CLAVES.vocabulario); } catch { /* opcional */ }
  }
  const vocabulario = vocabularioActivo(vocabRedis); // cae a la semilla del repo
  const conocimiento = { equivalencias, vocabulario };
  const meta = {
    equivalencias: metaEq
      ? { construido: metaEq.construido, clases_con_equivalente: metaEq.clases_con_equivalente || 0, pares: metaEq.pares || 0 }
      : null,
    vocabulario: { fuente: vocabulario.fuente, familias: vocabulario.indice.size, derivadas_del_historico: vocabulario.derivadas },
  };
  _memConocimiento = { sello, conocimiento, meta };
  logDev(`conocimiento: equivalencias=${equivalencias ? Object.keys(equivalencias).length : 0} vocabulario=${vocabulario.fuente}/${vocabulario.indice.size}`);
  return { conocimiento, meta };
}

/* Dispara la sincronización en segundo plano (mejor esfuerzo; la web también
   reintenta por su cuenta al recibir el 503). Si hay meta de una carga previa
   pero cero chunks, la caché quedó inconsistente → recarga full, no delta. */
function dispararSync(req, modo) {
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined;
    if (host) fetch(`${proto}://${host}/api/sync?modo=${modo}`, { headers }).catch(() => {});
  } catch { /* la web reintenta */ }
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  let perfil = String(q.perfil || "").toLowerCase();
  // alias documentados (consorcio → juntos); hasOwnProperty en ambos mapas:
  // un ?perfil=constructor no debe pasar por el prototipo
  if (Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, perfil)) perfil = ALIAS_PERFIL[perfil];
  if (!Object.prototype.hasOwnProperty.call(PERFILES, perfil)) {
    return res.status(400).json({ ok: false, error: "falta ?perfil=helder | genesis | juntos (alias: consorcio)" });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }

  const redis = crearRedis({});
  let meta, filas, indice = null, indiceMeta = null, conocimiento = {}, conocimientoMeta = null;
  try {
    meta = await leerJSON(redis, CLAVES.meta);
    filas = await cargarCorpus(redis, meta);
    if (filas) {
      ({ indice, meta: indiceMeta } = await cargarIndice(redis));
      ({ conocimiento, meta: conocimientoMeta } = await cargarConocimiento(redis));
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }

  if (!filas) {
    dispararSync(req, meta && meta.last_full ? "full" : "auto");
    return res.status(503).json({
      ok: false,
      error: "Datos no disponibles. Sincronización iniciada. Intente en unos minutos.",
      sincronizando: true,
    });
  }

  /* competencia histórica de la entidad, memoizada por fila dentro de la
     petición (el orden consulta el nivel n·log n veces) */
  const _comp = new Map();
  const compDe = (l) => {
    let c = _comp.get(l);
    if (!c) { c = competenciaDe(indice, l); _comp.set(l, c); }
    return c;
  };

  /* ---------- filtros ---------- */
  const anticipoMin = q.anticipo_min !== undefined ? parseFloat(q.anticipo_min) : ANTICIPO_MIN_DEFAULT;
  const fCuantia = ["bajo", "medio", "alto"].includes(q.cuantia_rango) ? q.cuantia_rango : null;
  const fCompetencia = ["baja", "media", "alta"].includes(q.nivel_competencia) ? q.nivel_competencia : null;
  const fEntidad = NIVELES_ENTIDAD.includes(q.competencia_entidad) ? q.competencia_entidad : null;
  const fUbicacion = q.ubicacion_valida === undefined ? null : ["true", "1"].includes(String(q.ubicacion_valida));
  const soloAbiertas = q.incluir_cerradas !== "1";
  // ?match=clase|familia|equivalente|texto → ver solo los de esa solidez
  const fTier = ["clase", "familia", "equivalente", "texto"].includes(q.match) ? q.match : null;
  /* Toggle «Incluir procesos sin código UNSPSC» (apagado por defecto). Sin él,
     un proceso rescatado SOLO por el objeto tiene que llegar a pertinencia
     VERDE para verse: sin código del RUP y sin vocabulario claro de obra no
     hay evidencia de nada (en el corpus real esa ruta metía software, equipos
     y servicios de salud). Ver lib/filtros.evaluarObjeto. */
  const opciones = { incluirTextoDebil: ["1", "true"].includes(String(q.incluir_sin_unspsc)) };

  /* Veredicto del RUP memoizado por fila DENTRO de la petición: el filtro lo
     necesita para decidir y la página lo necesita para pintar la tarjeta.
     Calcularlo dos veces duplicaría el trabajo caro de la cascada. */
  const _rup = new Map();
  const rupDe = (l) => {
    let r = _rup.get(l);
    if (!r) { r = evaluarRup(l, perfil, conocimiento, opciones); _rup.set(l, r); }
    return r;
  };

  let lista = filas.filter((l) => {
    if (!modalidad_competitiva(l)) return false; // defensa: corpus previo al filtro
    // proceso_abierto viene sellado de la sincronización, pero se RE-CLASIFICA
    // aquí: filas guardadas por versiones anteriores (con clasificador
    // optimista) no deben servirse como abiertas hasta la próxima full
    if (soloAbiertas && !(l.proceso_abierto && estado_abierto(l))) return false;
    // anticipo 0 = "no declarado" (el dataset no trae la columna): pasa el
    // filtro pero puntúa 0; solo se excluye el anticipo declarado bajo mínimo
    if (anticipoMin > 0 && l.anticipo_pct > 0 && l.anticipo_pct < anticipoMin) return false;
    if (fCuantia && l.cuantia_rango !== fCuantia) return false;
    if (fCompetencia && l.nivel_competencia !== fCompetencia) return false;
    if (fUbicacion !== null && l.ubicacion_valida !== fUbicacion) return false;
    if (fEntidad && compDe(l).nivel !== fEntidad) return false;
    if (fTier && (rupDe(l).tier || "ninguno") !== fTier) return false;
    return rupDe(l).ok;
  });

  /* ---------- orden ---------- */
  const campo = Object.prototype.hasOwnProperty.call(ORDEN_CAMPOS, q.ordenar_por)
    ? ORDEN_CAMPOS[q.ordenar_por] : ORDEN_CAMPOS[ORDEN_DEFAULT];
  const dir = q.orden === "asc" ? 1 : -1;
  lista.sort((a, b) => {
    const d = campo(a, compDe(a)) - campo(b, compDe(b));
    if (d) return d * dir;
    const p = (a.puntaje_ponderado || 0) - (b.puntaje_ponderado || 0); // desempate estable
    if (p) return -p;
    return String(b.fecha_de_publicacion_del || "").localeCompare(String(a.fecha_de_publicacion_del || ""));
  });

  /* ---------- paginación ---------- */
  const porPagina = Math.min(Math.max(parseInt(q.por_pagina, 10) || POR_PAGINA_DEFAULT, 1), POR_PAGINA_MAX);
  const pagina = Math.max(parseInt(q.pagina, 10) || 1, 1);
  const total = lista.length;
  const resultados = lista.slice((pagina - 1) * porPagina, (pagina - 1) * porPagina + porPagina)
    // sinAdjudicacion: defensa en profundidad — el corpus activo no guarda
    // datos de adjudicación, y si una fila vieja los trajera, no salen de aquí
    .map((l) => ({ ...sinAdjudicacion(l), rup: rupDe(l), competencia_entidad: compDe(l) }));

  // reparto por solidez del match: le dice al dueño cuántas de las que ve son
  // «RUP ✓» y cuántas hay que verificar en el pliego
  const por_match = { clase: 0, familia: 0, equivalente: 0, texto: 0 };
  for (const l of lista) {
    const t = rupDe(l).tier;
    if (t in por_match) por_match[t]++;
  }

  logDev(`perfil=${perfil} corpus=${filas.length} filtradas=${total} página=${pagina} orden=${q.ordenar_por || ORDEN_DEFAULT}`);
  return res.status(200).json({
    ok: true, total, resultados, pagina, por_pagina: porPagina, perfil,
    sincronizado: meta ? meta.last_sync : null,
    ordenado_por: Object.prototype.hasOwnProperty.call(ORDEN_CAMPOS, q.ordenar_por) ? q.ordenar_por : ORDEN_DEFAULT,
    por_match, incluye_sin_unspsc: opciones.incluirTextoDebil,
    indice_competencia: indiceMeta
      ? { construido: indiceMeta.construido, entidades: indiceMeta.clasificadas, min_procesos: indiceMeta.min_procesos }
      : null,
    conocimiento: conocimientoMeta,
  });
};
