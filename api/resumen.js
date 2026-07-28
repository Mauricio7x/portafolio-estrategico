/* ============================================================================
   /api/resumen  ·  Resumen IA por proceso (botón en la web)
   ----------------------------------------------------------------------------
   El front manda POST { nombre, entidad, valor, ciudad, depto, descripcion,
   perfil, score }. Devuelve { resumen }. Mismo formato que el de Telegram.
   Variable de entorno: ANTHROPIC_API_KEY
   ========================================================================== */

/* Solo el propio sitio: la web llama same-origin (no necesita CORS) y el
   endpoint gasta una API key de pago — sin este control, cualquiera en
   internet podía consumirla. El navegador siempre envía Origin en POST. */
function esOrigenPropio(req) {
  const propio = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origen = req.headers.origin || req.headers.referer || "";
  try { return !!propio && new URL(origen).host.toLowerCase() === propio; } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "usa POST" });
  if (!esOrigenPropio(req)) return res.status(403).json({ error: "Origen no autorizado" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Falta ANTHROPIC_API_KEY" });

  const b = req.body || {};
  const prompt = `Resume en 2 frases, tono ejecutivo y directo, este proceso de contratación pública colombiano para un contratista de obra civil. Frase 1: qué es y monto. Frase 2: por qué encaja (perfil ${b.perfil || "—"}, encaje ${b.score || "—"}/100) o qué lo limita. Sin preámbulos, sin viñetas.

Objeto: ${b.nombre || ""}
Entidad: ${b.entidad || ""}
Valor: ${b.valor || ""}
Ubicación: ${b.ciudad || ""}, ${b.depto || ""}
Descripción: ${(b.descripcion || "").slice(0, 800)}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await r.json();
    const resumen = (j.content || []).map(c => c.text || "").join(" ").trim();
    return res.status(200).json({ resumen: resumen || "No se pudo generar el resumen." });
  } catch (e) {
    return res.status(502).json({ error: "La IA no respondió", detail: String(e) });
  }
}
