/* ============================================================================
   /api/apu/inferir · Del objeto de una licitación a los ítems de su APU
   ----------------------------------------------------------------------------
   POST /api/apu/inferir            { objeto, unspsc, departamento } → ítems
   GET  /api/apu/inferir            estado del conocimiento (solo lee)
   POST /api/apu/inferir?sembrar=true   publica las semillas en Redis
   POST /api/apu/inferir?derivar=true   deriva el diccionario del histórico

   PROTEGIDO con el mismo `HISTORICO_TOKEN` del resto de /api/admin y de los
   endpoints de mantenimiento (lib/auth: header `x-historico-token` o `?token=`;
   el header manda si vienen los dos). Aquí el token NO es opcional, al revés
   que en /api/oportunidades: aquello es la lista pública a la que se presenta
   un cliente, y esto es la herramienta con la que el dueño arma su precio.

   ── Por qué las tres acciones viven en el MISMO endpoint ─────────────────
   Porque el que escribe una tabla tiene que ser el que la posee. El
   repositorio ya resolvió esta discusión una vez: la reconstrucción del índice
   de baja vive en `/api/indice-baja?reconstruir=true` y NO en
   `/api/diagnostico`, precisamente porque de diagnóstico se promete que SOLO
   LEE y esa promesa es lo que permite llamarlo cuando algo va mal. Aquí se
   mantiene la misma línea: el GET solo lee, y para escribir hay que pedirlo
   con un POST y un parámetro explícito.

   ── Por qué NO se siembra sola al inferir ────────────────────────────────
   Sería un camino de lectura que escribe. El motor ya funciona sin Redis —cae
   a las semillas del catálogo y lo DECLARA en `conocimiento.origen`—, así que
   no hay ninguna urgencia que justifique escribir a espaldas de quien
   consulta. El GET dice si falta sembrar y con qué llamada exacta se arregla.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
const {
  inferirItems, leerConocimiento, sembrarConocimiento, publicarConocimiento,
  derivarDiccionario, CLAVES_APU, MAX_ITEMS, PESO_UNSPSC, PESO_TEXTO, UMBRAL,
} = require("../../lib/apu/inferencia.js");
const { CATALOGO, CAPITULOS } = require("../../lib/apu/catalogo.js");

const MAX_BYTES = 256 * 1024;   // un objeto contractual no llega ni a 2 KB

async function leerCuerpo(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return { ok: true, datos: req.body };
  }
  let crudo = typeof req.body === "string" ? req.body : null;
  if (crudo === null) {
    crudo = await new Promise((resolve, reject) => {
      let buf = "", exceso = false;
      if (typeof req.on !== "function") return resolve("");
      req.on("data", (c) => {
        if (exceso) return;
        buf += c;
        if (Buffer.byteLength(buf, "utf8") > MAX_BYTES) { exceso = true; buf = ""; }
      });
      req.on("end", () => resolve(exceso ? null : buf));
      req.on("error", reject);
    });
    if (crudo === null) return { ok: false, status: 413, error: "Body demasiado grande", max_kb: 256 };
  }
  if (Buffer.byteLength(String(crudo || ""), "utf8") > MAX_BYTES) {
    return { ok: false, status: 413, error: "Body demasiado grande", max_kb: 256 };
  }
  if (!String(crudo || "").trim()) return { ok: true, datos: {} };
  try {
    return { ok: true, datos: JSON.parse(crudo) };
  } catch (e) {
    return { ok: false, status: 400, error: `Body no es JSON válido: ${e.message}` };
  }
}

const esVerdad = (v) => v === true || /^(1|true|si|sí)$/i.test(String(v || ""));

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });

  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use POST para inferir y GET para consultar el estado del conocimiento." });
  }

  /* Sin Redis el motor SIGUE sirviendo (semillas del catálogo). Se dice en la
     respuesta en vez de devolver un 503: una app que no puede sugerir ítems
     porque falta una variable de entorno es peor que una que sugiere con su
     conocimiento de fábrica y lo declara. Escribir, en cambio, sí exige Redis. */
  const conRedis = hayCredenciales();
  const redis = conRedis ? crearRedis({}) : null;

  /* ══════════════════ GET · estado del conocimiento (solo lee) ══════════════════ */
  if (metodo === "GET") {
    const c = await leerConocimiento(redis);
    const enSemilla = c.origen.mapeo === "semilla" || c.origen.diccionario === "semilla";
    return res.status(200).json({
      ok: true,
      catalogo: {
        items: CATALOGO.length,
        capitulos: Object.values(CAPITULOS).map((x) => x.nombre),
      },
      conocimiento: {
        origen: c.origen,
        version: c.version,
        claves_en_mapeo: c.mapeo.size,
        terminos_en_diccionario: c.diccionario.size,
        descartados: c.descartados,
        claves_redis: CLAVES_APU,
      },
      pesos: { unspsc: PESO_UNSPSC, texto: PESO_TEXTO, umbral: UMBRAL, max_items: MAX_ITEMS },
      redis_disponible: conRedis,
      mensaje: enSemilla
        ? "El motor está usando la semilla del catálogo (en código), no una tabla publicada en Redis. "
          + "Funciona igual; publique con POST /api/apu/inferir?sembrar=true para poder editarla sin desplegar."
        : "Conocimiento publicado en Redis.",
    });
  }

  /* ══════════════════ POST ?sembrar=true · publicar las semillas ══════════════════ */
  if (esVerdad(q.sembrar)) {
    if (!redis) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis: no hay dónde publicar." });
    try {
      const r = await sembrarConocimiento(redis);
      return res.status(200).json({
        ok: true, accion: "sembrar", ...r,
        nota: "Semillas publicadas. A partir de ahora manda lo que hay en Redis; el código sigue siendo el respaldo si la clave desaparece.",
      });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo publicar: ${e.message}` });
    }
  }

  /* ══════════════════ POST ?derivar=true · aprender del histórico ══════════════════ */
  if (esVerdad(q.derivar)) {
    if (!redis) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
    let r = null;
    try {
      r = await derivarDiccionario(redis, {});
    } catch (e) {
      return res.status(503).json({ ok: false, error: `La derivación falló: ${e.message}` });
    }
    if (!r.ok) {
      // 200 a propósito: no es un error del servidor, es una respuesta con
      // causa y siguiente paso — el mismo criterio que `equivalencias_por_que`
      return res.status(200).json({ ok: false, accion: "derivar", ...r });
    }
    try {
      const pub = await publicarConocimiento(redis, {
        diccionario: r.diccionario,
        nota: `derivado del histórico: ${r.terminos_nuevos} términos nuevos`,
      });
      return res.status(200).json({
        ok: true, accion: "derivar",
        ...pub,
        procesos_historico: r.procesos_historico,
        procesos_con_codigo_mapeado: r.procesos_con_codigo_mapeado,
        terminos_nuevos: r.terminos_nuevos,
        terminos_ampliados: r.terminos_ampliados,
        experiencia_cargada: r.experiencia_cargada,
        umbrales: r.umbrales,
      });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `Se derivó pero no se pudo publicar: ${e.message}` });
    }
  }

  /* ══════════════════ POST · inferir ══════════════════ */
  const cuerpo = await leerCuerpo(req);
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_kb) salida.max_kb = cuerpo.max_kb;
    return res.status(cuerpo.status).json(salida);
  }

  const datos = cuerpo.datos && typeof cuerpo.datos === "object" ? cuerpo.datos : {};
  const objeto = datos.objeto != null ? String(datos.objeto) : (q.objeto != null ? String(q.objeto) : "");
  const unspsc = datos.unspsc != null ? datos.unspsc : (q.unspsc != null ? q.unspsc : null);
  const departamento = datos.departamento != null ? String(datos.departamento) : (q.departamento != null ? String(q.departamento) : null);

  if (!objeto.trim() && !(unspsc != null && String(unspsc).trim())) {
    return res.status(400).json({
      ok: false,
      error: "Se necesita al menos «objeto» (el texto del objeto contractual) o «unspsc» (el código publicado). Sin ninguno de los dos no hay nada de donde inferir.",
      ejemplo: { objeto: "Construcción de placa huella en la vereda El Cairo", unspsc: "72141000", departamento: "Tolima" },
    });
  }

  let r = null;
  try {
    r = await inferirItems(objeto, unspsc, departamento, { redis });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `La inferencia falló: ${e.message}` });
  }

  /* Una lista vacía tiene DOS causas y `[]` no las distingue. El motor las
     separa —`no_pertinente` (no es obra) y `sin_sugerencias` (es obra, pero
     nada llegó al umbral)— y aquí hay que REENVIARLAS: un campo que se calcula,
     se publica y nadie transporta es peor que no calcularlo, porque parece que
     la explicación existe. Es la lección de `i.total_procesos` mirando al otro
     lado del cable. */
  return res.status(200).json({
    ok: true,
    objeto,
    unspsc: unspsc == null ? null : String(unspsc),
    departamento,
    items: r.items,
    total: r.total,
    recortados: r.recortados,
    no_pertinente: r.no_pertinente || null,
    sin_sugerencias: r.sin_sugerencias || null,
    cantidad_sugerida_motivo: r.cantidad_sugerida_motivo,
    diagnostico: r.diagnostico,
    como_leerlo: "Cada ítem viaja con su confianza y con los motivos que la produjeron (el código UNSPSC "
      + "y los términos del objeto que lo dispararon). Es una SUGERENCIA para no partir de una hoja en "
      + "blanco, no un presupuesto: revise las casillas antes de usarla. La cantidad va vacía siempre — "
      + "sin el pliego no se puede estimar, y un número inventado no se distingue de uno medido.",
  });
};
