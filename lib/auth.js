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

   Y los de token OPCIONAL (/api/oportunidades, el pulso, el cronograma, las
   lecturas públicas del editor de APU): sin credencial sirven la vista pública
   (lib/publico); con una credencial PRESENTE pero inválida responden 401,
   nunca degradan en silencio. `hayCredencial` dice si vino alguna.

   Y la SINCRONIZACIÓN (/api/procesos?op=sync) tiene una guarda propia de DOS
   llaves —el Bearer del cron de Vercel o este mismo guardián— que solo existe
   cuando CRON_SECRET está en el entorno: `autorizarSincronizacion`, abajo.

   DOS CREDENCIALES, Y SOLO DOS (17-oct-2026, decisión del dueño):

     LA SESIÓN DEL DUEÑO   cookie `__Host-detekta_sesion` (HttpOnly, la abre
                           /api/admin?op=entrar con correo y contraseña; lib/sesion).
                           Es la del navegador: la página no lleva ninguna llave.
     LA LLAVE DEL SERVIDOR HISTORICO_TOKEN, para lo que corre FUERA de un
                           navegador: el flujo de GitHub, las rutinas y las skills
                           de Claude Code, y el dueño que pega una URL con
                           `&token=` en la barra de Chrome. Desde el CÓDIGO de una
                           página (fetch con Sec-Fetch-Mode) se RECHAZA con 401: la
                           llave dejó de vivir en el navegador y no puede volver.

   El nombre de la variable es histórico —nació para /api/sync/historico— y hoy
   es la llave de todo. Los mensajes de abajo NO pueden hablar solo de la
   extracción histórica: quien recibe el 503 puede estar pidiendo el panel, el
   catálogo o el editor de APU.

   DOS formas de enviar la llave, validadas exactamente igual:

     header `x-historico-token`   preferido — no queda en los logs de acceso.
     query  `?token=…`            para pegarla en la barra del navegador.

   Si llegan las dos, MANDA EL HEADER (sin ambigüedad posible). Si llegan la
   llave y la cookie, manda la LLAVE: una llave presente e inválida es 401
   aunque haya una sesión válida detrás. La comparación es de digests SHA-256
   en tiempo constante: ni el contenido ni la longitud del token se filtran por
   el tiempo de respuesta.

   ES ASÍNCRONO desde el 17-oct-2026 (la sesión se comprueba en Redis): todo
   llamador lo espera con `await`. Un `await` olvidado falla CERRADO —una
   promesa no tiene `.ok`—, y la suite censa que ninguno se olvide.

   Sin la variable de entorno el endpoint responde 503 y no hace nada — jamás
   hay un default que valga como llave.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const COMO_AUTENTICAR = {
  sesion: "En la aplicación: entre con su correo y contraseña (la sesión dura 30 días en ese navegador).",
  header: "x-historico-token: <token>  (servidores, flujos de GitHub y rutinas)",
  url: "?token=<token>  (para pegar la URL en la barra del navegador)",
};

/* Comparación en tiempo constante de digests SHA-256: ni el contenido ni la
   longitud del secreto se filtran por el tiempo de respuesta. La usan las dos
   llaves (HISTORICO_TOKEN y CRON_SECRET) y la sesión (lib/sesion): una sola copia. */
function mismoSecreto(dado, esperado) {
  const a = crypto.createHash("sha256").update(String(dado)).digest();
  const b = crypto.createHash("sha256").update(String(esperado)).digest();
  return crypto.timingSafeEqual(a, b);
}

/* El require de lib/sesion va DIFERIDO: lib/sesion llama a `mismoSecreto` de
   aquí, y un require arriba cerraría el ciclo. */
const Sesion = () => require("./sesion.js");

const llaveDada = (req, q) => String((req && req.headers && req.headers["x-historico-token"]) || (q && q.token) || "");

/* ¿Vino ALGUNA credencial —la llave o la cookie de sesión—? La usan los
   endpoints de token OPCIONAL para decidir entre la vista pública y comprobar:
   una credencial presente se comprueba SIEMPRE (presente e inválida = 401). */
function hayCredencial(req, q = {}) {
  return Boolean(llaveDada(req, q)) || Sesion().hayCookieDeSesion(req);
}

/* ¿La pide el CÓDIGO de una página web? Los navegadores marcan TODA petición
   con Sec-Fetch-Site (Chrome, Firefox y Safari): `none` es la barra de
   direcciones y `navigate` (Sec-Fetch-Mode) una navegación —el dueño pegando
   una URL con &token=, que se conserva—; cualquier otra combinación es un fetch
   de una página. OJO: el `fetch` de Node también manda `sec-fetch-mode: cors`
   (medido con Node 22) pero NO Sec-Fetch-Site, y la aplicación se llama a sí
   misma con él y con la llave (sync → histórico, el latido): por eso se mira el
   SITIO y no el modo a solas. curl, el cron y los flujos no mandan ninguna. */
function desdeCodigoDePagina(req) {
  const h = (req && req.headers) || {};
  const sitio = String(h["sec-fetch-site"] || "").trim().toLowerCase();
  const modo = String(h["sec-fetch-mode"] || "").trim().toLowerCase();
  return Boolean(sitio) && sitio !== "none" && modo !== "navigate";
}

/* → { ok:true, via:"llave"|"sesion" } o { ok:false, status, error[, como_autenticar] }.
   `opciones.redis` inyecta el cliente (pruebas); sin él se crea uno al vuelo. */
async function autorizarToken(req, q = {}, opciones = {}) {
  const esperado = process.env.HISTORICO_TOKEN || "";
  // el header tiene prioridad sobre la query cuando vienen los dos
  const dado = llaveDada(req, q);

  /* SIN LLAVE PERO CON COOKIE: la sesión del dueño. Se comprueba contra el
     almacén (salir la invalida en el servidor) y, si la petición escribe, que
     venga de la propia página (defensa contra envíos desde otro sitio, además
     de SameSite=Strict). No depende de HISTORICO_TOKEN: rotar la llave del
     servidor no echa al dueño de su navegador. */
  if (!dado && Sesion().hayCookieDeSesion(req)) {
    const s = await Sesion().sesionDeLaPeticion(req, { redis: opciones.redis || null });
    if (!s.ok) return { ok: false, status: s.status, error: s.error, sesion_invalida: s.sesion_invalida || undefined, como_autenticar: COMO_AUTENTICAR };
    if (!Sesion().peticionDelMismoSitio(req)) return { ok: false, status: 403, error: Sesion().MSG_ORIGEN, motivo: "origen" };
    return { ok: true, via: "sesion", cuenta: s.cuenta };
  }

  if (!esperado) {
    return {
      ok: false, status: 503,
      error: "HISTORICO_TOKEN no está definida en este despliegue, así que TODOS los endpoints protegidos "
        + "están deshabilitados para quien no tenga la sesión del dueño (el panel, el diagnóstico, la carga "
        + "de RUP y de experiencia, los índices y el editor de APU). No es que su token esté mal: es que el "
        + "despliegue no tiene contra qué compararlo, y jamás hay un valor por defecto que valga como llave. "
        /* El «cómo se arregla» va DENTRO de `error` y no en un campo aparte a
           propósito: los doce llamadores reenvían `error` (y, cuando existe,
           `como_autenticar`), así que un tercer campo se perdería por el camino
           y nadie llegaría a leerlo nunca. */
        + "Añádala en Vercel (Settings → Environment Variables) y VUELVA A DESPLEGAR: "
        + "las variables de entorno solo entran en despliegues nuevos.",
    };
  }
  /* LA LLAVE NO SE ACEPTA DESDE EL CÓDIGO DE UNA PÁGINA (17-oct-2026). Vivió
     escrita en public/*.js y cualquiera la leía; la página entra hoy con la
     sesión del dueño. Si alguien la vuelve a escribir en el navegador, falla
     aquí a la primera, en vez de quedar publicada otra vez en silencio. */
  if (dado && desdeCodigoDePagina(req)) {
    return {
      ok: false, status: 401,
      error: "Token inválido desde una página web: la llave del servidor no se acepta desde el código del navegador. "
        + "En la aplicación se entra con correo y contraseña; la llave es solo para servidores, flujos y rutinas.",
      como_autenticar: COMO_AUTENTICAR,
    };
  }
  if (!mismoSecreto(dado, esperado)) {
    /* «Inválido» y «ausente» son dos problemas con dos arreglos distintos —
       corregir lo que se escribió, o escribir algo— y juntarlos en una sola
       frase obligaba a adivinar cuál era. La distinción no filtra nada: quien
       no mandó token ya sabe que no lo mandó. El mensaje sigue empezando por
       «Token inválido» cuando SÍ vino algo (hay prueba de esa cadena). */
    return {
      ok: false, status: 401,
      error: dado
        ? "Token inválido: el valor recibido no coincide con el HISTORICO_TOKEN de este despliegue. "
          + "Compruebe que lo copió entero (sin espacios al final) y que es el del entorno correcto."
        : "Token ausente: este endpoint está protegido y no llegó ninguna credencial. "
          + "En la aplicación, entre con su correo y contraseña. Desde un servidor, envíe la llave por el "
          + "header «x-historico-token» o, pegando la URL en la barra del navegador, como parámetro «token».",
      como_autenticar: COMO_AUTENTICAR,
    };
  }
  return { ok: true, via: "llave" };
}

/* ─────────────── La sincronización (6-sep-2026, M-SEG-08) ───────────────
   /api/procesos?op=sync tiene TRES llamadores legítimos y ninguno más:
     · el cron de Vercel, que —según la documentación de Vercel— envía
       `Authorization: Bearer <CRON_SECRET>` a cada invocación cuando esa
       variable existe en el proyecto (no se pudo releer desde aquí el
       6-sep-2026: el proxy responde 403; el dueño lo comprueba en op=salud al
       día siguiente de crear la variable);
     · el dueño desde la marca y «Actualizar datos» (su SESIÓN desde el
       17-oct-2026; o la llave por x-historico-token o ?token= desde fuera de
       la página: `autorizarToken`, el mismo guardián de todo lo demás);
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

async function autorizarSincronizacion(req, q = {}, opciones = {}) {
  if (!hayGuardaDeSincronizacion()) return { ok: true, via: "abierta" };
  const h = (req && req.headers) || {};
  // Node y Vercel entregan las cabeceras en minúsculas; la forma capitalizada
  // solo llega de un llamador que construye `req` a mano (la suite)
  const auth = String(h.authorization || h.Authorization || "").trim();
  const portador = /^Bearer\s+(.+)$/i.exec(auth);
  if (portador && mismoSecreto(portador[1].trim(), process.env.CRON_SECRET)) return { ok: true, via: "cron" };
  const porToken = await autorizarToken(req, q, opciones);
  if (porToken.ok) return { ok: true, via: porToken.via === "sesion" ? "sesion" : "token" };
  /* lo que falló fue la SESIÓN (sin llave y con cookie): su motivo tal cual
     —caducada, otro sitio, la base que no respondió—, no la lista de llaves */
  if (!portador && !llaveDada(req, q) && Sesion().hayCookieDeSesion(req)) return { ...porToken, como_autenticar: COMO_AUTENTICAR_SYNC };
  return {
    ok: false, status: 401,
    error: "La sincronización está protegida en este despliegue: la dispara el cron de Vercel (cabecera "
      + "«Authorization: Bearer» con el CRON_SECRET del proyecto), el dueño con su sesión iniciada en la "
      + "aplicación, o quien envíe la llave de la aplicación "
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
  autorizarToken, COMO_AUTENTICAR, hayCredencial, mismoSecreto, desdeCodigoDePagina,
  autorizarSincronizacion, hayGuardaDeSincronizacion, cabecerasDeAutoLlamada, COMO_AUTENTICAR_SYNC,
};
