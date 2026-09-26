/* lib/rutina.js · despertar una rutina de Claude Code por HTTP (26-sep-2026)
   Una sola copia del disparo para las dos rutinas que la aplicación despierta:
   la de Precios («Buscar», lib/apu/precios_ia.js) y la del dictamen del pliego
   («Leer el pliego completo con inteligencia artificial», lib/handlers/pliego/
   dictamen.js). Nació dentro de precios_ia.js el 13-sep-2026; se mudó aquí
   cuando llegó la segunda rutina, porque dos copias del mismo disparo divergen a
   la primera corrección. Quien llama lee sus variables de entorno DIRECTAMENTE
   (process.env.X): así el censo de variables de la suite las sigue viendo.

   `despertar` devuelve siempre un objeto, nunca lanza: un fallo es una
   OBSERVACIÓN con `motivo` (para la pantalla, en palabras del usuario y sin
   nombres del sistema) y `detalle` (para quien configura, con el token tachado). */
"use strict";

const BETA = "experimental-cc-routine-2026-04-01";
const URL_RE = /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[A-Za-z0-9_-]+\/fire$/;
const TIEMPO_MS = 8000;

/* que: «la búsqueda automática» · quePlural: «búsquedas automáticas» · varUrl/varToken:
   los NOMBRES de las variables, solo para el detalle de configuración */
async function despertar({ url, token, texto, que, quePlural, varUrl, varToken, fetchImpl = null, tiempoMs = TIEMPO_MS } = {}) {
  const el = new Date().toISOString();
  url = String(url == null ? "" : url).trim();
  token = String(token == null ? "" : token).trim();
  const tachar = (t) => (token.length >= 4 ? String(t == null ? "" : t).split(token).join("«clave tachada»") : String(t == null ? "" : t));
  const fallo = (status, motivo, detalle, extra = {}) => ({ ok: false, el, status, motivo, detalle: tachar(detalle), sesion_url: null, sesion_id: null, ...extra });
  if (!URL_RE.test(url)) return fallo(null, `${que} no está bien configurada`, `${varUrl} no tiene la forma de la dirección de disparo de una rutina (…/v1/claude_code/routines/<id>/fire)`);
  const f = fetchImpl || globalThis.fetch;
  let r;
  try {
    r = await f(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "anthropic-beta": BETA, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(tiempoMs) : undefined,
    });
  } catch (e) {
    const nombre = e && e.name ? String(e.name) : "";
    /* el disparo que EXPIRA es indeterminado: la sesión puede haber arrancado igual, así
       que ni se afirma ni se niega, y no se vuelve a disparar dentro de la ventana */
    if (nombre === "TimeoutError" || nombre === "AbortError") return fallo(null, `${que} no respondió a tiempo y puede haber arrancado igual`, `tiempo agotado (${tiempoMs} ms) en el disparo de la rutina`, { indeterminada: true });
    return fallo(null, `no se pudo llamar a ${que}`, `no se pudo llamar a la rutina (${e && e.message ? e.message : e})`);
  }
  /* el parseo del JSON va APARTE del fetch: el muro del edge responde HTML */
  let json = null;
  try { json = await r.json(); } catch { json = null; }
  const status = Number(r.status);
  if (!r.ok) {
    if (status === 401) return fallo(status, `el acceso a ${que} fue rechazado`, `401: el token de la rutina fue rechazado — regenérelo en claude.ai/code/routines y péguelo en Vercel como ${varToken}`);
    if (status === 403) return fallo(status, `la cuenta no tiene permiso para ${que}`, "403 (permission_error): las rutinas están desactivadas para la cuenta o el token no es de esta rutina");
    if (status === 404) return fallo(status, `${que} no está bien configurada`, `404: la rutina no existe con ese identificador — revise ${varUrl}`);
    if (status === 429) return fallo(status, `se agotó por hoy el cupo de ${quePlural}`, "429: tope diario de corridas de rutinas o cuota de la suscripción agotada");
    return fallo(status, `${que} no respondió bien`, `la rutina respondió ${status}`);
  }
  const urlSesion = json && typeof json.claude_code_session_url === "string" ? tachar(json.claude_code_session_url) : "";
  return { ok: true, el, status, motivo: null, detalle: null,
    sesion_id: json && json.claude_code_session_id ? tachar(String(json.claude_code_session_id)).slice(0, 80) : null,
    sesion_url: /^https:\/\/claude\.ai\/\S+$/.test(urlSesion) ? urlSesion : null };
}

module.exports = { BETA, URL_RE, TIEMPO_MS, despertar };
