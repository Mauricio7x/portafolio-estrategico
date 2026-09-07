/* ============================================================================
   lib/cuerpo · Leer el cuerpo JSON de una petición, una sola vez
   ----------------------------------------------------------------------------
   Vivía TRIPLICADO —`api/admin/rup.js`, `api/admin/experiencia.js` y
   `api/apu/[accion].js` traían cada uno su copia de la misma función—, y los
   tres comentaban el mismo motivo: Vercel deja `req.body` parseado cuando el
   Content-Type es JSON, pero no siempre (ni en las pruebas), así que hay que
   cubrir los TRES casos: objeto, cadena y stream.

   Dos de las copias eran idénticas byte a byte salvo un sustantivo del mensaje;
   la tercera había derivado en tres detalles que nadie decidió:

     · su tope era 2 MB y el de las otras 5 MB (eso sí es deliberado y se
       conserva: es un parámetro);
     · su 413 llevaba un punto final que las otras no;
     · le faltaba la comprobación de tamaño de la rama «`req.body` es una
       cadena», así que un cuerpo de 8 MB entregado ya parseado por la
       plataforma se colaba por debajo de su propio tope documentado.

   Es la razón por la que este proyecto insiste en no duplicar: no divergen el
   día que se copian, divergen después, y en silencio.

   `leerCuerpo(req, {maxBytes, que})`:
     maxBytes  tope en bytes; superarlo es 413 con `max_mb` para el mensaje.
     que       sustantivo de la clave que se esperaba («perfiles», «contratos»).
               CON `que`, un cuerpo vacío es un 400 que dice qué falta.
               SIN `que`, un cuerpo vacío es `{}` y la acción decide — que es lo
               que necesita el editor de APU, donde varias acciones se disparan
               con un POST sin cuerpo.

   Devuelve `{ok:true, datos}` o `{ok:false, status, error[, max_mb]}`. Nunca
   lanza: quien llama responde el status tal cual.
   ========================================================================== */
"use strict";

const MAX_BYTES_DEFECTO = 5 * 1024 * 1024;
/* Tope de cuerpo de una función serverless en Vercel: por encima de esto la
   plataforma ya rechaza, así que medir aquí no compraría nada. */
const TOPE_PLATAFORMA = 4.5 * 1024 * 1024;
/* EL PDF QUE VUELVE AL NAVEGADOR (3-sep-2026, una sola constante desde el 6-sep-2026).
   `op=descargar` devuelve el PDF en base64 (×1,37) dentro de un JSON, y una RESPUESTA de
   Vercel se corta en el mismo 4,5 MB de arriba: 3 MB × 1,37 = 4,1 MB, siempre por debajo.
   Prometer 12 MB era prometer un fallo mudo entre 3,4 y 12 MB (HTTP 200 con el JSON
   truncado, medido con el handler real). El proxy (lib/apu_descargar) y el plan de
   lectura de los documentos (lib/documentos_proceso) lo importan de AQUÍ, porque el
   dueño del 4,5 MB es este módulo y dos copias «iguales hoy» divergen mañana. */
const TOPE_PDF_BASE64 = 3 * 1024 * 1024;
/* Centinela interno: un error del stream no puede confundirse con «cuerpo
   vacío» (que es legítimo) ni con «demasiado grande» (que es null). */
const ERROR_STREAM = Symbol("error-de-stream");

/* EL TOPE SE DICE EN LA UNIDAD QUE LO HACE LEGIBLE (ago 2026). `max_mb`
   redondeaba a megas, así que los dos endpoints con tope de 64 KB
   (`seguimiento` y `consorcio`) anunciaban «máximo 0 MB» — y como 0 es falsy,
   los llamadores que hacen `if (cuerpo.max_mb)` ni siquiera lo reenviaban: el
   usuario recibía un límite de tamaño SIN el tamaño. El campo se conserva tal
   cual para no cambiarle el contrato a quien ya lo lee; lo que cambia es que
   el límite viaja además dentro del mensaje, en KB o MB según cuál se lea. */
const legible = (bytes) => (bytes >= 1024 * 1024
  ? `${Math.round(bytes / (1024 * 1024))} MB`
  : `${Math.round(bytes / 1024)} KB`);

const demasiadoGrande = (maxBytes) => ({
  ok: false, status: 413,
  error: `Body demasiado grande (máximo ${legible(maxBytes)})`,
  max_mb: Math.round(maxBytes / (1024 * 1024)),
});

async function leerCuerpo(req, { maxBytes = MAX_BYTES_DEFECTO, que = null } = {}) {
  // 1 · la plataforma ya lo parseó
  if (req && req.body !== undefined && req.body !== null && typeof req.body === "object") {
    /* …Y EL TOPE TAMBIÉN SE APLICA AQUÍ (ago 2026). Esta es la rama NORMAL en
       producción (Vercel parsea cuando el Content-Type es JSON), y era la única
       que no medía nada: un cuerpo de 3 MB pasaba entero por un endpoint con
       tope declarado de 64 KB. Se mide serializando, que cuesta, pero solo
       cuando el tope es MENOR que el de la plataforma (4,5 MB): por encima de
       eso quien protege es Vercel y pagar el `stringify` no compraría nada. */
    /* Y SI NO SE PUEDE MEDIR, SE RECHAZA (ago 2026). El `catch` dejaba
       `bytes = 0`, o sea que un cuerpo imposible de serializar —una referencia
       circular, un `toJSON` que lanza— pasaba el tope por no poder medirlo:
       una guarda de tamaño que falla ABIERTA no es una guarda. Un objeto que
       no es JSON serializable tampoco es un cuerpo JSON válido, así que el 400
       es además la respuesta correcta. */
    if (maxBytes < TOPE_PLATAFORMA) {
      let bytes = null;
      try { bytes = Buffer.byteLength(JSON.stringify(req.body) || "", "utf8"); } catch { bytes = null; }
      if (bytes === null) return { ok: false, status: 400, error: "El cuerpo no es un JSON serializable" };
      if (bytes > maxBytes) return demasiadoGrande(maxBytes);
    }
    return { ok: true, datos: req.body };
  }

  // 2 · llegó como cadena, o hay que leer el stream
  let crudo = req && typeof req.body === "string" ? req.body : null;
  if (crudo === null) {
    crudo = await new Promise((resolve) => {
      /* LOS TROZOS SE ACUMULAN COMO BUFFER Y SE DECODIFICAN AL FINAL. Con
         `buf += c` cada trozo se decodificaba por separado, así que un carácter
         UTF-8 partido en la frontera de dos trozos («ó», «í», «ñ» — el texto de
         un pliego está lleno) salía como dos U+FFFD. El JSON seguía siendo
         válido (las comillas son ASCII), o sea corrupción SILENCIOSA; y en el
         lector de pliegos «M³» se convertía en «m», metro lineal donde el
         pliego paga metro cúbico. Además así el tope se mide en bytes de
         verdad, sin reconvertir la cadena en cada trozo. */
      const trozos = [];
      let bytes = 0, exceso = false;
      if (!req || typeof req.on !== "function") return resolve("");
      req.on("data", (c) => {
        // al pasarse se deja de acumular: no tiene sentido pagar memoria por un
        // cuerpo que ya está rechazado
        if (exceso) return;
        const b = Buffer.isBuffer(c) ? c : Buffer.from(String(c), "utf8");
        bytes += b.length;
        if (bytes > maxBytes) { exceso = true; trozos.length = 0; return; }
        trozos.push(b);
      });
      req.on("end", () => resolve(exceso ? null : Buffer.concat(trozos).toString("utf8")));
      /* «Nunca lanza» es el contrato de esta función y ningún llamador envuelve
         la llamada en try: un cliente que aborta a mitad (reset TCP) rechazaba
         la promesa y reventaba el handler con un 500 opaco en vez del status
         controlado que aquí se promete. */
      req.on("error", () => resolve(ERROR_STREAM));
    });
    if (crudo === ERROR_STREAM) {
      return { ok: false, status: 400, error: "No se pudo leer el cuerpo de la petición (conexión interrumpida)" };
    }
    if (crudo === null) return demasiadoGrande(maxBytes);
  }
  // la rama «cadena» no pasa por el contador de arriba, así que el tope se
  // comprueba igual — es la que se le olvidaba a una de las tres copias
  if (Buffer.byteLength(String(crudo || ""), "utf8") > maxBytes) return demasiadoGrande(maxBytes);

  // 3 · vacío: error con nombre, o `{}` según lo que espere quien llama
  if (!String(crudo || "").trim()) {
    return que
      ? { ok: false, status: 400, error: `Body vacío: se esperaba un JSON con la clave «${que}»` }
      : { ok: true, datos: {} };
  }

  try {
    return { ok: true, datos: JSON.parse(crudo) };
  } catch (e) {
    return { ok: false, status: 400, error: `Body no es JSON válido: ${e.message}` };
  }
}

module.exports = { leerCuerpo, MAX_BYTES_DEFECTO, TOPE_PLATAFORMA, TOPE_PDF_BASE64 };
