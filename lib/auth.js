/* ============================================================================
   lib/auth · Un solo guardián para los endpoints protegidos
   ----------------------------------------------------------------------------
   TODO lo protegido de la app exige el MISMO token (`HISTORICO_TOKEN`) y en su
   día cada endpoint traía su copia de la comprobación. Una copia que se
   desincronice es un agujero, así que la comprobación vive aquí y solo aquí.
   Doce puntos de llamada, agrupados por lo que protegen:

     CORPUS Y DERIVADOS
     /api/sync/historico       backfill y reconstrucción de los derivados
     /api/diagnostico          expone el contenido del corpus
     /api/competencia-detalle  procesos históricos de una entidad, el desglose
                               de P(ganar) y el PAA (sus TRES vistas)
     /api/indice-baja          a qué precio se adjudica en cada entidad
     /api/resumen              agrega el corpus activo para el panel
     CONFIGURACIÓN DEL DUEÑO (lee y ESCRIBE)
     /api/admin/rup            el RUP
     /api/admin/experiencia    sus contratos ya ejecutados
     /api/admin/cobertura-rup  audita el histórico contra la whitelist del RUP
     /api/admin/apu/cargar-catalogo   reescribe el catálogo de precios
     MÓDULO APU
     api/apu/[accion]          todas MENOS `catalogo`, que es público
     lib/apu_extraer           la acción `extraer-texto`
     lib/apu_descargar         la acción `descargar`

   Y uno con el token OPCIONAL, el único: /api/oportunidades. Sin token sirve
   la lista con las finanzas redactadas (lib/publico); con un token PRESENTE
   pero inválido responde 401, nunca degrada en silencio.

   El nombre de la variable es histórico —nació para /api/sync/historico— y hoy
   es la llave de todo. Los mensajes de abajo NO pueden hablar solo de la
   extracción histórica: quien recibe el 503 puede estar pidiendo el panel, el
   catálogo o el editor de APU.

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
      error: "HISTORICO_TOKEN no está definida en este despliegue, así que TODOS los endpoints protegidos "
        + "están deshabilitados (el panel, el diagnóstico, la carga de RUP y de experiencia, los índices y "
        + "el editor de APU). No es que su token esté mal: es que el despliegue no tiene contra qué "
        + "compararlo, y jamás hay un valor por defecto que valga como llave. "
        /* El «cómo se arregla» va DENTRO de `error` y no en un campo aparte a
           propósito: los doce llamadores reenvían `error` (y, cuando existe,
           `como_autenticar`), así que un tercer campo se perdería por el camino
           y nadie llegaría a leerlo nunca. */
        + "Añádala en Vercel (Settings → Environment Variables) y VUELVA A DESPLEGAR: "
        + "las variables de entorno solo entran en despliegues nuevos.",
    };
  }
  // el header tiene prioridad sobre la query cuando vienen los dos
  const dado = String((req && req.headers && req.headers["x-historico-token"]) || q.token || "");
  const a = crypto.createHash("sha256").update(dado).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    /* «Inválido» y «ausente» son dos problemas con dos arreglos distintos —
       corregir lo que se escribió, o escribir algo— y juntarlos en una sola
       frase obligaba a adivinar cuál era. La distinción no filtra nada: quien
       no mandó token ya sabe que no lo mandó. El mensaje sigue empezando por
       «Token inválido» cuando SÍ vino algo, que es lo que los frontends
       reconocen para volver a pedirlo (hay prueba de esa cadena). */
    return {
      ok: false, status: 401,
      error: dado
        ? "Token inválido: el valor recibido no coincide con el HISTORICO_TOKEN de este despliegue. "
          + "Compruebe que lo copió entero (sin espacios al final) y que es el del entorno correcto."
        : "Token ausente: este endpoint está protegido y no llegó ninguna credencial. "
          + "Envíela por el header «x-historico-token» o, si no puede fijar cabeceras "
          + "(por ejemplo pegando la URL en el navegador), como parámetro «token» en la URL.",
      como_autenticar: COMO_AUTENTICAR,
    };
  }
  return { ok: true };
}

module.exports = { autorizarToken, COMO_AUTENTICAR };
