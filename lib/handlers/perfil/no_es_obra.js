/* ============================================================================
   /api/perfil?op=no-es-obra · LO QUE USTED QUITÓ DE SU LISTA (6-nov-2026)
   ----------------------------------------------------------------------------
   GET  ?perfil=X                                       → { ok, perfil, quitados }
   POST { perfil, accion: "quitar", id, nombre, descripcion, entidad, nit }
                                                        → lo guarda y responde la lista
   POST { perfil, accion: "devolver", id }              → lo saca de la lista
   Con credencial SIEMPRE: es una decisión del dueño sobre su lista.

   POR QUÉ EXISTE. Paso 6 del plan del 6-nov-2026 (aprobado por el dueño): la lista
   da como obra procesos que no lo son (en 45 días, 585 que la entidad no publicó
   como obra; en una muestra de 40, 24 no lo eran). El chip ya baja a ámbar los que
   la entidad publicó como compra o servicio (lib/filtros, 1-quater), pero el dueño
   necesita poder decir «esto no» y no volver a verlo.

   QUÉ SE QUITA. El proceso por su número y, con él, las otras publicaciones del
   MISMO objeto de la MISMA entidad (`firmaDe`): SECOP II le da otro número al
   pliego definitivo (el 23,5 % de los expedientes tiene más de uno, medido el
   6-nov-2026), y sin la firma el definitivo volvería a salir. La firma lleva la
   entidad: dos alcaldías con el mismo objeto genérico («MANTENIMIENTO DE VÍAS»)
   son dos procesos.

   QUÉ NO HACE, A PROPÓSITO. No excluye por palabra: una palabra mal escogida
   escondería obras futuras sin que nadie las viera, y en oportunidades el falso
   caro es esconder (CLAUDE.md). No toca el juicio (la cascada, el panel, los
   avisos): se aplica en la LISTA, como los filtros que elige quien consulta
   (lib/handlers/procesos/listar.js), y la lista dice cuántos quitó y los enseña
   con un toque, para devolverlos.

   Clave `config:no_es_obra:{perfil}` (cae bajo `config:*`, así que la copia de
   datos la exporta); el perfil dinámico la guarda con el TTL de su perfil, como
   `op=empresa-datos`.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { leerJSON, PERFIL_DINAMICO_TTL_SEG } = require("../../almacen.js");
const { esPerfilDinamico } = require("../../perfil_dinamico.js");
const { norm } = require("../../semantica.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._\-]{2,59}$/;
const MAX_QUITADOS = 1000;
const clave = (perfil) => `config:no_es_obra:${perfil}`;
const limpio = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/* El objeto sin la fase que SECOP II le pega al nombre («(Manifestación de interés (Menor Cuantía))
   (Presentación de oferta)»): la descripción si dice algo, si no el nombre cortado ahí. */
const FASE_EN_EL_NOMBRE_RE = /\s*\((?:manifestacion de interes|presentacion de oferta|presentacion de observaciones|borrador)\b.*$/;
function objetoDe(nombre, descripcion) {
  const d = norm(descripcion);
  if (d.length >= 25) return d;
  return norm(nombre).replace(FASE_EN_EL_NOMBRE_RE, "").trim() || d;
}
/* entidad (NIT, o el nombre si no hay NIT) + objeto. null sin objeto: sin él no se quita nada por firma. */
function firmaDe({ nombre, descripcion, entidad, nit } = {}) {
  const objeto = objetoDe(nombre, descripcion);
  if (objeto.length < 10) return null;
  const quien = String(nit || "").replace(/\D/g, "") || norm(entidad);
  return quien ? `${quien}|${objeto.slice(0, 400)}` : null;
}
const firmaDeFila = (l) => firmaDe({ nombre: l.nombre_del_procedimiento, descripcion: l.descripci_n_del_procedimiento, entidad: l.entidad, nit: l.nit_entidad });

async function leerQuitados(redis, perfil) {
  const j = await leerJSON(redis, clave(perfil));
  return j && Array.isArray(j.quitados) ? j : { quitados: [], guardado_el: null };
}
/* Lo que la lista necesita: los números y las firmas, y la pregunta para una fila. */
function indice(guardado) {
  const ids = new Set(), firmas = new Set();
  for (const q of (guardado && guardado.quitados) || []) {
    if (q.id) ids.add(String(q.id));
    if (q.firma) firmas.add(q.firma);
  }
  return { tamano: ids.size, esQuitado: (l) => ids.has(String(l.id_del_proceso)) || (firmas.size > 0 && firmas.has(firmaDeFila(l))) };
}

module.exports = async function noEsObra(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const q = req.query || {};
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const perfil = String(q.perfil || "").trim();
    if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
    const g = await leerQuitados(redis, perfil);
    return res.status(200).json({ ok: true, perfil, quitados: g.quitados, guardado_el: g.guardado_el });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use GET para leer o POST para quitar o devolver." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: 8 * 1024 });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const d = cuerpo.datos || {};
  const perfil = String(d.perfil || q.perfil || "").trim();
  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
  const id = String(d.id || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta el número del proceso («id»)." });
  const accion = String(d.accion || "").trim().toLowerCase();
  if (accion !== "quitar" && accion !== "devolver") return res.status(400).json({ ok: false, error: "«accion» debe ser «quitar» o «devolver»." });
  const g = await leerQuitados(redis, perfil);
  let quitados = g.quitados.filter((x) => x && x.id !== id);
  if (accion === "quitar") {
    if (quitados.length >= MAX_QUITADOS) {
      return res.status(409).json({ ok: false, error: `Ya quitó ${MAX_QUITADOS} procesos de su lista, que es el máximo. Devuelva alguno para quitar otro.` });
    }
    const entrada = {
      id,
      firma: firmaDe({ nombre: d.nombre, descripcion: d.descripcion, entidad: d.entidad, nit: d.nit }),
      objeto: limpio(d.descripcion || d.nombre, 200) || null,
      entidad: limpio(d.entidad, 160) || null,
      el: new Date().toISOString(),
    };
    quitados = [entrada, ...quitados];
  }
  const guardado = { quitados, guardado_el: new Date().toISOString() };
  const opciones = esPerfilDinamico(perfil) ? { ex: PERFIL_DINAMICO_TTL_SEG } : undefined;
  await redis.set(clave(perfil), JSON.stringify(guardado), opciones);
  return res.status(200).json({ ok: true, perfil, accion, id, ...guardado });
};
module.exports.leerQuitados = leerQuitados;
module.exports.indice = indice;
module.exports.firmaDe = firmaDe;
module.exports.firmaDeFila = firmaDeFila;
module.exports.clave = clave;
module.exports.MAX_QUITADOS = MAX_QUITADOS;
