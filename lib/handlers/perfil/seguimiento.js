/* lib/handlers/perfil/seguimiento.js · /api/perfil?op=seguimiento (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   MIS PROCESOS del perfil (token: es información del dueño):
     GET    ?perfil=X                → los guardados, enriquecidos con la fila
                                       VIVA del corpus (estado, hitos, avisos)
     GET    ?perfil=X&detalle=<id>   → quiénes se presentaron a ESE proceso y la
                                       ficha de cada uno (veces ante la entidad,
                                       ganadas, último adjudicado, contratos
                                       vigentes con firmas y valor); caché 1 h
     GET    ?perfil=X&ics=<id>       → el cronograma del proceso en .ics
     POST   {perfil, id, estado, notas, foto?}   → guardar / actualizar
     DELETE ?perfil=X&id=<id>        → quitar
   Almacenamiento: `seguimiento:{perfil}` (un JSON por perfil, ≤ 200 procesos).
   La red (hgi6, p6dx, jbjy) va con tiempo acotado y NUNCA tumba la respuesta:
   una fuente caída viaja como `ok:false` con motivo. La lógica pura vive en
   lib/seguimiento.js. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES, leerJSON, escribirJSON } = require("../../almacen.js");
const { crearCliente, escSoQL } = require("../../socrata.js");
const S = require("../../seguimiento.js");
/* Los predicados de la manifestación salen de su módulo: dos definiciones de
   «todavía se puede avisar» divergirían a la primera corrección. */
const { sigueValiendoLaPena: manifVigente, esUrgente: manifUrgente } = require("../../manifestacion.js");

const MAX_BYTES = 64 * 1024;
const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const ID_RE = /^[A-Za-z0-9._-]{3,60}$/;
const TIEMPO_MAX_MS = parseInt(process.env.SEGUIMIENTO_TIEMPO_MS, 10) || 6000;
const TTL_DETALLE_SEG = 3600;
const TOP_PROPONENTES = 12;
const clave = (perfil) => `seguimiento:${perfil}`;
const claveDetalle = (id) => `seguimiento:detalle:v1:${id}`;
const BASES = {
  proponentes: () => process.env.PROPONENTES_BASE_URL || "https://www.datos.gov.co/resource/hgi6-6wh3.json",
  adjudicaciones: () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json",
  contratos: () => process.env.EJECUCION_BASE_URL || "https://www.datos.gov.co/resource/jbjy-vk9h.json",
};
const conTiempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`tiempo agotado (${ms} ms)`)), ms))]);
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

async function leerGuardados(redis, perfil) {
  const j = await leerJSON(redis, clave(perfil));
  return j && typeof j === "object" && j.procesos && typeof j.procesos === "object" ? j : { procesos: {} };
}
async function filaViva(redis, ids) {
  try {
    const { cargarCorpus } = require("../procesos/listar.js");
    const meta = await leerJSON(redis, CLAVES.meta);
    const filas = await cargarCorpus(redis, meta);
    const buscados = new Set(ids);
    const out = new Map();
    for (const l of filas || []) if (buscados.has(l.id_del_proceso)) out.set(l.id_del_proceso, l);
    return out;
  } catch { return new Map(); }
}

/* ═══ La ficha de los competidores de UN proceso ═══ */
async function detalleCompetencia(idProceso, guardado, { log = () => {} } = {}) {
  const base = { ok: false, id: idProceso, fuente: "hgi6-6wh3", proponentes: [], motivo: null };
  const cli = (b) => crearCliente({ baseUrl: b, log });
  let filas;
  try {
    filas = await conTiempo(cli(BASES.proponentes()).pedir({
      "$select": "proveedor,nit_proveedor,codigo_entidad,nit_entidad,entidad_compradora,fecha_publicaci_n",
      "$where": `id_procedimiento='${escSoQL(idProceso)}'`, "$limit": "200",
    }, "proponentes del proceso"), TIEMPO_MAX_MS);
  } catch (e) { return { ...base, motivo: `no se pudo consultar hgi6-6wh3: ${String((e && e.message) || e)}` }; }
  if (!filas || !filas.length) {
    return { ...base, ok: true, motivo: "hgi6-6wh3 no publica proponentes para este proceso todavía (aparecen tras la apertura de ofertas; en procesos que no cierran en SECOP II, nunca)." };
  }
  const codigoEntidad = String(filas[0].codigo_entidad || "").trim() || null;
  const nitEntidad = S.nitONull(filas[0].nit_entidad);
  const props = new Map();
  for (const f of filas) {
    const nombre = String(f.proveedor || "").trim(); if (!nombre) continue;
    const nit = S.nitONull(f.nit_proveedor);
    const k = nit ? `nit:${nit}` : `n:${nombre.toUpperCase()}`;
    if (!props.has(k)) props.set(k, { nombre, nit });
  }
  const lista = [...props.values()].slice(0, TOP_PROPONENTES);
  const nits = lista.map((p) => p.nit).filter(Boolean);
  const enLista = nits.map((n) => `'${escSoQL(n)}'`).join(",");

  const veces = new Map(), ganadas = new Map(), vigentes = new Map();
  /* Si la consulta RESPONDIÓ, un proponente con NIT que no aparece en ella
     tiene CERO (veces / ganadas): la fuente lo dice. Si la consulta FALLÓ, no
     se sabe y viaja null. Son dos cosas distintas y se distinguen (R1). */
  const respondio = { veces: false, ganadas: false };
  const tareas = [];
  if (codigoEntidad && nits.length) {
    tareas.push(conTiempo(cli(BASES.proponentes()).pedir({
      "$select": "nit_proveedor,count(*) as veces,max(fecha_publicaci_n) as ultima",
      "$where": `codigo_entidad='${escSoQL(codigoEntidad)}' AND nit_proveedor in (${enLista})`,
      "$group": "nit_proveedor", "$limit": "100",
    }, "veces ante la entidad"), TIEMPO_MAX_MS).then((r) => { respondio.veces = true; for (const g of r || []) veces.set(String(g.nit_proveedor), { veces: num(g.veces), ultima: String(g.ultima || "").slice(0, 10) || null }); })
      .catch((e) => log(`seguimiento/veces: ${e.message}`)));
  }
  if (nitEntidad && nits.length) {
    tareas.push(conTiempo(cli(BASES.adjudicaciones()).pedir({
      "$select": "nit_del_proveedor_adjudicado,count(*) as ganadas,max(fecha_adjudicacion) as ultima,sum(valor_total_adjudicacion) as valor",
      "$where": `nit_entidad='${escSoQL(nitEntidad)}' AND adjudicado='Si' AND nit_del_proveedor_adjudicado in (${enLista})`,
      "$group": "nit_del_proveedor_adjudicado", "$limit": "100",
    }, "ganadas ante la entidad"), TIEMPO_MAX_MS).then((r) => { respondio.ganadas = true; for (const g of r || []) ganadas.set(String(g.nit_del_proveedor_adjudicado), { ganadas: num(g.ganadas), ultima: String(g.ultima || "").slice(0, 10) || null, valor: num(g.valor) != null && num(g.valor) > 0 ? Math.round(num(g.valor)) : null }); })
      .catch((e) => log(`seguimiento/ganadas: ${e.message}`)));
  }
  for (const nit of nits) {
    tareas.push(conTiempo(cli(BASES.contratos()).pedir({
      "$select": "nombre_entidad,valor_del_contrato,fecha_de_firma,fecha_de_fin_del_contrato,estado_contrato",
      "$where": `documento_proveedor='${escSoQL(nit)}' AND estado_contrato in ('En ejecución','Modificado','Suspendido','Prorrogado')`,
      "$order": "fecha_de_firma desc", "$limit": "200",
    }, `contratos vigentes ${nit}`), TIEMPO_MAX_MS).then((r) => {
      const l = r || []; let valor = 0, conValor = 0; const ents = new Set();
      for (const f of l) { const v = num(f.valor_del_contrato); if (v != null && v > 0) { valor += v; conValor++; } if (f.nombre_entidad) ents.add(String(f.nombre_entidad).trim()); }
      vigentes.set(nit, { contratos: l.length, valor_cop: conValor ? Math.round(valor) : null, entidades: ents.size,
        firmas: l.slice(0, 5).map((f) => ({ fecha_firma: String(f.fecha_de_firma || "").slice(0, 10) || null, valor_cop: num(f.valor_del_contrato), entidad: String(f.nombre_entidad || "").slice(0, 80) || null, fin: String(f.fecha_de_fin_del_contrato || "").slice(0, 10) || null, estado: String(f.estado_contrato || "") })) });
    }).catch((e) => log(`seguimiento/vigentes ${nit}: ${e.message}`)));
  }
  await Promise.all(tareas);
  return {
    ...base, ok: true,
    entidad: { codigo: codigoEntidad, nit: nitEntidad, nombre: String(filas[0].entidad_compradora || (guardado && guardado.foto && guardado.foto.entidad) || "").trim() || null },
    proponentes_totales: props.size,
    proponentes: lista.map((p) => S.fichaCompetidor(p, {
      veces: p.nit ? (veces.get(p.nit) || (respondio.veces ? { veces: 0, ultima: null } : null)) : null,
      ganadas: p.nit ? (ganadas.get(p.nit) || (respondio.ganadas ? { ganadas: 0, ultima: null, valor: null } : null)) : null,
      vigentes: p.nit ? vigentes.get(p.nit) : null,
    })),
    fuentes_consultadas: { veces_ante_entidad: codigoEntidad ? "hgi6-6wh3 por codigo_entidad" : "sin código de entidad", ganadas: nitEntidad ? "p6dx-8zbt por nit_entidad (los NIT se comparten entre regionales: puede sumar hermanas)" : "sin NIT de entidad", vigentes: "jbjy-vk9h por documento_proveedor" },
    lectura: "Quiénes se presentaron a este proceso y qué dicen las fuentes abiertas de cada uno. La inhabilidad se verifica por NIT con «Verificar» (SIRI + multas). Lo que no está, no se inventa.",
    consultado_el: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  const perfil = String(q.perfil || "").trim();

  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    const d = cuerpo.datos || {};
    const p = String(d.perfil || perfil || "").trim();
    const id = String(d.id || "").trim();
    if (!PERFIL_RE.test(p)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta «id» del proceso (id_del_proceso, p. ej. CO1.REQ.123)." });
    const g = await leerGuardados(redis, p);
    const existente = g.procesos[id] || null;
    if (!existente && Object.keys(g.procesos).length >= S.MAX_GUARDADOS) return res.status(400).json({ ok: false, error: `Tope de ${S.MAX_GUARDADOS} procesos guardados por perfil.` });
    const ahora = new Date().toISOString();
    /* «Enterado»: el usuario vio los cambios → la foto VIVA del corpus pasa a
       ser la referencia (`visto`); no toca la foto original ni el estado. Se
       toma del SERVIDOR (corpus), no del cliente: es lo que se va a comparar. */
    if (d.enterado === true) {
      if (!existente) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
      const vivas = await filaViva(redis, [id]);
      const viva = vivas.get(id) ? S.fotoViva(vivas.get(id)) : null;
      existente.visto = viva || existente.visto || existente.foto;
      existente.visto_el = ahora;
      await escribirJSON(redis, clave(p), g);
      return res.status(200).json({ ok: true, perfil: p, id, enterado: true, visto_el: ahora, en_corpus: !!viva });
    }
    // la foto viene del cliente (la fila que tenía en pantalla) o se toma del corpus
    let foto = d.foto && typeof d.foto === "object" ? S.fotoDe({ ...d.foto, id_del_proceso: id }) : (existente ? existente.foto : null);
    if (!existente) {
      /* al guardar por primera vez, la referencia para «cambió» es la fila VIVA
         del corpus (con su estado en SECOP II), no la que el cliente tenía en
         pantalla: así un cambio de estado desde el día de guardar se detecta */
      const vivas = await filaViva(redis, [id]);
      if (vivas.get(id)) { const fv = S.fotoViva(vivas.get(id)); foto = { ...(foto && foto.nombre ? foto : fv), estado_secop: fv.estado_secop }; }
    }
    if (!foto || !foto.nombre) { const vivas = await filaViva(redis, [id]); if (vivas.get(id)) foto = S.fotoDe(vivas.get(id)); }
    g.procesos[id] = {
      id, estado: S.normalizarEstado(d.estado || (existente && existente.estado) || "interesa"),
      notas: d.notas != null ? String(d.notas).slice(0, S.MAX_NOTAS) : (existente ? existente.notas || null : null),
      foto: foto || { id }, guardado: existente ? existente.guardado : ahora, actualizado: ahora,
      visto: existente ? existente.visto || null : null, visto_el: existente ? existente.visto_el || null : null,
    };
    await escribirJSON(redis, clave(p), g);
    return res.status(200).json({ ok: true, perfil: p, id, guardado: g.procesos[id], total: Object.keys(g.procesos).length });
  }

  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta ?perfil=…" });

  if (metodo === "DELETE") {
    const id = String(q.id || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id= del proceso a quitar." });
    const g = await leerGuardados(redis, perfil);
    const habia = !!g.procesos[id];
    delete g.procesos[id];
    await escribirJSON(redis, clave(perfil), g);
    return res.status(200).json({ ok: true, perfil, id, quitado: habia, total: Object.keys(g.procesos).length });
  }
  if (metodo !== "GET") { res.setHeader("Allow", "GET, POST, DELETE"); return res.status(405).json({ ok: false, error: "Use GET, POST o DELETE." }); }

  const g = await leerGuardados(redis, perfil);
  const ids = Object.keys(g.procesos);

  if (q.ics) {
    const id = String(q.ics).trim();
    const gu = g.procesos[id];
    if (!gu) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
    const vivas = await filaViva(redis, [id]);
    const e = S.enriquecer(gu, vivas.get(id) || null, Date.now());
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="detekta_${id.replace(/[^A-Za-z0-9._-]/g, "_")}.ics"`);
    return res.status(200).send(S.icsDe(e));
  }
  if (q.detalle) {
    const id = String(q.detalle).trim();
    const gu = g.procesos[id];
    if (!gu) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
    if (String(q.refrescar || "") !== "1") {
      try { const c = await leerJSON(redis, claveDetalle(id)); if (c && c.consultado_el) return res.status(200).json({ ...c, cache: true }); } catch { /* sin caché */ }
    }
    const det = await detalleCompetencia(id, gu, {});
    if (det.ok) { try { await redis.set(claveDetalle(id), JSON.stringify(det), { ex: TTL_DETALLE_SEG }); } catch { /* caché opcional */ } }
    return res.status(200).json({ ...det, cache: false });
  }

  const vivas = await filaViva(redis, ids);
  const ahora = Date.now();
  const procesos = ids.map((id) => S.enriquecer(g.procesos[id], vivas.get(id) || null, ahora))
    .sort((a, b) => {
      // primero lo que cierra antes y sigue abierto; después lo cerrado (más reciente primero)
      const ca = a.dias_para_cierre, cb = b.dias_para_cierre;
      const aa = ca != null && ca >= 0, ab = cb != null && cb >= 0;
      if (aa !== ab) return aa ? -1 : 1;
      if (aa) return ca - cb;
      return String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
    });
  const alertas = S.alertasDe(procesos, { dias: 7 });
  const porEstado = Object.fromEntries(S.ESTADOS.map((e) => [e, procesos.filter((p) => p.estado === e).length]));
  const resumen = { total: procesos.length, abiertos: procesos.filter((p) => p.cerrado === false).length, cerrados: procesos.filter((p) => p.cerrado === true).length,
    presentados: porEstado.presentado, por_estado: porEstado,
    avisos_proximos: procesos.flatMap((p) => p.avisos).filter((a) => a.dias_antes <= 7).length,
    cambios_pendientes: procesos.reduce((n, p) => n + (p.cambios_pendientes || 0), 0),
    /* `abiertas` = todavía vale la pena avisar (con certeza abiertas + las que
       están dentro de la ventana); `urgentes` ⊂ `abiertas` = hay que entrar a
       SECOP II HOY. Los predicados salen de lib/manifestacion: dos definiciones
       de «todavía se puede» divergirían. */
    manifestaciones_abiertas: procesos.filter((p) => manifVigente(p.manifestacion)).length,
    manifestaciones_urgentes: procesos.filter((p) => manifUrgente(p.manifestacion)).length,
    /* lo que enciende la insignia de la pestaña: cambios sin ver + alertas de urgencia alta */
    atencion: alertas.filter((a) => a.urgencia === "alta").length };
  return res.status(200).json({ ok: true, perfil, resumen, alertas, procesos, estados: S.ESTADO_ETIQUETA, orden_estados: S.ESTADOS,
    como_leerlo: "Sus procesos guardados con la versión VIVA del corpus: estado, días para el cierre, hitos (incluida la manifestación de interés calculada en menor cuantía) y avisos a 7/3/1 días; `cambios` dice qué cambió desde la última vez que lo dio por visto (POST {id, enterado:true}); `alertas` es el centro de alertas de los próximos 7 días. Cuando el proceso cierra, «detalle» trae quiénes se presentaron y la ficha de cada uno." });
};
module.exports.detalleCompetencia = detalleCompetencia;
