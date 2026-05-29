/* ============================================================================
   /api/proxy  ·  Proxy de Socrata para el navegador (Detecta)
   ----------------------------------------------------------------------------
   El front llama /api/proxy?url=<URL-de-Socrata>. Este proxy:
     1. Valida que la URL sea de datos.gov.co (evita ser un open-proxy abierto).
     2. Inyecta el App Token de Socrata (variable de entorno) → cuota mayor.
     3. Resuelve CORS para que el navegador no se queje.
   Variable de entorno requerida en Vercel:  SOCRATA_APP_TOKEN
   ========================================================================== */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();

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
