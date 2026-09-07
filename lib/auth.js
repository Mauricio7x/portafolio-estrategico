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

   Y la SINCRONIZACIÓN (/api/procesos?op=sync) tiene una guarda propia de DOS
   llaves —el Bearer del cron de Vercel o este mismo token— que solo existe
   cuando CRON_SECRET está en el entorno: `autorizarSincronizacion`, abajo.

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

/* Comparación en tiempo constante de digests SHA-256: ni el contenido ni la
   longitud del secreto se filtran por el tiempo de respuesta. La usan las dos
   llaves (HISTORICO_TOKEN y CRON_SECRET): una sola copia. */
function mismoSecreto(dado, esperado) {
  const a = crypto.createHash("sha256").update(String(dado)).digest();
  const b = crypto.createHash("sha256").update(String(esperado)).digest();
  return crypto.timingSafeEqual(a, b);
}

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
  if (!mismoSecreto(dado, esperado)) {
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

/* ─────────────── La sincronización (6-sep-2026, M-SEG-08) ───────────────
   /api/procesos?op=sync tiene TRES llamadores legítimos y ninguno más:
     · el cron de Vercel, que —según la documentación de Vercel— envía
       `Authorization: Bearer <CRON_SECRET>` a cada invocación cuando esa
       variable existe en el proyecto (no se pudo releer desde aquí el
       6-sep-2026: el proxy responde 403; el dueño lo comprueba en op=salud al
       día siguiente de crear la variable);
     · el dueño desde la marca y «Actualizar datos» (x-historico-token o
       ?token=, la MISMA llave de siempre: `autorizarToken`);
     · la propia aplicación cuando se encadena (sync → sync al agotar el
       presupuesto, listar → sync con Redis vacío), que manda el Bearer del
       cron porque el servidor lo conoce (`cabecerasDeAutoLlamada`).
   SIN la variable CRON_SECRET la guarda NO EXISTE y la operación sigue pública
   como hasta hoy: el cron de un despliegue sin la variable no manda ninguna
   cabecera y exigirla lo dejaría en 401 cada mañana sin que nadie lo viera.
   op=salud publica `sincronizacion_protegida` para que la ausencia no sea muda.
   Antes (medido el 6-sep-2026 con el handler real): cualquiera que conociera
   la URL tomaba el candado y lanzaba la ingesta contra Socrata. */
const COMO_AUTENTICAR_SYNC = {
  ...COMO_AUTENTICAR,
  cron: "Authorization: Bearer <CRON_SECRET>  (lo envía Vercel a las invocaciones del cron)",
};

const hayGuardaDeSincronizacion = () => Boolean(process.env.CRON_SECRET);

function autorizarSincronizacion(req, q = {}) {
  if (!hayGuardaDeSincronizacion()) return { ok: true, via: "abierta" };
  const h = (req && req.headers) || {};
  // Node y Vercel entregan las cabeceras en minúsculas; la forma capitalizada
  // solo llega de un llamador que construye `req` a mano (la suite)
  const auth = String(h.authorization || h.Authorization || "").trim();
  const portador = /^Bearer\s+(.+)$/i.exec(auth);
  if (portador && mismoSecreto(portador[1].trim(), process.env.CRON_SECRET)) return { ok: true, via: "cron" };
  const porToken = autorizarToken(req, q);
  if (porToken.ok) return { ok: true, via: "token" };
  return {
    ok: false, status: 401,
    error: "La sincronización está protegida en este despliegue: la dispara el cron de Vercel (cabecera "
      + "«Authorization: Bearer» con el CRON_SECRET del proyecto) o quien envíe la llave de la aplicación "
      + "(header «x-historico-token» o, pegando la URL en el navegador, «&token=…»). "
      + (portador
        ? "El Bearer recibido no coincide con CRON_SECRET."
        : porToken.status === 503
          ? "Además, HISTORICO_TOKEN no está definida en este despliegue: la vía de la llave no existe hasta que se añada y se vuelva a desplegar."
          : porToken.error),
    como_autenticar: COMO_AUTENTICAR_SYNC,
  };
}

/* Cabeceras con las que la aplicación SE LLAMA A SÍ MISMA (sync encadenada,
   listar → sync, sync → historico): el Bearer del cron cuando la guarda existe
   y el pase del muro de Vercel cuando el sitio pide contraseña (sin él la
   cadena muere en silencio: es la causa típica de una full que no termina).
   `extra` añade lo propio de cada disparo (la llave para op=historico).
   Devuelve undefined cuando no hay nada que mandar, como hasta hoy. */
function cabecerasDeAutoLlamada(extra) {
  const h = {};
  if (process.env.CRON_SECRET) h.authorization = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) h["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  Object.assign(h, extra || {});
  return Object.keys(h).length ? h : undefined;
}

module.exports = {
  autorizarToken, COMO_AUTENTICAR,
  autorizarSincronizacion, hayGuardaDeSincronizacion, cabecerasDeAutoLlamada, COMO_AUTENTICAR_SYNC,
};
