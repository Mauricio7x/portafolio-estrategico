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

   EL LÍMITE DE INTENTOS. Por correo y conexión juntos (el que de verdad frena
   a quien prueba contraseñas), por conexión, y por correo solo con un tope ALTO
   —un tercero que escribe el correo del dueño desde cinco conexiones no puede
   dejarlo fuera desde la suya—, en ventanas fijas con su caducidad en Redis.
   Los contadores se llevan exista o no la cuenta, y la respuesta de «correo
   inexistente» es IDÉNTICA a la de «contraseña mala»: mismo código, mismo
   texto, los MISMOS comandos de Redis y una derivación scrypt ficticia para que
   tampoco el tiempo las distinga. Si Redis no responde, NO se deja entrar: aquí
   el falso caro es abrir la puerta, al revés que en el alta pública del RUP,
   donde lo caro es cerrarla.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const Cuentas = require("./cuentas.js");

const COOKIE_SESION = "__Host-detekta_sesion";
const CLAVE_DUENO = "cuenta:dueno";

/* Ventana fija de 15 minutos. Cinco intentos por correo DESDE una conexión,
   veinte por conexión y cincuenta por correo desde todas: a ese ritmo una
   contraseña de diez caracteres no se adivina en una vida, quien se equivoca
   escribiendo la suya tiene margen de sobra, y un tercero que gasta los cinco
   intentos del correo del dueño desde sus conexiones no lo deja fuera desde la
   suya (revisión adversaria del 17-oct-2026: con el tope solo por correo,
   cinco fallos ajenos bloqueaban al dueño en todas partes). La pantalla de
   alta tiene su propio contador (por conexión): adivinar la llave del servidor
   tampoco puede ser barato. */
const VENTANA_INTENTOS_SEG = 15 * 60;
const MAX_INTENTOS_POR_CUENTA = 5;          // por el par correo + conexión
const MAX_INTENTOS_POR_IP = 20;
const MAX_INTENTOS_POR_CORREO = 50;         // por correo, desde todas las conexiones
const MAX_ALTAS_POR_IP = 5;
const CLAVE_INTENTO = (tipo, quien, ventana) => `intentos:${tipo}:${quien}:${ventana}`;
/* LA CONEXIÓN DONDE EL DUEÑO YA ENTRÓ NO SE CIERRA POR EL TOPE DEL CORREO (18-oct-2026, revisión
   adversaria del #245, reproducida con el Redis simulado): con el tope de 50 por correo sumando
   todas las conexiones, diez conexiones ajenas con cinco fallos cada una le daban 429 al dueño en
   la suya, renovable cada 15 minutos. El par correo + conexión que acertó queda marcado 30 días y
   ese tope no lo frena; los de 5 por par y 20 por conexión siguen valiendo para él, y una conexión
   nueva sigue sujeta a los tres. La marca solo nace de una contraseña correcta. */
const CONEXION_CONOCIDA_SEG = 30 * 24 * 3600;
const CLAVE_CONOCIDA = (par) => `intentos:conocida:${par}`;

const MSG_CREDENCIALES = "Correo o contraseña incorrectos. Revise los dos y vuelva a intentarlo.";
const MSG_SESION_INVALIDA = "Su sesión terminó o ya no es válida. Entre de nuevo con su correo y contraseña.";
const MSG_ORIGEN = "Se rechazó la petición porque no viene de la página de la aplicación (protección contra "
  + "envíos desde otros sitios). Recargue la página y vuelva a intentarlo.";
const MSG_ALMACEN = "No se pudo comprobar su sesión porque la base de datos no respondió. Vuelva a intentarlo en un momento.";

/* LA LLAVE QUE ESTUVO PUBLICADA NO CREA LA CUENTA (17-oct-2026, revisión adversaria).
   Hasta el 17-oct-2026 HISTORICO_TOKEN vivía escrita en public/app.js, onboarding.js y
   pliego.js: está en la historia PÚBLICA de git. Si este cambio se despliega antes de
   que el dueño la cambie en Vercel, cualquiera que la haya leído crearía la ÚNICA
   cuenta antes que él, y después la pantalla de alta se cierra para siempre. Aquí va
   solo su HUELLA SHA-256 —jamás el valor—: con esa llave en el entorno, el alta se
   NIEGA y dice qué hacer, así que el orden en que se despliegue y se rote deja de
   importar. Una llave que se retire mañana se añade a la lista con su fecha. */
const LLAVES_RETIRADAS_SHA256 = new Set([
  "75de4f9a31b94674ecb617552bbcf5c394ef5838156abee01348d780cecaa2eb", // la de public/*.js hasta el 17-oct-2026
]);
const huella = (valor) => crypto.createHash("sha256").update(String(valor)).digest("hex");
// Se recorta: una llave pegada en Vercel con un espacio o un salto de línea al final sigue siendo la filtrada.
const esLlaveRetirada = (valor) => LLAVES_RETIRADAS_SHA256.has(huella(String(valor ?? "").trim()));
const MSG_LLAVE_RETIRADA = "La cuenta no se puede crear todavía: la llave del servidor que tiene puesta en Vercel es la que "
  + "estuvo escrita en el código de la página, y cualquiera puede conocerla. Primero cámbiela en Vercel "
  + "(Settings → Environment Variables → HISTORICO_TOKEN, una cadena larga y aleatoria), vuelva a desplegar "
  + "y cree la cuenta con la llave nueva.";

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
  /* «sin dato» no es cero: un INCR que no devuelve un entero (null, texto, una forma
     nueva de la respuesta) es un contador que no se puede leer, y eso es 503, no un
     intento libre (revisión adversaria: con INCR → null, 50 intentos pasaban) */
  const crudo = await redis._cmd(["INCR", clave]);
  if (crudo == null || !/^\d+$/.test(String(crudo).trim())) throw new Error("el contador de intentos no devolvió un número");
  const n = parseInt(String(crudo).trim(), 10);
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

/* ENTRAR. → { status, cuerpo, token? } (token solo cuando entra).
   LA CUENTA SE BUSCA POR LA MARCA, NO POR EL ÍNDICE DEL CORREO (17-oct-2026): con una
   sola cuenta, la marca `cuenta:dueno` dice cuál es y el correo escrito se compara con
   el de la ficha (su hash, en tiempo constante). Así dos altas a la vez con el mismo
   correo no pueden dejar al dueño sin índice (revisión adversaria: el perdedor borraba
   el del ganador y la contraseña correcta respondía 401 para siempre), y los comandos
   de Redis son los MISMOS exista o no el correo: GET de la marca y GET de la ficha. */
async function entrar(redis, req, { correo, contrasena }, { ahora = Date.now() } = {}) {
  const normal = Cuentas.normalizarCorreo(typeof correo === "string" ? correo : "");
  const clave = typeof contrasena === "string" ? contrasena : "";
  const ventana = Math.floor(ahora / 1000 / VENTANA_INTENTOS_SEG);
  const hashCorreo = Cuentas.hashCorreo(normal || String(correo || ""));
  const ip = ipDe(req);
  const parIpCorreo = huella(`${ip}|${hashCorreo}`);
  let nPar, nIp, nCorreo, conocida;
  try {
    nIp = await contarIntento(redis, CLAVE_INTENTO("entrar-ip", ip, ventana));
    nPar = await contarIntento(redis, CLAVE_INTENTO("entrar-par", parIpCorreo, ventana));
    nCorreo = await contarIntento(redis, CLAVE_INTENTO("entrar-cuenta", hashCorreo, ventana));
    conocida = (await redis.get(CLAVE_CONOCIDA(parIpCorreo))) != null;
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  if (nIp > MAX_INTENTOS_POR_IP || nPar > MAX_INTENTOS_POR_CUENTA || (nCorreo > MAX_INTENTOS_POR_CORREO && !conocida)) {
    return { status: 429, cuerpo: cuerpoDemasiados(ahora) };
  }

  let ficha = null, idDueno = null;
  try {
    idDueno = (await redis.get(CLAVE_DUENO)) || null;
    // la ficha se lee SIEMPRE que haya cuenta, case o no el correo: el número de comandos no distingue
    if (idDueno) ficha = parsear(await redis.get(Cuentas.CLAVES.cuenta(idDueno)));
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  const correoCasa = Boolean(ficha && typeof ficha.correo_hash === "string" && mismoTexto(ficha.correo_hash, hashCorreo) && normal);
  const cuenta = correoCasa && ficha.id === idDueno ? ficha : null;
  const guardada = cuenta && typeof cuenta.contrasena === "string" ? cuenta.contrasena : derivacionFicticia();
  const coincide = Cuentas.contrasenaCoincide(clave, guardada);
  if (!cuenta || !coincide) {
    return { status: 401, cuerpo: { ok: false, error: MSG_CREDENCIALES, motivo: "credenciales" } };
  }
  let token;
  try {
    token = await abrirSesion(redis, cuenta.id, { ahora });
  } catch {
    return { status: 503, cuerpo: { ok: false, error: MSG_ALMACEN } };
  }
  /* lo que sigue no puede impedir la entrada: el contador del par se limpia (el dueño
     que acertó no arrastra sus errores desde esta conexión) y, si los parámetros de
     scrypt se endurecieron, la contraseña se vuelve a derivar ahora, que es el único
     momento en que se tiene en claro */
  try {
    const nueva = { ...cuenta, ultimo_acceso: new Date(ahora).toISOString() };
    if (Cuentas.necesitaRederivar(cuenta.contrasena)) nueva.contrasena = Cuentas.derivarContrasena(clave);
    await redis.set(Cuentas.CLAVES.cuenta(cuenta.id), JSON.stringify(nueva));
    await redis.del(CLAVE_INTENTO("entrar-par", parIpCorreo, ventana));
    await redis.set(CLAVE_CONOCIDA(parIpCorreo), "1", { ex: CONEXION_CONOCIDA_SEG });
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
  if (esLlaveRetirada(esperada)) return { status: 503, cuerpo: { ok: false, motivo: "llave_retirada", error: MSG_LLAVE_RETIRADA } };
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
    /* la marca va DESPUÉS de la ficha y con NX: si otra alta ganó la carrera, esta
       retira SOLO su ficha (que tiene su propio id) y responde lo mismo que si
       hubiera llegado tarde. El índice del correo se escribe solo tras GANAR: antes,
       con dos altas del mismo correo, la perdedora borraba el índice de la ganadora */
    const escrita = await redis.set(CLAVE_DUENO, c.id, { nx: true });
    if (escrita !== "OK") {
      await redis.del(Cuentas.CLAVES.cuenta(c.id));
      return { status: 409, cuerpo: { ok: false, hay_cuenta: true, error: "La cuenta de esta aplicación ya existe y no se puede crear otra. Entre con su correo y contraseña." } };
    }
    try { await redis.set(Cuentas.CLAVES.porCorreo(c.correo_hash), c.id); } catch { /* entrar no lo necesita: va por la marca */ }
    const token = await abrirSesion(redis, c.id, { ahora });
    return { status: 201, token, cuerpo: { ok: true, sesion: true, correo: c.correo, creada: true } };
  } catch {
    return { status: 503, cuerpo: { ok: false, error: "La cuenta no se pudo crear porque la base de datos no respondió. Vuelva a intentarlo en un momento." } };
  }
}

module.exports = {
  COOKIE_SESION, CLAVE_DUENO, VENTANA_INTENTOS_SEG, MAX_INTENTOS_POR_CUENTA, MAX_INTENTOS_POR_IP, MAX_INTENTOS_POR_CORREO, MAX_ALTAS_POR_IP,
  LLAVES_RETIRADAS_SHA256, esLlaveRetirada, MSG_LLAVE_RETIRADA,
  CLAVE_INTENTO, MSG_CREDENCIALES, MSG_SESION_INVALIDA, MSG_ORIGEN, MSG_ALMACEN,
  hashToken, claveSesion, leerCookie, hayCookieDeSesion, cabeceraCookie, cabeceraBorrarCookie,
  peticionDelMismoSitio, hayCuenta, sesionDeLaPeticion, abrirSesion, cerrarSesion,
  entrar, crearCuentaDelDueno,
};
