/* ============================================================================
   /api/competencia-detalle · Consultas de SOLO LECTURA sobre el mercado
   ----------------------------------------------------------------------------
   TRES VISTAS, una sola función serverless:

     GET /api/competencia-detalle?entidad=ALCALDÍA DE PURIFICACIÓN[&nit=890000000]
         ¿CUÁLES son los procesos detrás del badge de competencia? Con el NIT,
         la entidad se encuentra también por su alias (otra razón social).
     GET /api/competencia-detalle?vista=probabilidad&id_proceso=CO1.REQ.123
         ¿POR QUÉ ese «Prob. estimada: 23 %»? — el desglose paso a paso.
         Alias público: /api/probabilidad-desglose (rewrite de vercel.json).
     GET /api/competencia-detalle?vista=paa[&entidad=…][&unspsc=72141000]
         ¿QUÉ VA A SALIR? — el Plan Anual de Adquisiciones de los próximos
         12 meses (dataset Socrata 9sue-ezhx, lib/paa).
         Alias público: /api/paa (rewrite de vercel.json).

     (token por header `x-historico-token` o por `?token=`)

   POR QUÉ VAN JUNTAS, que no es una decisión estética: el plan Hobby de Vercel
   admite 12 funciones por despliegue y el repositorio está EXACTAMENTE en 12
   (hay prueba que las cuenta). Un archivo más y no falla el endpoint nuevo:
   falla el despliegue entero. Es la misma restricción que plegó
   `/api/apu/catalogo` en `api/apu/[accion].js` y que impidió `/api/baja-mercado`.

   QUÉ COMPARTEN, dicho sin adornos. Las dos primeras responden la misma
   pregunta —«de dónde sale ese número de la tarjeta»— sobre el mismo corpus.
   La tercera NO: mira otro dataset, no toca Redis y habla de procesos que
   todavía no existen. Lo que las tres tienen en común es ser CONSULTAS DE SOLO
   LECTURA CON TOKEN que explican lo que el dueño ve en la pestaña de
   licitaciones, y ese es el alcance del archivo desde ago 2026. Conviene
   decirlo aquí en vez de dejar que un lector futuro deduzca que «detalle de
   competencia» alguna vez significó esto: el nombre del archivo se quedó corto
   y el tope de funciones es lo que impide arreglarlo.

   Las URLs literales `/api/probabilidad-desglose` y `/api/paa` existen como
   `rewrite` de vercel.json, que no cuenta como función. Hay prueba de que
   apuntan aquí CON su `vista`. El frontend llama a la CANÓNICA: si el rewrite
   fallara, el modal y el PAA tienen que seguir funcionando (misma lección que
   `/api/admin/cargar-experiencia-genesis`).

   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Sin poder ver esos 12, el promedio es una caja negra: no hay forma de saber
   si son procesos de obra civil o de cualquier otra cosa. Este endpoint los
   entrega, y entrega TAMBIÉN los que quedaron fuera del promedio y por qué —
   incluida la razón de que una entidad aparezca en ⚪ «sin datos».

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/diagnostico (lib/auth):
   expone contenido del corpus. SOLO LEE; lo único que escribe es su caché.

   Adjudicatarios (ago 2026): las FILAS siguen sin adjudicatario ni NIT — la
   proyección es una lista blanca (lib/competencia_detalle.proyectarProceso),
   igual que en /api/oportunidades—, pero la vista de entidad SÍ publica el
   AGREGADO «quién gana aquí» (top de ganadores, concentración y su lectura):
   es la señal #11 del manual hecha dato, es información pública de SECOP y
   este endpoint exige token. Decisión deliberada, con prueba de las dos
   mitades.

   `?publicado=1` (23-sep-2026, vistas entidad y adjudicatario): responde SOLO
   con lo que la reconstrucción del índice publicó —banda, hechos, «quién gana
   aquí», el perfil del competidor— sin recorrer el histórico, con `origen` y
   `construido`; la pantalla lo pinta al instante y pide el recorrido aparte.

   Caché: `indice:detalle:{entidad}` con TTL de 1 h para la vista de entidad y
   `indice:desglose_p:{id}` con TTL de 300 s para la del desglose. El valor
   guarda el sello de construcción del índice, así que reconstruirlo invalida
   todo al instante sin borrar clave por clave. `?refrescar=1` la salta.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { detalleEntidad, detalleAdjudicatario } = require("../../competencia_detalle.js");
const { desgloseDeProceso } = require("../../probabilidad_desglose.js");
const { consultarPaa } = require("../../paa.js");
const { medirAciertoPaa, leerAciertoPaa } = require("../../paa_acierto.js");

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const TOPE_CONTRATOS_RIVAL_MS = 40000;
const logDev = (...a) => { if (DEV) console.log("[competencia-detalle]", ...a); };

/* El costo de preparación lo aporta quien consulta o no se usa: un valor por
   defecto sería inventarse la cifra con la que se decide si vale la pena
   presentarse. (Desde el 5-nov-2026 el editor de precios calcula la póliza de
   seriedad con lib/apu/rentabilidad.costoPreparacionDe; este resumen no se
   cambió y sigue enunciando el umbral en múltiplos del costo.) */
function costoPreparacion(q) {
  if (q.costo_preparacion === undefined || String(q.costo_preparacion).trim() === "") return null;
  const n = Number(String(q.costo_preparacion).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  /* La vista se resuelve ANTES de autorizar y antes de tocar Redis: así una
     vista inventada no consume ni el token ni una lectura del corpus. Se lee
     de la query y del path como respaldo, igual que `accion` en
     api/apu/[accion].js: el rewrite trae `vista` en la query, pero un handler
     que solo funciona detrás del enrutador es un handler que no se puede
     probar. */
  const url = String(req.url || "");
  const enRuta = /\/api\/probabilidad-desglose\b/.test(url) ? "probabilidad"
    : /\/api\/paa\b/.test(url) ? "paa" : null;
  const vista = String(q.vista || enRuta || "entidad").toLowerCase();
  if (!["entidad", "probabilidad", "paa", "adjudicatario", "socio", "secop1"].includes(vista)) {
    return res.status(400).json({
      ok: false,
      error: `vista «${vista}» desconocida`,
      vistas: ["entidad (por defecto) — ?entidad=…", "probabilidad — ?id_proceso=…",
        "paa — [?entidad=…][&unspsc=…]", "adjudicatario — ?adjudicatario=<clave del top>",
        "socio — ?id=<NIT o cédula>[&representante=<cédula>]",
        "secop1 — ?departamentos=<códigos separados por coma>"],
    });
  }

  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false, error: permiso.error,
      ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
    });
  }

  /* El PAA sale AQUÍ, antes del chequeo duro de Upstash: la consulta vive en
     otro dataset de Socrata, no lee el corpus y no toma candados. Desde ago
     2026 hay DOS matices, los dos deliberados:
     · `?medir=1` SÍ exige Redis (cruza el PAA de una vigencia cerrada contra
       el corpus y guarda `paa:acierto`): es la única escritura de la vista y
       lo dice su 503.
     · la consulta normal LEE `paa:acierto` best-effort — un Redis caído
       devuelve null dentro de `leerAciertoPaa` y la vista sirve igual, con la
       tasa sin medir. La garantía que importa (una avería de Redis no tumba
       el PAA) se conserva. */
  /* SOCIO (ago 2026): la due diligence del truco #15 sobre CUATRO datasets de
     Socrata (SIRI, multas SECOP I, contratos y adjudicaciones SECOP II). Sale
     ANTES del chequeo de Upstash por la misma razón que el PAA: no lee el
     corpus, no escribe y no toma candados. Un `id` ilegible es 400 (no es un
     dataset caído: es la petición). */
  if (vista === "socio") {
    const { verificarSocio } = require("../../socio.js");
    const r = await verificarSocio({ identificacion: q.id, representante: q.representante }, { log: logDev });
    return res.status(r.ok ? 200 : 400).json(r);
  }

  /* LOS PROCESOS DE OBRA CONVOCADOS EN SECOP I (5-nov-2026, plan «Detekta a otro nivel», proceso 1 y fase 5): a pedido,
     por los departamentos del filtro (códigos «73,15»; uno desconocido es inerte), una consulta a f789-7hwg (lib/secop1).
     Sin Redis: no lee el corpus ni escribe nada. */
  if (vista === "secop1") {
    const Filtros = require("../../../public/filtros.js");
    const nombres = String(q.departamentos || "").split(",").map((c) => Filtros.departamento(String(c).trim())).filter(Boolean).map((d) => d.nombre);
    const r = await require("../../secop1.js").convocadosSecopI({ departamentos: nombres, log: logDev });
    return res.status(200).json({ ok: true, secop1: r });
  }

  if (vista === "paa") {
    /* LOS CONTRATOS QUE TERMINAN PRONTO (5-nov-2026, proceso 15): `por_vencer=1` con la misma entidad del PAA. Una consulta
       a jbjy-vk9h, sin Redis. Otro valor de `por_vencer` es inerte: el PAA de siempre */
    if (q.por_vencer === "1") {
      const r = await require("../../contratos_en_ejecucion.js").contratosPorVencer(q.entidad, { log: logDev });
      return res.status(200).json({ ok: true, por_vencer: r });
    }
    if (q.medir === "1") {
      if (!hayCredenciales()) {
        return res.status(503).json({ ok: false, error: "Medir la tasa de acierto exige credenciales de Upstash Redis (cruza el PAA contra el corpus)." });
      }
      let redisMedir;
      try { redisMedir = crearRedis({}); }
      catch (e) { return res.status(503).json({ ok: false, error: `Servicio de caché no disponible: ${e.message}` }); }
      const anio = q.anio && String(q.anio).trim() !== "" ? Number(q.anio) : undefined;
      const { estado, cuerpo } = await medirAciertoPaa(redisMedir, { anio, log: logDev });
      return res.status(estado).json(cuerpo);
    }
    let acierto = null;
    if (hayCredenciales()) {
      try { acierto = await leerAciertoPaa(crearRedis({})); } catch { acierto = null; }
    }
    const { estado, cuerpo } = await consultarPaa({ entidad: q.entidad, unspsc: q.unspsc, log: logDev, acierto });
    return res.status(estado).json(cuerpo);
  }

  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  }

  const t0 = Date.now();
  let redis;
  try { redis = crearRedis({}); }
  catch (e) { return res.status(503).json({ ok: false, error: `Servicio de caché no disponible: ${e.message}` }); }

  /* LO QUE EL COMPETIDOR TIENE POR EJECUTAR (5-nov-2026, proceso 7.2): `adjudicatario` + `contratos=1`. Solo con un
     NIT o un documento de verdad: la clave «nit:» también puede ser el código interno de SECOP, y buscar contratos con él
     daría un «no tiene» falso. El tipo sale del perfil publicado; si no lo hay, del `id_tipo` que la pantalla ya recibió
     del recorrido (otro valor es inerte). No escribe ni toma candados. */
  if (vista === "adjudicatario" && q.contratos === "1") {
    const clave = String(q.adjudicatario || "").trim();
    const digitos = /^nit:\d{5,}$/.test(clave) ? clave.slice(4) : null;
    let tipo = null;
    try {
      const pub = digitos && hayCredenciales() ? await require("../../competencia_detalle.js").leerPerfilPublicado(crearRedis({}), clave) : null;
      tipo = pub && pub.identificacion ? pub.identificacion.tipo : null;
    } catch { tipo = null; }
    if (!tipo && ["nit", "documento"].includes(String(q.id_tipo || ""))) tipo = String(q.id_tipo);
    if (!digitos || !["nit", "documento"].includes(tipo)) {
      return res.status(200).json({ ok: true, contratos: { ok: false, motivo: "Este competidor no tiene un NIT publicado en SECOP II (solo un código interno): no se pueden buscar sus contratos." } });
    }
    const CE = require("../../contratos_en_ejecucion.js");
    if (!CE.nitSinDv(digitos)) return res.status(200).json({ ok: true, contratos: { ok: false, motivo: "El número publicado de este competidor es demasiado corto para buscar sus contratos en SECOP II." } });
    /* tope TOTAL (revisión adversaria: con cientos de contratos vencidos, las tandas de modificaciones en serie pasaban de
       los 60 s de la función): pasado el tope se dice que tardó, nunca una lista a medias */
    let r;
    try {
      r = await Promise.race([CE.consultarContratosEnEjecucion(digitos, { log: logDev }), new Promise((_, no) => setTimeout(() => no(new Error("tope")), TOPE_CONTRATOS_RIVAL_MS))]);
    } catch { return res.status(200).json({ ok: true, contratos: { ok: false, motivo: "SECOP II tardó demasiado en responder con los contratos de este competidor. Intente de nuevo más tarde." } }); }
    return res.status(200).json({ ok: true, contratos: CE.resumenParaCompetidor(r) });
  }

  try {
    const usarCache = q.refrescar !== "1";
    /* `publicado=1` (23-sep-2026): entidad y competidor responden SOLO con lo
       que el índice publicó, sin recorrer el histórico —la pantalla lo pinta al
       instante y pide el recorrido aparte—. Cualquier otro valor es inerte. */
    const soloPublicado = q.publicado === "1";
    const { estado, cuerpo } = vista === "probabilidad"
      ? await desgloseDeProceso(redis, q.id_proceso, {
        usarCache, costoPreparacion: costoPreparacion(q), log: logDev,
        // A4: el perfil cuyos borradores dan la baja máxima del proceso, y la declarada
        perfil: String(q.perfil || "").trim().toLowerCase() || null,
        bajaDeclarada: q.baja_max !== undefined && q.baja_max !== "" && Number.isFinite(Number(q.baja_max)) ? Number(q.baja_max) : null,
      })
      : vista === "adjudicatario"
        ? await detalleAdjudicatario(redis, q.adjudicatario, { usarCache, log: logDev, soloPublicado })
        /* `nit` (24-sep-2026): el del chip, para encontrar la entidad por el MISMO alias
           que la tarjeta. Uno ilegible es inerte: se busca por el nombre. */
        : await detalleEntidad(redis, q.entidad, { usarCache, log: logDev, soloPublicado, nit: q.nit });
    return res.status(estado).json(
      estado === 200 ? { ...cuerpo, duracionMs: Date.now() - t0, comandosRedis: redis.comandos() } : cuerpo,
    );
  } catch (e) {
    // Redis caído, timeout o corpus ilegible: mensaje accionable, nunca un 500 mudo
    logDev("fallo:", e && e.message);
    return res.status(503).json({
      ok: false,
      error: "Servicio de caché no disponible. Intente de nuevo.",
      detalle: String((e && e.message) || e),
    });
  }
};
