/* ============================================================================
   /api/perfil?op=cuenta · LA PUERTA DEL MODO CUENTA, hoy APAGADA
   ----------------------------------------------------------------------------
   Se pliega como `op` del router de perfil y JAMÁS como archivo nuevo bajo
   api/: la suite fija en seis el número de funciones de ese directorio, y una
   séptima rompería el despliegue entero.

   CON EL MODO APAGADO responde que está apagado, de forma explícita y con el
   cómo encenderlo. No un 404 —que diría «esto no existe» cuando lo que pasa es
   que no está encendido, y mandaría a buscar un fallo donde no lo hay— ni una
   degradación silenciosa, que es la peor de las dos.

   CON EL MODO ENCENDIDO todavía no hace nada más: `lib/cuentas` tiene la parte
   delicada escrita y probada (derivación de contraseña, sesión, claves del
   almacén), y el alta y el inicio de sesión se conectan aquí el día que se
   decida encenderlo. Se deja declarado en vez de insinuado.
   ========================================================================== */
"use strict";

const { modoCuentaEncendido, cuerpoApagado } = require("../../modo.js");

module.exports = async function cuenta(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!modoCuentaEncendido()) {
    /* 503 y no 404: el recurso existe, no está disponible todavía. Es el mismo
       código y la misma forma de respuesta que usa lib/auth cuando falta la
       configuración del token, para que el dueño reconozca la situación. */
    return res.status(503).json(cuerpoApagado());
  }
  return res.status(501).json({
    ok: false,
    modo_cuenta: true,
    error: "El modo cuenta está encendido, pero el alta y el inicio de sesión todavía no están conectados.",
    que_hacer: "Apague el modo cuenta para volver a la entrada directa mientras se termina.",
  });
};
