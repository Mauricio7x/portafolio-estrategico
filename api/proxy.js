// ============================================================================
//  Detecta · Proxy serverless (Vercel)
//  Cartero confiable propio: reemplaza los proxies CORS públicos.
//  - Inyecta el App Token de Socrata (variable de entorno SOCRATA_APP_TOKEN).
//  - Solo permite destinos en una allowlist (anti-abuso / anti-SSRF).
//  - Reenvía JSON, HTML y binarios (PDF) preservando el content-type.
//
//  Uso desde el front:  /api/proxy?url=<URL_ENCODED>
//
//  Configura en Vercel → Project → Settings → Environment Variables:
//     SOCRATA_APP_TOKEN = <tu app token de datos.gov.co>
// ============================================================================

const ALLOWED_HOSTS = [
  "www.datos.gov.co",
  "datos.gov.co",
  "api.gdeltproject.org",
  "news.google.com",
  "www.colombiacompra.gov.co",
  "community.secop.gov.co",
  "www.secop.gov.co",
  "prod1.secop.gov.co",
  "www.dane.gov.co",
];

function hostAllowed(host) {
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h));
}

export default async function handler(req, res) {
  // CORS: este proxy lo consume tu propia página servida desde Vercel.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const target = req.query.url;
  if (!target) { res.status(400).json({ error: "Falta parámetro url" }); return; }

  let parsed;
  try { parsed = new URL(target); }
  catch { res.status(400).json({ error: "URL inválida" }); return; }

  if (parsed.protocol !== "https:") {
    res.status(400).json({ error: "Solo se permite https" }); return;
  }
  if (!hostAllowed(parsed.hostname)) {
    res.status(403).json({ error: "Host no permitido: " + parsed.hostname }); return;
  }

  // Cabeceras de salida. Inyectamos el token de Socrata solo a datos.gov.co.
  const outHeaders = {
    "Accept": req.headers["accept"] || "application/json,text/html,*/*",
    "User-Agent": "Detecta/1.0 (+vercel-proxy)",
  };
  if (parsed.hostname.endsWith("datos.gov.co") && process.env.SOCRATA_APP_TOKEN) {
    outHeaders["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const upstream = await fetch(parsed.toString(), {
      headers: outHeaders,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    // Cache corto en el edge para aliviar SECOP/GDELT en recargas seguidas.
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");

    // Binario (PDF u otros) → buffer. Texto/JSON → passthrough de string.
    if (ct.includes("application/pdf") || ct.includes("octet-stream")) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status).send(buf);
    } else {
      const body = await upstream.text();
      res.status(upstream.status).send(body);
    }
  } catch (e) {
    const msg = (e && e.name === "AbortError") ? "Tiempo de espera agotado" : (e.message || "Error de red");
    res.status(502).json({ error: "Fallo al contactar el destino", detail: msg });
  }
}
