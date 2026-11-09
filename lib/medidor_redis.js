/* ============================================================================
   lib/medidor_redis · Cuánto ancho de banda de Upstash gasta cada operación
   ----------------------------------------------------------------------------
   Para qué existe (9-nov-2026, encargo del dueño): el plan gratis de Upstash da
   10 GB de ancho de banda al mes y en octubre se llenaron. Lo que se sabía de
   quién gasta salía de un MODELO (memoria, 1-nov-2026: código real contra un
   Upstash falso con tamaños de producción); la página nunca se pudo medir. Esto
   lo mide EN PRODUCCIÓN, petición por petición, sin consola de Upstash.

   Cómo:
     · cada router de api/ corre su petición dentro de `medir(dominio, fn)` y,
       al resolver la operación, la nombra con `etiquetar("dominio:op")`;
     · lib/redis.cmd —el ÚNICO sitio por donde la aplicación habla con Upstash—
       llama a `sumar(bytes enviados, bytes recibidos)` en cada comando;
     · al terminar la petición, si gastó algún comando, se anota en el hash del
       día `uso:redis:AAAA-MM-DD`: `<etiqueta>|bytes`, `<etiqueta>|comandos` y
       `<etiqueta>|veces` (HINCRBY), con caducidad de 40 días;
     · `/api/admin?op=uso&redis=1[&dias=1..40]` lo lee, de lo que más gasta a lo
       que menos.

   Lo que mide y lo que no (declarado):
     · los bytes de los CUERPOS de cada comando, de ida y de vuelta (el JSON que
       viaja por la API REST). No cuenta las cabeceras HTTP (por eso también se
       anotan los comandos: cada uno lleva unos cientos de bytes de cabeceras);
     · no sabe si Upstash cuenta la entrada, la salida o las dos (su página no lo
       dice, consultada el 1-nov-2026): por eso se suman las dos, el lado alto;
     · lo que una petición sigue haciendo DESPUÉS de responder y de anotarse
       (un `waitUntil` que aún corre) no entra en su cuenta. La llamada que la
       aplicación se hace a sí misma es otra petición y se mide sola.

   Coste: 3 comandos por petición que ya usó Upstash (4 la primera del día de
   cada operación y cada 50, por la caducidad). Ninguno en una petición que no
   tocó la base ni en una que la puerta rechazó (`omitir`), así que un robot no
   hace anotar nada.

   Encendido: en Vercel (`VERCEL=1`, que Vercel pone en todo despliegue) o con
   `DETEKTA_MEDIR_REDIS=1`. Apagado, `medir` solo llama a la función: la suite
   corre igual y sus cuentas de comandos no cambian.
   Jamás rompe una respuesta: un fallo al anotar se traga (es una medición). */
"use strict";

const { AsyncLocalStorage } = require("async_hooks");

const als = new AsyncLocalStorage();
const TTL_SEG = 40 * 86400;
const DIAS_MAX = 40;
const ETIQUETA_RE = /^[a-z]{2,16}:[a-z0-9-]{0,32}$/;
const claveDelDia = (fecha) => `uso:redis:${fecha}`;
const diaUTC = (ms) => new Date(ms).toISOString().slice(0, 10);

const activo = (env = process.env) => env.VERCEL === "1" || env.DETEKTA_MEDIR_REDIS === "1";

/* Lo llama lib/redis.cmd por cada comando que recibió respuesta. Fuera de una
   petición medida (scripts, la suite) no hace nada. */
function sumar(bytesIda, bytesVuelta) {
  const s = als.getStore();
  if (!s) return;
  s.comandos += 1;
  s.bytes += (Number(bytesIda) || 0) + (Number(bytesVuelta) || 0);
}

/* El router la llama cuando ya sabe qué operación atiende. Una etiqueta que no
   tiene la forma esperada se anota como «<dominio>:otra»: lo que escribe quien
   llama no puede crear campos a su gusto en el hash del día. */
function etiquetar(etiqueta) {
  const s = als.getStore();
  if (!s) return;
  const e = String(etiqueta || "").toLowerCase();
  s.etiqueta = ETIQUETA_RE.test(e) ? e : `${s.dominio}:otra`;
}

/* La puerta la llama al rechazar (lib/auth.responderPuerta): una petición que no entró no se anota.
   Sin esto, una cookie inventada pero bien formada (que cuesta un MGET a la puerta) hacía anotar 3 o 4
   comandos más por petición y, en apu e inteligencia, creaba un campo por cada valor inventado
   (revisión adversaria del 9-nov-2026, reproducido). */
function omitir() {
  const s = als.getStore();
  if (s) s.omitir = true;
}

async function anotar(store, { redis, ahora = Date.now() } = {}) {
  const r = redis || (() => {
    const { crearRedis, hayCredenciales } = require("./redis.js");   // diferido: lib/redis llama a este módulo
    return hayCredenciales() ? crearRedis({}) : null;
  })();
  if (!r) return;
  const clave = claveDelDia(diaUTC(ahora));
  const e = store.etiqueta;
  await r.hincrby(clave, `${e}|bytes`, Math.round(store.bytes));
  await r.hincrby(clave, `${e}|comandos`, store.comandos);
  const veces = Number(await r.hincrby(clave, `${e}|veces`, 1));
  // la caducidad la primera vez y, por si aquella falló, cada 50 (una clave sin caducidad viviría para siempre)
  if (veces === 1 || veces % 50 === 0) await r.expire(clave, TTL_SEG);
}

/* Corre `fn` midiendo lo que gasta en Upstash. Devuelve lo que devuelva `fn`. */
async function medir(dominio, fn, opciones = {}) {
  if (!activo(opciones.env)) return fn();
  const store = { dominio: String(dominio), etiqueta: `${dominio}:sin-op`, bytes: 0, comandos: 0 };
  try {
    return await als.run(store, fn);
  } finally {
    if (store.comandos > 0 && !store.omitir) {
      // fuera de la medición: anotar no se cuenta a sí mismo
      const p = als.exit(() => anotar(store, opciones)).catch(() => { /* una medición no rompe la respuesta */ });
      /* La anotación corre DESPUÉS de responder, y Vercel congela la función al responder (lib/autollamada):
         se le entrega a `waitUntil` (lib/contexto_vercel) cuando existe; sin él (la suite, un servidor local) se espera aquí. */
      const ctx = opciones.contexto !== undefined ? opciones.contexto : require("./contexto_vercel.js").contextoDeVercel();
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
      else await p;
    }
  }
}

/* Lo anotado en los últimos `dias` (hoy incluido), sumado por etiqueta y ordenado de lo que más
   bytes gastó a lo que menos. Un campo que no es un entero no se suma (se cuenta en `ilegibles`). */
async function leerMedicion(redis, { dias = 7, ahora = Date.now() } = {}) {
  const n = Number.isInteger(dias) && dias >= 1 && dias <= DIAS_MAX ? dias : 7;
  const porEtiqueta = new Map();
  const porDia = [];
  let ilegibles = 0;
  for (let i = 0; i < n; i++) {
    const fecha = diaUTC(ahora - i * 86400000);
    const h = (await redis.hgetall(claveDelDia(fecha))) || {};
    let bytesDia = 0;
    for (const [campo, valor] of Object.entries(h)) {
      const m = /^(.+)\|(bytes|comandos|veces)$/.exec(campo);
      if (!m || !/^\d+$/.test(String(valor))) { ilegibles++; continue; }
      const fila = porEtiqueta.get(m[1]) || { operacion: m[1], bytes: 0, comandos: 0, veces: 0 };
      fila[m[2]] += Number(valor);
      porEtiqueta.set(m[1], fila);
      if (m[2] === "bytes") bytesDia += Number(valor);
    }
    porDia.push({ fecha, mb: Math.round(bytesDia / 1e4) / 100, con_datos: Object.keys(h).length > 0 });
  }
  const filas = [...porEtiqueta.values()]
    .map((f) => ({ ...f, mb: Math.round(f.bytes / 1e4) / 100, mb_por_vez: f.veces ? Math.round(f.bytes / f.veces / 1e4) / 100 : null }))
    .sort((a, b) => b.bytes - a.bytes);
  const total = filas.reduce((s, f) => s + f.bytes, 0);
  return { dias: n, total_mb: Math.round(total / 1e4) / 100, por_operacion: filas, por_dia: porDia, campos_ilegibles: ilegibles };
}

module.exports = { medir, etiquetar, omitir, sumar, activo, leerMedicion, claveDelDia, TTL_SEG, DIAS_MAX };
