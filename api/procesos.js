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
// 1500 filas × ~2.5 KB (peor caso, descripción truncada a 1500) ≈ 3.8 MB,
// bajo el límite de respuesta de Vercel (4.5 MB). Medido en tests.
const LIMIT_MAX = 1500;
const FRESCA_MS = 60 * 60e3; // "fresca" = sincronizada hace menos de 1 h

function esOrigenAjeno(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  if (!origen || !propio) return false;
  try { return new URL(origen).host.toLowerCase() !== propio; } catch { return true; }
}

/* Memoria caliente entre invocaciones de la misma instancia: se memoiza el
   resultado FUSIONADO (dedup entre meses + orden) por mes-de-inicio, así las
   páginas sucesivas del mismo radar son un slice y no re-hacen dedup+sort
   sobre cientos de miles de filas. Tope de 3 rangos para acotar el heap. */
let _mem = { sello: null, fusion: new Map() };

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
      desde: meta.desde || null,   // inicio de cobertura de la caché
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
  if (_mem.sello !== meta.last_sync) _mem = { sello: meta.last_sync, fusion: new Map() };

  const claveRango = desde.slice(0, 7);
  let lista = _mem.fusion.get(claveRango);
  if (!lista) {
    const x = crearExtractor({ store });
    const meses = mesesDelRango(claveRango + "-01T00:00:00.000");
    let filas = [];
    for (const mes of meses) filas = filas.concat((await x.leerMes(mes)).registros);
    // dedup ENTRE meses: si un proceso cambió de mes de publicación entre
    // sincronizaciones puede vivir en dos particiones; gana el :updated_at
    // más reciente (leerMes ya deduplica DENTRO de cada mes).
    const porClave = new Map();
    for (const f of filas) {
      const prev = porClave.get(f._k);
      if (!prev || (f[":updated_at"] || "") >= (prev[":updated_at"] || "")) porClave.set(f._k, f);
    }
    lista = [...porClave.values()].sort((a, b) => {
      const A = String(a[CAMPO_FECHA] || ""), B = String(b[CAMPO_FECHA] || "");
      return A < B ? 1 : A > B ? -1 : 0;
    });
    if (_mem.fusion.size >= 3) _mem.fusion.delete(_mem.fusion.keys().next().value);
    _mem.fusion.set(claveRango, lista);
  }

  let filas = lista.filter(f => String(f[CAMPO_FECHA] || "") >= desde);
  // filtros de valor OPCIONALES en servidor (misma semántica que el $where
  // Socrata: min excluye nulos por NaN, max exige precio presente)
  const min = parseFloat(req.query.min), max = parseFloat(req.query.max);
  if (min > 0) filas = filas.filter(f => parseFloat(f.precio_base) >= min);
  if (max > 0) filas = filas.filter(f => { const p = parseFloat(f.precio_base); return !isNaN(p) && p <= max; });
  return res.status(200).json(filas.slice(offset, offset + limit));
}
