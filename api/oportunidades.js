/* ============================================================================
   /api/oportunidades · Consulta de oportunidades viables desde la caché Redis
   ----------------------------------------------------------------------------
   GET /api/oportunidades?perfil=helder|genesis|juntos   (alias: consorcio)
     &anticipo_min=20            (excluye anticipos DECLARADOS bajo el mínimo;
                                  0 = "sin dato" pasa el filtro y puntúa 0,
                                  porque p6dx-8zbt no trae columna de anticipo)
     &cuantia_rango=bajo|medio|alto
     &nivel_competencia=baja|media|alta
     &ubicacion_valida=true|false
     &incluir_cerradas=1         (por defecto solo procesos abiertos)
     &ordenar_por=anticipo|cuantia|competencia|puntaje   (default puntaje)
     &orden=asc|desc             (default desc)
     &pagina=1&por_pagina=20     (máx 100)

   → { ok:true, total, resultados, pagina, por_pagina, perfil, sincronizado }

   Lógica: SCAN licitaciones:mes:*:chunk:* → MGET por lotes → inflate →
   dedup por _k (gana :updated_at) → filtros de negocio → rup_valido(perfil)
   → orden → paginación. El corpus deduplicado se memoiza a nivel de módulo
   (instancia serverless caliente) sellado con meta.last_sync.

   Defensa en profundidad: la cascada (modalidad competitiva, estado abierto,
   objeto/anti-suministro) ya corre en /api/sync antes de guardar, pero se
   RE-APLICA aquí al servir — el corpus puede traer filas de sincronizaciones
   anteriores a esta versión (hasta la próxima full) y cerradas que el delta
   conserva a propósito para el reemplazo por :updated_at.

   Arranque en frío: si Redis no tiene chunks, dispara /api/sync?modo=auto en
   segundo plano (sin await) y responde 503 con mensaje claro — la web
   reintenta sola. Este es el reemplazo de raíz del viejo "Sin conexión a
   SECOP II": la primera visita se autorrepara en vez de agotar cascadas.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { CLAVES, descomprimir, leerJSON } = require("../lib/almacen.js");
const { PERFILES, ALIAS_PERFIL, rup_valido, evaluarRup } = require("../lib/rup.js");
const { modalidad_competitiva } = require("../lib/filtros.js");

const POR_PAGINA_DEFAULT = 20, POR_PAGINA_MAX = 100;
const ANTICIPO_MIN_DEFAULT = 20;
const ORDEN_CAMPOS = {
  anticipo: (l) => l.anticipo_pct || 0,
  cuantia: (l) => l.cuantia_cop || 0,
  competencia: (l) => ({ baja: 1, media: 2, alta: 3 }[l.nivel_competencia] || 0),
  puntaje: (l) => l.puntaje_ponderado || 0,
};

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[oportunidades]", ...a); };

/* Corpus deduplicado memoizado por instancia caliente (sello = last_sync). */
let _mem = { sello: null, filas: null };

async function cargarCorpus(redis, meta) {
  const sello = meta && meta.last_sync ? `${meta.last_sync}|${meta.last_full}` : null;
  if (sello && _mem.sello === sello && _mem.filas) {
    logDev(`corpus desde memoria caliente (${_mem.filas.length} filas)`);
    return _mem.filas;
  }
  const claves = await redis.scan(CLAVES.patronChunks);
  if (!claves.length) return null;
  const porClave = new Map();
  for (let i = 0; i < claves.length; i += 8) {
    const lote = await redis.mget(claves.slice(i, i + 8));
    for (const b of lote) {
      for (const r of (descomprimir(b) || [])) {
        const prev = porClave.get(r._k);
        if (!prev || (r[":updated_at"] || "") >= (prev[":updated_at"] || "")) porClave.set(r._k, r);
      }
    }
  }
  const filas = [...porClave.values()];
  if (sello) _mem = { sello, filas };
  logDev(`corpus leído de Redis: ${claves.length} chunks → ${filas.length} filas únicas`);
  return filas;
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
  let meta, filas;
  try {
    meta = await leerJSON(redis, CLAVES.meta);
    filas = await cargarCorpus(redis, meta);
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

  /* ---------- filtros ---------- */
  const anticipoMin = q.anticipo_min !== undefined ? parseFloat(q.anticipo_min) : ANTICIPO_MIN_DEFAULT;
  const fCuantia = ["bajo", "medio", "alto"].includes(q.cuantia_rango) ? q.cuantia_rango : null;
  const fCompetencia = ["baja", "media", "alta"].includes(q.nivel_competencia) ? q.nivel_competencia : null;
  const fUbicacion = q.ubicacion_valida === undefined ? null : ["true", "1"].includes(String(q.ubicacion_valida));
  const soloAbiertas = q.incluir_cerradas !== "1";

  let lista = filas.filter((l) => {
    if (!modalidad_competitiva(l)) return false; // defensa: corpus previo al filtro
    if (soloAbiertas && !l.proceso_abierto) return false;
    // anticipo 0 = "no declarado" (el dataset no trae la columna): pasa el
    // filtro pero puntúa 0; solo se excluye el anticipo declarado bajo mínimo
    if (anticipoMin > 0 && l.anticipo_pct > 0 && l.anticipo_pct < anticipoMin) return false;
    if (fCuantia && l.cuantia_rango !== fCuantia) return false;
    if (fCompetencia && l.nivel_competencia !== fCompetencia) return false;
    if (fUbicacion !== null && l.ubicacion_valida !== fUbicacion) return false;
    return rup_valido(l, perfil);
  });

  /* ---------- orden ---------- */
  const campo = Object.prototype.hasOwnProperty.call(ORDEN_CAMPOS, q.ordenar_por)
    ? ORDEN_CAMPOS[q.ordenar_por] : ORDEN_CAMPOS.puntaje;
  const dir = q.orden === "asc" ? 1 : -1;
  lista.sort((a, b) => {
    const d = campo(a) - campo(b);
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
    .map((l) => ({ ...l, rup: evaluarRup(l, perfil) })); // detalle RUP/K solo en la página servida

  logDev(`perfil=${perfil} corpus=${filas.length} filtradas=${total} página=${pagina}`);
  return res.status(200).json({
    ok: true, total, resultados, pagina, por_pagina: porPagina, perfil,
    sincronizado: meta ? meta.last_sync : null,
  });
};
