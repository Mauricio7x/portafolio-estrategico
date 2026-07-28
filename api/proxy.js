/* ============================================================================
   /api/proxy  ·  Proxy de Socrata para el navegador (Detecta)
   ----------------------------------------------------------------------------
   El front llama /api/proxy?url=<URL-de-Socrata>. Este proxy:
     1. Valida que la URL sea de datos.gov.co (evita ser un open-proxy abierto).
     2. Inyecta el App Token de Socrata (variable de entorno) → cuota mayor.
     3. Resuelve CORS para que el navegador no se queje.
   Variable de entorno requerida en Vercel:  SOCRATA_APP_TOKEN
   ========================================================================== */

/* La web llama same-origin, así que no hace falta CORS abierto. Se rechaza
   solo cuando hay evidencia de un origen AJENO (Origin/Referer de otro host);
   sin cabeceras no se bloquea, para no romper navegadores con extensiones de
   privacidad agresivas — el dato servido es público en todo caso. */
function esOrigenAjeno(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  if (!origen || !propio) return false;
  try { return new URL(origen).host.toLowerCase() !== propio; } catch { return true; }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (esOrigenAjeno(req)) return res.status(403).json({ error: "Origen no autorizado" });

  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Falta el parámetro url" });

  let parsed;
  try { parsed = new URL(target); } catch { return res.status(400).json({ error: "URL inválida" }); }
  if (!/(^|\.)datos\.gov\.co$/.test(parsed.hostname)) {
    return res.status(403).json({ error: "Solo se permiten URLs de datos.gov.co" });
  }

  const headers = { Accept: "application/json" };
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;

  try {
    const r = await fetch(target, { headers });
    const body = await r.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // cache corto en el edge para no martillar Socrata
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: "Socrata no respondió", detail: String(e) });
  }
}
