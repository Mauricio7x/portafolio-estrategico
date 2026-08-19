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
   está acotado por SEIS cosas a la vez, y ninguna sobra:
     1. exige el token (nadie anónimo llega);
     2. solo `https:`, y sin credenciales embebidas en la URL;
     3. el host no puede ser una IP literal (v4, v6, ni `::ffff:` mapeada), ni
        `localhost`, ni un dominio interno (`.local`, `.internal`);
     4. **SE RESUELVE EL NOMBRE Y SE VALIDA LA IP**. Este era el agujero de
        verdad: validar la CADENA del hostname no protege de nada, porque
        cualquier dominio público puede apuntar a 127.0.0.1 o a
        169.254.169.254. Basta una dirección privada entre las resueltas para
        rechazar;
     5. no se siguen redirecciones automáticamente: se siguen A MANO y se
        revalidan nombre Y IP en cada salto, que es donde se intentaría el
        salto de un host público a uno interno;
     6. no se devuelve ningún byte del cuerpo remoto cuando no es un PDF: eso
        convertía el endpoint en un oráculo de lectura.

   Queda una ventana TOCTOU conocida (*DNS rebinding*): el nombre podría cambiar
   de IP entre la comprobación y el `fetch`. Cerrarla exigiría fijar la IP en la
   conexión, que el `fetch` nativo no permite. Está dicho, no disimulado.

   El tamaño se controla MIENTRAS se lee, no después: mirar solo
   `Content-Length` deja pasar una respuesta que miente o que no lo declara.
   ========================================================================== */
"use strict";

const dns = require("dns").promises;
const { autorizarToken } = require("./auth.js");
const { MARCA } = require("./glosario.js");

const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB de PDF de origen
const MAX_REDIRECCIONES = 3;
const TIMEOUT_MS = 25000;

/* Rangos que nunca deben alcanzarse desde una función: loopback, enlace local
   (donde viven los metadatos de las nubes) y las tres redes privadas.
   Se aplican SOBRE UNA IP, no sobre un nombre. */
const IP_PRIVADA_RE = new RegExp([
  "^0(\\.0)*$", "^127\\.", "^10\\.", "^192\\.168\\.",
  "^172\\.(1[6-9]|2\\d|3[01])\\.", "^169\\.254\\.",
  // CGNAT (RFC 6598, 100.64.0.0/10): la red interna típica de balanceadores y
  // clusters gestionados — faltaba, y es tan alcanzable como 10/8 desde dentro
  "^100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.",
].join("|"));

/* Las reglas IPv6 SOLO se aplican a un literal IPv6 (el hostname trae `:`).
   Escritas sin delimitador y sobre cualquier hostname, `^fc` y `^fd` rechazaban
   dominios públicos reales —`fdn.gov.co`, `fcm.org.co`— como «dirección
   interna»: un falso positivo que rompe el uso legítimo. */
/* `fe80::/10` va de fe80: a febf: (no solo fe80:), y `::` es la dirección
   indeterminada, que en muchas pilas resuelve al loopback. */
const IPV6_PROHIBIDA_RE = /^(?:::1|::$|fe[89ab][0-9a-f]:|fc|fd)/i;

const SUFIJO_INTERNO_RE = /\.(?:local|internal|localdomain|home|lan|corp|intranet)$/i;

/* `::ffff:127.0.0.1` es 127.0.0.1 escrito en IPv6, y ninguna de las dos familias
   de reglas lo veía: no tiene forma punteada para el corte de IPv4 y no empieza
   por ninguno de los prefijos IPv6 prohibidos. Se desenvuelve antes de decidir. */
function desenvolverIpv6(host) {
  const m = /^\[?::ffff:([0-9a-f.:]+)\]?$/i.exec(host);
  if (!m) return null;
  const dentro = m[1];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(dentro)) return dentro;
  // forma hexadecimal: ::ffff:7f00:1 → 127.0.0.1
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(dentro);
  if (!hex) return null;
  const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16);
  return `${(a >> 8) & 255}.${a & 255}.${(b >> 8) & 255}.${b & 255}`;
}

const esIpv4 = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h);

function urlSegura(bruto) {
  let u = null;
  try { u = new URL(String(bruto || "").trim()); } catch { return { ok: false, error: "La URL no es válida." }; }
  if (u.protocol !== "https:") {
    return { ok: false, error: "Solo se aceptan URL «https:». Una URL sin cifrar no se descarga." };
  }
  if (u.username || u.password) {
    return { ok: false, error: "La URL lleva credenciales embebidas: no se descarga." };
  }
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || SUFIJO_INTERNO_RE.test(host)) {
    return { ok: false, error: "El destino apunta a una dirección interna o privada: no se descarga." };
  }
  const mapeada = desenvolverIpv6(host);
  if (mapeada) {
    return { ok: false, error: "El destino es una IPv4 escrita como IPv6 (::ffff:): no se descarga." };
  }
  if (host.includes(":") && IPV6_PROHIBIDA_RE.test(host.replace(/^\[|\]$/g, ""))) {
    return { ok: false, error: "El destino es una dirección IPv6 interna: no se descarga." };
  }
  if (esIpv4(host)) {
    // ni dentro ni fuera de los rangos privados: la vía legítima de un pliego es
    // un nombre de dominio, y así la comprobación no depende de enumerar rangos
    return { ok: false, error: "El destino es una dirección IP literal: use el nombre de dominio del portal." };
  }
  return { ok: true, url: u };
}

/* ── LA COMPROBACIÓN QUE FALTABA: LA IP RESUELTA ──
   Validar la CADENA del hostname no protege de nada por sí sola. Cualquier
   dominio público puede apuntar a 127.0.0.1 o a 169.254.169.254, y con eso el
   endpoint descargaba servicios internos sin que ninguna regla se enterara. Aquí
   se resuelve el nombre y se rechazan TODAS las direcciones que devuelva —basta
   una privada para rechazar: un nombre que resuelve a varias no es de fiar—.

   Queda una ventana TOCTOU conocida (el DNS podría cambiar entre la comprobación
   y el `fetch`, que es el ataque de *rebinding*). Cerrarla exigiría fijar la IP
   en la conexión, que el `fetch` nativo no permite. Con el endpoint detrás del
   token y la resolución validada en cada salto, el hueco que queda está dicho y
   es mucho más estrecho que el que había. */
async function resolucionSegura(host) {
  let direcciones = [];
  try {
    direcciones = await dns.lookup(host, { all: true, verbatim: true });
  } catch (e) {
    return { ok: false, error: `No se pudo resolver «${host}»: ${(e && e.code) || "error de DNS"}.` };
  }
  if (!direcciones.length) return { ok: false, error: `«${host}» no resolvió a ninguna dirección.` };
  for (const d of direcciones) {
    const dir = String(d.address || "").toLowerCase();
    const mapeada = desenvolverIpv6(dir) || dir;
    if (IP_PRIVADA_RE.test(mapeada) || (dir.includes(":") && IPV6_PROHIBIDA_RE.test(dir))) {
      return { ok: false, error: "El nombre resuelve a una dirección interna o privada: no se descarga." };
    }
  }
  return { ok: true, direcciones: direcciones.map((d) => d.address) };
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

/* `urlSegura` y `resolucionSegura` se exportan además del handler: son las DOS
   capas de la comprobación de destino y la suite las prueba por separado. La del
   NOMBRE es determinista; la del DNS depende del resolutor, y en un entorno con
   proxy todo resuelve a direcciones privadas — probarlas juntas mediría el
   sandbox en vez de la regla. */
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
  const resuelta0 = await resolucionSegura(destino.hostname);
  if (!resuelta0.ok) return res.status(400).json({ ok: false, error: resuelta0.error });

  let r = null;
  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
    const corte = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    try {
      r = await fetch(destino.toString(), {
        redirect: "manual",     // los saltos se siguen A MANO para revalidar el destino
        headers: { Accept: "application/pdf,*/*", "User-Agent": `${MARCA.nombre}/1.0 (+lector de pliegos)` },
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
      // y la IP del salto, no solo su nombre: es el mismo agujero un salto más allá
      const dns2 = await resolucionSegura(otra.url.hostname);
      if (!dns2.ok) return res.status(400).json({ ok: false, error: `La redirección apunta a un destino no permitido. ${dns2.error}` });
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
      bytes: leido.buf.length,
      /* NO se devuelven los primeros bytes del cuerpo remoto. Devolverlos
         convertía este endpoint en un ORÁCULO DE LECTURA: con un destino interno
         alcanzable, los 16 primeros bytes de su respuesta salían en el JSON. El
         tamaño y el tipo declarado bastan para diagnosticar un fallo legítimo. */
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

module.exports.urlSegura = urlSegura;
module.exports.resolucionSegura = resolucionSegura;
