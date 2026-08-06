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

const demasiadoGrande = (maxBytes) => ({
  ok: false, status: 413,
  error: "Body demasiado grande",
  max_mb: Math.round(maxBytes / (1024 * 1024)),
});

async function leerCuerpo(req, { maxBytes = MAX_BYTES_DEFECTO, que = null } = {}) {
  // 1 · la plataforma ya lo parseó
  if (req && req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return { ok: true, datos: req.body };
  }

  // 2 · llegó como cadena, o hay que leer el stream
  let crudo = req && typeof req.body === "string" ? req.body : null;
  if (crudo === null) {
    crudo = await new Promise((resolve, reject) => {
      let buf = "", exceso = false;
      if (!req || typeof req.on !== "function") return resolve("");
      req.on("data", (c) => {
        // al pasarse se deja de acumular: no tiene sentido pagar memoria por un
        // cuerpo que ya está rechazado
        if (exceso) return;
        buf += c;
        if (Buffer.byteLength(buf, "utf8") > maxBytes) { exceso = true; buf = ""; }
      });
      req.on("end", () => resolve(exceso ? null : buf));
      req.on("error", reject);
    });
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

module.exports = { leerCuerpo, MAX_BYTES_DEFECTO };
