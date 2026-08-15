/* ============================================================================
   /api/admin/cobertura-rup · Qué códigos UNSPSC le faltan al RUP
   ----------------------------------------------------------------------------
   GET /api/admin/cobertura-rup?perfil=helder&token=…[&usar_experiencia=false]
                                                     [&refrescar=1]

   PROTEGIDO con el mismo HISTORICO_TOKEN (lib/auth): expone el contenido del
   corpus histórico. SOLO LEE — no toma candados ni dispara sincronizaciones.

   Responde, ordenados por un puntaje que combina volumen y similitud con la
   experiencia real del dueño, los códigos UNSPSC con los que el mercado
   ADJUDICA obras como las suyas y que NO están inscritos en su RUP. La lógica
   vive en lib/cobertura_rup (ahí está explicada regla por regla); este handler
   solo autoriza, resuelve el perfil VIGENTE, cachea y responde.

   Tres cosas que el handler sí decide:

   · el PERFIL es obligatorio. No hay default: la respuesta se lee como «lo que
     te falta a TI», y servir la de otro perfil por omisión sería la peor forma
     posible de equivocarse.
   · el RUP VIGENTE manda. `recargarPerfiles` corre antes de auditar: si el
     dueño acaba de subir un RUP con códigos nuevos, esos códigos ya no son
     huecos y la auditoría tiene que saberlo en la misma consulta.
   · la CACHÉ lleva el sello del RUP y el de la experiencia. Cargar cualquiera
     de los dos la invalida sola; `?refrescar=1` la salta a mano.

   NO requiere full ni backfill para funcionar, pero SÍ necesita corpus
   histórico: sin él no hay nada que auditar y se dice explícitamente en vez de
   devolver una lista vacía que parecería «no te falta nada».
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { CLAVES } = require("../../almacen.js");
const { PERFILES, ALIAS_PERFIL, recargarPerfiles } = require("../../perfiles.js");
const { leerTerminos, selloExperiencia } = require("../../experiencia.js");
const {
  auditarCobertura, selloCobertura, leerCache, guardarCache,
} = require("../../cobertura_rup.js");

const PERFILES_VALIDOS = "helder | genesis | consorcio";

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });

  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Método no permitido: la auditoría solo lee." });
  }

  const pedido = String(q.perfil || "").toLowerCase().trim();
  if (!pedido) {
    return res.status(400).json({ ok: false, error: `falta el parámetro «perfil»: ${PERFILES_VALIDOS}` });
  }
  const perfilId = Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, pedido) ? ALIAS_PERFIL[pedido] : pedido;
  if (!Object.prototype.hasOwnProperty.call(PERFILES, perfilId)) {
    return res.status(400).json({ ok: false, error: `perfil inválido: ${PERFILES_VALIDOS}` });
  }

  // ?usar_experiencia=false apaga la priorización por experiencia (el toggle de
  // la UI). Cualquier otro valor deja el default, que es usarla.
  const usarExperiencia = !/^(0|false|no)$/i.test(String(q.usar_experiencia ?? "true").trim());
  const refrescar = /^(1|true|si|s[ií])$/i.test(String(q.refrescar || ""));

  const redis = crearRedis({});
  const t0 = Date.now();

  let perfil, terminos = null, sello;
  try {
    // el RUP cargado por el dueño manda sobre el del repositorio: la whitelist
    // contra la que se mide el hueco tiene que ser la VIGENTE
    const estado = await recargarPerfiles(redis);
    perfil = PERFILES[perfilId];
    if (usarExperiencia) terminos = await leerTerminos(redis);
    sello = selloCobertura(estado.version, await selloExperiencia(redis));
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }

  const modo = terminos ? "exp" : "base";
  const clave = CLAVES.cobertura(perfilId, modo);

  if (!refrescar) {
    const enCache = await leerCache(redis, clave, sello);
    if (enCache) {
      return res.status(200).json({ ...enCache, cache: true });
    }
  }

  let auditoria;
  try {
    auditoria = await auditarCobertura(redis, perfil, { terminos });
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo auditar el histórico: ${e.message}` });
  }

  const cuerpo = {
    ok: true,
    perfil: perfilId,
    perfil_nombre: perfil.nombre,
    generado: new Date().toISOString(),
    ...auditoria,
    // sin corpus histórico la lista vacía NO significa «no te falta nada»
    mensaje: auditoria.resumen.procesos_analizados === 0
      ? "No hay corpus histórico todavía: ejecute /api/sync/historico?desde=2024-01&hasta=2025-12 (una sola vez) para poder auditar la cobertura."
      : (!auditoria.experiencia_utilizada && usarExperiencia
        ? "No hay experiencia cargada: la auditoría usó el vocabulario de obra del proyecto y no midió similitud. Cargue sus contratos ejecutados en /api/admin/experiencia para priorizar por su nicho real."
        : null),
    duracion_ms: Date.now() - t0,
    cache: false,
  };

  // un barrido sobre un histórico incompleto NO se cachea: sería congelar el
  // error una hora (mismo criterio que /api/competencia-detalle)
  if (!auditoria.chunks_ilegibles && auditoria.resumen.procesos_analizados > 0) {
    try { await guardarCache(redis, clave, sello, cuerpo); } catch { /* la caché es un lujo, no un requisito */ }
  }
  return res.status(200).json(cuerpo);
};
