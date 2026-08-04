/* ============================================================================
   /api/admin/rup · Cargar y consultar el RUP del dueño (archivo JSON)
   ----------------------------------------------------------------------------
   GET  /api/admin/rup?token=…   → el RUP VIGENTE, en el mismo esquema que se
                                   sube (descargar → editar → volver a subir).
   POST /api/admin/rup?token=…   → valida y guarda un RUP nuevo.

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/sync/historico,
   /api/diagnostico, /api/competencia-detalle y /api/resumen (lib/auth: header
   `x-historico-token` o `?token=`, el header manda si vienen los dos).

   POR QUÉ EXISTE: los perfiles eran datos hardcodeados en lib/perfiles.js, así
   que actualizar un RUP —un código UNSPSC nuevo, un indicador del balance del
   año, un profesional más— exigía tocar código y desplegar. El dueño no tiene
   terminal. Ahora sube un archivo desde /admin.html y el cambio surte efecto en
   la siguiente consulta: el juicio (matching UNSPSC, capacidad K, tope) corre
   AL SERVIR desde jul 2026, así que no hace falta re-sincronizar nada.

   ORDEN DE ESCRITURA (lo único delicado): primero las whitelists derivadas,
   después la configuración, y el SELLO (`config:perfiles:version`) AL FINAL.
   El sello es lo que hace recargar a las instancias calientes; escribirlo el
   último garantiza que nadie lea un estado a medias si la función muere en
   mitad de la carga. Y al terminar se invalida la caché del dashboard: sus
   números salen de este RUP y quedarían mintiendo cinco minutos.

   La configuración se guarda COMPRIMIDA (mismo formato que los chunks): el
   tope real de Upstash es 1 MB por valor y un RUP con cientos de códigos cabe
   de sobra, pero un archivo grande sin comprimir no.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
const { CLAVES, escribirJSONComprimido, leerJSONComprimido } = require("../../lib/almacen.js");
const { validarConfig, derivarUnspsc } = require("../../lib/config_rup.js");
const {
  PERFILES, aplicarConfig, invalidarCachePerfiles, recargarPerfiles,
  fuentePerfiles, perfilesComoConfig, idCanonico,
} = require("../../lib/perfiles.js");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB de cuerpo (requerimiento)

/* Cuerpo de la petición. Vercel ya deja `req.body` parseado cuando el
   Content-Type es JSON, pero no siempre (ni en las pruebas), así que se
   cubren los tres casos: objeto, cadena y stream. */
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
    if (crudo === null) return { ok: false, status: 413, error: "Body demasiado grande", max_mb: 5 };
  }
  if (Buffer.byteLength(String(crudo || ""), "utf8") > MAX_BYTES) {
    return { ok: false, status: 413, error: "Body demasiado grande", max_mb: 5 };
  }
  if (!String(crudo || "").trim()) {
    return { ok: false, status: 400, error: "Body vacío: se esperaba un JSON con la clave «perfiles»" };
  }
  try {
    return { ok: true, datos: JSON.parse(crudo) };
  } catch (e) {
    return { ok: false, status: 400, error: `Body no es JSON válido: ${e.message}` };
  }
}

/* Resumen legible de lo que quedó cargado (lo que enseña la UI). */
function resumenPerfiles() {
  const out = {};
  for (const clave of ["helder", "genesis", "consorcio"]) {
    const p = PERFILES[idCanonico(clave)];
    if (!p) continue;
    const d = derivarUnspsc([...p.unspsc]);
    out[clave] = {
      nombre: p.nombre,
      codigos: p.unspsc.size,
      clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length,
      profesionales: p.profesionales, tope_smmlv: p.topeSMMLV,
    };
  }
  return out;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const metodo = String(req.method || "GET").toUpperCase();
  const redis = crearRedis({});

  /* ══════════════════ GET · el RUP vigente ══════════════════ */
  if (metodo === "GET") {
    let config = null, version = null;
    try {
      version = await redis.get(CLAVES.configPerfilesVersion);
      if (version != null) config = await leerJSONComprimido(redis, CLAVES.configPerfiles);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer la configuración: ${e.message}` });
    }
    if (config && config.perfiles) {
      return res.status(200).json({
        ok: true, fuente: "redis",
        version: String(version),
        cargado: (config._meta && config._meta.cargado) || String(version),
        perfiles: config.perfiles,
        resumen: resumenPerfiles(),
      });
    }
    // nada cargado (o valor ilegible): se devuelven los del repositorio, ya
    // traducidos al esquema de carga para poder editarlos y subirlos
    return res.status(200).json({
      ok: true, fuente: "hardcoded",
      advertencia: "No se ha cargado ningún RUP. Estos son los valores por defecto del repositorio (RUP corte 31/12/2025).",
      version: null, cargado: null,
      perfiles: perfilesComoConfig(),
      resumen: resumenPerfiles(),
    });
  }

  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use GET para consultar y POST para cargar." });
  }

  /* ══════════════════ POST · cargar un RUP ══════════════════ */
  const cuerpo = await leerCuerpo(req);
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }

  const v = validarConfig(cuerpo.datos);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      error: `El archivo tiene ${v.errores.length} error${v.errores.length === 1 ? "" : "es"} de validación: no se guardó nada.`,
      errores: v.errores,
      advertencias: v.advertencias,
    });
  }

  /* El sello lleva un sufijo aleatorio además del instante: dos cargas dentro
     del mismo milisegundo (dos pestañas, un doble envío) producirían el mismo
     ISO y la segunda pasaría desapercibida para las instancias calientes, que
     comparan sellos. La fecha legible viaja aparte, en `_meta.cargado`. */
  const cargado = new Date().toISOString();
  const version = `${cargado}#${Math.random().toString(36).slice(2, 10)}`;
  const config = { ...v.config, _meta: { version, cargado, perfiles: v.perfiles_cargados } };

  /* ---------- guardado (todo o nada: el sello va al final) ---------- */
  const unspsc = {};
  try {
    for (const clave of v.perfiles_cargados) {
      const id = idCanonico(clave);
      const d = derivarUnspsc(v.config.perfiles[clave].unspsc);
      unspsc[clave] = { clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length };
      await redis.set(CLAVES.configUnspsc(id, "clases"), JSON.stringify(d.clases));
      await redis.set(CLAVES.configUnspsc(id, "familias"), JSON.stringify(d.familias));
      await redis.set(CLAVES.configUnspsc(id, "segmentos"), JSON.stringify(d.segmentos));
      await redis.set(CLAVES.configUnspsc(id, "completo"), JSON.stringify(d));
    }
    await escribirJSONComprimido(redis, CLAVES.configPerfiles, config);
    // SELLO AL FINAL: es lo que hace recargar a las instancias calientes
    await redis.set(CLAVES.configPerfilesVersion, version);
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo guardar. Reintente. (${e.message})` });
  }

  /* ---------- efecto inmediato ---------- */
  let aplicado = null;
  try {
    aplicarConfig(config, { version, cargado });
    invalidarCachePerfiles();
    await recargarPerfiles(redis, { forzar: true });
    aplicado = fuentePerfiles();
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Error interno al procesar UNSPSC: ${e.message}` });
  }

  /* el dashboard cachea sus totales 5 minutos y salen de ESTE RUP: dejarlos
     vivos enseñaría números de la configuración anterior. Lo mismo vale para la
     auditoría de cobertura (TTL 1 h): su lista de «códigos que te faltan» se
     calcula contra ESTA whitelist, así que un código recién inscrito seguiría
     apareciendo como hueco durante una hora. */
  let cacheBorrada = 0;
  try {
    const viejas = [...await redis.scan(CLAVES.patronResumen), ...await redis.scan(CLAVES.patronCobertura)];
    if (viejas.length) {
      await redis.del(...viejas);
      cacheBorrada = viejas.length;
    }
  } catch { /* las dos cachés caducan solas: no valen un 500 */ }

  /* el consorcio se REDERIVA de sus integrantes aunque no venga en el archivo
     (unión de UNSPSC, experiencia sumada, K = suma de CRP): hay que decirlo */
  const derivados = [];
  if (!v.perfiles_cargados.includes("consorcio") && !v.perfiles_cargados.includes("juntos")) {
    derivados.push("consorcio");
    const d = derivarUnspsc([...PERFILES.juntos.unspsc]);
    unspsc.consorcio = { clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length };
  }

  return res.status(200).json({
    ok: true,
    guardado: true,
    perfiles_cargados: v.perfiles_cargados,
    perfiles_derivados: derivados,
    unspsc,
    resumen: resumenPerfiles(),
    advertencias: v.advertencias,
    version,
    fuente: aplicado,
    cache_resumen_invalidada: cacheBorrada,
    nota: "Los cambios surten efecto en la siguiente consulta: el juicio (UNSPSC, pertinencia, capacidad K y tope) corre al servir, no al sincronizar. No hace falta relanzar /api/sync.",
  });
};
