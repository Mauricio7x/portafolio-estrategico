/* ============================================================================
   /api/admin/experiencia · Los contratos que el dueño YA ejecutó
   ----------------------------------------------------------------------------
   GET  /api/admin/experiencia?token=…  → lo cargado (contratos + vocabulario)
   POST /api/admin/experiencia?token=…  → valida, guarda y extrae el vocabulario

   PROTEGIDO con el mismo HISTORICO_TOKEN que el resto de /api/admin y de los
   endpoints de mantenimiento (lib/auth: header `x-historico-token` o `?token=`,
   el header manda si vienen los dos).

   POR QUÉ EXISTE: el RUP dice a qué PUEDE presentarse el dueño; sus contratos
   ejecutados dicen en qué SABE trabajar, y hasta ahora la app solo conocía lo
   primero. Con esta lista, /api/admin/cobertura-rup puede responder la pregunta
   que importa antes de cada renovación del RUP: «¿con qué códigos publica el
   mercado los objetos que yo ya ejecuto, y cuáles no tengo inscritos?».

   Al guardar se invalida la caché de la auditoría de cobertura: sus números
   salen de este vocabulario y quedarían mintiendo una hora entera. (La caché
   además compara sellos, así que esto es la segunda cerradura, no la única —
   pero borrarla aquí es lo que hace que el dueño vea el efecto al instante.)

   NO requiere full ni backfill: la experiencia se compara al SERVIR la
   auditoría, exactamente igual que el juicio del RUP desde jul 2026.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
const { CLAVES } = require("../../lib/almacen.js");
const {
  MAX_CONTRATOS, MAX_OBJETO,
  validarContratos, guardarExperiencia, leerExperiencia, leerTerminos,
} = require("../../lib/experiencia.js");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB de cuerpo (mismo tope que el RUP)

/* Cuerpo de la petición. Vercel deja `req.body` parseado cuando el
   Content-Type es JSON, pero no siempre (ni en las pruebas): se cubren los tres
   casos —objeto, cadena y stream—, igual que en /api/admin/rup. */
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
    return { ok: false, status: 400, error: "Body vacío: se esperaba un JSON con la clave «contratos»" };
  }
  try {
    return { ok: true, datos: JSON.parse(crudo) };
  } catch (e) {
    return { ok: false, status: 400, error: `Body no es JSON válido: ${e.message}` };
  }
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

  /* ══════════════════ GET · la experiencia vigente ══════════════════ */
  if (metodo === "GET") {
    let guardada = null, vocab = null;
    try {
      guardada = await leerExperiencia(redis);
      vocab = await leerTerminos(redis);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer la experiencia: ${e.message}` });
    }
    if (!guardada || !Array.isArray(guardada.contratos) || !guardada.contratos.length) {
      return res.status(200).json({
        ok: true, cargada: false,
        contratos: [], contratos_cargados: 0,
        terminos_extraidos: 0, ejemplos_terminos: [],
        mensaje: "No hay experiencia cargada. Cargue sus contratos ejecutados para auditar la cobertura de sus RUP.",
      });
    }
    const meta = guardada._meta || {};
    return res.status(200).json({
      ok: true, cargada: true,
      version: meta.version || null,
      cargado: meta.cargado || null,
      contratos_cargados: guardada.contratos.length,
      terminos_extraidos: vocab ? vocab.total_terminos : 0,
      ejemplos_terminos: vocab ? vocab.ejemplos : [],
      contratos: guardada.contratos,
    });
  }

  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use GET para consultar y POST para cargar." });
  }

  /* ══════════════════ POST · cargar la experiencia ══════════════════ */
  const cuerpo = await leerCuerpo(req);
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }

  const v = validarContratos(cuerpo.datos);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      error: `El archivo tiene ${v.errores.length} error${v.errores.length === 1 ? "" : "es"} de validación: no se guardó nada.`,
      errores: v.errores,
      limites: { max_contratos: MAX_CONTRATOS, max_caracteres_objeto: MAX_OBJETO },
    });
  }

  let guardado = null;
  try {
    guardado = await guardarExperiencia(redis, v.contratos);
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo guardar. Reintente. (${e.message})` });
  }

  /* la auditoría de cobertura se calcula con ESTE vocabulario: dejar viva su
     caché enseñaría durante una hora los huecos de la experiencia anterior */
  let cacheBorrada = 0;
  try {
    const viejas = await redis.scan(CLAVES.patronCobertura);
    if (viejas.length) {
      await redis.del(...viejas);
      cacheBorrada = viejas.length;
    }
  } catch { /* la caché caduca sola en una hora: no vale un 500 */ }

  return res.status(200).json({
    ok: true,
    contratos_cargados: v.contratos.length,
    terminos_extraidos: guardado.vocabulario.total_terminos,
    ejemplos_terminos: guardado.vocabulario.ejemplos,
    version: guardado.version,
    cargado: guardado.cargado,
    cache_cobertura_invalidada: cacheBorrada,
    nota: "Experiencia cargada. Ejecute la auditoría de cobertura para ver qué códigos le faltan basados en su experiencia real.",
  });
};
