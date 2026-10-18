/* ============================================================================
   lib/autollamada.js · El servidor llamándose a sí mismo: que la llamada salga y que se sepa cómo le fue (18-oct-2026)
   ----------------------------------------------------------------------------
   Cuatro sitios siguen su trabajo llamando a su propia dirección: la cadena de
   la sincronización y su reintento tras un fallo, el refresco mensual del
   histórico, la cadena del histórico y el listado que no encuentra datos. Eran
   un `fetch` suelto con `.catch(() => {})`. Medido el 18-oct-2026 con el muro de
   Vercel puesto: tras una tanda con `done:false` y tras un fallo con
   `reintento:true`, en 7 y 3 minutos de lecturas de op=salud no arrancó ninguna
   tanda más, y nada lo decía. Ya antes del muro esa llamada «se perdía» a veces
   (lib/latido, cabecera: el histórico parado del 15 al 25-sep).

   Dos causas posibles y una sola pieza para las dos:
   · VERCEL CONGELA LA FUNCIÓN al responder y la llamada no llega a salir. La
     llamada va dentro de `waitUntil`, con el MISMO acceso que usa el paquete
     oficial @vercel/functions 3.10.1 (`get-context.js` y `wait-until.js`,
     leídos el 18-oct-2026): el contexto de la petición vive en
     `globalThis[Symbol.for("@vercel/request-context")].get()`. Sin dependencias.
     Sin ese contexto (la suite, un servidor local) la llamada sale como antes.
   · EL MURO RECHAZA LA LLAMADA (el servidor no tiene el pase, o tiene otro). Se
     pide sin seguir redirecciones: el muro responde 302 hacia
     `https://vercel.com/sso-api` (medido el 17-oct) y eso se reconoce en positivo,
     como en la sonda del muro.

   Se anota ANTES de enviar («enviada», esperado: si la función se congela ahí,
   el rastro queda) y, a los 10 s como mucho, cómo le fue. Sin `waitUntil`, la
   función espera esos 10 s y las dos anotaciones (3 s como mucho cada una)
   antes de responder: la llamada sale igual. Pasados 10 s sin
   respuesta, la tanda siguiente está trabajando (una tanda dura 45 s o más):
   eso es «siguió». La anotación vive en su propia clave con caducidad de 26 h
   (nunca en `meta`: fuera del candado pisaría el cursor del delta) y op=salud la
   publica en `autollamada`; un fallo, o un «enviada» de más de un minuto, es un
   motivo de la salud. El valor de ningún secreto se anota: solo si el pase existe.
   ========================================================================== */
"use strict";

const { cabecerasDeAutoLlamada } = require("./auth.js");
const { CLAVES } = require("./almacen.js");

// cuánto se espera la respuesta antes de dar la tanda siguiente por arrancada
const ESPERA_MS = 10000;
// la anotación caduca sola: un fallo de anteayer no puede tener la salud en rojo
const TTL_SEG = 26 * 3600;
/* Un «enviada» de más de un minuto: la anotación del resultado llega a los 10 s
   como mucho, así que la función no siguió viva para ver la respuesta. */
const SIN_NOTICIA_MS = 60e3;
// cada escritura de la anotación: si Upstash no contesta en 3 s, se deja (la anotación es vigilancia)
const TIEMPO_ANOTAR_MS = 3000;
// el muro se reconoce en positivo, con lo medido el 17-oct-2026 (lo mismo que la sonda del muro)
const DESTINO_DEL_MURO = "https://vercel.com/sso-api";
const TEXTO_DEL_MURO = "Protected by Vercel Authentication";

/* El contexto de la petición de Vercel, o null. Es lo que hace `getContext()` de
   @vercel/functions: un símbolo global que el entorno de ejecución de Vercel pone. */
function contextoDeVercel() {
  try {
    const almacen = globalThis[Symbol.for("@vercel/request-context")];
    const ctx = almacen && typeof almacen.get === "function" ? almacen.get() : null;
    return ctx && typeof ctx.waitUntil === "function" ? ctx : null;
  } catch { return null; }
}

/** ¿Cómo le fue a la llamada? (pura, con prueba). `visto` es lo que llegó: nada en
    ESPERA_MS (`sinRespuesta`), un fallo de red (`error`) o una respuesta. */
function clasificarAutoLlamada(visto = {}) {
  if (visto.sinRespuesta) return "siguio";
  if (visto.error) return "fallo_de_red";
  const status = Number(visto.status);
  if (String(visto.ubicacion || "").startsWith(DESTINO_DEL_MURO) || String(visto.texto || "").includes(TEXTO_DEL_MURO)) return "muro";
  if (status >= 200 && status < 300) {
    // la tanda siguiente llegó, pero otra tenía el candado: informativo, no es un fallo
    try { if (JSON.parse(visto.texto || "null").enCurso === true) return "candado_ocupado"; } catch { /* no es JSON: siguió */ }
    return "siguio";
  }
  if (status === 401) return "credencial";
  return "otro_codigo";
}

/* LO PASAJERO NO TIENE LA SALUD EN ROJO UN DÍA (18-oct-2026, revisión adversaria). Un 504 de
   una vez, un fallo de red o una función que no siguió viva cuentan para `ok` 2 h como mucho, y
   nada si después el mismo trabajo se cerró (`superada`, la calcula op=salud con la meta). El
   muro y la credencial son configuración: cuentan mientras viva la anotación (26 h), porque la
   siguiente actualización de varias tandas volverá a chocar con lo mismo. */
const VIGENCIA_FALLO_PASAJERO_MS = 2 * 3600e3;
const DE_CONFIGURACION = new Set(["muro", "credencial"]);

/** El motivo de la salud para una anotación, o null si no hay nada que decir
    (pura, con prueba). Sin `; `: el aviso por correo parte los motivos por ahí. */
function motivoDeAutoLlamada(reg, ahora = Date.now(), { superada = false } = {}) {
  if (!reg || typeof reg !== "object") return null;
  const cuando = reg.ts ? ` (${reg.ts})` : "";
  const que = "la actualización no pudo seguir sola";
  if (!DE_CONFIGURACION.has(reg.resultado)) {
    const ts = Date.parse(reg.ts);
    // un ts ilegible cuenta como vigente, como en los demás fallos de la salud (lado conservador)
    if (superada || (Number.isFinite(ts) && ahora - ts > VIGENCIA_FALLO_PASAJERO_MS)) return null;
  }
  switch (reg.resultado) {
    case "siguio": return null;
    case "candado_ocupado": return null;
    case "enviada": {
      const ts = Date.parse(reg.ts);
      // un ts ilegible no se da por viejo ni por nuevo: «no sé» no pone la salud en rojo
      if (!Number.isFinite(ts) || ahora - ts <= SIN_NOTICIA_MS) return null;
      return `${que}${cuando}: el servidor se llamó a sí mismo y no consta cómo le fue, porque la función no siguió viva para verlo`;
    }
    case "muro": return reg.pase_en_el_servidor
      ? `${que}${cuando}: el muro de Vercel rechazó la llamada del servidor a sí mismo aunque el servidor tiene un pase`
      : `${que}${cuando}: el muro de Vercel rechazó la llamada del servidor a sí mismo porque el servidor no tiene el pase`;
    case "credencial": return `${que}${cuando}: la aplicación no reconoció la llamada del servidor a sí mismo (respondió 401)`;
    case "fallo_de_red": return `${que}${cuando}: la llamada del servidor a sí mismo no salió (${String(reg.detalle || "fallo de red").replace(/;\s*/g, ", ").slice(0, 120)})`;
    default: return `${que}${cuando}: la llamada del servidor a sí mismo respondió ${reg.status == null ? "sin código" : reg.status}`;
  }
}

/** Qué hacer ante cada resultado; null cuando no hay nada que hacer. */
function queHacerAutoLlamada(reg) {
  if (!reg) return null;
  if (reg.resultado === "muro" && !reg.pase_en_el_servidor) {
    return "En Vercel, en la página «Environment Variables» del proyecto, marque al final la casilla «Enable access to System Environment Variables» y vuelva a desplegar: el pase llega al servidor con el despliegue.";
  }
  if (reg.resultado === "muro") {
    return "En Vercel, en «Settings» → «Deployment Protection» → «Protection Bypass for Automation», revise que el pase exista y vuelva a desplegar.";
  }
  if (reg.resultado === "credencial") return "Revise que CRON_SECRET siga puesta en Vercel y vuelva a desplegar.";
  if (reg.resultado === "siguio" || reg.resultado === "candado_ocupado") return null;
  return "Mientras tanto, el latido continúa la actualización por tandas; con el sitio abierto, «Actualizar datos» en «Mi empresa» la termina.";
}

/* Anota con su propio cliente: el `comandosRedis` del handler sigue contando lo suyo. Un
   fallo al anotar no tumba nada: la anotación es vigilancia, no el trabajo. */
async function anotar(reg) {
  try {
    const { crearRedis, hayCredenciales } = require("./redis.js");
    if (!hayCredenciales()) return false;
    // tope corto: sin waitUntil la respuesta espera estas dos escrituras además de los 10 s
    await crearRedis({ timeoutMs: TIEMPO_ANOTAR_MS }).set(CLAVES.autoLlamada, JSON.stringify(reg), { ex: TTL_SEG });
    return true;
  } catch { return false; }
}

async function leerPrincipio(r) {
  try { return (await r.text()).slice(0, 2000); } catch { return ""; }
}

/**
 * El servidor se llama a sí mismo en `ruta` (p. ej. «/api/procesos?op=sync&modo=auto»),
 * con las cabeceras de `cabecerasDeAutoLlamada(extra)` y la dirección por la que llegó `req`.
 * Con `waitUntil` espera solo la anotación de «enviada» y la llamada sigue dentro de él; sin
 * `waitUntil` espera también la llamada (10 s como mucho). Devuelve { enviada, con_waitUntil,
 * trabajo } (`trabajo` para la suite).
 */
async function autoLlamar(req, ruta, { extra, origen, esperaMs = ESPERA_MS, fetchImpl } = {}) {
  const h = (req && req.headers) || {};
  const proto = h["x-forwarded-proto"] || "https";
  const host = h["x-forwarded-host"] || h.host;
  if (!host) return { enviada: false, con_waitUntil: false, trabajo: Promise.resolve() };
  const ctx = contextoDeVercel();
  const t0 = Date.now();
  const base = {
    ts: new Date(t0).toISOString(), origen: origen || null,
    destino: (/[?&]op=([a-z]+)/.exec(ruta) || [, null])[1],
    pase_en_el_servidor: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
    con_waitUntil: Boolean(ctx),
  };
  await anotar({ ...base, resultado: "enviada" });
  const trabajo = (async () => {
    let reloj;
    const sinRespuesta = new Promise((ok) => {
      reloj = setTimeout(() => ok({ sinRespuesta: true }), esperaMs);
      if (reloj.unref) reloj.unref();
    });
    const intento = (fetchImpl || fetch)(`${proto}://${host}${ruta}`, { headers: cabecerasDeAutoLlamada(extra), redirect: "manual" })
      .then(async (r) => ({ status: r.status, ubicacion: (r.headers && r.headers.get && r.headers.get("location")) || "", texto: await leerPrincipio(r) }))
      .catch((e) => ({ error: require("./apu_ocr.js").tacharClave(String((e && e.message) || e)).slice(0, 200) }));
    const visto = await Promise.race([intento, sinRespuesta]);
    clearTimeout(reloj);
    const resultado = clasificarAutoLlamada(visto);
    await anotar({ ...base, resultado, status: Number.isInteger(visto.status) ? visto.status : null,
      ms: Date.now() - t0, ...(visto.error ? { detalle: visto.error } : {}) });
  })().catch(() => {});
  /* Con el contexto de Vercel, la función sigue viva hasta que `trabajo` termine sin hacer
     esperar la respuesta. Sin él (un servidor local, la suite, o Vercel sin el contexto) se
     espera AQUÍ, 10 s como mucho: así la llamada sale antes de responder también fuera de
     Vercel, y la anotación nunca llega tarde encima de lo que pasó después. */
  let entregada = false;
  if (ctx) { try { ctx.waitUntil(trabajo); entregada = true; } catch { entregada = false; } }
  if (!entregada) await trabajo;
  return { enviada: true, con_waitUntil: entregada, trabajo };
}

module.exports = {
  autoLlamar, clasificarAutoLlamada, motivoDeAutoLlamada, queHacerAutoLlamada, contextoDeVercel,
  ESPERA_MS, TTL_SEG, SIN_NOTICIA_MS, TIEMPO_ANOTAR_MS, VIGENCIA_FALLO_PASAJERO_MS, DESTINO_DEL_MURO, TEXTO_DEL_MURO,
};
