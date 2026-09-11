/* ============================================================================
   lib/modo · EL INTERRUPTOR, y vive en un solo sitio
   ----------------------------------------------------------------------------
   La aplicación tiene dos modos de entrada, y solo uno está encendido:

   · MODO DIRECTO (el de hoy, y el que no se toca). Se entra sin sesión y sin
     crear nada: la landing ofrece subir el RUP, escribir tres datos o entrar
     con la clave del sitio. Es como funciona en producción.

   · MODO CUENTA (construido y APAGADO). Solo dos puertas —subir el RUP o
     escribir los datos a mano— y los datos quedan guardados bajo una cuenta con
     correo y contraseña. Es la mejora M-SEG-04 de la memoria («las cuentas son
     código, no compra»), y se deja escrita para no tener que inventarla el día
     que se encienda. Hoy no se enciende: el dueño lo pidió así.

   POR QUÉ UN INTERRUPTOR Y NO UNA RAMA. Una rama paralela diverge: la primera
   corrección que se aplique a una de las dos se queda sin aplicar en la otra, y
   el día de encenderla habría que rehacer el trabajo. Un interruptor obliga a
   que las dos vivan en el mismo árbol y a que la suite cubra las dos.

   AUSENTE ⇒ APAGADO, y a propósito. Un despliegue que no declare nada se
   comporta EXACTAMENTE como hoy. No hay valor por defecto que encienda nada:
   encenderlo tiene que ser un acto explícito de quien despliega.
   ========================================================================== */
"use strict";

/* El único nombre que decide. Cualquier otro valor —vacío, ausente, «0»,
   «false», «no»— deja el modo cuenta apagado. */
const VARIABLE = "DETEKTA_MODO_CUENTA";
const ENCENDIDO = new Set(["1", "true", "si", "sí", "on"]);

function modoCuentaEncendido(entorno = process.env) {
  const v = entorno && entorno[VARIABLE];
  if (v == null) return false;
  return ENCENDIDO.has(String(v).trim().toLowerCase());
}

/* Lo que responde la aplicación cuando alguien llama a algo del modo cuenta y
   está apagado. NUNCA un 404 mudo: un 404 le diría al dueño «esto no existe»
   cuando lo que pasa es que no está encendido, y mandaría a buscar un fallo
   donde no lo hay. Tampoco una degradación silenciosa. */
const MENSAJE_APAGADO = "Las cuentas de usuario todavía no están encendidas. "
  + "Por ahora se entra directo, sin crear cuenta: suba su registro de proponente o escriba sus datos.";

function cuerpoApagado() {
  return {
    ok: false,
    modo_cuenta: false,
    error: MENSAJE_APAGADO,
    /* Qué hay que hacer para encenderlo, en la respuesta y no en un documento
       aparte: es la misma regla que sigue lib/auth cuando falta el token. */
    como_encenderlo: `Declare ${VARIABLE}=1 en el entorno del despliegue y vuelva a desplegar.`,
  };
}

module.exports = { VARIABLE, modoCuentaEncendido, cuerpoApagado, MENSAJE_APAGADO };
