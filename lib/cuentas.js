/* ============================================================================
   lib/cuentas · La infraestructura de las cuentas de usuario. CONSTRUIDA Y SIN
   ENCHUFAR — el interruptor vive en lib/modo y hoy está apagado.
   ----------------------------------------------------------------------------
   QUÉ ES ESTO Y QUÉ NO ES. Es el módulo PURO que sabe cómo se guarda una
   cuenta, cómo se comprueba una contraseña y cómo se abre y se cierra una
   sesión. No abre ninguna ruta, no toca ninguna pantalla y ningún endpoint lo
   llama todavía. Se escribe ahora para que el día de encenderlo no haya que
   inventar la parte delicada con prisa — que es exactamente cuando se cometen
   los errores de esta clase.

   CERO DEPENDENCIAS, como todo el repositorio: `crypto` nativo. La derivación
   es **scrypt**, que es lenta a propósito y con coste de memoria, así que una
   contraseña robada no se prueba a millones por segundo. Los parámetros van
   GUARDADOS CON CADA CONTRASEÑA (`N`, `r`, `p`, la sal y la longitud): el día
   que haya que endurecerlos, las cuentas viejas siguen validando con los suyos
   y se re-derivan al siguiente inicio de sesión. Un esquema que no guarda sus
   parámetros no se puede endurecer sin echar a todo el mundo.

   LO QUE NUNCA SE GUARDA: la contraseña. Ni cifrada, ni «ofuscada». Solo su
   derivación, que no se puede deshacer.

   LA COMPARACIÓN ES EN TIEMPO CONSTANTE (`timingSafeEqual` sobre digests de la
   misma longitud), igual que en lib/auth: comparar con `===` filtra por tiempo
   cuántos bytes acertó quien prueba.

   EL CORREO NO SE GUARDA EN CLARO COMO CLAVE. La búsqueda «¿existe esta
   cuenta?» va por un hash del correo normalizado, así que un volcado del
   almacén no entrega la lista de correos de los usuarios. El correo sí se
   guarda dentro del registro de la cuenta —hace falta para escribirle—, pero no
   como nombre de clave.

   ENUMERACIÓN DE CUENTAS: `buscarPorCorreo` devuelve null tanto si la cuenta no
   existe como si existe. Quien la use tiene que responder lo MISMO en los dos
   casos, o un desconocido puede averiguar quién está registrado probando
   correos. Se dice aquí porque la tentación está en el consumidor, no aquí.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

/* ── parámetros de derivación ──────────────────────────────────────────────
   N = 2^15: del orden de decenas de milisegundos por intento en un servidor
   normal, y ~32 MB de memoria con r=8. Suficiente para que probar contraseñas
   en masa deje de ser barato, sin que iniciar sesión se note. */
const SCRYPT = Object.freeze({ N: 32768, r: 8, p: 1, claveBytes: 64, salBytes: 16, maxmem: 64 * 1024 * 1024 });

const MIN_CONTRASENA = 10;   // longitud, no «complejidad»: las reglas de símbolos producen peores contraseñas
const MAX_CONTRASENA = 200;  // tope: sin él, una contraseña enorme es una forma barata de tumbar el servidor
const MAX_CORREO = 254;      // lo que admite un correo, por norma

const TTL_SESION_SEG = 30 * 24 * 3600;   // 30 días
const TTL_CUENTA_SEG = null;             // una cuenta no caduca sola: la borra su dueño

/* ── claves del almacén ────────────────────────────────────────────────────
   `cuenta:correo:{hash}` → id, para buscar sin guardar el correo como clave. */
const CLAVES = Object.freeze({
  cuenta: (id) => `cuenta:${id}`,
  porCorreo: (hashCorreo) => `cuenta:correo:${hashCorreo}`,
  sesion: (token) => `sesion:${token}`,
  cuota: (ip, ventana) => `cuota:cuenta:${ip}:${ventana}`,
});

const ID_CUENTA_RE = /^cta_[a-z0-9]{16,32}$/;
const TOKEN_SESION_RE = /^[a-f0-9]{64}$/;

/* ── correo ────────────────────────────────────────────────────────────────
   Se normaliza antes de hashear, o «Juan@X.com» y «juan@x.com» serían dos
   cuentas distintas para la misma persona. NO se toca la parte local más allá
   de recortar y bajar a minúsculas: quitar puntos o lo que va tras un «+» es
   una regla de un proveedor concreto, no del correo, y aplicarla fusionaría
   cuentas que su dueño quiso separadas. */
function normalizarCorreo(correo) {
  const s = String(correo || "").trim().toLowerCase();
  if (!s || s.length > MAX_CORREO) return null;
  const partes = s.split("@");
  if (partes.length !== 2 || !partes[0] || !partes[1] || !partes[1].includes(".")) return null;
  if (/\s/.test(s)) return null;
  return s;
}
function hashCorreo(correoNormalizado) {
  return crypto.createHash("sha256").update(String(correoNormalizado), "utf8").digest("hex");
}

/* ── contraseña ────────────────────────────────────────────────────────────
   Se valida la LONGITUD y nada más. Las reglas de «una mayúscula y un símbolo»
   empujan a contraseñas cortas y predecibles; una frase larga es mejor y más
   fácil de recordar. Se rechaza la que viene con espacios al principio o al
   final porque casi siempre es un error de copiado que deja al dueño fuera. */
function validarContrasena(contrasena) {
  const s = String(contrasena == null ? "" : contrasena);
  if (s !== s.trim()) return { ok: false, error: "La contraseña no puede empezar ni terminar con un espacio." };
  if (s.length < MIN_CONTRASENA) return { ok: false, error: `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres. Una frase que recuerde sirve mejor que una palabra corta con símbolos.` };
  if (s.length > MAX_CONTRASENA) return { ok: false, error: `La contraseña no puede pasar de ${MAX_CONTRASENA} caracteres.` };
  return { ok: true };
}

/* Deriva la contraseña y devuelve una cadena que se guarda TAL CUAL. Lleva
   dentro sus propios parámetros: así se pueden endurecer sin invalidar lo ya
   guardado. Formato: scrypt$N$r$p$sal$derivada (todo en hexadecimal). */
function derivarContrasena(contrasena, sal = null) {
  const s = sal || crypto.randomBytes(SCRYPT.salBytes);
  const derivada = crypto.scryptSync(String(contrasena), s, SCRYPT.claveBytes, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${s.toString("hex")}$${derivada.toString("hex")}`;
}

/* Comprueba en TIEMPO CONSTANTE. Nunca lanza: una derivación guardada corrupta
   —o de un esquema que ya no se reconoce— es «no coincide», no un 500 que le
   diría a quien prueba que ahí hay algo raro. */
function contrasenaCoincide(contrasena, guardada) {
  try {
    const partes = String(guardada || "").split("$");
    if (partes.length !== 6 || partes[0] !== "scrypt") return false;
    const N = Number(partes[1]), r = Number(partes[2]), p = Number(partes[3]);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    const sal = Buffer.from(partes[4], "hex");
    const esperada = Buffer.from(partes[5], "hex");
    if (!sal.length || !esperada.length) return false;
    const derivada = crypto.scryptSync(String(contrasena), sal, esperada.length, { N, r, p, maxmem: SCRYPT.maxmem });
    return derivada.length === esperada.length && crypto.timingSafeEqual(derivada, esperada);
  } catch {
    return false;
  }
}

/* ¿La derivación guardada usa parámetros más flojos que los de hoy? Si sí, hay
   que volver a derivar la contraseña en el siguiente inicio de sesión, que es
   el único momento en que se tiene en claro. */
function necesitaRederivar(guardada) {
  const partes = String(guardada || "").split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return true;
  return Number(partes[1]) < SCRYPT.N || Number(partes[2]) < SCRYPT.r;
}

/* ── identidad ─────────────────────────────────────────────────────────────
   Los identificadores salen de `crypto.randomBytes`, JAMÁS de un contador ni
   del correo: un id adivinable convierte cualquier fuga en una lista. */
function generarIdCuenta() { return `cta_${crypto.randomBytes(10).toString("hex")}`; }
function generarTokenSesion() { return crypto.randomBytes(32).toString("hex"); }

const esIdCuenta = (id) => ID_CUENTA_RE.test(String(id || ""));
const esTokenSesion = (t) => TOKEN_SESION_RE.test(String(t || ""));

/* ── la forma de una cuenta ────────────────────────────────────────────────
   `perfiles` son los ids de perfil que la cuenta posee (los `rup_…` que creó
   al subir su registro o al escribir sus datos). Una cuenta NO lleva cifras de
   ninguna empresa: esas siguen viviendo donde ya viven. */
function nuevaCuenta({ correo, contrasena, ahora = null }) {
  const c = normalizarCorreo(correo);
  if (!c) return { ok: false, error: "Ese correo no parece válido. Escríbalo completo, con la arroba y el dominio." };
  const v = validarContrasena(contrasena);
  if (!v.ok) return v;
  return {
    ok: true,
    cuenta: {
      id: generarIdCuenta(),
      correo: c,
      correo_hash: hashCorreo(c),
      contrasena: derivarContrasena(contrasena),
      perfiles: [],
      creada: ahora || new Date().toISOString(),
      ultimo_acceso: null,
    },
  };
}

/* Lo que puede salir de la aplicación hacia el navegador. La derivación de la
   contraseña y el hash del correo NO salen nunca: no le sirven a nadie del
   otro lado y sí a quien intercepte la respuesta. */
function cuentaPublica(cuenta) {
  if (!cuenta) return null;
  return {
    id: cuenta.id,
    correo: cuenta.correo,
    perfiles: Array.isArray(cuenta.perfiles) ? [...cuenta.perfiles] : [],
    creada: cuenta.creada || null,
    ultimo_acceso: cuenta.ultimo_acceso || null,
  };
}

/* ── sesión ────────────────────────────────────────────────────────────────
   Una sesión es un token opaco con fecha de caducidad y nada más. No lleva
   dentro ningún dato de la cuenta: si lo llevara, cambiar algo de la cuenta
   dejaría sesiones mintiendo hasta que caducaran. */
function nuevaSesion(idCuenta, { ahora = null, ttlSeg = TTL_SESION_SEG } = {}) {
  if (!esIdCuenta(idCuenta)) return null;
  const token = generarTokenSesion();
  return {
    token,
    sesion: { cuenta: idCuenta, creada: ahora || new Date().toISOString(), ttl_seg: ttlSeg },
  };
}

module.exports = {
  CLAVES, SCRYPT, MIN_CONTRASENA, MAX_CONTRASENA, TTL_SESION_SEG, TTL_CUENTA_SEG,
  ID_CUENTA_RE, TOKEN_SESION_RE, esIdCuenta, esTokenSesion,
  normalizarCorreo, hashCorreo,
  validarContrasena, derivarContrasena, contrasenaCoincide, necesitaRederivar,
  generarIdCuenta, generarTokenSesion,
  nuevaCuenta, cuentaPublica, nuevaSesion,
};
