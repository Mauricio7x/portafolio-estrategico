/* ============================================================================
   /api/sync · Sincronización de la caché SECOP (carga completa + delta)
   ----------------------------------------------------------------------------
   Modos (?modo=):
     full   → carga completa del año vigente (reanudable: cada invocación
              avanza hasta ~45 s y guarda el cursor; repetir hasta done:true).
              Solo con secreto (es costosa).
     delta  → nuevos/modificados desde la última sincronización (barata).
     auto   → lo que toque: si no hay carga completa terminada, continúa la
              full; si la hay, delta si la caché tiene >10 min; si no, no-op.
   Auth:
     - Authorization: Bearer CRON_SECRET  (Vercel Cron / GitHub Actions)
     - ?secret=CRON_SECRET                (invocación manual)
     - mismo origen (navegador de la app) → SOLO modo auto/delta, para que la
       vista de oportunidades pueda refrescar sin exponer la carga completa.
   Un candado en KV (SET NX EX) evita sincronizaciones concurrentes cuando
   varios visitantes disparan el refresco a la vez.
   ========================================================================== */

import { crearExtractor } from "../lib/extractor.js";
import { crearAlmacen, claves } from "../lib/almacen.js";
import { hayCredenciales } from "../lib/redis.js";

function esOrigenPropio(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  try { return !!propio && new URL(origen).host.toLowerCase() === propio; } catch { return false; }
}

export default async function handler(req, res) {
  // OJO: sin la guarda !!secreto, la env var ausente produciría el literal
  // 'Bearer undefined' y cualquiera podría pasar como autorizado.
  const secreto = process.env.CRON_SECRET;
  const conSecreto = !!secreto && (req.headers["authorization"] === `Bearer ${secreto}`
    || (req.query.secret && req.query.secret === secreto));
  const propio = esOrigenPropio(req);
  if (!conSecreto && !propio) return res.status(401).json({ error: "no autorizado" });

  const modo = (req.query.modo || "auto").toLowerCase();
  if ((modo === "full" || modo === "purga" || modo === "diagnostico") && !conSecreto) {
    return res.status(403).json({ error: modo + " requiere secreto" });
  }

  if (!hayCredenciales()) {
    return res.status(503).json({ error: "Falta Upstash Redis (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN). Ver lib/README.md" });
  }
  const store = crearAlmacen({});
  const K = claves("");

  // Desbloqueo de emergencia también como modo (además de /api/sync/unlock):
  //   /api/sync?modo=unlock&secret=CRON_SECRET
  if (modo === "unlock") {
    if (!conSecreto) return res.status(403).json({ error: "unlock requiere secreto" });
    try {
      const habia = await store.get(K.lock);
      await store.del(K.lock);
      console.log(`[sync] desbloqueo manual (?modo=unlock): habiaCandado=${habia != null}`);
      return res.status(200).json({ ok: true, desbloqueado: true, habiaCandado: habia != null, msg: "desbloqueado" });
    } catch (e) {
      return res.status(502).json({ ok: false, error: "Redis inaccesible: " + String(e && e.message || e) });
    }
  }

  // Censo de la base (solo lectura, sin candado): clasifica TODAS las claves
  // en válidas / huérfanas / ajenas. Para diagnosticar cuotas excedidas.
  if (modo === "diagnostico") {
    try {
      const r0 = await crearExtractor({ store }).diagnosticar({});
      return res.status(200).json({ ok: true, modo, comandosRedis: store.comandos ? store.comandos() : null, ...r0 });
    } catch (e) {
      return res.status(502).json({ ok: false, modo, error: String(e && e.message || e) });
    }
  }

  /* ── Candado anti-concurrencia con TRIPLE protección ────────────────────
     1) TTL en Redis (320 s > maxDuration): si Vercel mata la función y el
        finally no corre, el candado se limpia solo.
     2) TIMESTAMP dentro del valor: si el TTL no operara (almacén sin TTL,
        clave restaurada de un backup, etc.), un candado con más de
        LOCK_STALE_MS se considera MUERTO y la llamada lo sobrescribe y
        continúa, en vez de rechazar para siempre.
     3) Un error de Redis al tomar el candado ya NO se disfraza de
        "enCurso": responde 502 con la causa real. (El bug original: el
        .catch(() => false) convertía credenciales inválidas o base caída
        en un "ya hay una sincronización corriendo" eterno que ni vaciar
        Redis ni redeployar podía quitar.)
     La liberación va en finally comparando el token (nunca borra el
     candado de otra corrida). ─────────────────────────────────────────── */
  // TTL 900 s (15 min) como red de seguridad de Redis; la liberación
  // EFECTIVA de un candado muerto llega antes, a los 10 min, por el
  // timestamp (ambos umbrales > maxDuration 300 s: jamás matan un candado
  // de una función viva).
  const LOCK_TTL_S = 900, LOCK_STALE_MS = 10 * 60e3;
  const token = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()) + Date.now();
  const valorLock = JSON.stringify({ t: Date.now(), token });
  let lock, candadoPrevio = null;
  try {
    lock = await store.setNX(K.lock, valorLock, LOCK_TTL_S);
    if (!lock) {
      const crudo = await store.get(K.lock);
      try { candadoPrevio = JSON.parse(crudo); } catch (e) { /* formato legado sin timestamp */ }
      const edadMs = candadoPrevio && candadoPrevio.t ? Date.now() - candadoPrevio.t : (crudo == null ? Infinity : null);
      if (crudo == null || edadMs === Infinity || (edadMs != null && edadMs > LOCK_STALE_MS)) {
        // candado muerto (o desaparecido entre el setNX y el get): tómalo
        console.log(`[sync] candado muerto (edad ${edadMs === Infinity ? "desconocida/legado" : Math.round(edadMs / 1000) + "s"}): se sobrescribe y se continúa`);
        await store.del(K.lock);
        lock = await store.setNX(K.lock, valorLock, LOCK_TTL_S);
      }
    }
  } catch (e) {
    console.error("[sync] Redis inaccesible al tomar el candado:", String(e && e.message || e));
    return res.status(502).json({ ok: false, error: "Redis inaccesible al tomar el candado: " + String(e && e.message || e) });
  }
  if (!lock) {
    const startedAt = candadoPrevio && candadoPrevio.t ? new Date(candadoPrevio.t).toISOString() : null;
    console.log(`[sync] ocupado: candado vivo desde ${startedAt || "(formato legado)"}`);
    return res.status(202).json({
      ok: true, enCurso: true, startedAt,
      msg: "ya hay una sincronización corriendo (se libera sola en ≤ 10 min)",
    });
  }
  console.log(`[sync] inicio modo=${modo} presupuesto=${Math.min(parseInt(req.query.presupuesto, 10) || 240000, 280000)}ms`);

  const x = crearExtractor({ store });
  const presupuestoMs = Math.min(parseInt(req.query.presupuesto, 10) || 240000, 280000);
  const t0 = Date.now();
  try {
    let r;
    if (modo === "purga") {
      // borra claves huérfanas/ajenas; con el candado tomado, ningún delta
      // puede estar escribiendo chunks que el censo aún no ve en el manifest
      r = await x.diagnosticar({ purgar: true, force: req.query.force === "1" });
      if (r && r.ok === false) return res.status(409).json({ ...r, modo });
    } else if (modo === "full") {
      r = await x.extraerTodo({ presupuestoMs });
    } else if (modo === "delta") {
      r = await x.extraerDelta({ presupuestoMs });
    } else { // auto
      const est = await x.estado();
      const meta = est.meta || {};
      const progreso = est.progreso || {};
      if (progreso.tipo === "full" && !progreso.terminado) {
        if (!conSecreto) { r = { ok: true, msg: "carga completa en curso: la continúa el cron" }; }
        else r = await x.extraerTodo({ presupuestoMs });
      } else if (!meta.last_full) {
        r = conSecreto ? await x.extraerTodo({ presupuestoMs })
          : { ok: true, msg: "sin carga inicial: ejecútala con ?modo=full&secret=…" };
      } else if (Date.now() - Date.parse(meta.last_sync || 0) > 10 * 60e3) {
        r = await x.extraerDelta({ presupuestoMs });
      } else {
        r = { ok: true, alDia: true, last_sync: meta.last_sync };
      }
    }
    console.log(`[sync] fin modo=${modo} en ${Date.now() - t0}ms →`, JSON.stringify(r).slice(0, 300));
    // comandosRedis: consumo de esta invocación contra el presupuesto diario
    // del tier gratuito de Upstash (~10 000 comandos/día)
    return res.status(200).json({ ok: true, enCurso: false, modo, duracionMs: Date.now() - t0, comandosRedis: store.comandos ? store.comandos() : null, ...r });
  } catch (e) {
    console.error(`[sync] ERROR modo=${modo} tras ${Date.now() - t0}ms:`, String(e && e.message || e));
    return res.status(502).json({ ok: false, modo, error: String(e && e.message || e), comandosRedis: store.comandos ? store.comandos() : null });
  } finally {
    // libera SOLO nuestro candado (por token); ante cualquier error aquí,
    // el TTL y el detector de candados muertos hacen el resto
    try {
      const crudo = await store.get(K.lock);
      let p = null; try { p = JSON.parse(crudo); } catch (e) { /* legado */ }
      if ((p && p.token === token) || crudo === token) { await store.del(K.lock); console.log("[sync] candado liberado"); }
    } catch (e) { /* TTL limpia */ }
  }
}
