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
const { leerTerminos, selloExperiencia, experienciaAplica } = require("../../experiencia.js");
const {
  auditarCobertura, selloCobertura, leerCache, guardarCache,
} = require("../../cobertura_rup.js");

const PERFILES_VALIDOS = "helder | genesis | consorcio";

/* Las tres razones por las que la auditoría no priorizó por experiencia, dichas
   con sus palabras. Se ENUMERAN, no se resumen en una: «no hay experiencia
   cargada» dicho sobre una que sí está —pero es de otro— es afirmar algo falso
   en la pantalla que decide qué códigos inscribir. */
function mensajeSinExperiencia(expAjena, perfilId, perfil) {
  if (!expAjena) {
    return "No hay experiencia cargada: la auditoría usó el vocabulario de obra del proyecto y no midió similitud. "
      + `Cargue sus contratos ejecutados en /api/admin/experiencia?perfil=${perfilId} para priorizar por su nicho real.`;
  }
  const otro = expAjena.perfil && PERFILES[expAjena.perfil] ? PERFILES[expAjena.perfil].nombre : null;
  if (otro) {
    return `La experiencia cargada es de ${otro} y NO se usó para auditar a ${perfil.nombre}: la auditoría usó el vocabulario `
      + `de obra del proyecto. Cargue los contratos ejecutados de este perfil en /api/admin/experiencia?perfil=${perfilId}.`;
  }
  return "La experiencia cargada no dice de qué perfil es, así que no se atribuyó a ninguno y la auditoría usó el "
    + `vocabulario de obra del proyecto. Vuelva a cargarla indicando el perfil: /api/admin/experiencia?perfil=${perfilId}.`;
}

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

  /* `expAjena`: hay experiencia cargada y NO se usó para este perfil.
     `{ perfil: "genesis" }` = es de otro; `{ perfil: null }` = no consta de
     quién es (cargada antes del 28-ago-2026). `null` = no hay ninguna. */
  let perfil, terminos = null, sello, expAjena = null;
  try {
    // el RUP cargado por el dueño manda sobre el del repositorio: la whitelist
    // contra la que se mide el hueco tiene que ser la VIGENTE
    const estado = await recargarPerfiles(redis);
    perfil = PERFILES[perfilId];
    if (usarExperiencia) {
      /* ⚠️ LA EXPERIENCIA DE OTRO NO PRIORIZA ESTA AUDITORÍA (28-ago-2026).
         `config:experiencia` es una clave global y lo cargado en producción son
         los 106 contratos de Génesis. Auditar a Helder con ese vocabulario
         respondía «los códigos que TE faltan» a partir de obra que Helder no ha
         ejecutado: la peor forma posible de equivocarse en la pantalla que
         existe para decidir qué inscribir antes de la renovación anual — y es
         justo lo que el dueño reportó viendo «Su registro de proponente».
         Aquí el falso caro es el POSITIVO (recomendar un código que no sostiene
         nada), así que ante la duda NO se usa: sin dueño escrito tampoco, porque
         «no consta de quién es» no es «es de este». Se cae al método base
         —el vocabulario de obra del proyecto— y se DECLARA, que es lo que
         permite interpretar el resultado. */
      const leidos = await leerTerminos(redis);
      if (leidos && experienciaAplica(leidos.perfil, perfilId, perfil)) terminos = leidos;
      else if (leidos) expAjena = { perfil: leidos.perfil || null };
    }
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
    /* DE QUIÉN ERA LA EXPERIENCIA QUE NO SE USÓ. «No hay experiencia cargada»
       sería FALSO cuando sí la hay pero es de otro perfil, y ese es el caso
       corriente en producción (los 106 contratos de Génesis). Un «no la usé»
       sin el motivo no se puede interpretar: es la misma lección de `no_consta`
       en el rastreo. `null` cuando de verdad no hay ninguna. */
    experiencia_ajena: expAjena,
    // sin corpus histórico la lista vacía NO significa «no te falta nada»
    mensaje: auditoria.resumen.procesos_analizados === 0
      ? "No hay corpus histórico todavía: ejecute /api/sync/historico?desde=2024-01&hasta=2025-12 (una sola vez) para poder auditar la cobertura."
      : (!auditoria.experiencia_utilizada && usarExperiencia
        ? mensajeSinExperiencia(expAjena, perfilId, perfil)
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
