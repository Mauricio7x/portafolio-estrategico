/* ============================================================================
   lib/sesion · La sesión del DUEÑO: una cuenta, una cookie, un límite de intentos
   ----------------------------------------------------------------------------
   DECISIÓN DEL DUEÑO (17-oct-2026): un ÚNICO usuario —él—, con correo y
   contraseña; entra una vez y el navegador lo recuerda 30 días. Sustituye a la
   llave escrita en el código del navegador, que cualquiera leía y que abría
   todas las API protegidas.

   QUÉ HAY AQUÍ. La parte con ESTADO de las cuentas: dónde vive la cuenta en el
   almacén, cómo se abre, se comprueba y se cierra una sesión, y cuántos intentos
   de entrar se permiten. La parte PURA (scrypt, ids, forma de la cuenta) es de
   lib/cuentas y se LLAMA, no se copia. Las rutas son `op` de /api/admin
   (lib/handlers/admin/sesion.js); el guardián que acepta la sesión es lib/auth.

   UNA SOLA CUENTA, Y ES ATÓMICO. La marca `cuenta:dueno` guarda el id de la
   única cuenta y se escribe con SET NX: dos altas simultáneas no pueden crear
   dos cuentas, y una vez escrita la pantalla de alta responde 409 para siempre.
   Una cuenta cuyo id no coincide con la marca no entra ni tiene sesión válida.

   LA SESIÓN. Un token opaco de 32 bytes aleatorios que solo viaja en una cookie
   `HttpOnly; Secure; SameSite=Strict; Path=/` con prefijo `__Host-`: el
   JavaScript de la página no lo ve nunca. En el almacén se guarda bajo el HASH
   del token (un volcado de Redis no entrega sesiones usables), con caducidad en
   el propio almacén y la fecha dentro del registro. Salir la BORRA del almacén:
   la cookie que alguien hubiera copiado deja de valer en ese instante.

   EL LÍMITE DE INTENTOS. Por conexión y por correo escrito, en ventanas fijas
   con su caducidad en Redis. El contador por correo se lleva exista o no la
   cuenta, y la respuesta de «correo inexistente» es IDÉNTICA a la de
   «contraseña mala» (mismo código, mismo texto y una derivación scrypt ficticia
   para que tampoco el tiempo las distinga). Si Redis no responde, NO se deja
   entrar: aquí el falso caro es abrir la puerta, al revés que en el alta
   pública del RUP, donde lo caro es cerrarla.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const Cuentas = require("./cuentas.js");

const COOKIE_SESION = "__Host-detekta_sesion";
const CLAVE_DUENO = "cuenta:dueno";

/* Ventana fija de 15 minutos. Cinco intentos por correo y veinte por conexión:
   a ese ritmo una contraseña de diez caracteres no se adivina en una vida, y
   quien se equivoca escribiendo la suya tiene margen de sobra. La pantalla de
   alta tiene su propio contador (por conexión): adivinar la llave del servidor
   tampoco puede ser barato. */
const VENTANA_INTENTOS_SEG = 15 * 60;
const MAX_INTENTOS_POR_CUENTA = 5;
const MAX_INTENTOS_POR_IP = 20;
const MAX_ALTAS_POR_IP = 5;
const CLAVE_INTENTO = (tipo, quien, ventana) => `intentos:${tipo}:${quien}:${ventana}`;

const MSG_CREDENCIALES = "Correo o contraseña incorrectos. Revise los dos y vuelva a intentarlo.";
const MSG_SESION_INVALIDA = "Su sesión terminó o ya no es válida. Entre de nuevo con su correo y contraseña.";
const MSG_ORIGEN = "Se rechazó la petición porque no viene de la página de la aplicación (protección contra "
  + "envíos desde otros sitios). Recargue la página y vuelva a intentarlo.";
const MSG_ALMACEN = "No se pudo comprobar su sesión porque la base de datos no respondió. Vuelva a intentarlo en un momento.";

const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
const claveSesion = (token) => Cuentas.CLAVES.sesion(hashToken(token));

/* La comparación en tiempo constante es la de lib/auth (una sola copia); el
   require va DIFERIDO porque lib/auth requiere este módulo. */
const mismoTexto = (a, b) => require("./auth.js").mismoSecreto(a, b);

/* ── la cookie ───────────────────────────────────────────────────────────── */
function leerCookie(req, nombre) {
  const crudo = String((req && req.headers && (req.headers.cookie || req.headers.Cookie)) || "");
  for (const parte of crudo.split(";")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}
/* ¿Viene la cookie de sesión? Basta con que VENGA —bien formada o no— para que
   la petición cuente como «con credencial»: una cookie corrupta es una
   credencial presente e inválida, y eso es 401, jamás la vista sin cifras. */
const hayCookieDeSesion = (req) => leerCookie(req, COOKIE_SESION) !== null;

function cabeceraCookie(token, maxAgeSeg = Cuentas.TTL_SESION_SEG) {
  return `${COOKIE_SESION}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeg}`;
}
const cabeceraBorrarCookie = () => `${COOKIE_SESION}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/* ── defensa contra envíos desde otro sitio ─────────────────────────────────
   SameSite=Strict ya impide que otro sitio haga viajar la cookie; esto es la
   segunda cerradura, la que no depende de que el navegador la respete. Una
   petición que ESCRIBE con cookie tiene que traer un Origin igual al host de la
   aplicación (los navegadores lo mandan en todo POST) o, en su defecto,
   `Sec-Fetch-Site: same-origin`. Una LECTURA solo se rechaza si el propio
   navegador declara que viene de otro sitio. */
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);
function hostDeLaPeticion(req) {
  const h = (req && req.headers) || {};
  return String(h["x-forwarded-host"] || h.host || "").split(",")[0].trim().toLowerCase();
}
function peticionDelMismoSitio(req) {
  const h = (req && req.headers) || {};
  const sitio = String(h["sec-fetch-site"] || "").trim().toLowerCase();
  if (sitio === "cross-site" || sitio === "same-site") return false;
  const metodo = String((req && req.method) || "GET").toUpperCase();
  if (METODOS_SEGUROS.has(metodo)) return true;
  const origen = String(h.origin || "").trim();
  const host = hostDeLaPeticion(req);
  if (origen) {
    try { return Boolean(host) && new URL(origen).host.toLowerCase() === host; } catch { return false; }
  }
  return sitio === "same-origin";
}

/* ── el almacén ──────────────────────────────────────────────────────────── */
function redisPorDefecto() {
  const { crearRedis } = require("./redis.js");
  return crearRedis({});
}
const parsear = (crudo) => { try { return crudo ? JSON.parse(crudo) : null; } catch { return null; } };

async function hayCuenta(redis) {
  return Boolean(await redis.get(CLAVE_DUENO));
}

/* La sesión de la petición. → { presente:false } sin cookie;
   { presente:true, ok:true, cuenta } válida; { presente:true, ok:false, status, error } si no. */
async function sesionDeLaPeticion(req, { redis = null, ahora = Date.now() } = {}) {
  const token = leerCookie(req, COOKIE_SESION);
  if (token === null) return { presente: false, ok: false };
  const invalida = { presente: true, ok: false, status: 401, error: MSG_SESION_INVALIDA, sesion_invalida: true };
  if (!Cuentas.esTokenSesion(token)) return invalida;
  let pares;
  try {
    pares = await (redis || redisPorDefecto()).mget([claveSesion(token), CLAVE_DUENO]);
  } catch {
    return { presente: true, ok: false, status: 503, error: MSG_ALMACEN };
  }
  const s = parsear(Array.isArray(pares) ? pares[0] : null);
  const idDueno = Array.isArray(pares) ? pares[1] : null;
  if (!s || typeof s.cuenta !== "string" || !idDueno || !mismoTexto(s.cuenta, idDueno)) return invalida;
  const creada = Date.parse(s.creada);
  const ttl = Number(s.ttl_seg);
  if (!Number.isFinite(creada) || !Number.isFinite(ttl) || creada + ttl * 1000 <= ahora) return invalida;
  return { presente: true, ok: true, cuenta: s.cuenta };
}

async function abrirSesion(redis, idCuenta, { ahora = Date.now() } = {}) {
  const n = Cuentas.nuevaSesion(idCuenta, { ahora: new Date(ahora).toISOString() });
  if (!n) throw new Error("id de cuenta inválido");
  await redis.set(claveSesion(n.token), JSON.stringify(n.sesion), { ex: n.sesion.ttl_seg });
  return n.token;
}

async function cerrarSesion(redis, req) {
  const token = leerCookie(req, COOKIE_SESION);
  if (!token || !Cuentas.esTokenSesion(token)) return false;
  return Number(await redis.del(claveSesion(token))) > 0;
}

/* ── el límite de intentos ─────────────────────────────────────────────────
   INCR + EXPIRE por ventana. Se cuenta ANTES de comprobar la contraseña: así
   cien intentos en paralelo no pasan todos por debajo del tope. Lanza si Redis
   falla: quien llama responde 503 y no deja entrar. */
async function contarIntento(redis, clave) {
  const n = Number(await redis._cmd(["INCR", clave]));
  if (n === 1) await redis.expire(clave, VENTANA_INTENTOS_SEG);
  return n;
}
function ipDe(req) {
  const { ipDePeticion } = require("./perfil_dinamico.js");
  return ipDePeticion(req) || "sin-ip";
}
function minutosDeEspera(ahora) {
  const resto = VENTANA_INTENTOS_SEG - Math.floor((ahora / 1000) % VENTANA_INTENTOS_SEG);
  return Math.max(1, Math.ceil(resto / 60));
}
function cuerpoDemasiados(ahora) {
  const m = minutosDeEspera(ahora);
  return {
    ok: false,
    error: "Demasiados intentos seguidos. Por seguridad, la entrada queda en pausa un rato.",
    que_hacer: `Vuelva a intentarlo en ${m} ${m === 1 ? "minuto" : "minutos"}.`,
    reintentar_en_seg: m * 60,
    motivo: "demasiados_intentos",
  };
}

/* Una derivación ficticia, calculada una vez: cuando el correo no tiene cuenta
   se compara contra ella para que la respuesta tarde lo mismo que con una
   contraseña mala. */
let _ficticia = null;
const derivacionFicticia = () => (_ficticia || (_ficticia = Cuentas.derivarContrasena(crypto.randomBytes(16).toString("hex"))));

/* ENTRAR. → { status, cuerpo, token? } (token solo cuando entra). */
async function entrar(redis, req, { correo, contrasena }, { ahora = Date.now() } = {}) {
  const normal = Cuentas.normalizarCorreo(typeof correo === "string" ? correo : "");
  const clave = typeof contrasena === "string" ? contrasena : "";
  const ventana = Math.floor(ahora / 1000 / VENTANA_INTENTOS_SEG);
  const hashCorreo = Cuentas.hashCorreo(normal || String(correo || ""));
  let nIp, nCuenta;
  try {
    nIp = await contarIntento(redis, CLAVE_INTENTO("entrar-ip", ipDe(req), ventana));
    nCuenta = await contarIntento(redis, CLAVE_INTENTO("entrar-cuenta", hashCorreo, ventana));
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  if (nIp > MAX_INTENTOS_POR_IP || nCuenta > MAX_INTENTOS_POR_CUENTA) return { status: 429, cuerpo: cuerpoDemasiados(ahora) };

  let cuenta = null, idDueno = null;
  try {
    if (normal) {
      const [idPorCorreo, marca] = await redis.mget([Cuentas.CLAVES.porCorreo(Cuentas.hashCorreo(normal)), CLAVE_DUENO]);
      idDueno = marca || null;
      if (idPorCorreo && idDueno && mismoTexto(idPorCorreo, idDueno)) cuenta = parsear(await redis.get(Cuentas.CLAVES.cuenta(idDueno)));
    }
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  const guardada = cuenta && typeof cuenta.contrasena === "string" ? cuenta.contrasena : derivacionFicticia();
  const coincide = Cuentas.contrasenaCoincide(clave, guardada);
  if (!cuenta || !coincide || cuenta.id !== idDueno) {
    return { status: 401, cuerpo: { ok: false, error: MSG_CREDENCIALES, motivo: "credenciales" } };
  }
  let token;
  try {
    token = await abrirSesion(redis, cuenta.id, { ahora });
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  /* lo que sigue no puede impedir la entrada: el contador por correo se limpia
     (el dueño que acertó no arrastra sus errores) y, si los parámetros de
     scrypt se endurecieron, la contraseña se vuelve a derivar ahora, que es el
     único momento en que se tiene en claro */
  try {
    const nueva = { ...cuenta, ultimo_acceso: new Date(ahora).toISOString() };
    if (Cuentas.necesitaRederivar(cuenta.contrasena)) nueva.contrasena = Cuentas.derivarContrasena(clave);
    await redis.set(Cuentas.CLAVES.cuenta(cuenta.id), JSON.stringify(nueva));
    await redis.del(CLAVE_INTENTO("entrar-cuenta", hashCorreo, ventana));
  } catch { /* la sesión ya está abierta */ }
  return { status: 200, token, cuerpo: { ok: true, sesion: true, correo: cuenta.correo } };
}

/* CREAR LA ÚNICA CUENTA. Solo mientras no exista ninguna, y solo con la llave
   del servidor (HISTORICO_TOKEN) escrita a mano por el dueño, que la copia de
   Vercel. → { status, cuerpo, token? } */
async function crearCuentaDelDueno(redis, req, { llave, correo, contrasena }, { ahora = Date.now() } = {}) {
  try {
    if (await hayCuenta(redis)) {
      return { status: 409, cuerpo: { ok: false, hay_cuenta: true, error: "La cuenta de esta aplicación ya existe y no se puede crear otra. Entre con su correo y contraseña." } };
    }
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  const esperada = process.env.HISTORICO_TOKEN || "";
  if (!esperada) {
    return { status: 503, cuerpo: { ok: false, error: "La cuenta no se puede crear todavía: falta HISTORICO_TOKEN en la configuración del despliegue (Vercel → Settings → Environment Variables), y es la llave que se escribe aquí. Añádala y vuelva a desplegar." } };
  }
  const ventana = Math.floor(ahora / 1000 / VENTANA_INTENTOS_SEG);
  try {
    if (await contarIntento(redis, CLAVE_INTENTO("alta-ip", ipDe(req), ventana)) > MAX_ALTAS_POR_IP) return { status: 429, cuerpo: cuerpoDemasiados(ahora) };
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  if (typeof llave !== "string" || !llave || !mismoTexto(llave, esperada)) {
    return { status: 401, cuerpo: { ok: false, motivo: "llave", error: "La llave del servidor no coincide. Cópiela entera desde Vercel (Settings → Environment Variables → HISTORICO_TOKEN), sin espacios de más." } };
  }
  const alta = Cuentas.nuevaCuenta({ correo, contrasena, ahora: new Date(ahora).toISOString() });
  if (!alta.ok) return { status: 400, cuerpo: { ok: false, error: alta.error } };
  const c = alta.cuenta;
  try {
    await redis.set(Cuentas.CLAVES.cuenta(c.id), JSON.stringify(c));
    await redis.set(Cuentas.CLAVES.porCorreo(c.correo_hash), c.id);
    /* la marca va la ÚLTIMA y con NX: si otra alta ganó la carrera, esta
       retira lo que escribió y responde lo mismo que si hubiera llegado tarde */
    const escrita = await redis.set(CLAVE_DUENO, c.id, { nx: true });
    if (escrita !== "OK") {
      await redis.del(Cuentas.CLAVES.cuenta(c.id));
      const otra = await redis.get(Cuentas.CLAVES.porCorreo(c.correo_hash));
      if (otra === c.id) await redis.del(Cuentas.CLAVES.porCorreo(c.correo_hash));
      return { status: 409, cuerpo: { ok: false, hay_cuenta: true, error: "La cuenta de esta aplicación ya existe y no se puede crear otra. Entre con su correo y contraseña." } };
    }
    const token = await abrirSesion(redis, c.id, { ahora });
    return { status: 201, token, cuerpo: { ok: true, sesion: true, correo: c.correo, creada: true } };
  } catch {
    return { status: 503, cuerpo: { ok: false, error: "La cuenta no se pudo crear porque la base de datos no respondió. Vuelva a intentarlo en un momento." } };
  }
}

module.exports = {
  COOKIE_SESION, CLAVE_DUENO, VENTANA_INTENTOS_SEG, MAX_INTENTOS_POR_CUENTA, MAX_INTENTOS_POR_IP, MAX_ALTAS_POR_IP,
  CLAVE_INTENTO, MSG_CREDENCIALES, MSG_SESION_INVALIDA, MSG_ORIGEN, MSG_ALMACEN,
  hashToken, claveSesion, leerCookie, hayCookieDeSesion, cabeceraCookie, cabeceraBorrarCookie,
  peticionDelMismoSitio, hayCuenta, sesionDeLaPeticion, abrirSesion, cerrarSesion,
  entrar, crearCuentaDelDueno,
};
