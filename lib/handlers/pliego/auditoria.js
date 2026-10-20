/* /api/pliego?op=auditoria · ¿LO QUE DETEKTA DICE HABER LEÍDO SE PUEDE LEER DE VERDAD? (20-oct-2026)

   Frente 1a del encargo «leer bien y rápido»: una auditoría de SOLO LECTURA de los documentos ya guardados. Por
   documento mide páginas, texto por página, proporción de letras, páginas que faltan, huella del texto y las palabras
   que su tipo tiene que traer (lib/auditoria_lectura); marca los que tienen indicios de lectura mala. No escribe
   NADA en Redis ni consulta SECOP II, y no devuelve ni una línea del texto guardado: solo cuentas y números de página.

     GET /api/pliego?op=auditoria                      los procesos con documentos guardados, de a pocos
                                                       (&desde=N&limite=N para seguir; la respuesta trae `siguiente`)
     GET /api/pliego?op=auditoria&id_proceso=CO1.REQ.n un proceso, con la cuenta página por página

   Con token (la llave de la aplicación; &token=… para pegar la dirección en Chrome). Lo que no se pudo medir sale
   `null` o con su motivo, nunca 0; «sin_indicios» NO es «correcto». */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerJSONComprimido } = require("../../almacen.js");
const Docs = require("../../documentos_proceso.js");
const { auditarDocumento, UMBRALES } = require("../../auditoria_lectura.js");
const { ID_RE } = require("./diff.js");

const LIMITE_DEFECTO = 10;
const LIMITE_MAX = 40;
const PRESUPUESTO_MS = 20000;   // la función dura 300 s, pero el dueño espera con la pestaña abierta
const MAX_LINEAS = 60;

async function auditarProceso(redis, id, { detalle }) {
  let docs = null;
  try { docs = await leerJSONComprimido(redis, Docs.claveDocs(id)); } catch { docs = null; }
  if (!docs || typeof docs !== "object") return { id_proceso: id, estado: "sin_registro", documentos: [], ilegibles: [] };
  const leidos = docs.leidos && typeof docs.leidos === "object" ? docs.leidos : {};
  const ids = Object.keys(leidos);
  const textos = await Promise.all(ids.map(async (idDoc) => { try { return await leerJSONComprimido(redis, Docs.claveDoc(id, idDoc)); } catch { return undefined; } }));
  const documentos = ids.map((idDoc, i) => {
    const x = leidos[idDoc] || {}, g = textos[i];
    const base = { id_documento: idDoc, nombre: x.nombre || null, leido_el: x.leido_el || null };
    if (g === undefined) return { ...base, veredicto: "sin_medir", motivos: [{ nivel: "revisar", codigo: "no_se_pudo_leer_lo_guardado", texto: "la base de datos no respondió al pedir el texto guardado" }] };
    if (!g || typeof g.texto_normalizado !== "string" || !g.texto_normalizado) {
      return { ...base, tipo: x.tipo || null, origen: x.origen === "ocr" ? "ocr" : "texto", veredicto: "revisar", motivos: [{ nivel: "revisar", codigo: "texto_ausente", texto: "figura como leído pero su texto ya no está guardado (caduca a los 90 días): hay que volver a buscarlo" }] };
    }
    return { ...base, ...auditarDocumento({
      texto: g.texto_normalizado, tipo: x.tipo || g.tipo, origen: x.origen, paginas_total: x.paginas_total != null ? x.paginas_total : null,
      recortado: g.recortado === true || x.recortado === true, hash: g.hash || x.hash || null,
    }, { detalle }) };
  });
  const ilegibles = Object.entries(docs.ilegibles && typeof docs.ilegibles === "object" ? docs.ilegibles : {}).map(([idDoc, y]) => ({
    id_documento: idDoc, nombre: (y && y.nombre) || null, motivo: String((y && y.motivo) || "").slice(0, 200), definitivo: !!(y && y.definitivo),
  }));
  return { id_proceso: id, estado: "con_registro", documentos, ilegibles };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  if (String(req.method || "GET").toUpperCase() !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "Use GET: la auditoría solo lee." }); }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const inicio = Date.now();

  const unico = q.id_proceso !== undefined ? String(q.id_proceso || "").trim() : null;
  if (unico !== null && !ID_RE.test(unico)) return res.status(400).json({ ok: false, error: "id_proceso debe ser el id del proceso en SECOP II, p. ej. CO1.REQ.123." });

  let ids, enLaBase = null, desde = 0, limite = LIMITE_DEFECTO;
  if (unico !== null) ids = [unico];
  else {
    const d = Number(q.desde), l = Number(q.limite);
    desde = Number.isInteger(d) && d >= 0 ? d : 0;
    limite = Number.isInteger(l) && l >= 1 ? Math.min(l, LIMITE_MAX) : LIMITE_DEFECTO;
    let claves;
    try { claves = await redis.scan("pliego:*:docs"); } catch (e) {
      const { tacharClave } = require("../../apu_ocr.js");
      return res.status(502).json({ ok: false, error: `No se pudo listar lo guardado: ${tacharClave(String((e && e.message) || e)).slice(0, 200)}`, que_hacer: "Vuelva a pegar esta misma dirección en unos minutos." });
    }
    const todos = [...new Set(claves.map((k) => { const m = /^pliego:(.+):docs$/.exec(String(k)); return m && ID_RE.test(m[1]) ? m[1] : null; }).filter(Boolean))].sort();
    enLaBase = todos.length;
    ids = todos.slice(desde, desde + limite);
  }

  const procesos = [];
  for (const id of ids) {
    if (procesos.length && Date.now() - inicio > PRESUPUESTO_MS) break;   // lo que no cupo se pide con `siguiente`
    procesos.push(await auditarProceso(redis, id, { detalle: unico !== null }));
  }
  const hasta = desde + procesos.length;
  const siguiente = unico === null && enLaBase != null && hasta < enLaBase ? hasta : null;

  /* el resumen y las líneas para leer en el teléfono: primero lo que hay que mirar */
  const porMotivo = {};
  let docsN = 0, enRevision = 0, conNotas = 0, sinIndicios = 0, sinMedir = 0, ilegiblesN = 0;
  const lineas = [];
  for (const p of procesos) {
    ilegiblesN += p.ilegibles.length;
    for (const d of p.documentos) {
      docsN++;
      if (d.veredicto === "revisar") enRevision++; else if (d.veredicto === "con_notas") conNotas++; else if (d.veredicto === "sin_indicios") sinIndicios++; else sinMedir++;
      for (const m of d.motivos || []) if (m.nivel === "revisar") porMotivo[m.codigo] = (porMotivo[m.codigo] || 0) + 1;
      if (d.veredicto === "revisar") lineas.push(`${p.id_proceso} · ${d.nombre || d.id_documento} (${d.tipo || "sin tipo"}, ${d.origen === "ocr" ? "escaneo leído con reconocimiento de texto" : "texto del PDF"}): ${(d.motivos || []).filter((m) => m.nivel === "revisar").map((m) => m.texto).join("; ")}.`);
    }
  }
  return res.status(200).json({
    ok: true,
    generado_el: new Date().toISOString(),
    alcance: { procesos_con_registro: enLaBase, desde, hasta, procesos_en_esta_respuesta: procesos.length, completo: unico !== null || siguiente === null, siguiente,
      como_seguir: siguiente !== null ? `Para seguir, pegue la misma dirección añadiendo &desde=${siguiente}` : null },
    resumen: { documentos: docsN, para_revisar: enRevision, con_notas: conNotas, sin_indicios: sinIndicios, sin_medir: sinMedir, ilegibles_que_no_se_midieron: ilegiblesN, motivos_para_revisar: porMotivo },
    para_revisar: lineas.slice(0, MAX_LINEAS),
    para_revisar_recortado: lineas.length > MAX_LINEAS,
    umbrales: UMBRALES,
    procesos,
    como_leerlo: "«para_revisar» lista los documentos con indicios de una lectura mala, con la razón en palabras. «sin_indicios» quiere decir que esta revisión no encontró nada raro, NO que el documento esté bien leído: "
      + "un escaneo puede tener una cifra mal reconocida y pasar todo esto; las cifras que deciden se comprueban contra el original en SECOP II. Los umbrales son una propuesta para discutir con estos datos; "
      + "el texto guardado no se devuelve, solo cuentas y números de página. Esta consulta no escribe nada.",
  });
};
