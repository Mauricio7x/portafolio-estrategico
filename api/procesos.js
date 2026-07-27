/* ============================================================================
   /api/procesos · Sirve el radar desde la caché KV (capa de extracción)
   ----------------------------------------------------------------------------
   La web consulta AQUÍ en vez de golpear Socrata en caliente; Socrata queda
   solo para las sincronizaciones (/api/sync). Contrato pensado para encajar
   con el bucle de paginación que la app ya tenía:

     GET /api/procesos?meta=1
         → { total, last_sync, last_full, frescaMs, fresca, auditoria }
     GET /api/procesos?desde=2026-06-01T00:00:00&limit=4000&offset=0
         → [ filas ]  (misma forma de campos que Socrata: mapProcess ni se
           entera de que el origen cambió). Orden: fecha de publicación DESC.
           limit ≤ 4000 para no rozar el tope de respuesta de Vercel (4.5 MB).

   Rendimiento: los meses descomprimidos se memorizan a nivel de módulo
   (instancia serverless caliente) con el sello last_sync como clave, así las
   páginas sucesivas del mismo radar no releen KV.
   ========================================================================== */

import { crearExtractor, mesesDelRango } from "../lib/extractor.js";
import { crearAlmacen, leerJSON, claves } from "../lib/almacen.js";

const CAMPO_FECHA = "fecha_de_publicacion_del";
// 2000 filas × ~1.9 KB (peor caso, descripción truncada a 800) ≈ 3.7 MB,
// bajo el límite de respuesta de Vercel (4.5 MB). Medido en tests.
const LIMIT_MAX = 2000;
const FRESCA_MS = 60 * 60e3; // "fresca" = sincronizada hace menos de 1 h

function esOrigenAjeno(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  if (!origen || !propio) return false;
  try { return new URL(origen).host.toLowerCase() !== propio; } catch { return true; }
}

/* memoria caliente entre invocaciones de la misma instancia */
let _mem = { sello: null, meses: new Map() };

export default async function handler(req, res) {
  if (esOrigenAjeno(req)) return res.status(403).json({ error: "Origen no autorizado" });
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: "sin KV: usa la ruta Socrata directa" });
  }
  res.setHeader("Cache-Control", "no-store");
  const store = crearAlmacen({});
  const meta = (await leerJSON(store, claves("").meta)) || {};

  if (req.query.meta) {
    const frescaMs = meta.last_sync ? Date.now() - Date.parse(meta.last_sync) : null;
    return res.status(200).json({
      total: meta.total || 0,
      last_sync: meta.last_sync || null,
      last_full: meta.last_full || null,
      frescaMs,
      fresca: frescaMs != null && frescaMs < FRESCA_MS,
      auditoria: meta.auditoria ? {
        esperados: meta.auditoria.esperados, almacenados: meta.auditoria.almacenados,
        diferencia: meta.auditoria.diferencia, ts: meta.auditoria.ts,
      } : null,
    });
  }

  if (!meta.last_full) return res.status(503).json({ error: "caché sin carga inicial" });

  const desde = String(req.query.desde || "").slice(0, 23);
  if (!/^\d{4}-\d{2}-\d{2}/.test(desde)) return res.status(400).json({ error: "falta ?desde=YYYY-MM-DDTHH:mm:ss" });
  const limit = Math.min(parseInt(req.query.limit, 10) || LIMIT_MAX, LIMIT_MAX);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  // invalidar la memoria caliente si hubo sincronización nueva
  if (_mem.sello !== meta.last_sync) _mem = { sello: meta.last_sync, meses: new Map() };

  const x = crearExtractor({ store });
  const meses = mesesDelRango(desde.slice(0, 7) + "-01T00:00:00.000");
  let filas = [];
  for (const mes of meses) {
    if (!_mem.meses.has(mes)) {
      const { registros } = await x.leerMes(mes);
      _mem.meses.set(mes, registros);
    }
    filas = filas.concat(_mem.meses.get(mes));
  }
  // dedup ENTRE meses: si un proceso cambió de mes de publicación entre
  // sincronizaciones puede vivir en dos particiones; gana el :updated_at
  // más reciente (leerMes ya deduplica DENTRO de cada mes).
  const porClave = new Map();
  for (const f of filas) {
    const prev = porClave.get(f._k);
    if (!prev || (f[":updated_at"] || "") >= (prev[":updated_at"] || "")) porClave.set(f._k, f);
  }
  filas = [...porClave.values()].filter(f => String(f[CAMPO_FECHA] || "") >= desde);
  filas.sort((a, b) => String(b[CAMPO_FECHA] || "").localeCompare(String(a[CAMPO_FECHA] || "")));
  return res.status(200).json(filas.slice(offset, offset + limit));
}
