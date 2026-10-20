/* LA CAUSA REAL DE UN FALLO DE LECTURA (19-oct-2026) — capa PURA, sin red ni Redis.
   Hasta hoy un documento que no se podía bajar quedaba como «No se pudo leer: No se pudo descargar:
   fetch failed.»: el servidor tiraba `e.cause` (donde el cliente HTTP de Node pone el código real:
   ECONNRESET, un tiempo agotado, un fallo de TLS) y el navegador guardaba solo un texto. Dos documentos
   del mismo proceso fallaron dos veces seguidas y nadie pudo decir si era SECOP II, la red de Vercel o el
   propio código. Una causa que no se registra no se puede corregir: esto la clasifica, la sanea y la dice.

   Tres usos, UNA sola definición (dos tablas «equivalentes hoy» divergen a la primera corrección):
     · `causaDeRed` / `causaDeEstado`: el servidor clasifica lo que le pasó a SU descarga (lib/apu_descargar).
     · `saneada`: el servidor NO se fía de la causa que manda el navegador (puede mandar cualquier cosa).
     · `frase`: lo que lee el dueño en el expediente, en castellano.

   LO QUE LA FRASE NO PUEDE HACER (revisión adversaria, 19-oct-2026; cada punto se reprodujo):
     · culpar a SECOP II de lo que no se sabe. Un reinicio de conexión, un fallo de TLS o un DNS que no resuelve pueden ser la
       salida de red del servidor de Detekta: solo se nombra a SECOP II cuando SECOP II RESPONDIÓ (un 401/403/429, un error
       HTTP, un archivo vacío). El resto dice qué pasó, no quién.
     · prometer («temporal», «reintente»): eso lo decide quien tiene la serie de fallos, no una frase.
     · pisar un texto más informativo: la clase «desconocida», «plataforma» y «lector_no_cargo» NO reemplazan el motivo que ya
       traía el ilegible (ver `DEL_SERVIDOR`).
     · inventar un dato: un código técnico es solo texto alfabético corto (jamás un número del DOM como el 23 de un
       AbortSignal.timeout, ni una IP, ni un host). */
"use strict";
const { TOPE_PDF_BASE64 } = require("./cuerpo.js");

/* Cerrada a propósito: una clase que no está aquí es «desconocida», y la prueba exige que cada clase tenga su frase
   (un censo, no una lista). */
const CLASES = Object.freeze([
  "conexion",        // la conexión con SECOP II se cortó, se rechazó o no se completó (TLS, reinicio): no se sabe de qué lado
  "dns",             // el servidor de Detekta no pudo ubicar la dirección de SECOP II (ENOTFOUND, EAI_AGAIN)
  "tiempo",          // el archivo no llegó dentro del tiempo que da la plataforma
  "bloqueo_portal",  // SECOP II respondió 401/403/429: rechazó la descarga automática
  "error_portal",    // SECOP II respondió otro error HTTP (404, 5xx…)
  "no_es_documento", // llegó algo que no es el archivo esperado (página de sesión o de error, otro tipo de archivo)
  "vacio",           // SECOP II entregó un archivo de cero bytes
  "peso",            // el archivo pesa más de lo que la aplicación descarga
  "corte_a_mitad",   // la descarga empezó y se cortó
  "ocr_parcial",     // el reconocimiento de texto no pudo leer todas las páginas de un escaneo: el texto que llegó es el de las otras (20-oct-2026)
  "plataforma",      // la consulta al servidor de Detekta no se completó (el corte de la plataforma, una respuesta que no es JSON)
  "lector_no_cargo", // el lector de PDF (pdf.js) no se pudo cargar en este navegador: no dice nada del archivo
  "desconocida",     // llegó sin causa o con una que no se reconoce
]);
const ETAPAS = Object.freeze(["descarga", "lectura"]);
/* Las clases cuya frase SABE más que el texto que el ilegible ya traía: las que clasificó el servidor en la descarga.
   Las otras tres conservan el motivo de siempre, que dice algo concreto (el código 504, «su red puede estar bloqueando el sitio…»). */
const DEL_SERVIDOR = Object.freeze(["conexion", "dns", "tiempo", "bloqueo_portal", "error_portal", "no_es_documento", "vacio", "peso", "corte_a_mitad"]);

/* Un código técnico es SOLO texto alfabético corto (letras, dígitos y «_», empezando por letra): sin puntos —no cabe una IP
   ni un host—, sin espacios ni mensajes, y jamás un número (`AbortSignal.timeout` lanza un DOMException con `code` 23). */
const codigoLimpio = (s) => (typeof s === "string" && /^[A-Za-z][A-Za-z0-9_]{1,39}$/.test(s) ? s : null);
/* Un entero ES un número JSON: una cadena en blanco o un arreglo vacío se volvían 0 con `Number()` («sin dato» ≠ «cero»). */
const entero = (n, min, max) => (typeof n === "number" && Number.isInteger(n) && n >= min && n <= max ? n : null);

/* el código que el cliente HTTP de Node deja en `cause` (undici) o en el propio error */
function codigoDe(e) {
  if (!e || typeof e !== "object") return null;
  const c = e.cause && typeof e.cause === "object" ? e.cause : null;
  /* «Error» y «TypeError» no dicen nada (un `fetch` que falla es siempre un TypeError), y «TimeoutError»/«AbortError» ya los dice la clase
     «tiempo»: mostrarlos como «código técnico» sería inventar un dato; se queda null */
  const sinGenericos = (v) => (v === "Error" || v === "TypeError" || v === "TimeoutError" || v === "AbortError" ? null : v);
  return codigoLimpio(c && c.code) || codigoLimpio(e.code) || sinGenericos(codigoLimpio(c && c.name)) || sinGenericos(codigoLimpio(e.name));
}
const RE_TIEMPO = /^(UND_ERR_(CONNECT|HEADERS|BODY)_TIMEOUT|ETIMEDOUT|ESOCKETTIMEDOUT|TimeoutError|AbortError|ConnectTimeoutError)$/;
const RE_DNS = /^(ENOTFOUND|EAI_AGAIN)$/;

/* `fetch` o la lectura del cuerpo lanzaron: no hubo respuesta HTTP */
function causaDeRed(e, ms = null) {
  const codigo = codigoDe(e);
  const nombres = [e && e.name, e && e.cause && e.cause.name, e && e.cause && e.cause.code, e && e.code].map((x) => (typeof x === "string" ? x : ""));
  const clase = nombres.some((n) => RE_DNS.test(n)) ? "dns" : nombres.some((n) => RE_TIEMPO.test(n)) ? "tiempo" : "conexion";
  return { clase, codigo, http: null, ms: entero(ms, 0, 600000) };
}
/* SECOP II respondió, pero con un estado que no es un archivo */
function causaDeEstado(status, ms = null) {
  const http = entero(status, 100, 599);
  const clase = http === 401 || http === 403 || http === 429 ? "bloqueo_portal" : "error_portal";
  return { clase, codigo: null, http, ms: entero(ms, 0, 600000) };
}
const causaDe = (clase, extra = {}) => ({ clase: CLASES.includes(clase) ? clase : "desconocida", codigo: codigoLimpio(extra.codigo), http: entero(extra.http, 100, 599), ms: entero(extra.ms, 0, 600000) });

/* Lo que el navegador manda en `causa`: se reduce a una lista blanca de campos con su tipo y su rango.
   Devuelve null si no llegó nada utilizable (el motivo en texto sigue sirviendo). */
function saneada(c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const clase = CLASES.includes(c.clase) ? c.clase : "desconocida";
  const etapa = ETAPAS.includes(c.etapa) ? c.etapa : (clase === "lector_no_cargo" || clase === "ocr_parcial" ? "lectura" : "descarga");
  const pagLeidas = entero(c.pag_leidas, 0, 100000), pagTotal = entero(c.pag_total, 1, 100000);
  return { clase, etapa, codigo: codigoLimpio(c.codigo), http: entero(c.http, 100, 599), ms: entero(c.ms, 0, 600000),
    parte: entero(c.parte, 1, 64), bytes_total: entero(c.bytes_total, 0, 2 ** 31),
    /* solo si llegan: la causa de una descarga no tiene páginas, y un campo en null por todas partes no dice nada */
    ...(pagLeidas != null && pagTotal != null && pagLeidas < pagTotal ? { pag_leidas: pagLeidas, pag_total: pagTotal } : {}) };
}

const BASE = {
  conexion: "No se completó la conexión con SECOP II al bajar el archivo",
  dns: "El servidor de Detekta no pudo ubicar la dirección de SECOP II",
  tiempo: "El archivo no llegó dentro del tiempo permitido",
  bloqueo_portal: "SECOP II rechazó la descarga automática del archivo",
  error_portal: "SECOP II respondió con un error al pedir el archivo",
  no_es_documento: "Lo que llegó no es el archivo esperado: puede ser una página de sesión o de error, u otro tipo de archivo",
  vacio: "SECOP II entregó un archivo vacío",
  peso: "El archivo pesa más de lo que la aplicación descarga sola",
  corte_a_mitad: "La descarga del archivo se cortó antes de terminar",
  ocr_parcial: "El reconocimiento de texto no pudo leer todas las páginas del escaneo",
  plataforma: "El servidor de Detekta no completó la consulta",
  lector_no_cargo: "El lector de PDF no se pudo cargar en este navegador",
  desconocida: "No se pudo leer y la causa no quedó registrada",
};

/* La RACHA: cuántos fallos seguidos, contando desde el último, son de la MISMA clase. `n` (el total) mezcla un escaneo que espera
   el OCR, un «sin texto» definitivo y una descarga caída: «ya van 4 intentos que fallan» sería falso. La clase «desconocida»
   no hace racha (no se sabe si son iguales). */
function rachaDe(ultimas, clase) {
  if (!Array.isArray(ultimas) || !CLASES.includes(clase) || clase === "desconocida") return 0;
  let n = 0;
  for (let i = ultimas.length - 1; i >= 0; i--) { if (ultimas[i] && ultimas[i].clase === clase) n++; else break; }
  return n;
}

/* `serie` = docs.fallos[id] de lib/handlers/pliego/documentos ({n, ultimas:[{clase,…}]}). */
function frase(causa, serie = null) {
  const c = causa && typeof causa === "object" ? causa : null;
  if (!c) return null;
  const clase = CLASES.includes(c.clase) ? c.clase : "desconocida";
  const partes = [BASE[clase]];
  /* un escaneo a medias dice CUÁNTAS páginas se leyeron de cuántas: es lo que el dueño necesita para saber si el documento le sirve */
  if (clase === "ocr_parcial" && c.pag_leidas != null && c.pag_total != null && c.pag_leidas < c.pag_total) partes[0] = `El reconocimiento de texto solo pudo leer ${c.pag_leidas} de ${c.pag_total} páginas del escaneo; no se da por leído`;
  /* el estado HTTP solo si es un ERROR (un 200 con una página no es «respuesta 200» de ninguna falla) */
  if (c.http != null && c.http >= 400) partes[0] += ` (respuesta ${c.http})`;
  else if (c.codigo) partes[0] += ` (código técnico: ${c.codigo})`;
  if (c.parte != null && c.bytes_total != null && c.bytes_total > 0) {
    const de = Math.max(1, Math.ceil(c.bytes_total / TOPE_PDF_BASE64));
    if (de > 1 && c.parte <= de) partes.push(`falló al traer la parte ${c.parte} de ${de}`);
  }
  const racha = rachaDe(serie && serie.ultimas, clase);
  if (racha >= 2) partes.push(`ya van ${racha} intentos seguidos que fallan igual`);
  return `${partes.join("; ")}.`;
}

module.exports = { CLASES, ETAPAS, DEL_SERVIDOR, causaDeRed, causaDeEstado, causaDe, saneada, frase, rachaDe, codigoDe };
