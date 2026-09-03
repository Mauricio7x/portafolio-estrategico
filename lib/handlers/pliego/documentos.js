/* lib/handlers/pliego/documentos.js · /api/pliego?op=documentos (3-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   LOS DOCUMENTOS DE UN PROCESO, LEÍDOS SOLOS. El navegador es quien lee (pdf.js,
   como en todo el módulo APU); el servidor lista, guarda e interpreta.

     GET  ?id_proceso=X[&refrescar=1] → el índice de archivos del proceso (datos.gov.co
          dmgg-8hin por el id_del_portafolio de p6dx), clasificado (lib/documentos_proceso),
          con el plan de lectura y los `pendientes` (los que el navegador tiene que
          bajar con op=descargar, leer con pdf.js y devolver aquí). El índice se
          guarda 12 h; `refrescar=1` lo vuelve a pedir (adendas nuevas).
     POST {id_proceso, id_documento, texto, perfil?}          → guarda el texto leído
          (pliego:{id}:doc:{id_documento}), saca sus HECHOS y los deja en el índice
          (pliego:{id}:docs). Si el documento es el pliego, registra ADEMÁS la
          versión en el vigía de adendas (lib/diff.registrarVersion): así el
          dictamen, el cronograma y las deducciones lo leen sin que nadie cargue nada.
     POST {id_proceso, id_documento, ilegible:true, motivo, definitivo?} → el navegador
          no pudo leerlo. `definitivo:true` (escaneado sin capa de texto) no se
          reintenta nunca; sin él (la descarga falló, el proxy cortó) se reintenta
          cuando el usuario pide «volver a buscar» (`refrescar=1` los suelta).

   Con token: la lista es pública, pero los hechos se comparan con el perfil y el
   guardado es del usuario. La red va con tiempo acotado y NUNCA tumba la
   respuesta: sin índice se responde ok:true con `estado:"sin_archivos"` y motivo.
   El id_del_portafolio NO está en el corpus (la ingesta no lo trae): se pide a
   p6dx por id_del_proceso, una vez, y queda en el índice guardado. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { leerJSONComprimido, escribirJSONComprimido } = require("../../almacen.js");
const { crearCliente, escSoQL } = require("../../socrata.js");
const Docs = require("../../documentos_proceso.js");
const D = require("../../diff.js");
const { ID_RE } = require("./diff.js");
const { filaDe } = require("./cronograma.js");

const MAX_BYTES = 3 * 1024 * 1024;           // el mismo tope que op=diff: ~120 páginas son 0,34 MB
const INDICE_TTL_MS = 12 * 3600 * 1000;      // el índice de datos.gov.co va ~3 días por detrás: pedirlo más seguido no trae nada
const DOC_TTL_SEG = 90 * 86400;              // el texto de cada documento caduca solo; el índice (pequeño) no
const TIEMPO_MAX_MS = parseInt(process.env.DOCUMENTOS_TIEMPO_MS, 10) || 8000;
const MAX_FILAS_INDICE = 400;
const BASES = {
  procesos: () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json",
  archivos: () => process.env.ARCHIVOS_BASE_URL || "https://www.datos.gov.co/resource/dmgg-8hin.json",
};
const conTiempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`tiempo agotado (${ms} ms)`)), ms))]);
const vacio = (id) => ({ version: Docs.VERSION, id_proceso: id, indice: null, leidos: {}, ilegibles: {} });

async function leerDocs(redis, id) {
  try { const d = await leerJSONComprimido(redis, Docs.claveDocs(id)); return d && typeof d === "object" ? { ...vacio(id), ...d } : vacio(id); } catch { return vacio(id); }
}
const escribirDocs = (redis, id, docs) => escribirJSONComprimido(redis, Docs.claveDocs(id), docs);

/* La fecha de cierre, para separar lo de la entidad de lo de las ofertas: la
   fila del corpus (lib/negocio.fechaCierre) o, si el proceso no está, la que
   trae p6dx. Un dato publicado; sin él, `null` (y la regla por fecha no aplica). */
function cierreDe(fila, filaP6dx) {
  try { const c = fila ? require("../../negocio.js").fechaCierre(fila) : null; if (c) return String(c).slice(0, 10); } catch { /* sin cierre del corpus */ }
  const p = filaP6dx && (filaP6dx.fecha_de_recepcion_de || filaP6dx.fecha_de_apertura_de_respuesta);
  return p ? String(p).slice(0, 10) : null;
}

/** Pide el índice a datos.gov.co. Devuelve {ok, indice} o {ok:false, motivo}. */
async function consultarIndice(redis, id, { log = () => {} } = {}) {
  const ahora = new Date().toISOString();
  const cli = (b) => crearCliente({ baseUrl: b, log });
  let filaP = null;
  try {
    const r = await conTiempo(cli(BASES.procesos()).pedir({ "$select": "id_del_proceso,id_del_portafolio,fecha_de_recepcion_de,fecha_de_apertura_de_respuesta", "$where": `id_del_proceso='${escSoQL(id)}'`, "$limit": "1" }, "id_del_portafolio"), TIEMPO_MAX_MS);
    filaP = Array.isArray(r) && r[0] ? r[0] : null;
  } catch (e) { return { ok: false, motivo: `no se pudo consultar el proceso en datos.gov.co: ${String((e && e.message) || e)}` }; }
  const portafolio = filaP && String(filaP.id_del_portafolio || "").trim();
  if (!portafolio) return { ok: true, indice: { version: Docs.VERSION, consultado_el: ahora, fuente: "dmgg-8hin", id_del_portafolio: null, archivos: [], plan: [], resumen: null, motivo: "SECOP II no publica este proceso en datos.gov.co con su id de portafolio (procesos de SECOP I, tienda virtual o anteriores a 2025 no tienen índice de archivos)." } };
  let filas;
  try {
    filas = await conTiempo(cli(BASES.archivos()).pedir({ "$select": "id_documento,nombre_archivo,tamanno_archivo,extensi_n,fecha_carga,url_descarga_documento", "$where": `proceso='${escSoQL(portafolio)}'`, "$order": "fecha_carga", "$limit": String(MAX_FILAS_INDICE) }, "archivos del proceso"), TIEMPO_MAX_MS);
  } catch (e) { return { ok: false, motivo: `no se pudo consultar el índice de archivos (dmgg-8hin): ${String((e && e.message) || e)}` }; }
  const fila = await filaDe(redis, id).catch(() => null);
  const cierre = cierreDe(fila, filaP);
  const plan = Docs.planDeLectura(Array.isArray(filas) ? filas : [], { cierre });
  return { ok: true, indice: { version: Docs.VERSION, consultado_el: ahora, fuente: "dmgg-8hin", id_del_portafolio: portafolio, cierre_usado: cierre, archivos: plan.archivos, plan: plan.plan, resumen: plan.resumen,
    motivo: plan.archivos.length ? null : "datos.gov.co todavía no publica archivos de este proceso (el índice va unos días por detrás de SECOP II)." } };
}

function respuesta(docs, extra = {}) {
  const r = Docs.resumenLectura(docs);
  return { ok: true, id_proceso: docs.id_proceso, ...r, indice: docs.indice, leidos: docs.leidos, ilegibles: docs.ilegibles, ...extra,
    como_leerlo: "«pendientes» son los documentos que el navegador tiene que bajar (op=descargar), leer con pdf.js y devolver aquí por POST; «leidos» trae los hechos de cada documento (con página) que la guía de Mis procesos enseña. Lo no legible (hojas de cálculo, comprimidos) se lista con su motivo: no se inventa." };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();

  if (metodo === "GET") {
    const id = String(q.id_proceso || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id_proceso= (el id del proceso en SECOP II, p. ej. CO1.REQ.123)." });
    const docs = await leerDocs(redis, id);
    const edad = docs.indice && docs.indice.consultado_el ? Date.now() - Date.parse(docs.indice.consultado_el) : Infinity;
    const viejo = !docs.indice || String(q.refrescar || "") === "1" || !(edad < INDICE_TTL_MS);
    let aviso = null;
    if (viejo) {
      /* al volver a buscar a mano se sueltan los ilegibles NO definitivos (una
         descarga que falló ayer puede funcionar hoy); los escaneados se quedan */
      if (String(q.refrescar || "") === "1") for (const [k, v] of Object.entries(docs.ilegibles)) if (!(v && v.definitivo)) delete docs.ilegibles[k];
      const r = await consultarIndice(redis, id, {});
      if (r.ok) { docs.indice = r.indice; await escribirDocs(redis, id, docs); }
      else if (!docs.indice) { aviso = r.motivo; docs.indice = { version: Docs.VERSION, consultado_el: new Date().toISOString(), fuente: "dmgg-8hin", id_del_portafolio: null, archivos: [], plan: [], resumen: null, motivo: r.motivo, transitorio: true }; }
      else aviso = `se usa el índice guardado el ${String(docs.indice.consultado_el).slice(0, 10)}: ${r.motivo}`;
    }
    return res.status(200).json(respuesta(docs, { cache: !viejo, aviso }));
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use GET ?id_proceso= o POST {id_proceso, id_documento, texto}." }); }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const d = cuerpo.datos || {};
  const id = String(d.id_proceso || "").trim();
  const idDoc = String(d.id_documento || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta id_proceso (el id del proceso en SECOP II)." });
  if (!/^\d{1,12}$/.test(idDoc)) return res.status(400).json({ ok: false, error: "Falta id_documento (el número del archivo en el índice)." });
  const docs = await leerDocs(redis, id);
  if (!docs.indice || !Array.isArray(docs.indice.archivos)) return res.status(400).json({ ok: false, error: "Primero pida el índice de archivos (GET ?id_proceso=…): solo se guardan documentos que estén en él." });
  const archivo = docs.indice.archivos.find((a) => a.id_documento === idDoc);
  if (!archivo) return res.status(404).json({ ok: false, error: "Ese id_documento no está en el índice de archivos de este proceso." });
  const ahora = new Date().toISOString();

  if (d.ilegible === true) {
    docs.ilegibles[idDoc] = { nombre: archivo.nombre, tipo: archivo.tipo, tipo_legible: archivo.tipo_legible, motivo: String(d.motivo || "sin capa de texto").slice(0, 200), definitivo: d.definitivo === true, intentado_el: ahora };
    delete docs.leidos[idDoc];
    await escribirDocs(redis, id, docs);
    return res.status(200).json(respuesta(docs, { id_documento: idDoc, ilegible: true }));
  }
  const texto = String(d.texto || "");
  if (texto.trim().length < 50) return res.status(400).json({ ok: false, error: "El texto del documento llegó vacío o demasiado corto. Si el PDF es un escaneo, mándelo con {ilegible:true, motivo}." });
  const normalizado = D.normalizarConPaginas(texto);
  const recortado = normalizado.length > D.MAX_TEXTO;
  const guardable = recortado ? normalizado.slice(0, D.MAX_TEXTO) : normalizado;
  const hash = D.hashDe(D.normalizarTexto(texto));
  const hechos = Docs.hechosDeTexto(guardable, { tipo: archivo.tipo });
  let versionPliego = null, cambio = false;
  if (archivo.tipo === "pliego" || archivo.tipo === "pliego_borrador") {
    /* el pliego entra en el vigía: es la MISMA versión que leerían el dictamen, el
       cronograma y las deducciones si el usuario lo hubiera cargado a mano */
    try {
      const r = await D.registrarVersion(redis, { idProceso: id, texto, origen: `documentos:${String(archivo.nombre || "").slice(0, 40)}`, perfilId: String(d.perfil || "").trim() || null });
      versionPliego = r.version == null ? null : r.version; cambio = !!r.cambio;
    } catch { versionPliego = null; }
  }
  await escribirJSONComprimido(redis, Docs.claveDoc(id, idDoc), { nombre: archivo.nombre, tipo: archivo.tipo, texto_normalizado: guardable, hash, leido_el: ahora, recortado }, { ttl: DOC_TTL_SEG });
  docs.leidos[idDoc] = { nombre: archivo.nombre, tipo: archivo.tipo, tipo_legible: archivo.tipo_legible, fecha_carga: archivo.fecha_carga || null, paginas: hechos.paginas, caracteres: hechos.caracteres, hash, leido_el: ahora, recortado, version_pliego: versionPliego, hechos };
  delete docs.ilegibles[idDoc];
  await escribirDocs(redis, id, docs);
  return res.status(200).json(respuesta(docs, { id_documento: idDoc, tipo: archivo.tipo, paginas: hechos.paginas, recortado, version_pliego: versionPliego, cambio,
    hechos_n: Object.keys(hechos.detecciones).length + Object.keys(hechos.requisitos_numericos).length + (hechos.anticipo.estado === "sin_dato" ? 0 : 1) }));
};
module.exports.consultarIndice = consultarIndice;
module.exports.leerDocs = leerDocs;
