/* ============================================================================
   lib/error_interno · La respuesta JSON de un fallo que nadie capturó (6-sep-2026)
   ----------------------------------------------------------------------------
   Los seis routers de api/ hacían `return h()(req, res)` sin try: un throw
   dentro de un handler rechazaba la promesa y la plataforma respondía un 500
   SIN JSON, que el navegador solo podía traducir a un consejo genérico. Aquí
   vive la ÚNICA copia de la forma de esa respuesta —un solo texto, en registro
   de usted, que dice qué hacer— para que seis routers no la deriven cada uno
   por su lado. No decide nada ni autoriza nada: los routers siguen sin lógica.

   El detalle (mensaje y pila) va al registro del servidor, NUNCA al cuerpo: un
   500 con la pila era un oráculo de rutas y de nombres internos.
   Módulo HOJA: no requiere nada.
   ========================================================================== */
"use strict";

const MENSAJE_ERROR_INTERNO = "Error interno al preparar la respuesta. Vuelva a intentarlo en un minuto; "
  + "si el fallo persiste, avise a quien administra la aplicación.";

function responderErrorInterno(res, dominio, e) {
  console.error(`[api/${dominio}] fallo no capturado:`, (e && e.stack) || e);
  // si el handler ya empezó a responder no hay cabeceras que cambiar
  if (res && res.headersSent) return undefined;
  return res.status(500).json({ ok: false, error: MENSAJE_ERROR_INTERNO });
}

module.exports = { responderErrorInterno, MENSAJE_ERROR_INTERNO };
