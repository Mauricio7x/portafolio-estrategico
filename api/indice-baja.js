/* ============================================================================
   /api/indice-baja · El índice de baja de mercado, completo o por entidad
   ----------------------------------------------------------------------------
   GET /api/indice-baja                      → el índice entero + la meta
   GET /api/indice-baja?entidad=INVIAS       → solo esa entidad (nombre o NIT)
   GET /api/indice-baja?reconstruir=true     → lo reconstruye y devuelve la meta
       (token por header `x-historico-token` o por `?token=`)

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/diagnostico (lib/auth): dice
   a qué precio se adjudica en cada entidad, que es exactamente la información
   con la que se decide una oferta.

   ── POR QUÉ LA RECONSTRUCCIÓN VIVE AQUÍ Y NO EN /api/diagnostico ───────────
   El encargo ofrecía las dos opciones. `/api/diagnostico` está documentado como
   SOLO LEE —no escribe, no toma candados, no dispara sincronizaciones— y esa
   garantía es lo que permite llamarlo sin miedo cuando algo va mal en
   producción. Meterle una reconstrucción que toma un candado de 300 s la
   rompería. Va aquí, que es el endpoint dedicado del índice.
   `/api/sync/historico?reconstruir_baja=true` sigue funcionando igual: es la
   vía que comparte presupuesto y encadenamiento con los otros tres derivados.

   ── CACHÉ ─────────────────────────────────────────────────────────────────
   `indice:baja:cache`, TTL 1 h, comprimida (el índice entero pasa de 500 KB con
   facilidad y un valor de Upstash tope a 1 MB). El valor lleva el SELLO de
   construcción del índice: reconstruirlo la invalida sola, además de que la
   propia construcción la borra. Una caché que solo caduca es una caché que
   miente durante una hora. `?refrescar=1` la salta.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { autorizarToken } = require("../lib/auth.js");
const {
  CLAVES, leerJSONComprimido, escribirJSONComprimido,
} = require("../lib/almacen.js");
const {
  construirIndiceBaja, leerIndiceBaja, leerIndiceBajaMeta, MIN_PROCESOS, MIN_SEGMENTO,
} = require("../lib/indice_baja.js");
const { claveCanonica } = require("../lib/indice_competencia.js");

const TTL_CACHE_SEG = 3600;
const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[indice-baja]", ...a); };

const siNo = (v) => ["1", "true", "si", "sí"].includes(String(v).toLowerCase());

/* Sello del índice: si cambia, la caché guardada ya no describe lo vigente. */
const selloDe = (meta) => (meta ? `${meta.generado}|${meta.procesos_analizados}` : "-");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false, error: permiso.error,
      ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
    });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  }

  const redis = crearRedis({});
  const t0 = Date.now();

  /* ---------- reconstrucción a la carta ---------- */
  if (siNo(q.reconstruir)) {
    try {
      const r = await construirIndiceBaja(redis, {
        presupuestoMs: Math.min(parseInt(q.presupuesto, 10) || 40000, 60000),
        reiniciar: siNo(q.reiniciar),
        log: logDev,
      });
      // `enCurso` NO es un error: otro proceso tiene el candado y terminará él
      return res.status(200).json({ ok: true, reconstruido: r, duracionMs: Date.now() - t0 });
    } catch (e) {
      return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
    }
  }

  /* ---------- lectura ---------- */
  let meta, indice, cache = null;
  try {
    meta = await leerIndiceBajaMeta(redis);
    if (!meta) {
      return res.status(200).json({
        ok: true,
        construido: false,
        msg: "El índice de baja no se ha construido todavía.",
        como_construirlo: "GET /api/indice-baja?reconstruir=true (mismo token), "
          + "o /api/sync/historico?reconstruir_baja=true. No re-extrae nada de SECOP II.",
        indice: null, meta: null,
      });
    }
    if (!siNo(q.refrescar)) {
      const guardada = await leerJSONComprimido(redis, CLAVES.cacheIndiceBaja);
      if (guardada && guardada.sello === selloDe(meta)) cache = guardada;
    }
    indice = cache ? cache.indice : await leerIndiceBaja(redis);
    if (!cache) {
      await escribirJSONComprimido(redis, CLAVES.cacheIndiceBaja,
        { sello: selloDe(meta), indice }, { ttl: TTL_CACHE_SEG });
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }

  res.setHeader("X-Cache", cache ? "HIT" : "MISS");

  /* ---------- ?entidad= : una sola, por nombre o por NIT ---------- */
  if (q.entidad !== undefined) {
    const pedida = String(q.entidad || "").trim();
    if (!pedida) return res.status(400).json({ ok: false, error: "?entidad= vacío" });
    const porEntidad = indice.entidad || {};
    /* Nombre → clave canónica (la ÚNICA definición de identidad del proyecto).
       Si no casa, se busca por NIT recorriendo el hash: el índice de baja no
       publica alias por NIT a propósito —las regionales de un organismo lo
       comparten, y un alias ambiguo es una respuesta equivocada, no un alias—
       así que un NIT compartido devuelve TODAS las entidades que lo usan en vez
       de elegir una en silencio. */
    const canonica = claveCanonica(pedida);
    const soloDigitos = pedida.replace(/\D/g, "");
    let coincidencias = [];
    if (canonica && Object.prototype.hasOwnProperty.call(porEntidad, canonica)) {
      coincidencias = [{ clave: canonica, ...porEntidad[canonica] }];
    } else if (soloDigitos) {
      coincidencias = Object.entries(porEntidad)
        .filter(([, m]) => m && !m.ref && String(m.nit || "") === soloDigitos)
        .map(([clave, m]) => ({ clave, ...m }));
    }
    if (!coincidencias.length) {
      return res.status(404).json({
        ok: false,
        error: `No hay registro de baja para «${pedida}».`,
        pista: "Se busca por nombre exacto (normalizado) o por NIT. Una entidad con menos de "
          + `${MIN_PROCESOS} adjudicaciones con presupuesto y valor adjudicado no entra en el índice.`,
      });
    }
    return res.status(200).json({
      ok: true,
      construido: true,
      consulta: pedida,
      // varias entidades pueden compartir NIT: se devuelven todas y quien
      // consulta decide, en vez de que el servidor elija una a ciegas
      coincidencias: coincidencias.length,
      entidades: coincidencias,
      min_procesos: MIN_PROCESOS,
      min_procesos_segmento: MIN_SEGMENTO,
      generado: meta.generado,
      duracionMs: Date.now() - t0,
    });
  }

  /* ---------- índice completo ---------- */
  const tamanos = {};
  for (const [nivel, mapa] of Object.entries(indice || {})) tamanos[nivel] = Object.keys(mapa || {}).length;

  return res.status(200).json({
    ok: true,
    construido: true,
    generado: meta.generado,
    meta,
    grupos: tamanos,
    indice,
    duracionMs: Date.now() - t0,
    como_leerlo: "`indice.entidad` es el hash por entidad; dentro de cada registro, `segmentos` trae la "
      + `baja por segmento UNSPSC de 2 dígitos (mínimo ${MIN_SEGMENTO} procesos, más laxo que el `
      + `mínimo de ${MIN_PROCESOS} de la entidad: una mediana de 3 procesos es orientativa, no una `
      + "medición). `entidad_familia`, `departamento_familia` y `departamento` son las otras "
      + "granularidades de la cascada. Ningún registro por debajo de su mínimo publica cifras derivadas: "
      + "conserva el conteo, que es un hecho, y anula mediana, promedio y percentiles.",
  });
};
