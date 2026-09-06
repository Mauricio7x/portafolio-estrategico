/* lib/handlers/perfil/consorcio.js · /api/perfil?op=consorcio | op=consorcio-simular (Fase 10)
   ─────────────────────────────────────────────────────────────────────────────
     GET    ?op=consorcio                    → los consorcios guardados
     POST   ?op=consorcio  {nombre, integrantes:[{perfilId, participacion}]}
                                             → valida (suma EXACTA 100), guarda en
                                               config:consorcios, devuelve {id, perfil}
     DELETE ?op=consorcio&id=cons_…          → lo borra
     POST   ?op=consorcio-simular {integrantes, proceso?, origen?}
                                             → indicadores ponderados (truncados a 2),
                                               capacidad (suma de CRP), unión UNSPSC,
                                               contratos, procesosAdicionales, cumple:null,
                                               advertencias. Caché 1 h en consorcio:sim:{hash}.
                                               Con `proceso`, además `exigencias`: las ocho
                                               casillas del pliego pasadas con el perfil del
                                               consorcio (lib/guia_proceso, con los documentos
                                               ya leídos del proceso). `origen` («guia» o
                                               «mi_empresa») solo se anota en el registro del
                                               servidor para poder contar desde dónde se simula.
   TODO CON TOKEN (lib/auth): las respuestas llevan liquidez, patrimonio y
   capacidad de personas identificadas — las «cifras del perfil» que nunca
   salen sin llave. Los perfiles `rup_…` de los integrantes se cargan antes de
   validar, para que un visitante con dos RUP subidos también pueda simular.
   No dispara sincronizaciones ni escribe fuera de config:consorcios y su caché.
   Art. 410A: aquí no entra ningún precio de oferta. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { recargarPerfiles } = require("../../perfiles.js");
const { esPerfilDinamico, cargarPerfilDinamico } = require("../../perfil_dinamico.js");
const { esCandadoOcupado, cuerpoCandadoOcupado } = require("../../almacen.js");
const C = require("../../consorcio.js");

const MAX_BYTES = 64 * 1024;

async function cargarIntegrantesDinamicos(redis, integrantes) {
  for (const i of Array.isArray(integrantes) ? integrantes : []) {
    const id = String((i && i.perfilId) || "");
    if (esPerfilDinamico(id)) await cargarPerfilDinamico(redis, id).catch(() => null);
  }
}

async function procesoDe(redis, idProceso) {
  if (!idProceso) return null;
  const { cargarCorpus } = require("../procesos/listar.js");
  const { CLAVES, leerJSON } = require("../../almacen.js");
  const meta = await leerJSON(redis, CLAVES.meta);
  const filas = await cargarCorpus(redis, meta);
  if (!filas) return null;
  return filas.find((l) => l.id_del_proceso === idProceso) || null;
}

module.exports = async function handler(req, res, { op = "consorcio" } = {}) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  try { await recargarPerfiles(redis); } catch { /* respaldo */ }

  if (op === "consorcio-simular") {
    if (metodo !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, error: "La simulación se pide por POST con {integrantes:[{perfilId, participacion}], proceso?}." }); }
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    const datos = cuerpo.datos || {};
    await cargarIntegrantesDinamicos(redis, datos.integrantes);
    let proceso = null;
    try { proceso = await procesoDe(redis, datos.proceso ? String(datos.proceso) : null); } catch { proceso = null; }
    /* los documentos del proceso que el navegador ya leyó (pliego:{id}:docs), para
       que las ocho casillas del pliego se pasen con el perfil del consorcio;
       best-effort: sin ellos la simulación sale con las casillas «por leer» */
    let documentos = null;
    if (proceso) {
      try { const d = await require("../pliego/documentos.js").leerDocs(redis, proceso.id_del_proceso); if (d && d.indice) documentos = d; } catch { documentos = null; }
    }
    /* desde dónde se pidió (M-COMP-02): un valor desconocido es INERTE, y solo
       queda en el registro del servidor; no hay contador */
    const origen = ["guia", "mi_empresa"].includes(String(datos.origen || "")) ? String(datos.origen) : null;
    if (origen) console.log(`[consorcio-simular] origen=${origen} proceso=${proceso ? "si" : "no"}`);
    const { contarOportunidades } = require("./entrada.js");
    const r = await C.simular(redis, { integrantes: datos.integrantes, proceso, documentos, contar: contarOportunidades });
    if (!r.ok) return res.status(r.status || 400).json({ ok: false, error: r.error });
    return res.status(200).json({ ...r, proceso: datos.proceso || null, proceso_encontrado: !!proceso, origen });
  }

  if (metodo === "GET") {
    const todos = await C.leerConsorcios(redis);
    return res.status(200).json({ ok: true, consorcios: Object.values(todos).sort((a, b) => String(b.guardado).localeCompare(String(a.guardado))) });
  }
  if (metodo === "DELETE") {
    const id = String(q.id || "").trim();
    if (!C.esConsorcio(id)) return res.status(400).json({ ok: false, error: "Falta ?id=cons_… del consorcio a borrar." });
    let habia;
    /* si el candado de config:consorcios no se obtiene, la respuesta lo dice
       (409) y no afirma «borrado» sin escritura */
    try { habia = await C.borrarConsorcio(redis, id); }
    catch (e) { if (esCandadoOcupado(e)) return res.status(409).json(cuerpoCandadoOcupado(e)); throw e; }
    /* Sus cachés POR PERFIL se van con él: la rama de caché del pulso responde
       ANTES de resolver el perfil, así que sin esto el consorcio borrado seguía
       titulando «Para su empresa, hoy: 54 licitaciones» hasta 10 minutos
       mientras el listado ya respondía 404 `perfil_caducado`. El DELETE de RUP
       ya hacía esta misma purga. */
    try { await redis.del(`pulso:${id}`, `resumen:${id}`); } catch { /* la caché caduca sola */ }
    return res.status(200).json({ ok: true, id, borrado: habia });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST, DELETE"); return res.status(405).json({ ok: false, error: "Use GET (listar), POST (crear) o DELETE (borrar)." }); }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  await cargarIntegrantesDinamicos(redis, datos.integrantes);
  const v = C.validarIntegrantes(datos.integrantes);
  if (!v.ok) return res.status(400).json({ ok: false, error: v.error });
  /* Sin nombre, «Consorcio N»: lo numera lib/consorcio DENTRO del candado (la
     regla y su motivo viven allí). La composición y las participaciones siguen
     en `rol` (tooltip). */
  const nombre = String(datos.nombre || "").trim().slice(0, 140) || null;
  const id = C.generarId();
  /* si el candado de config:consorcios no se obtiene, la respuesta lo dice
     (409, con qué hacer) y jamás afirma «guardado» sin escritura */
  try { await C.guardarConsorcio(redis, { id, nombre, integrantes: v.integrantes }); }
  catch (e) { if (esCandadoOcupado(e)) return res.status(409).json(cuerpoCandadoOcupado(e)); throw e; }
  const perfil = await C.cargarConsorcio(redis, id);
  return res.status(200).json({
    ok: true, id, nombre: perfil.nombre, integrantes: v.integrantes,
    indicadores: C.resumenIndicadores(perfil), clasesUnspsc: perfil.unspsc.size, contratos: perfil.contratosRup,
    url_lista: `/?perfil=${id}#/licitaciones`,
    advertencias: [C.ADVERTENCIA_PARTICIPACION_MINIMA, C.ADVERTENCIA_K],
  });
};
