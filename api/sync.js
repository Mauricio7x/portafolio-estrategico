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

function esOrigenPropio(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  try { return !!propio && new URL(origen).host.toLowerCase() === propio; } catch { return false; }
}

export default async function handler(req, res) {
  const conSecreto = req.headers["authorization"] === `Bearer ${process.env.CRON_SECRET}`
    || (req.query.secret && req.query.secret === process.env.CRON_SECRET);
  const propio = esOrigenPropio(req);
  if (!conSecreto && !propio) return res.status(401).json({ error: "no autorizado" });

  const modo = (req.query.modo || "auto").toLowerCase();
  if (modo === "full" && !conSecreto) return res.status(403).json({ error: "full requiere secreto" });

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: "Falta Vercel KV (KV_REST_API_URL/KV_REST_API_TOKEN). Ver lib/README.md" });
  }
  const store = crearAlmacen({});
  const K = claves("");

  // candado anti-concurrencia (55 s ≈ maxDuration)
  const lock = await store.setNX(K.lock, String(Date.now()), 55).catch(() => false);
  if (!lock) return res.status(202).json({ ok: true, enCurso: true, msg: "ya hay una sincronización corriendo" });

  const x = crearExtractor({ store });
  const presupuestoMs = Math.min(parseInt(req.query.presupuesto, 10) || 45000, 50000);
  const t0 = Date.now();
  try {
    let r;
    if (modo === "full") {
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
    return res.status(200).json({ ok: true, modo, duracionMs: Date.now() - t0, ...r });
  } catch (e) {
    return res.status(502).json({ ok: false, modo, error: String(e && e.message || e) });
  } finally {
    await store.del(K.lock).catch(() => {});
  }
}
