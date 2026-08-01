/* ============================================================================
   lib/auth · Un solo guardián para los endpoints protegidos
   ----------------------------------------------------------------------------
   Cinco endpoints exigen el MISMO token (`HISTORICO_TOKEN`) y en su día cada
   uno traía su copia de la comprobación. Una copia que se desincronice es un
   agujero, así que la comprobación vive aquí y solo aquí:

     /api/sync/historico     backfill y reconstrucción de los derivados
     /api/diagnostico        expone el contenido del corpus
     /api/competencia-detalle expone los procesos históricos de una entidad
     /api/resumen            agrega el corpus activo para el panel
     /api/admin/rup          lee y ESCRIBE el RUP del dueño

   DOS formas de enviarlo, validadas exactamente igual:

     header `x-historico-token`   preferido — no queda en los logs de acceso.
     query  `?token=…`            para dispararlo desde el NAVEGADOR, cuando no
                                  se pueden fijar cabeceras.

   Si llegan las dos, MANDA EL HEADER (sin ambigüedad posible). La comparación
   es de digests SHA-256 en tiempo constante: ni el contenido ni la longitud
   del token se filtran por el tiempo de respuesta.

   Sin la variable de entorno el endpoint responde 503 y no hace nada — jamás
   hay un default que valga como llave.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const COMO_AUTENTICAR = {
  header: "x-historico-token: <token>",
  url: "?token=<token>  (para dispararlo desde el navegador)",
};

function autorizarToken(req, q = {}) {
  const esperado = process.env.HISTORICO_TOKEN || "";
  if (!esperado) {
    return {
      ok: false, status: 503,
      error: "HISTORICO_TOKEN no está definida en este despliegue: la extracción histórica está deshabilitada. "
        + "Añádala en Vercel (Settings → Environment Variables) y vuelva a desplegar — las variables solo entran en despliegues nuevos.",
    };
  }
  // el header tiene prioridad sobre la query cuando vienen los dos
  const dado = String((req && req.headers && req.headers["x-historico-token"]) || q.token || "");
  const a = crypto.createHash("sha256").update(dado).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return {
      ok: false, status: 401,
      error: "Token inválido o ausente. Envíelo por el header «x-historico-token» o, si no puede fijar cabeceras "
        + "(por ejemplo desde el navegador), como parámetro «token» en la URL.",
      como_autenticar: COMO_AUTENTICAR,
    };
  }
  return { ok: true };
}

module.exports = { autorizarToken, COMO_AUTENTICAR };
