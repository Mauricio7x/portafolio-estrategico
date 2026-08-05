/* ============================================================================
   /api/apu/descargar · Traer el PDF de un pliego para que pdf.js pueda leerlo
   ----------------------------------------------------------------------------
   POST /api/apu/descargar?token=…   { url }  → { base64, content_type, bytes }

   POR QUÉ EXISTE. El encargo pide poder pegar la URL de un pliego, y muchos son
   URLs públicas. Pero el navegador NO puede descargar ese PDF por su cuenta: la
   política de mismo origen se lo impide salvo que el servidor remoto mande
   `Access-Control-Allow-Origin`, y los portales de contratación no lo mandan. Sin
   este paso, el campo de URL sería un campo que nunca funciona.

   POR QUÉ DEVUELVE EL PDF Y NO EL TEXTO. Extraer el texto exigiría `pdfjs-dist`
   en Node —decenas de MB, fuera del request path (§1.G.3)—. Este endpoint solo
   hace de puente: baja los bytes y los entrega al navegador, que ya tiene un
   motor de PDF y hace el trabajo caro. La arquitectura no cambia; solo se salva
   el CORS.

   SSRF: LA LISTA DE COMPROBACIONES NO ES DECORATIVA. Un endpoint que baja una
   URL arbitraria desde dentro de la infraestructura es un SSRF de manual. Aquí
   está acotado por cuatro cosas a la vez, y ninguna sobra:
     1. exige el token (nadie anónimo llega);
     2. solo `https:` — `file:`, `gopher:` y `http:` en claro fuera;
     3. el host no puede ser una IP, ni localhost, ni un dominio interno
        (`.local`, `.internal`), ni un literal de rango privado;
     4. no se siguen redirecciones automáticamente: una redirección a
        `169.254.169.254` es la forma clásica de saltarse el punto 3, así que se
        siguen A MANO, revalidando el destino en cada salto.

   El tamaño se controla MIENTRAS se lee, no después: mirar solo
   `Content-Length` deja pasar una respuesta que miente o que no lo declara.
   ========================================================================== */
"use strict";

const { autorizarToken } = require("../../lib/auth.js");

const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB de PDF de origen
const MAX_REDIRECCIONES = 3;
const TIMEOUT_MS = 25000;

/* Rangos que nunca deben alcanzarse desde una función: loopback, enlace local
   (donde viven los metadatos de las nubes), y las tres redes privadas. */
const HOST_PROHIBIDO_RE = new RegExp([
  "^localhost$", "^0(\\.0)*$", "^127\\.", "^10\\.", "^192\\.168\\.",
  "^172\\.(1[6-9]|2\\d|3[01])\\.", "^169\\.254\\.", "^\\[?::1\\]?$", "^\\[?fe80:", "^\\[?fc", "^\\[?fd",
].join("|"), "i");

const SUFIJO_INTERNO_RE = /\.(?:local|internal|localdomain|home|lan|corp|intranet)$/i;

function urlSegura(bruto) {
  let u = null;
  try { u = new URL(String(bruto || "").trim()); } catch { return { ok: false, error: "La URL no es válida." }; }
  if (u.protocol !== "https:") {
    return { ok: false, error: "Solo se aceptan URL «https:». Una URL sin cifrar no se descarga." };
  }
  const host = u.hostname.toLowerCase();
  if (HOST_PROHIBIDO_RE.test(host) || SUFIJO_INTERNO_RE.test(host)) {
    return { ok: false, error: "El destino apunta a una dirección interna o privada: no se descarga." };
  }
  // un host que es un literal IPv4 no se acepta ni fuera de los rangos privados:
  // la vía legítima de un pliego es un nombre de dominio
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { ok: false, error: "El destino es una dirección IP literal: use el nombre de dominio del portal." };
  }
  return { ok: true, url: u };
}

async function leerCuerpo(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") return req.body;
  const crudo = typeof req.body === "string" ? req.body : await new Promise((resolve) => {
    let buf = "";
    if (typeof req.on !== "function") return resolve("");
    req.on("data", (c) => { buf += c; if (buf.length > 8192) buf = buf.slice(0, 8192); });
    req.on("end", () => resolve(buf));
    req.on("error", () => resolve(""));
  });
  try { return JSON.parse(String(crudo || "{}")); } catch { return {}; }
}

/* Lee el cuerpo cortando en cuanto se pasa del tope. Se acumulan trozos y se
   cuenta al vuelo: un `arrayBuffer()` a secas se traería los 500 MB de un
   destino hostil antes de que nadie pudiera comprobar el tamaño. */
async function leerConTope(respuesta) {
  const declarado = parseInt(respuesta.headers.get("content-length") || "", 10);
  if (Number.isFinite(declarado) && declarado > MAX_BYTES) {
    return { ok: false, error: `El archivo declara ${Math.round(declarado / 1024 / 1024)} MB y el tope es ${MAX_BYTES / 1024 / 1024} MB.` };
  }
  if (!respuesta.body || typeof respuesta.body.getReader !== "function") {
    const buf = Buffer.from(await respuesta.arrayBuffer());
    if (buf.length > MAX_BYTES) return { ok: false, error: `El archivo pesa más de ${MAX_BYTES / 1024 / 1024} MB.` };
    return { ok: true, buf };
  }
  const lector = respuesta.body.getReader();
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      try { await lector.cancel(); } catch { /* ya da igual: se aborta la descarga */ }
      return { ok: false, error: `El archivo supera el tope de ${MAX_BYTES / 1024 / 1024} MB.` };
    }
    trozos.push(Buffer.from(value));
  }
  return { ok: true, buf: Buffer.concat(trozos) };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });

  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Método no permitido: use POST con {\"url\": \"https://…\"}.",
      limites: { max_mb: MAX_BYTES / 1024 / 1024, solo_https: true, redirecciones: MAX_REDIRECCIONES },
    });
  }

  const datos = await leerCuerpo(req);
  const revisada = urlSegura(datos && datos.url);
  if (!revisada.ok) return res.status(400).json({ ok: false, error: revisada.error });

  let destino = revisada.url;
  let r = null;
  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
    const corte = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    try {
      r = await fetch(destino.toString(), {
        redirect: "manual",     // los saltos se siguen A MANO para revalidar el destino
        headers: { Accept: "application/pdf,*/*", "User-Agent": "Detecta/1.0 (+lector de pliegos)" },
        signal: corte,
      });
    } catch (e) {
      return res.status(502).json({ ok: false, error: `No se pudo descargar: ${(e && e.message) || "error de red"}.` });
    }
    if (r.status >= 300 && r.status < 400) {
      const siguiente = r.headers.get("location");
      if (!siguiente) return res.status(502).json({ ok: false, error: `El servidor respondió ${r.status} sin destino de redirección.` });
      if (salto === MAX_REDIRECCIONES) {
        return res.status(502).json({ ok: false, error: `Demasiadas redirecciones (${MAX_REDIRECCIONES}).` });
      }
      let resuelta = null;
      try { resuelta = new URL(siguiente, destino); } catch { return res.status(502).json({ ok: false, error: "La redirección no es una URL válida." }); }
      // REVALIDAR el salto: es justo aquí donde se intentaría el salto a una IP interna
      const otra = urlSegura(resuelta.toString());
      if (!otra.ok) return res.status(400).json({ ok: false, error: `La redirección apunta a un destino no permitido. ${otra.error}` });
      destino = otra.url;
      continue;
    }
    break;
  }

  if (!r.ok) {
    return res.status(502).json({
      ok: false,
      error: `El servidor del pliego respondió ${r.status}. Muchos portales de contratación exigen sesión para `
        + "descargar los adjuntos: si es el caso, baje el archivo a mano y súbalo con el selector de archivo.",
      status_remoto: r.status,
    });
  }

  const leido = await leerConTope(r);
  if (!leido.ok) return res.status(413).json({ ok: false, error: leido.error });
  if (!leido.buf.length) return res.status(502).json({ ok: false, error: "El servidor devolvió un archivo vacío." });

  const tipo = String(r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const esPdf = leido.buf.slice(0, 5).toString("latin1") === "%PDF-";
  if (!esPdf) {
    /* El tipo declarado no basta: los portales sirven HTML de sesión con
       `Content-Type: application/pdf`. Lo que decide es la firma del fichero. */
    return res.status(415).json({
      ok: false,
      error: "Lo descargado no es un PDF (le falta la firma «%PDF-»). Lo más probable es que el portal haya "
        + "devuelto una página de sesión o de error en vez del documento. Baje el archivo a mano y súbalo.",
      content_type_declarado: tipo || null,
      primeros_bytes: leido.buf.slice(0, 16).toString("latin1").replace(/[^\x20-\x7e]/g, "."),
    });
  }

  return res.status(200).json({
    ok: true,
    base64: leido.buf.toString("base64"),
    content_type: tipo || "application/pdf",
    bytes: leido.buf.length,
    url_final: destino.toString(),
    nota: "El PDF se devuelve en base64 para que pdf.js lo lea EN EL NAVEGADOR: extraer el texto en el "
      + "servidor exigiría pdfjs-dist, que pesa decenas de MB y no cabe en el request path.",
  });
};
